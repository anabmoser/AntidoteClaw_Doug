"use strict";
/**
 * GravityClaw — Agent Core
 *
 * Classe principal do agente que conecta todos os módulos:
 * Soul, LLM, Memory, Security, Skills, Gateway.
 *
 * Loop principal: recebe mensagem → valida segurança → busca skill →
 * monta contexto (memória + fatos) → envia ao LLM → responde.
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.Agent = void 0;
var soul_js_1 = require("./soul.js");
var security_js_1 = require("./security.js");
var router_js_1 = require("./llm/router.js");
var manager_js_1 = require("../memory/manager.js");
var registry_js_1 = require("../skills/registry.js");
var orchestrator_js_1 = require("./orchestrator.js");
var mcp_js_1 = require("./mcp.js");
var path_1 = require("path");
var Agent = /** @class */ (function () {
    function Agent(config) {
        this.soul = null;
        this.dynamicRules = [];
        this.eventHandlers = [];
        this.config = config;
        this.driveService = config.driveService;
        this.llmRouter = new router_js_1.LLMRouter('openrouter');
        this.memory = new manager_js_1.MemoryManager(config.memoryDir);
        this.skills = new registry_js_1.SkillsRegistry();
        this.orchestrator = new orchestrator_js_1.Orchestrator(config.driveService);
        this.mcp = new mcp_js_1.McpManager();
        // Carrega regras base do diretório de assets
        var assetsDir = (0, path_1.resolve)(process.cwd(), 'src', 'assets');
    }
    // ─── Inicialização ────────────────────────────────────────
    Agent.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, provider, models;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        // Carrega a personalidade
                        _a = this;
                        return [4 /*yield*/, (0, soul_js_1.loadSoul)(this.config.soulPath)];
                    case 1:
                        // Carrega a personalidade
                        _a.soul = _b.sent();
                        console.log("[Agent] Personalidade carregada: ".concat(this.soul.name));
                        // Configura OpenRouter
                        if (this.config.openRouterApiKey) {
                            provider = new router_js_1.OpenRouterProvider(this.config.openRouterApiKey);
                            this.llmRouter.addProvider(provider);
                            models = provider.listModels();
                            console.log('[Agent] 🔌 OpenRouter configurado:');
                            console.log("  Chat     \u2192 ".concat(models.chat));
                            console.log("  Resumo   \u2192 ".concat(models.summarize));
                            console.log("  An\u00E1lise  \u2192 ".concat(models.analyze));
                            console.log("  Skills   \u2192 ".concat(models.skill));
                        }
                        else {
                            console.warn('[Agent] ⚠️  OPENROUTER_API_KEY não configurada!');
                        }
                        // Inicializa memória
                        return [4 /*yield*/, this.memory.init()];
                    case 2:
                        // Inicializa memória
                        _b.sent();
                        console.log("[Agent] \u2705 ".concat(this.soul.name, " inicializado e pronto!"));
                        return [2 /*return*/];
                }
            });
        });
    };
    // ─── Getters Públicos ──────────────────────────────────────
    Agent.prototype.getSoul = function () {
        return this.soul;
    };
    Agent.prototype.getMemory = function () {
        return this.memory;
    };
    Agent.prototype.getSkills = function () {
        return this.skills;
    };
    Agent.prototype.getOrchestrator = function () {
        return this.orchestrator;
    };
    Agent.prototype.getLLMRouter = function () {
        return this.llmRouter;
    };
    Agent.prototype.getMcpManager = function () {
        return this.mcp;
    };
    // ─── Regras Dinâmicas ──────────────────────────────────────
    Agent.prototype.addDynamicRule = function (condition, behavior) {
        var rule = (0, soul_js_1.createDynamicRule)(condition, behavior);
        this.dynamicRules.push(rule);
        console.log("[Agent] Nova regra din\u00E2mica: \"".concat(condition, "\" \u2192 \"").concat(behavior, "\""));
        return rule;
    };
    Agent.prototype.removeDynamicRule = function (id) {
        var idx = this.dynamicRules.findIndex(function (r) { return r.id === id; });
        if (idx === -1)
            return false;
        this.dynamicRules.splice(idx, 1);
        return true;
    };
    Agent.prototype.getDynamicRules = function () {
        return __spreadArray([], this.dynamicRules, true);
    };
    // ─── Event System ──────────────────────────────────────────
    Agent.prototype.onEvent = function (handler) {
        this.eventHandlers.push(handler);
    };
    Agent.prototype.emitEvent = function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, handler, err_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _i = 0, _a = this.eventHandlers;
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 6];
                        handler = _a[_i];
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, handler(event)];
                    case 3:
                        _b.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        err_1 = _b.sent();
                        console.error('[Agent] Erro em event handler:', err_1);
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    // ─── Loop Principal de Processamento ───────────────────────
    /**
     * Processa uma mensagem de entrada e retorna a resposta do agente.
     * Este é o ponto central de orquestração.
     * @param sendProgress - callback opcional para enviar mensagens intermediárias ao usuário
     */
    Agent.prototype.processMessage = function (incoming, sendProgress, sendFile) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, safety, cleanText, matchedSkill, skillResult, response, specialistResult, elapsed_1, systemPrompt, recentHistory, messages, relevantMemory, contextNote, mcpToolsList, openaiTools, llmResponse, _i, _a, tc, prefix, rest, firstUnderscore, serverName, toolName, args, mcpResult, textResult, err_2, msg, elapsed, err_3, msg;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        startTime = Date.now();
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 23, , 25]);
                        safety = (0, security_js_1.enforceInputSafety)(incoming.text);
                        if (!safety.safe) {
                            console.warn("[Agent] \u26A0\uFE0F Alerta de seguran\u00E7a para mensagem de ".concat(incoming.senderId));
                            console.warn(safety.warning);
                            // Usa o texto sanitizado, mas continua processando
                        }
                        cleanText = safety.cleanText;
                        matchedSkill = this.skills.findByTrigger(cleanText);
                        if (!matchedSkill) return [3 /*break*/, 5];
                        console.log("[Agent] Skill encontrada: ".concat(matchedSkill.name));
                        return [4 /*yield*/, this.skills.execute(matchedSkill.name, {
                                command: (_b = cleanText.split(' ')[0]) !== null && _b !== void 0 ? _b : '',
                                args: cleanText.split(' ').slice(1),
                                rawText: cleanText,
                                context: {
                                    senderId: incoming.senderId,
                                    channel: incoming.channel,
                                },
                            })];
                    case 2:
                        skillResult = _c.sent();
                        if (!skillResult.text) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.memory.addEntry('user', incoming.text, incoming.channel, incoming.senderId, this.llmRouter)];
                    case 3:
                        _c.sent();
                        return [4 /*yield*/, this.memory.addEntry('assistant', skillResult.text, incoming.channel, 'agent', this.llmRouter)];
                    case 4:
                        _c.sent();
                        response = { text: skillResult.text };
                        if (skillResult.mediaUrl) {
                            response.mediaUrl = skillResult.mediaUrl;
                        }
                        return [2 /*return*/, response];
                    case 5: return [4 /*yield*/, this.orchestrator.tryProcess(__assign(__assign({}, incoming), { text: cleanText }), this.llmRouter, this.buildFullSystemPrompt(), sendProgress, sendFile)];
                    case 6:
                        specialistResult = _c.sent();
                        if (!specialistResult) return [3 /*break*/, 9];
                        return [4 /*yield*/, this.memory.addEntry('user', incoming.text, incoming.channel, incoming.senderId, this.llmRouter)];
                    case 7:
                        _c.sent();
                        return [4 /*yield*/, this.memory.addEntry('assistant', specialistResult.text, incoming.channel, 'agent', this.llmRouter)];
                    case 8:
                        _c.sent();
                        elapsed_1 = Date.now() - startTime;
                        console.log("[Agent] Specialist respondeu em ".concat(elapsed_1, "ms"));
                        return [2 /*return*/, specialistResult];
                    case 9:
                        systemPrompt = this.buildFullSystemPrompt();
                        recentHistory = this.memory.getRecentHistory(20);
                        messages = recentHistory.map(function (entry) { return ({
                            role: entry.role,
                            content: entry.content,
                        }); });
                        // Adiciona a mensagem atual
                        messages.push({ role: 'user', content: cleanText });
                        return [4 /*yield*/, this.memory.search(cleanText, 3, this.llmRouter)];
                    case 10:
                        relevantMemory = _c.sent();
                        contextNote = '';
                        if (relevantMemory.length > 0) {
                            contextNote = '\n\n[Contexto relevante da memória]:\n' +
                                relevantMemory.map(function (r) {
                                    return "- (".concat(new Date(r.entry.timestamp).toLocaleDateString('pt-BR'), "): ").concat(r.entry.content.slice(0, 150));
                                }).join('\n');
                            // Injeta no system prompt como nota
                        }
                        return [4 /*yield*/, this.mcp.listAllTools()];
                    case 11:
                        mcpToolsList = _c.sent();
                        openaiTools = mcpToolsList.flatMap(function (server) {
                            return server.tools.map(function (t) { return ({
                                type: 'function',
                                function: {
                                    name: "mcp_".concat(server.serverName, "_").concat(t.name),
                                    description: t.description,
                                    parameters: t.inputSchema,
                                }
                            }); });
                        });
                        return [4 /*yield*/, this.llmRouter.completeForFunction('chat', messages, {
                                systemPrompt: systemPrompt + contextNote,
                                tools: openaiTools.length > 0 ? openaiTools : undefined,
                            })];
                    case 12:
                        llmResponse = _c.sent();
                        if (!(llmResponse.toolCalls && llmResponse.toolCalls.length > 0)) return [3 /*break*/, 20];
                        console.log("[Agent] \uD83D\uDEE0\uFE0F LLM solicitou o uso de ".concat(llmResponse.toolCalls.length, " ferramenta(s)..."));
                        // Adiciona a resposta de assistant com as chamadas das tools
                        messages.push({
                            role: 'assistant',
                            content: llmResponse.content,
                            // @ts-ignore
                            tool_calls: llmResponse.toolCalls
                        });
                        _i = 0, _a = llmResponse.toolCalls;
                        _c.label = 13;
                    case 13:
                        if (!(_i < _a.length)) return [3 /*break*/, 18];
                        tc = _a[_i];
                        _c.label = 14;
                    case 14:
                        _c.trys.push([14, 16, , 17]);
                        prefix = 'mcp_';
                        if (!tc.function.name.startsWith(prefix))
                            return [3 /*break*/, 17];
                        rest = tc.function.name.substring(prefix.length);
                        firstUnderscore = rest.indexOf('_');
                        serverName = rest.substring(0, firstUnderscore);
                        toolName = rest.substring(firstUnderscore + 1);
                        args = JSON.parse(tc.function.arguments);
                        return [4 /*yield*/, this.mcp.callTool(serverName, toolName, args)];
                    case 15:
                        mcpResult = _c.sent();
                        textResult = mcpResult.content.map(function (c) { return c.text || JSON.stringify(c); }).join('\n');
                        messages.push({
                            role: 'tool',
                            name: tc.function.name,
                            tool_call_id: tc.id,
                            content: textResult,
                        });
                        return [3 /*break*/, 17];
                    case 16:
                        err_2 = _c.sent();
                        msg = err_2 instanceof Error ? err_2.message : String(err_2);
                        console.error("[Agent] \u274C Erro ao executar toll ".concat(tc.function.name, ":"), msg);
                        messages.push({
                            role: 'tool',
                            name: tc.function.name,
                            tool_call_id: tc.id,
                            content: "Error executing tool: ".concat(msg),
                        });
                        return [3 /*break*/, 17];
                    case 17:
                        _i++;
                        return [3 /*break*/, 13];
                    case 18: return [4 /*yield*/, this.llmRouter.completeForFunction('chat', messages, {
                            systemPrompt: systemPrompt + contextNote,
                        })];
                    case 19:
                        // 6.6. Nova rodada no LLM com os resultados
                        llmResponse = _c.sent();
                        _c.label = 20;
                    case 20: 
                    // 7. Salva no histórico
                    return [4 /*yield*/, this.memory.addEntry('user', incoming.text, incoming.channel, incoming.senderId, this.llmRouter)];
                    case 21:
                        // 7. Salva no histórico
                        _c.sent();
                        return [4 /*yield*/, this.memory.addEntry('assistant', llmResponse.content, incoming.channel, 'agent', this.llmRouter)];
                    case 22:
                        _c.sent();
                        elapsed = Date.now() - startTime;
                        console.log("[Agent] Resposta gerada em ".concat(elapsed, "ms via ").concat(llmResponse.provider, "/").concat(llmResponse.model));
                        return [2 /*return*/, { text: llmResponse.content }];
                    case 23:
                        err_3 = _c.sent();
                        msg = err_3 instanceof Error ? err_3.message : String(err_3);
                        console.error("[Agent] Erro ao processar mensagem: ".concat(msg));
                        return [4 /*yield*/, this.emitEvent({
                                type: 'error',
                                payload: { source: 'processMessage', error: err_3 },
                            })];
                    case 24:
                        _c.sent();
                        return [2 /*return*/, {
                                text: '❌ Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.',
                            }];
                    case 25: return [2 /*return*/];
                }
            });
        });
    };
    // ─── Construção do System Prompt ────────────────────────────
    Agent.prototype.buildFullSystemPrompt = function () {
        if (!this.soul) {
            return 'Você é um assistente de IA útil e eficiente.';
        }
        var prompt = (0, soul_js_1.buildSystemPrompt)(this.soul, this.dynamicRules);
        // Adiciona fatos da memória
        var facts = this.memory.getAllFacts();
        if (facts.length > 0) {
            prompt += '\n\n## Informações do Usuário (da memória)\n';
            facts.forEach(function (f) {
                prompt += "- **".concat(f.key, "**: ").concat(f.value, "\n");
            });
        }
        // Adiciona descrição das skills
        var skillsDesc = this.skills.describeForLLM();
        if (skillsDesc !== 'Nenhuma skill disponível no momento.') {
            prompt += '\n\n' + skillsDesc;
            prompt += '\nSe o usuário pedir algo que uma skill pode resolver, use-a.';
        }
        return prompt;
    };
    return Agent;
}());
exports.Agent = Agent;
