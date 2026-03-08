/**
 * GravityClaw — Cron Scheduler & Heartbeat System
 *
 * Agendador de tarefas baseado em expressões cron simplificadas.
 * Inclui sistema de heartbeat que acorda o agente periodicamente.
 */

import type { ScheduledTask } from '../core/types.js';
import { v4 as uuid } from 'uuid';

interface CronField {
    type: 'any' | 'value' | 'step' | 'range';
    value?: number;
    step?: number;
    min?: number;
    max?: number;
}

/**
 * Parseia um campo de expressão cron simplificada.
 * Suporta: * (any), N (valor), /N (a cada N), N-M (range)
 */
function parseCronField(field: string): CronField {
    if (field === '*') return { type: 'any' };

    if (field.startsWith('*/')) {
        const step = parseInt(field.slice(2), 10);
        return { type: 'step', step };
    }

    if (field.includes('-')) {
        const [minStr, maxStr] = field.split('-');
        return {
            type: 'range',
            min: parseInt(minStr ?? '0', 10),
            max: parseInt(maxStr ?? '59', 10),
        };
    }

    return { type: 'value', value: parseInt(field, 10) };
}

/**
 * Verifica se um valor corresponde a um campo cron.
 */
function matchesCronField(field: CronField, value: number): boolean {
    switch (field.type) {
        case 'any': return true;
        case 'value': return value === field.value;
        case 'step': return field.step !== undefined && field.step > 0 && value % field.step === 0;
        case 'range': return value >= (field.min ?? 0) && value <= (field.max ?? 59);
        default: return false;
    }
}

/**
 * Verifica se uma expressão cron bate com o horário dado.
 * Formato: minuto hora diaMes mês diaSemana
 * Exemplo: "0 9 * * 1" = toda segunda às 9h
 */
function matchesCron(expression: string, date: Date): boolean {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) return false;

    const fields = parts.map(p => parseCronField(p!));
    const values = [
        date.getMinutes(),
        date.getHours(),
        date.getDate(),
        date.getMonth() + 1,
        date.getDay(),
    ];

    return fields.every((field, i) => matchesCronField(field, values[i]!));
}

export class Scheduler {
    private tasks = new Map<string, ScheduledTask>();
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private checkIntervalMs = 60_000; // Verifica a cada 1 minuto

    // ─── Gerenciamento de Tarefas ──────────────────────────────

    /**
     * Adiciona uma tarefa agendada.
     * @param cronExpression formato: "minuto hora diaMes mês diaSemana"
     * @param taskName Nome descritivo
     * @param handler Função a executar
     */
    addTask(cronExpression: string, taskName: string, handler: () => Promise<void>): ScheduledTask {
        const task: ScheduledTask = {
            id: uuid().slice(0, 8),
            cronExpression,
            taskName,
            handler,
            enabled: true,
        };
        this.tasks.set(task.id, task);
        console.log(`[Scheduler] ⏰ Tarefa adicionada: "${taskName}" (${cronExpression})`);
        return task;
    }

    /**
     * Remove uma tarefa pelo ID.
     */
    removeTask(id: string): boolean {
        const removed = this.tasks.delete(id);
        if (removed) console.log(`[Scheduler] Tarefa removida: ${id}`);
        return removed;
    }

    /**
     * Habilita ou desabilita uma tarefa.
     */
    toggleTask(id: string, enabled: boolean): boolean {
        const task = this.tasks.get(id);
        if (!task) return false;
        task.enabled = enabled;
        console.log(`[Scheduler] Tarefa ${id} ${enabled ? 'habilitada' : 'desabilitada'}`);
        return true;
    }

    /**
     * Lista todas as tarefas registradas.
     */
    listTasks(): ScheduledTask[] {
        return [...this.tasks.values()];
    }

    // ─── Lifecycle ─────────────────────────────────────────────

    start(): void {
        if (this.intervalId) return;

        console.log('[Scheduler] ▶️ Iniciando scheduler...');
        this.intervalId = setInterval(() => {
            this.tick();
        }, this.checkIntervalMs);

        // Executa o primeiro tick imediatamente
        this.tick();
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('[Scheduler] ⏹️ Scheduler parado.');
        }
    }

    // ─── Tick (verificação periódica) ──────────────────────────

    private tick(): void {
        const now = new Date();

        for (const task of this.tasks.values()) {
            if (!task.enabled) continue;

            if (matchesCron(task.cronExpression, now)) {
                console.log(`[Scheduler] ⚡ Executando: "${task.taskName}"`);
                task.lastRun = now;

                task.handler().catch(err => {
                    const msg = err instanceof Error ? err.message : String(err);
                    console.error(`[Scheduler] Erro em "${task.taskName}": ${msg}`);
                });
            }
        }
    }
}

// ─── Heartbeat System ────────────────────────────────────────

export class Heartbeat {
    private scheduler: Scheduler;
    private handler: () => Promise<void>;
    private intervalMinutes: number;
    private taskId: string | null = null;

    constructor(scheduler: Scheduler, handler: () => Promise<void>, intervalMinutes = 30) {
        this.scheduler = scheduler;
        this.handler = handler;
        this.intervalMinutes = intervalMinutes;
    }

    start(): void {
        const cron = `*/${this.intervalMinutes} * * * *`;
        const task = this.scheduler.addTask(cron, 'Heartbeat', this.handler);
        this.taskId = task.id;
        console.log(`[Heartbeat] 💓 Ativo a cada ${this.intervalMinutes} minutos`);
    }

    stop(): void {
        if (this.taskId) {
            this.scheduler.removeTask(this.taskId);
            this.taskId = null;
        }
    }
}
