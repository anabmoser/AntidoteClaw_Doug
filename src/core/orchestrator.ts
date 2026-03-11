/**
 * GravityClaw — Orchestrator
 *
 * Analisa mensagens recebidas e roteia para o Specialist correto.
 * Se nenhum specialist bater, delega para o chat genérico.
 */

import type { IncomingMessage, LLMMessage, OutgoingMessage } from './types.js';
import type { LLMRouter } from './llm/router.js';
import { Specialist, type SpecialistConfig, type SpecialistInput } from './specialist.js';
import type { DriveService } from '../services/drive.js';
import * as fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const AGENTS_CONFIG_FILE = join(process.cwd(), 'data', 'agents.json');

interface TaskState {
    objective?: string;
    activeSpecialist?: string;
    lastSpecialist?: string;
    lastUserMessage?: string;
    lastSpecialistOutput?: string;
    lastHandoffCommand?: string;
    updatedAt: string;
}

interface TransferIntent {
    target: Specialist;
    targetLabel: string;
    instruction: string;
}

const SPECIALIST_ALIASES: Record<string, string[]> = {
    Video: ['video', 'vídeo', 'editor', 'editor de vídeo', 'video agent'],
    Designer: ['designer', 'design', 'banner', 'imagem', 'arte'],
    Writer: ['writer', 'redator', 'copywriter', 'copy'],
    Scout: ['scout', 'pesquisa', 'pesquisador'],
    Social: ['social', 'social media', 'redes sociais'],
};

const HANDOFF_VERBS = ['manda', 'passa', 'encaminha', 'envia', 'joga', 'deixa'];

export class Orchestrator {
    private specialists: Specialist[] = [];
    private activeSessions: Map<string, string> = new Map();
    private taskStates: Map<string, TaskState> = new Map();
    private driveService: DriveService | undefined;

    constructor(driveService?: DriveService) {
        this.driveService = driveService;
    }

    register(specialist: Specialist): void {
        this.specialists.push(specialist);
        console.log(`[Orchestrator] 🧩 Specialist registrado: ${specialist.config.name}`);
        console.log(`    └─ Triggers: ${specialist.config.triggers.join(', ')}`);
        console.log(`    └─ Modelo: ${specialist.config.model}`);
    }

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

