/**
 * GravityClaw — Orchestrator
 *
 * Analisa mensagens recebidas e roteia para o Specialist correto.
 * Se nenhum specialist bater, delega para o chat genérico.
 */

import type { IncomingMessage, OutgoingMessage } from './types.js';
import type { LLMRouter } from './llm/router.js';
import { Specialist, type SpecialistInput, type SpecialistOutput } from './specialist.js';
import type { DriveService } from '../services/drive.js';

export class Orchestrator {
    private specialists: Specialist[] = [];
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
        // 1. Verifica se já existe uma sessão interativa travada neste usuário
        if (senderId) {
            const activeSpec = this.specialists.find(s => s.hasActiveSession(senderId));
            if (activeSpec) return activeSpec;
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
                const lower = text.toLowerCase();
                const isVideoExtension = inputMediaUrl?.match(/\.(mp4|mov|mkv|avi|webm)$/i);

                if (videoTerms.some(t => lower.includes(t)) || (text.trim() === '' && isVideoExtension)) {
                    return videoSpec;
                }
            }
        }

        // 3. Roteamento por triggers do texto
        // Intercept: Evita rotear perguntas explícitas (que devem ser respondidas pela Memória do Agente)
        const lower = text.toLowerCase().trim();
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

        return this.specialists.find(s => s.matches(text));
    }

    /**
     * Processa uma mensagem tentando delegar a um specialist.
     * Retorna null se nenhum specialist puder lidar com a mensagem
     * (delegando ao chat genérico do agent).
     */
    async tryProcess(
        incoming: IncomingMessage,
        llmRouter: LLMRouter,
        context?: string,
        onProgress?: (message: string) => Promise<void>,
        onSendFile?: (filePath: string, caption: string) => Promise<void>
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

        try {
            const result = await specialist.run(input, llmRouter);

            const response: OutgoingMessage = { text: result.text };
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
