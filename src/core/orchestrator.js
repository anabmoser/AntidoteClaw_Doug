"use strict";
/**
 * GravityClaw — Orchestrator
 *
 * Analisa mensagens recebidas e roteia para o Specialist correto.
 * Se nenhum specialist bater, delega para o chat genérico.
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
exports.Orchestrator = void 0;
var Orchestrator = /** @class */ (function () {
    function Orchestrator(driveService) {
        this.specialists = [];
        this.driveService = driveService;
    }
    /**
     * Registra um specialist no orquestrador.
     */
    Orchestrator.prototype.register = function (specialist) {
        this.specialists.push(specialist);
        console.log("[Orchestrator] \uD83E\uDDE9 Specialist registrado: ".concat(specialist.config.name));
        console.log("    \u2514\u2500 Triggers: ".concat(specialist.config.triggers.join(', ')));
        console.log("    \u2514\u2500 Modelo: ".concat(specialist.config.model));
    };
    /**
     * Remove um specialist pelo nome.
     */
    Orchestrator.prototype.unregister = function (name) {
        var idx = this.specialists.findIndex(function (s) { return s.config.name === name; });
        if (idx >= 0) {
            this.specialists.splice(idx, 1);
            return true;
        }
        return false;
    };
    /**
     * Lista todos os specialists registrados.
     */
    Orchestrator.prototype.list = function () {
        return __spreadArray([], this.specialists, true);
    };
    /**
     * Tenta encontrar um specialist que corresponda à mensagem.
     * Verifica sessões ativas primeiro, depois por mediaType e por último triggers no texto.
     */
    Orchestrator.prototype.findSpecialist = function (text, mediaType, senderId) {
        // 1. Verifica se já existe uma sessão interativa travada neste usuário
        if (senderId) {
            var activeSpec = this.specialists.find(function (s) { return s.hasActiveSession(senderId); });
            if (activeSpec)
                return activeSpec;
        }
        // 2. Roteamento automático por tipo de mídia
        if (mediaType === 'video' || mediaType === 'audio') {
            var videoSpec = this.specialists.find(function (s) { return s.config.name === 'Video'; });
            if (videoSpec)
                return videoSpec;
        }
        // Documentos que são vídeos (enviados como arquivo no Telegram)
        if (mediaType === 'document') {
            var videoSpec = this.specialists.find(function (s) { return s.config.name === 'Video'; });
            if (videoSpec) {
                // Verifica se o texto menciona vídeo/transcrição ou se é só o arquivo
                var videoTerms = ['transcrev', 'vídeo', 'video', 'editar', 'cortar', 'legenda', 'ffmpeg'];
                var lower_1 = text.toLowerCase();
                if (videoTerms.some(function (t) { return lower_1.includes(t); }) || text.trim() === '') {
                    return videoSpec;
                }
            }
        }
        // 3. Roteamento por triggers do texto
        // Intercept: Evita rotear perguntas explícitas (que devem ser respondidas pela Memória do Agente)
        var lower = text.toLowerCase().trim();
        var isQuestionPattern = lower.startsWith('o que') ||
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
            console.log("[Orchestrator] \uD83D\uDED1 Roteamento retido: Detectada pergunta expl\u00EDcita para a mem\u00F3ria.");
            return undefined;
        }
        return this.specialists.find(function (s) { return s.matches(text); });
    };
    /**
     * Processa uma mensagem tentando delegar a um specialist.
     * Retorna null se nenhum specialist puder lidar com a mensagem
     * (delegando ao chat genérico do agent).
     */
    Orchestrator.prototype.tryProcess = function (incoming, llmRouter, context, onProgress, onSendFile) {
        return __awaiter(this, void 0, void 0, function () {
            var specialist, input, result, response, err_1, msg;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        specialist = this.findSpecialist(incoming.text, incoming.mediaType, incoming.senderId);
                        if (!specialist)
                            return [2 /*return*/, null];
                        console.log("[Orchestrator] \uD83C\uDFAF Roteando para: ".concat(specialist.config.name));
                        input = {
                            text: incoming.text,
                            senderId: incoming.senderId,
                            channel: incoming.channel,
                        };
                        if (incoming.mediaUrl) {
                            input.mediaUrl = incoming.mediaUrl;
                        }
                        if (incoming.mediaType) {
                            input.mediaType = incoming.mediaType;
                        }
                        if (context) {
                            input.context = context;
                        }
                        if (onProgress) {
                            input.onProgress = onProgress;
                        }
                        if (onSendFile) {
                            input.onSendFile = onSendFile;
                        }
                        if (this.driveService) {
                            input.driveService = this.driveService;
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, specialist.run(input, llmRouter)];
                    case 2:
                        result = _a.sent();
                        response = { text: result.text };
                        if (result.mediaUrl) {
                            response.mediaUrl = result.mediaUrl;
                        }
                        return [2 /*return*/, response];
                    case 3:
                        err_1 = _a.sent();
                        msg = err_1 instanceof Error ? err_1.message : String(err_1);
                        console.error("[Orchestrator] \u274C Erro em ".concat(specialist.config.name, ": ").concat(msg));
                        return [2 /*return*/, {
                                text: "\u26A0\uFE0F Erro no specialist \"".concat(specialist.config.name, "\": ").concat(msg),
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Gera uma descrição dos specialists para incluir no system prompt.
     */
    Orchestrator.prototype.describeForLLM = function () {
        if (this.specialists.length === 0)
            return '';
        var lines = ['\n## Specialists Disponíveis\n'];
        lines.push('Você coordena os seguintes agentes especializados:\n');
        for (var _i = 0, _a = this.specialists; _i < _a.length; _i++) {
            var s = _a[_i];
            lines.push("- **".concat(s.config.name, "**: ").concat(s.config.description, " (triggers: ").concat(s.config.triggers.join(', '), ")"));
        }
        lines.push('\nQuando o usuário pedir algo relacionado a um specialist, delegue a tarefa automaticamente.');
        return lines.join('\n');
    };
    return Orchestrator;
}());
exports.Orchestrator = Orchestrator;