    async updateSpecialistConfig(name: string, newConfig: Partial<SpecialistConfig>): Promise<boolean> {
        const spec = this.specialists.find(s => s.config.name.toLowerCase() === name.toLowerCase());
        if (!spec) return false;

        spec.updateConfig(newConfig);

        try {
            let overrides: Record<string, Partial<SpecialistConfig>> = {};
            if (existsSync(AGENTS_CONFIG_FILE)) {
                const raw = await fs.readFile(AGENTS_CONFIG_FILE, 'utf-8');
                overrides = JSON.parse(raw);
            }

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

    unregister(name: string): boolean {
        const idx = this.specialists.findIndex(s => s.config.name === name);
        if (idx >= 0) {
            this.specialists.splice(idx, 1);
            return true;
        }
        return false;
    }

    list(): Specialist[] {
        return [...this.specialists];
    }

    findSpecialist(text: string, mediaType?: string, senderId?: string, inputMediaUrl?: string): Specialist | undefined {
        const lower = text.toLowerCase().trim();

        if (text.startsWith('/')) {
            const command = text.split(' ')[0]!.toLowerCase();
            const slashSpec = this.specialists.find(s => s.config.triggers.includes(command));
            if (slashSpec && senderId) {
                this.activeSessions.set(senderId, slashSpec.config.name);
                this.ensureTaskState(senderId).activeSpecialist = slashSpec.config.name;
                console.log(`[Orchestrator] 🔒 Sessão travada via comando explícito com ${slashSpec.config.name}`);
                return slashSpec;
            }
        }

        if (mediaType === 'video') {
            return this.specialists.find(s => s.config.name === 'Video');
        }

        if (mediaType === 'document' && inputMediaUrl?.match(/\.(mp4|mov|mkv|avi|webm)$/i)) {
            return this.specialists.find(s => s.config.name === 'Video');
        }

        if (senderId) {
            const activeSessionName = this.activeSessions.get(senderId);
            if (activeSessionName) {
                const activeSpec = this.specialists.find(s => s.config.name === activeSessionName);
                if (activeSpec) return activeSpec;
            }

            const legacyActiveSpec = this.specialists.find(s => s.hasActiveSession(senderId));
            if (legacyActiveSpec) return legacyActiveSpec;
        }

        const isQuestionPattern =
            lower.startsWith('o que') || lower.startsWith('como') ||
            lower.startsWith('qual') || lower.startsWith('quais') ||
            lower.startsWith('onde') || lower.startsWith('quando') ||
            lower.startsWith('lembra') || lower.startsWith('você lembra') ||
            lower.startsWith('pera aí') || lower.startsWith('escuta');

        if (isQuestionPattern && lower.includes('?')) {
            console.log('[Orchestrator] 🛑 Roteamento retido: Detectada pergunta explícita para a memória.');
            return undefined;
        }

        const sortedSpecialists = [...this.specialists].sort((a, b) => {
            if (a.config.name === 'Video') return -1;
            if (b.config.name === 'Video') return 1;
            if (a.config.name === 'Writer') return 1;
            if (b.config.name === 'Writer') return -1;
            return 0;
        });

        const naturalTriggerSpec = sortedSpecialists.find(s => s.matches(text));
        if (naturalTriggerSpec && senderId) {
            this.activeSessions.set(senderId, naturalTriggerSpec.config.name);
            this.ensureTaskState(senderId).activeSpecialist = naturalTriggerSpec.config.name;
            console.log(`[Orchestrator] 🔒 Sessão travada com ${naturalTriggerSpec.config.name} (Acionamento Natural)`);
        }

        return naturalTriggerSpec;
    }

    async tryProcess(
        incoming: IncomingMessage,
        llmRouter: LLMRouter,
        context?: string,
        onProgress?: (message: string) => Promise<void>,
        onSendFile?: (filePath: string, caption: string) => Promise<void>,
        recentHistory?: LLMMessage[]
    ): Promise<OutgoingMessage | null> {
        const lower = incoming.text.toLowerCase().trim();
        const exitCommands = [
            '/sair', 'sair', 'tchau', 'encerrar', 'voltar', 'cancelar',
            'tarefa finalizada', 'fim da tarefa', 'pode sair', 'finalizado', 'terminamos', '/terminar', 'tarefa concluída', 'tarefa concluida'
        ];

        if (incoming.senderId) {
            this.trackUserMessage(incoming.senderId, incoming.text);
        }

        if (incoming.senderId && exitCommands.some(cmd => lower === cmd || lower.startsWith(cmd))) {
            const state = this.ensureTaskState(incoming.senderId);
            const specToExit = state.activeSpecialist || this.activeSessions.get(incoming.senderId) || this.getLegacyActiveSpecialist(incoming.senderId)?.config.name;

            if (specToExit) {
                this.clearSpecialistSession(incoming.senderId, specToExit);
                state.activeSpecialist = undefined;
                state.lastSpecialist = specToExit;

                console.log(`[Orchestrator] 🔓 Sessão com ${specToExit} encerrada pelo usuário (Comando: ${lower}).`);
                return {
                    text: `[SISTEMA] 🔓 Tarefa finalizada. O especialista **${specToExit}** saiu da conversa.\n\nDoug (Controle Central) assumindo novamente. O que faremos agora?`
                };
            }
        }

        const transfer = incoming.senderId ? this.detectTransferIntent(incoming.text) : null;
        if (transfer && incoming.senderId) {
            const task = this.ensureTaskState(incoming.senderId);
            const previous = task.activeSpecialist || this.activeSessions.get(incoming.senderId);
            if (previous && previous !== transfer.target.config.name) {
                this.clearSpecialistSession(incoming.senderId, previous);
            }

            this.activeSessions.set(incoming.senderId, transfer.target.config.name);
            task.activeSpecialist = transfer.target.config.name;
            task.lastHandoffCommand = incoming.text;

            const handoffContext = this.buildTaskContext(incoming.senderId, transfer.target.config.name, 'handoff');
            const input = this.buildSpecialistInput(
                {
                    ...incoming,
                    text: transfer.instruction || 'Continue a tarefa em andamento com base no contexto e entregue a próxima etapa completa.',
                },
                context ? `${context}\n\n${handoffContext}` : handoffContext,
                onProgress,
                onSendFile,
                recentHistory
            );

            console.log(`[Orchestrator] 🔁 Handoff: ${previous ?? 'Doug'} → ${transfer.target.config.name}`);
            return this.executeSpecialist(transfer.target, input, llmRouter, true, false, incoming.senderId);
        }

        const specialist = this.findSpecialist(incoming.text, incoming.mediaType, incoming.senderId, incoming.mediaUrl);
        if (!specialist) return null;

        console.log(`[Orchestrator] 🎯 Roteando para: ${specialist.config.name}`);

        const task = incoming.senderId ? this.ensureTaskState(incoming.senderId) : undefined;
        if (task) {
            task.activeSpecialist = specialist.config.name;
        }

        const isNewSession = Boolean(
            incoming.senderId &&
            this.activeSessions.get(incoming.senderId) === specialist.config.name &&
            (!recentHistory || recentHistory.length === 0 || recentHistory[recentHistory.length - 1]?.name !== specialist.config.name)
        );

        const cleanText = lower.replace(/^[^\w\/]+/, '');
        const isJustTrigger = specialist.config.triggers.some(t => t.toLowerCase() === cleanText || t.toLowerCase() === lower);

        if (isJustTrigger && !incoming.mediaUrl && incoming.senderId) {
            const taskState = this.ensureTaskState(incoming.senderId);
            taskState.activeSpecialist = specialist.config.name;
            return {
                text: `[SISTEMA] 🔒 Sessão focada iniciada com o especialista **${specialist.config.name}**. 🎯\n\nNós trabalharemos juntos nesta tarefa até terminarmos. Envie as instruções de trabalho.\n*(Para encerrar a conversa e devolver para o Doug, digite "tarefa finalizada" ou "sair")*`,
                specialist: specialist.config.name
            };
        }

        const taskContext = incoming.senderId ? this.buildTaskContext(incoming.senderId, specialist.config.name, 'continuation') : '';
        const mergedContext = [context, taskContext].filter(Boolean).join('\n\n');
        const input = this.buildSpecialistInput(incoming, mergedContext || undefined, onProgress, onSendFile, recentHistory);

        return this.executeSpecialist(specialist, input, llmRouter, isNewSession, isJustTrigger, incoming.senderId);
    }

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

    private buildSpecialistInput(
        incoming: IncomingMessage,
        context: string | undefined,
        onProgress?: (message: string) => Promise<void>,
        onSendFile?: (filePath: string, caption: string) => Promise<void>,
        recentHistory?: LLMMessage[]
    ): SpecialistInput {
        const input: SpecialistInput = {
            text: incoming.text,
            senderId: incoming.senderId,
            channel: incoming.channel,
        };

        if (incoming.mediaUrl) input.mediaUrl = incoming.mediaUrl;
        if (incoming.mediaType) input.mediaType = incoming.mediaType;
        if (context) input.context = context;
        if (onProgress) input.onProgress = onProgress;
        if (onSendFile) input.onSendFile = onSendFile;
        if (this.driveService) input.driveService = this.driveService;
        if (recentHistory) input.recentHistory = recentHistory;
        return input;
    }

    private async executeSpecialist(
        specialist: Specialist,
        input: SpecialistInput,
        llmRouter: LLMRouter,
        isNewSession: boolean,
        isJustTrigger: boolean,
        senderId?: string
    ): Promise<OutgoingMessage> {
        try {
            const result = await specialist.run(input, llmRouter);
            if (senderId) {
                this.recordSpecialistResult(senderId, specialist.config.name, input.text, result.text);
            }

            let finalText = result.text;
            if (isNewSession && !isJustTrigger) {
                finalText = `_[SISTEMA] 🔒 **${specialist.config.name}** assumiu a conversa. Para encerrar a sessão depois, digite "tarefa finalizada"._\n\n${finalText}`;
            }

            const response: OutgoingMessage = {
                text: finalText,
                specialist: specialist.config.name
            };
            if (result.mediaUrl) response.mediaUrl = result.mediaUrl;
            if (result.mediaBuffer) {
                response.mediaBuffer = result.mediaBuffer;
                response.mediaMimeType = typeof result.metadata?.['mimeType'] === 'string' ? String(result.metadata['mimeType']) : 'image/png';
                response.mediaFileName = typeof result.metadata?.['fileName'] === 'string' ? String(result.metadata['fileName']) : undefined;
            }

            return response;
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[Orchestrator] ❌ Erro em ${specialist.config.name}: ${msg}`);
            return {
                text: `⚠️ Erro no specialist "${specialist.config.name}": ${msg}`,
            };
        }
    }

    private ensureTaskState(senderId: string): TaskState {
        const current = this.taskStates.get(senderId);
        if (current) return current;

        const next: TaskState = { updatedAt: new Date().toISOString() };
        this.taskStates.set(senderId, next);
        return next;
    }

    private trackUserMessage(senderId: string, text: string): void {
        const task = this.ensureTaskState(senderId);
        task.lastUserMessage = text;
        task.updatedAt = new Date().toISOString();

        if (!task.objective && text.trim().length > 6 && !text.trim().startsWith('/')) {
            task.objective = text.trim();
        }
    }

    private recordSpecialistResult(senderId: string, specialistName: string, requestText: string, responseText: string): void {
        const task = this.ensureTaskState(senderId);
        task.activeSpecialist = specialistName;
        task.lastSpecialist = specialistName;
        task.lastUserMessage = requestText;
        task.lastSpecialistOutput = this.compactText(responseText, 900);
        task.updatedAt = new Date().toISOString();

        if (!task.objective && requestText.trim() && !requestText.trim().startsWith('/')) {
            task.objective = requestText.trim();
        }
    }

    private getLegacyActiveSpecialist(senderId: string): Specialist | undefined {
        return this.specialists.find(s => s.hasActiveSession(senderId));
    }

    private clearSpecialistSession(senderId: string, specialistName?: string): void {
        this.activeSessions.delete(senderId);

        const specialist = specialistName
            ? this.specialists.find(s => s.config.name === specialistName)
            : this.getLegacyActiveSpecialist(senderId);

        specialist?.clearSession(senderId);
    }

    private detectTransferIntent(text: string): TransferIntent | null {
        const lower = text.toLowerCase();
        for (const specialist of this.specialists) {
            const aliases = SPECIALIST_ALIASES[specialist.config.name] ?? [specialist.config.name.toLowerCase()];
            const aliasMatch = aliases.find(alias => lower.includes(alias));
            if (!aliasMatch) continue;

            const explicitContinue = new RegExp(`\\b(${aliases.map(alias => this.escapeRegExp(alias)).join('|')})\\b.*\\b(continua|continue|seguir|segue)\\b`, 'i');
            const explicitRoute = new RegExp(`\\b(${HANDOFF_VERBS.join('|')})\\b.*\\b(${aliases.map(alias => this.escapeRegExp(alias)).join('|')})\\b`, 'i');

            if (!explicitContinue.test(lower) && !explicitRoute.test(lower)) {
                continue;
            }

            const instruction = this.stripTransferPhrases(text, aliases).trim();
            return {
                target: specialist,
                targetLabel: aliasMatch,
                instruction,
            };
        }

        return null;
    }

    private stripTransferPhrases(text: string, aliases: string[]): string {
        let cleaned = text;
        const escapedAliases = aliases.map(alias => this.escapeRegExp(alias)).join('|');
        const patterns = [
            new RegExp(`\\b(${HANDOFF_VERBS.join('|')})\\b\\s+(isso|essa tarefa|essa etapa|essa|isso tudo)?\\s*(pro|pra|para|com)?\\s*(${escapedAliases})\\b[:,-]*`, 'ig'),
            new RegExp(`\\b(agora\\s+)?(o|a)?\\s*(${escapedAliases})\\b\\s+(continua|continue|seguir|segue)\\b[:,-]*`, 'ig'),
            new RegExp(`\\b(${escapedAliases})\\b\\s+(continua|continue|seguir|segue)\\b[:,-]*`, 'ig'),
        ];

        for (const pattern of patterns) {
            cleaned = cleaned.replace(pattern, '');
        }

        return cleaned.replace(/\s{2,}/g, ' ').trim();
    }

    private buildTaskContext(senderId: string, targetSpecialist: string, reason: 'handoff' | 'continuation'): string {
        const task = this.taskStates.get(senderId);
        if (!task) return '';

        const lines = [
            '## Contexto de Tarefa',
            `Motivo: ${reason === 'handoff' ? 'Transferência entre agentes' : 'Continuação da tarefa atual'}`,
        ];

        if (task.objective) lines.push(`Objetivo atual: ${this.compactText(task.objective, 260)}`);
        if (task.lastSpecialist) lines.push(`Último especialista ativo: ${task.lastSpecialist}`);
        if (task.lastUserMessage) lines.push(`Último pedido do usuário: ${this.compactText(task.lastUserMessage, 260)}`);
        if (task.lastSpecialistOutput) lines.push(`Última entrega útil: ${this.compactText(task.lastSpecialistOutput, 480)}`);
        lines.push(`Especialista esperado agora: ${targetSpecialist}`);
        lines.push('Use esse contexto para continuar a tarefa sem pedir que o usuário repita tudo.');

        return lines.join('\n');
    }

    private compactText(text: string, limit: number): string {
        const compact = text.replace(/\s+/g, ' ').trim();
        if (compact.length <= limit) return compact;
        return `${compact.slice(0, limit - 1)}…`;
    }

    private escapeRegExp(text: string): string {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
