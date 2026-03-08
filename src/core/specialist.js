"use strict";
/**
 * GravityClaw — Specialist Agent Interface
 *
 * Um Specialist é um sub-agente com personalidade, modelo LLM
 * e ferramentas próprias. O Orchestrator decide qual ativar
 * com base na mensagem do usuário.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Specialist = void 0;
// ─── Base Specialist Class ────────────────────────────────────
var Specialist = /** @class */ (function () {
    function Specialist(config) {
        this.tools = [];
        this.config = config;
    }
    /**
     * Retorna true se este especialista tiver uma sessão interativa ativa com o usuário.
     * Caso true, o Orchestrator forçará o roteamento de mensagens para cá.
     */
    Specialist.prototype.hasActiveSession = function (senderId) {
        return false;
    };
    /**
     * Verifica se este specialist deve ser ativado para o texto dado.
     */
    Specialist.prototype.matches = function (text) {
        var lower = text.toLowerCase().trim();
        return this.config.triggers.some(function (trigger) {
            return lower.includes(trigger.toLowerCase());
        });
    };
    /**
     * Registra uma ferramenta disponível para este specialist.
     */
    Specialist.prototype.addTool = function (tool) {
        this.tools.push(tool);
    };
    /**
     * Lista as ferramentas disponíveis em formato para o system prompt.
     */
    Specialist.prototype.describeTools = function () {
        if (this.tools.length === 0)
            return '';
        var lines = ['\n## Ferramentas Disponíveis\n'];
        for (var _i = 0, _a = this.tools; _i < _a.length; _i++) {
            var tool = _a[_i];
            lines.push("- **".concat(tool.name, "**: ").concat(tool.description));
        }
        return lines.join('\n');
    };
    /**
     * Executa o specialist com a mensagem dada.
     * Implementações concretas podem sobrescrever para lógica customizada.
     */
    Specialist.prototype.run = function (input, llmRouter) {
        return __awaiter(this, void 0, void 0, function () {
            var messages, fullPrompt, response;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        messages = [
                            { role: 'user', content: input.text },
                        ];
                        if (input.context) {
                            messages.unshift({ role: 'system', content: input.context });
                        }
                        fullPrompt = this.config.systemPrompt + this.describeTools();
                        return [4 /*yield*/, llmRouter.complete(messages, {
                                model: this.config.model,
                                systemPrompt: fullPrompt,
                                maxTokens: (_a = this.config.maxTokens) !== null && _a !== void 0 ? _a : 2048,
                                temperature: (_b = this.config.temperature) !== null && _b !== void 0 ? _b : 0.7,
                            })];
                    case 1:
                        response = _c.sent();
                        console.log("[".concat(this.config.name, "] \u2705 Resposta via ").concat(response.model));
                        return [2 /*return*/, { text: response.content }];
                }
            });
        });
    };
    return Specialist;
}());
exports.Specialist = Specialist;
