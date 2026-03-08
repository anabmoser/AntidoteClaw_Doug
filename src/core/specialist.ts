/**
 * GravityClaw — Specialist Agent Interface
 *
 * Um Specialist é um sub-agente com personalidade, modelo LLM
 * e ferramentas próprias. O Orchestrator decide qual ativar
 * com base na mensagem do usuário.
 */

import type { LLMMessage, LLMProviderName, IncomingMessage, OutgoingMessage, ChannelType } from './types.js';
import type { LLMRouter } from './llm/router.js';
import type { DriveService } from '../services/drive.js';

// ─── Specialist Types ─────────────────────────────────────────

export interface SpecialistConfig {
    name: string;
    description: string;
    model: string;                // modelo OpenRouter (ex: 'qwen/qwen3.5')
    systemPrompt: string;         // personalidade focada
    triggers: string[];           // palavras/frases que ativam
    maxTokens?: number;
    temperature?: number;
}

export interface SpecialistInput {
    text: string;
    senderId: string;
    channel: ChannelType;
    mediaUrl?: string;
    mediaType?: 'image' | 'audio' | 'video' | 'document';
    context?: string;             // contexto adicional do orchestrator
    recentHistory?: LLMMessage[]; // histórico recente para permitir handoffs entre agentes
    onProgress?: (message: string) => Promise<void>;  // callback para enviar status ao usuário
    onSendFile?: (filePath: string, caption: string) => Promise<void>;  // callback para enviar arquivo ao usuário
    driveService?: DriveService;  // Serviço opcional do Google Drive para salvar outputs
}

export interface SpecialistOutput {
    text: string;
    mediaUrl?: string;
    mediaBuffer?: Buffer;
    files?: { name: string; url: string }[];
    metadata?: Record<string, unknown>;
}

export interface Tool {
    name: string;
    description: string;
    execute(params: Record<string, unknown>): Promise<unknown>;
}

// ─── Base Specialist Class ────────────────────────────────────

export abstract class Specialist {
    readonly config: SpecialistConfig;
    protected tools: Tool[] = [];

    constructor(config: SpecialistConfig) {
        this.config = config;
    }

    /**
     * Retorna true se este especialista tiver uma sessão interativa ativa com o usuário.
     * Caso true, o Orchestrator forçará o roteamento de mensagens para cá.
     */
    hasActiveSession(senderId: string): boolean {
        return false;
    }

    /**
     * Verifica se este specialist deve ser ativado para o texto dado.
     */
    matches(text: string): boolean {
        const lower = text.toLowerCase().trim();
        return this.config.triggers.some(trigger =>
            lower.includes(trigger.toLowerCase())
        );
    }

    /**
     * Registra uma ferramenta disponível para este specialist.
     */
    addTool(tool: Tool): void {
        this.tools.push(tool);
    }

    /**
     * Lista as ferramentas disponíveis em formato para o system prompt.
     */
    describeTools(): string {
        if (this.tools.length === 0) return '';
        const lines = ['\n## Ferramentas Disponíveis\n'];
        for (const tool of this.tools) {
            lines.push(`- **${tool.name}**: ${tool.description}`);
        }
        return lines.join('\n');
    }

    /**
     * Executa o specialist com a mensagem dada.
     * Implementações concretas podem sobrescrever para lógica customizada.
     */
    async run(input: SpecialistInput, llmRouter: LLMRouter): Promise<SpecialistOutput> {
        const messages: LLMMessage[] = input.recentHistory ? [...input.recentHistory] : [];
        messages.push({ role: 'user', content: input.text });

        if (input.context) {
            messages.unshift({ role: 'system', content: input.context });
        }

        const fullPrompt = this.config.systemPrompt + this.describeTools();

        const response = await llmRouter.complete(messages, {
            model: this.config.model,
            systemPrompt: fullPrompt,
            maxTokens: this.config.maxTokens ?? 2048,
            temperature: this.config.temperature ?? 0.7,
        });

        console.log(`[${this.config.name}] ✅ Resposta via ${response.model}`);

        return { text: response.content };
    }
}
