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

        // 0. Verifica comandos de saída para limpar sessões
        if (senderId && exitCommands.includes(lower)) {
            if (this.activeSessions.has(senderId)) {
                const specName = this.activeSessions.get(senderId);
                this.activeSessions.delete(senderId);
                console.log(`[Orchestrator] 🔓 Sessão com ${specName} liberada para o usuário ${senderId}`);
                return undefined;
            }
        }

        // 1. Comandos com barra (Prioridade Absoluta Explicita)
        if (text.startsWith('/')) {
            const command = text.split(' ')[0]!.toLowerCase();
            const slashSpec = this.specialists.find(s => s.config.triggers.includes(command));
            if (slashSpec && senderId) {
                this.activeSessions.set(senderId, slashSpec.config.name);
                console.log(`[Orchestrator] 🔒 Sessão travada via comando explícito com ${slashSpec.config.name}`);
                return slashSpec;
            }
        }

        // 2. Roteamento automático por tipo de mídia ANTES DOS TRIGGERS
        if (mediaType === 'video') {
            const videoSpec = this.specialists.find(s => s.config.name === 'Video');
            if (videoSpec) return videoSpec;
        }

        if (mediaType === 'document' && inputMediaUrl) {
            const isVideoExtension = inputMediaUrl.match(/\.(mp4|mov|mkv|avi|webm)$/i);
            if (isVideoExtension) {
                const videoSpec = this.specialists.find(s => s.config.name === 'Video');
                if (videoSpec) return videoSpec;
            }
        }

        // 3. Respeitar a sessão ativa do usuário (Hand-off)
        if (senderId) {
            const activeSessionName = this.activeSessions.get(senderId);
            if (activeSessionName) {
                const activeSpec = this.specialists.find(s => s.config.name === activeSessionName);
                if (activeSpec) return activeSpec;
            }

            // Fallback legado do objeto interno do especialista
            const legacyActiveSpec = this.specialists.find(s => s.hasActiveSession(senderId));
            if (legacyActiveSpec) return legacyActiveSpec;
        }

        // 4. Se chegou aqui, não é mídia, não tem sessão e não tem slash command.
        // Vamos checar triggers naturais, mas apenas se a frase não for uma pergunta solta para o Doug.
        const isQuestionPattern =
            lower.startsWith('o que') || lower.startsWith('como') ||
            lower.startsWith('qual') || lower.startsWith('quais') ||
            lower.startsWith('onde') || lower.startsWith('quando') ||
            lower.startsWith('lembra') || lower.startsWith('você lembra') ||
            lower.startsWith('pera aí') || lower.startsWith('escuta');

        if (isQuestionPattern && lower.includes('?')) {
            console.log(`[Orchestrator] 🛑 Roteamento retido: Detectada pergunta explícita para a memória.`);
            return undefined;
        }

        // Como o Writer intercepta muito, vamos avaliar a especialidade "Vídeo" antes do "Writer" para palavras-chave mistas
        // Ordenamos os especialistas temporariamente para checagem:
        const sortedSpecialists = [...this.specialists].sort((a, b) => {
            if (a.config.name === 'Video') return -1;
            if (b.config.name === 'Video') return 1;
            if (a.config.name === 'Writer') return 1; // Joga pra baixo na prioridade
            if (b.config.name === 'Writer') return -1;
            return 0;
        });

        const naturalTriggerSpec = sortedSpecialists.find(s => s.matches(text));

        if (naturalTriggerSpec) {
            // Só trava a sessão no natural trigger se a instrução for mega curta e direta
            if (senderId && lower.split(' ').length <= 3) {
                this.activeSessions.set(senderId, naturalTriggerSpec.config.name);
                console.log(`[Orchestrator] 🔒 Sessão travada com ${naturalTriggerSpec.config.name} (Acionamento Curto)`);
            }
            return naturalTriggerSpec;
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

        // Intercepta chamadas "vazias" (apenas o gatilho) para dar boas-vindas na sessão
        const cleanText = incoming.text.toLowerCase().trim().replace(/^[^\w\/]+/, ''); // remove ?, ! no começo mas mantém /
        const isJustTrigger = specialist.config.triggers.some(t => t.toLowerCase() === cleanText || t.toLowerCase() === incoming.text.toLowerCase().trim());

        if (isJustTrigger && !incoming.mediaUrl) {
            console.log(`[Orchestrator] 🚪 Gatilho puro detectado. Iniciando sessão focada sem rodar LLM.`);
            return {
                text: `[SISTEMA] Sessão focada iniciada com o especialista **${specialist.config.name}**. 🎯\n\nEnvie o material, link ou as instruções que deseja trabalhar.\n*(Para liberar o especialista depois, digite /sair ou tchau)*`,
                specialist: specialist.config.name
            };
        }

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
