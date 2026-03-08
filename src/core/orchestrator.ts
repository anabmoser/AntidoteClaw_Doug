/**
 * GravityClaw — Orchestrator
 *
 * Analisa mensagens recebidas e roteia para o Specialist correto.
 * Se nenhum specialist bater, delega para o chat genérico.
 */

import type { IncomingMessage, OutgoingMessage } from './types.js';
import type { LLMRouter } from './llm/router.js';
import { Specialist, type SpecialistInput, type SpecialistOutput, type SpecialistConfig } from './specialist.js';
import type { DriveService } from '../services/drive.js';
import * as fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const AGENTS_CONFIG_FILE = join(process.cwd(), 'data', 'agents.json');

export class Orchestrator {
    private specialists: Specialist[] = [];
    private activeSessions: Map<string, string> = new Map(); // senderId -> specialistName
    private driveService: DriveService | undefined;

    constructor(driveService?: DriveService) {
        this.driveService = driveService;
    }

    /**
     * Registra um specialist no orquestrador.
     */
    register(specialist: Specialist): void {
        this.specialists.push(specialist);
        console.log(`[Orchestrator] 🧩 Specialist registrado: ${specialist.config.name}`);
        console.log(`    └─ Triggers: ${specialist.config.triggers.join(', ')}`);
        console.log(`    └─ Modelo: ${specialist.config.model}`);
    }

    /**
     * Carrega as configurações personalizadas do JSON (Dashboard) e sobrescreve os defaults do código.
     */
    async loadConfigOverrides(): Promise<void> {
        if (!existsSync(AGENTS_CONFIG_FILE)) return;

        try {
            const raw = await fs.readFile(AGENTS_CONFIG_FILE, 'utf-8');
            const overrides: Record<string, Partial<SpecialistConfig>> = JSON.parse(raw);

            for (const spec of this.specialists) {
                const custom = overrides[spec.config.name];
                if (custom) {
                    spec.updateConfig(custom);
                }
            }
            console.log(`[Orchestrator] 📄 Configurações dinâmicas de especialistas carregadas (${Object.keys(overrides).length} encontradas).`);
        } catch (err) {
            console.error(`[Orchestrator] ❌ Erro ao ler agents.json:`, err);
        }
    }

    /**
     * Atualiza a configuração de um Specialist e salva no JSON.
     */
    async updateSpecialistConfig(name: string, newConfig: Partial<SpecialistConfig>): Promise<boolean> {
        const spec = this.specialists.find(s => s.config.name.toLowerCase() === name.toLowerCase());
        if (!spec) return false;

        spec.updateConfig(newConfig);

        // Salvar tudo em arquivo
        try {
            let overrides: Record<string, Partial<SpecialistConfig>> = {};
            if (existsSync(AGENTS_CONFIG_FILE)) {
                const raw = await fs.readFile(AGENTS_CONFIG_FILE, 'utf-8');
                overrides = JSON.parse(raw);
            }

            // Atualiza ou insere as configurações do agente específico
            overrides[spec.config.name] = {
                ...overrides[spec.config.name],
                systemPrompt: newConfig.systemPrompt !== undefined ? newConfig.systemPrompt : spec.config.systemPrompt,
                triggers: newConfig.triggers !== undefined ? newConfig.triggers : spec.config.triggers,
                model: newConfig.model !== undefined ? newConfig.model : spec.config.model,
                temperature: newConfig.temperature !== undefined ? newConfig.temperature : spec.config.temperature,
                maxTokens: newConfig.maxTokens !== undefined ? newConfig.maxTokens : spec.config.maxTokens,
            };

            await fs.writeFile(AGENTS_CONFIG_FILE, JSON.stringify(overrides, null, 2), 'utf-8');
            console.log(`[Orchestrator] 💾 Configurações salvas permanentemente em data/agents.json`);
            return true;
        } catch (err) {
            console.error(`[Orchestrator] ❌ Erro ao salvar agents.json:`, err);
            return false;
        }
    }

    /**
     * Remove um specialist pelo nome.
     */
    unregister(name: string): boolean {
        const idx = this.specialists.findIndex(s => s.config.name === name);
        if (idx >= 0) {
            this.specialists.splice(idx, 1);
            return true;
        }
        return false;
    }

    /**
     * Lista todos os specialists registrados.
     */
    list(): Specialist[] {
        return [...this.specialists];
    }

