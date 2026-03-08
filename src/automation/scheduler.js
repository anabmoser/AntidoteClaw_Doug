"use strict";
/**
 * GravityClaw — Cron Scheduler & Heartbeat System
 *
 * Agendador de tarefas baseado em expressões cron simplificadas.
 * Inclui sistema de heartbeat que acorda o agente periodicamente.
 */
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Heartbeat = exports.Scheduler = void 0;
var uuid_1 = require("uuid");
/**
 * Parseia um campo de expressão cron simplificada.
 * Suporta: * (any), N (valor), /N (a cada N), N-M (range)
 */
function parseCronField(field) {
    if (field === '*')
        return { type: 'any' };
    if (field.startsWith('*/')) {
        var step = parseInt(field.slice(2), 10);
        return { type: 'step', step: step };
    }
    if (field.includes('-')) {
        var _a = field.split('-'), minStr = _a[0], maxStr = _a[1];
        return {
            type: 'range',
            min: parseInt(minStr !== null && minStr !== void 0 ? minStr : '0', 10),
            max: parseInt(maxStr !== null && maxStr !== void 0 ? maxStr : '59', 10),
        };
    }
    return { type: 'value', value: parseInt(field, 10) };
}
/**
 * Verifica se um valor corresponde a um campo cron.
 */
function matchesCronField(field, value) {
    var _a, _b;
    switch (field.type) {
        case 'any': return true;
        case 'value': return value === field.value;
        case 'step': return field.step !== undefined && field.step > 0 && value % field.step === 0;
        case 'range': return value >= ((_a = field.min) !== null && _a !== void 0 ? _a : 0) && value <= ((_b = field.max) !== null && _b !== void 0 ? _b : 59);
        default: return false;
    }
}
/**
 * Verifica se uma expressão cron bate com o horário dado.
 * Formato: minuto hora diaMes mês diaSemana
 * Exemplo: "0 9 * * 1" = toda segunda às 9h
 */
function matchesCron(expression, date) {
    var parts = expression.trim().split(/\s+/);
    if (parts.length !== 5)
        return false;
    var fields = parts.map(function (p) { return parseCronField(p); });
    var values = [
        date.getMinutes(),
        date.getHours(),
        date.getDate(),
        date.getMonth() + 1,
        date.getDay(),
    ];
    return fields.every(function (field, i) { return matchesCronField(field, values[i]); });
}
var Scheduler = /** @class */ (function () {
    function Scheduler() {
        this.tasks = new Map();
        this.intervalId = null;
        this.checkIntervalMs = 60000; // Verifica a cada 1 minuto
    }
    // ─── Gerenciamento de Tarefas ──────────────────────────────
    /**
     * Adiciona uma tarefa agendada.
     * @param cronExpression formato: "minuto hora diaMes mês diaSemana"
     * @param taskName Nome descritivo
     * @param handler Função a executar
     */
    Scheduler.prototype.addTask = function (cronExpression, taskName, handler) {
        var task = {
            id: (0, uuid_1.v4)().slice(0, 8),
            cronExpression: cronExpression,
            taskName: taskName,
            handler: handler,
            enabled: true,
        };
        this.tasks.set(task.id, task);
        console.log("[Scheduler] \u23F0 Tarefa adicionada: \"".concat(taskName, "\" (").concat(cronExpression, ")"));
        return task;
    };
    /**
     * Remove uma tarefa pelo ID.
     */
    Scheduler.prototype.removeTask = function (id) {
        var removed = this.tasks.delete(id);
        if (removed)
            console.log("[Scheduler] Tarefa removida: ".concat(id));
        return removed;
    };
    /**
     * Habilita ou desabilita uma tarefa.
     */
    Scheduler.prototype.toggleTask = function (id, enabled) {
        var task = this.tasks.get(id);
        if (!task)
            return false;
        task.enabled = enabled;
        console.log("[Scheduler] Tarefa ".concat(id, " ").concat(enabled ? 'habilitada' : 'desabilitada'));
        return true;
    };
    /**
     * Lista todas as tarefas registradas.
     */
    Scheduler.prototype.listTasks = function () {
        return __spreadArray([], this.tasks.values(), true);
    };
    // ─── Lifecycle ─────────────────────────────────────────────
    Scheduler.prototype.start = function () {
        var _this = this;
        if (this.intervalId)
            return;
        console.log('[Scheduler] ▶️ Iniciando scheduler...');
        this.intervalId = setInterval(function () {
            _this.tick();
        }, this.checkIntervalMs);
        // Executa o primeiro tick imediatamente
        this.tick();
    };
    Scheduler.prototype.stop = function () {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('[Scheduler] ⏹️ Scheduler parado.');
        }
    };
    // ─── Tick (verificação periódica) ──────────────────────────
    Scheduler.prototype.tick = function () {
        var now = new Date();
        var _loop_1 = function (task) {
            if (!task.enabled)
                return "continue";
            if (matchesCron(task.cronExpression, now)) {
                console.log("[Scheduler] \u26A1 Executando: \"".concat(task.taskName, "\""));
                task.lastRun = now;
                task.handler().catch(function (err) {
                    var msg = err instanceof Error ? err.message : String(err);
                    console.error("[Scheduler] Erro em \"".concat(task.taskName, "\": ").concat(msg));
                });
            }
        };
        for (var _i = 0, _a = this.tasks.values(); _i < _a.length; _i++) {
            var task = _a[_i];
            _loop_1(task);
        }
    };
    return Scheduler;
}());
exports.Scheduler = Scheduler;
// ─── Heartbeat System ────────────────────────────────────────
var Heartbeat = /** @class */ (function () {
    function Heartbeat(scheduler, handler, intervalMinutes) {
        if (intervalMinutes === void 0) { intervalMinutes = 30; }
        this.taskId = null;
        this.scheduler = scheduler;
        this.handler = handler;
        this.intervalMinutes = intervalMinutes;
    }
    Heartbeat.prototype.start = function () {
        var cron = "*/".concat(this.intervalMinutes, " * * * *");
        var task = this.scheduler.addTask(cron, 'Heartbeat', this.handler);
        this.taskId = task.id;
        console.log("[Heartbeat] \uD83D\uDC93 Ativo a cada ".concat(this.intervalMinutes, " minutos"));
    };
    Heartbeat.prototype.stop = function () {
        if (this.taskId) {
            this.scheduler.removeTask(this.taskId);
            this.taskId = null;
        }
    };
    return Heartbeat;
}());
exports.Heartbeat = Heartbeat;