    /**
     * Tenta encontrar um specialist que corresponda à mensagem.
     * Verifica sessões ativas primeiro, depois por mediaType e por último triggers no texto.
     */
    findSpecialist(text: string, mediaType?: string, senderId?: string, inputMediaUrl?: string): Specialist | undefined {
        const lower = text.toLowerCase().trim();
        const exitCommands = ['/sair', 'sair', 'tchau', 'encerrar', 'voltar', 'cancelar'];

        // 0. Verifica comandos de saída
        if (senderId && exitCommands.includes(lower)) {
            if (this.activeSessions.has(senderId)) {
                const specName = this.activeSessions.get(senderId);
                this.activeSessions.delete(senderId);
                console.log(`[Orchestrator] 🔓 Sessão com ${specName} liberada para o usuário ${senderId}`);
                return undefined; // Devolve para o Doug (Agent Genérico)
            }
        }

        // 1. Verifica se chamou explicitamente um agente (ex: /social) e trava a sessão
        const explicitTriggerSpec = this.specialists.find(s => s.matches(text));

        if (senderId) {
            // Se usou um trigger explícito (comando com barra ou palavra forte de trigger), muda a sessão
            if (explicitTriggerSpec && text.startsWith('/')) {
                this.activeSessions.set(senderId, explicitTriggerSpec.config.name);
                console.log(`[Orchestrator] 🔒 Sessão travada com ${explicitTriggerSpec.config.name} para o usuário ${senderId}`);
                return explicitTriggerSpec;
            }

            // Se tem uma sessão ativa mantida pelo Orquestrador, envia tudo para ele
            const activeSessionName = this.activeSessions.get(senderId);
            if (activeSessionName) {
                const activeSpec = this.specialists.find(s => s.config.name === activeSessionName);
                if (activeSpec) return activeSpec;
            }

            // Fallback para especialistas que gerenciam a própria sessão internamente (legado)
            const legacyActiveSpec = this.specialists.find(s => s.hasActiveSession(senderId));
            if (legacyActiveSpec) return legacyActiveSpec;
        }

        // 2. Roteamento automático por tipo de mídia
        if (mediaType === 'video') {
            const videoSpec = this.specialists.find(s => s.config.name === 'Video');
            if (videoSpec) return videoSpec;
        }

        // Documentos que são vídeos (enviados como arquivo no Telegram)
        if (mediaType === 'document') {
            const videoSpec = this.specialists.find(s => s.config.name === 'Video');
            if (videoSpec) {
                // Verifica se o texto menciona vídeo/transcrição ou se é só o arquivo
                const videoTerms = ['transcrev', 'vídeo', 'video', 'editar', 'cortar', 'legenda', 'ffmpeg'];
                const isVideoExtension = inputMediaUrl?.match(/\.(mp4|mov|mkv|avi|webm)$/i);

                if (videoTerms.some(t => lower.includes(t)) || (text.trim() === '' && isVideoExtension)) {
                    return videoSpec;
                }
            }
        }

        // 3. Roteamento por triggers do texto
        // Intercept: Evita rotear perguntas explícitas (que devem ser respondidas pela Memória do Agente)
        const isQuestionPattern =
            lower.startsWith('o que') ||
            lower.startsWith('como') ||
            lower.startsWith('qual') ||
            lower.startsWith('quais') ||
            lower.startsWith('onde') ||
            lower.startsWith('quando') ||
            lower.startsWith('lembra') ||
            lower.startsWith('você lembra') ||
            lower.startsWith('pera aí') ||
            lower.startsWith('escuta') ||
            lower.startsWith('espera');

        if (isQuestionPattern && lower.includes('?')) {
            console.log(`[Orchestrator] 🛑 Roteamento retido: Detectada pergunta explícita para a memória.`);
            return undefined;
        }

        if (explicitTriggerSpec) {
            // Trava a sessão caso tenha acionado um trigger forte (mesmo sem a barra, mas só se configurarmos assim)
            // Para não prender acidentalmente, prendemos só se ele mandar um trigger isolado pequeno
            if (senderId && lower.split(' ').length <= 3) {
                this.activeSessions.set(senderId, explicitTriggerSpec.config.name);
                console.log(`[Orchestrator] 🔒 Sessão travada com ${explicitTriggerSpec.config.name} (Acionamento Simples)`);
            }
            return explicitTriggerSpec;
        }

        return undefined;
    }

    /**
     * Processa uma mensagem tentando delegar a um specialist.
     * Retorna null se nenhum specialist puder lidar com a mensagem
     * (delegando ao chat genérico do agent).
     */
    async tryProcess(
        incoming: IncomingMessage,
        llmRouter: import('./llm/router.js').LLMRouter,
        context?: string,
        onProgress?: (message: string) => Promise<void>,
        onSendFile?: (filePath: string, caption: string) => Promise<void>,
        recentHistory?: import('./types.js').LLMMessage[]
    ): Promise<OutgoingMessage | null> {
        const specialist = this.findSpecialist(incoming.text, incoming.mediaType, incoming.senderId, incoming.mediaUrl);
        if (!specialist) return null;

        console.log(`[Orchestrator] 🎯 Roteando para: ${specialist.config.name}`);

        const input: SpecialistInput = {
            text: incoming.text,
            senderId: incoming.senderId,
            channel: incoming.channel,
        };
        if (incoming.mediaUrl) { input.mediaUrl = incoming.mediaUrl; }
        if (incoming.mediaType) { input.mediaType = incoming.mediaType; }
        if (context) { input.context = context; }
        if (onProgress) { input.onProgress = onProgress; }
        if (onSendFile) { input.onSendFile = onSendFile; }
        if (this.driveService) { input.driveService = this.driveService; }
        if (recentHistory) { input.recentHistory = recentHistory; }

        try {
            const result = await specialist.run(input, llmRouter);

            const response: OutgoingMessage = {
                text: result.text,
                specialist: specialist.config.name
            };
            if (result.mediaUrl) { response.mediaUrl = result.mediaUrl; }

            return response;
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[Orchestrator] ❌ Erro em ${specialist.config.name}: ${msg}`);
            return {
                text: `⚠️ Erro no specialist "${specialist.config.name}": ${msg}`,
            };
        }
    }

    /**
     * Gera uma descrição dos specialists para incluir no system prompt.
     */
    describeForLLM(): string {
        if (this.specialists.length === 0) return '';

        const lines = ['\n## Specialists Disponíveis\n'];
        lines.push('Você coordena os seguintes agentes especializados:\n');
        for (const s of this.specialists) {
            lines.push(`- **${s.config.name}**: ${s.config.description} (triggers: ${s.config.triggers.join(', ')})`);
        }
        lines.push('\nQuando o usuário pedir algo relacionado a um specialist, delegue a tarefa automaticamente.');
        return lines.join('\n');
    }
}
