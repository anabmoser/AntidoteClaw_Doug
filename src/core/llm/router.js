"use strict";
/**
 * GravityClaw — LLM Router via OpenRouter
 *
 * Usa OpenRouter como gateway único para acessar múltiplos LLMs.
 * Cada função do agente usa um modelo diferente otimizado:
 *   - Chat: Claude Sonnet (qualidade de conversa)
 *   - Summarize: Gemini Flash (rápido e barato para resumos)
 *   - Analyze: GPT-4o-mini (bom custo-benefício para análise)
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
exports.LLMRouter = exports.OpenRouterProvider = void 0;
/** Modelos padrão otimizados por função */
var DEFAULT_MODEL_MAP = {
    chat: {
        model: 'google/gemini-3.1-pro-preview',
        maxTokens: 4096,
        temperature: 0.7,
    },
    summarize: {
        model: 'qwen/qwen3.5-27b',
        maxTokens: 2048,
        temperature: 0.5,
    },
    analyze: {
        model: 'anthropic/claude-sonnet-4.6',
        maxTokens: 4096,
        temperature: 0.4,
    },
    skill: {
        model: 'google/gemini-3.1-pro-preview',
        maxTokens: 2048,
        temperature: 0.3,
    },
};
// ─── OpenRouter Provider ───────────────────────────────────────
var OpenRouterProvider = /** @class */ (function () {
    function OpenRouterProvider(apiKey, modelOverrides, appName) {
        if (appName === void 0) { appName = 'GravityClaw'; }
        this.name = 'openrouter';
        this.apiKey = apiKey;
        this.appName = appName;
        // Mescla configurações padrão com overrides
        this.modelMap = __assign({}, DEFAULT_MODEL_MAP);
        if (modelOverrides) {
            for (var _i = 0, _a = Object.entries(modelOverrides); _i < _a.length; _i++) {
                var _b = _a[_i], fn = _b[0], override = _b[1];
                var key = fn;
                if (this.modelMap[key] && override) {
                    this.modelMap[key] = __assign(__assign({}, this.modelMap[key]), override);
                }
            }
        }
    }
    OpenRouterProvider.prototype.isAvailable = function () {
        return this.apiKey.length > 0;
    };
    /**
     * Retorna a configuração do modelo para uma função específica.
     */
    OpenRouterProvider.prototype.getModelForFunction = function (fn) {
        return this.modelMap[fn];
    };
    /**
     * Lista os modelos configurados por função.
     */
    OpenRouterProvider.prototype.listModels = function () {
        var result = {};
        for (var _i = 0, _a = Object.entries(this.modelMap); _i < _a.length; _i++) {
            var _b = _a[_i], fn = _b[0], config = _b[1];
            result[fn] = config.model;
        }
        return result;
    };
    /**
     * Completação via OpenRouter. Compatible com a OpenAI API.
     * Use options.model para especificar o modelo, ou deixe usar o padrão de 'chat'.
     */
    OpenRouterProvider.prototype.complete = function (messages, options) {
        return __awaiter(this, void 0, void 0, function () {
            var agentFn, fnConfig, model, maxTokens, temperature, allMessages, _i, messages_1, m, body, res, errText, data, message, content, mappedToolCalls;
            var _a, _b, _c, _d, _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        agentFn = (_a = options === null || options === void 0 ? void 0 : options.metadata) === null || _a === void 0 ? void 0 : _a['agentFunction'];
                        fnConfig = agentFn ? this.modelMap[agentFn] : this.modelMap.chat;
                        model = (_b = options === null || options === void 0 ? void 0 : options.model) !== null && _b !== void 0 ? _b : fnConfig.model;
                        maxTokens = (_c = options === null || options === void 0 ? void 0 : options.maxTokens) !== null && _c !== void 0 ? _c : fnConfig.maxTokens;
                        temperature = (_d = options === null || options === void 0 ? void 0 : options.temperature) !== null && _d !== void 0 ? _d : fnConfig.temperature;
                        allMessages = [];
                        if (options === null || options === void 0 ? void 0 : options.systemPrompt) {
                            allMessages.push({ role: 'system', content: options.systemPrompt });
                        }
                        // Adiciona as mensagens da conversa (sem system, que já foi separado)
                        for (_i = 0, messages_1 = messages; _i < messages_1.length; _i++) {
                            m = messages_1[_i];
                            if (m.role !== 'system') {
                                allMessages.push(m);
                            }
                        }
                        body = __assign(__assign({ model: model, messages: allMessages.map(function (m) {
                                var mapMsg = { role: m.role, content: m.content };
                                if (m.name)
                                    mapMsg.name = m.name;
                                if (m.tool_call_id)
                                    mapMsg.tool_call_id = m.tool_call_id;
                                return mapMsg;
                            }), max_tokens: maxTokens, temperature: temperature }, ((options === null || options === void 0 ? void 0 : options.stopSequences) ? { stop: options.stopSequences } : {})), ((options === null || options === void 0 ? void 0 : options.tools) && options.tools.length > 0 ? { tools: options.tools } : {}));
                        return [4 /*yield*/, fetch('https://openrouter.ai/api/v1/chat/completions', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': "Bearer ".concat(this.apiKey),
                                    'HTTP-Referer': 'https://gravityclaw.app',
                                    'X-Title': this.appName,
                                },
                                body: JSON.stringify(body),
                            })];
                    case 1:
                        res = _g.sent();
                        if (!!res.ok) return [3 /*break*/, 3];
                        return [4 /*yield*/, res.text()];
                    case 2:
                        errText = _g.sent();
                        throw new Error("OpenRouter API error ".concat(res.status, ": ").concat(errText));
                    case 3: return [4 /*yield*/, res.json()];
                    case 4:
                        data = _g.sent();
                        message = (_e = data.choices[0]) === null || _e === void 0 ? void 0 : _e.message;
                        content = (_f = message === null || message === void 0 ? void 0 : message.content) !== null && _f !== void 0 ? _f : '';
                        if ((message === null || message === void 0 ? void 0 : message.tool_calls) && message.tool_calls.length > 0) {
                            mappedToolCalls = message.tool_calls.map(function (tc) { return ({
                                id: tc.id,
                                type: tc.type,
                                function: {
                                    name: tc.function.name,
                                    arguments: tc.function.arguments,
                                }
                            }); });
                        }
                        return [2 /*return*/, {
                                content: content,
                                model: data.model,
                                provider: 'openrouter',
                                toolCalls: mappedToolCalls,
                                usage: data.usage ? {
                                    inputTokens: data.usage.prompt_tokens,
                                    outputTokens: data.usage.completion_tokens,
                                } : undefined,
                            }];
                }
            });
        });
    };
    /**
     * Gera os embeddings de um texto via OpenRouter.
     */
    OpenRouterProvider.prototype.embed = function (text) {
        return __awaiter(this, void 0, void 0, function () {
            var res, errText, data;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, fetch('https://openrouter.ai/api/v1/embeddings', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': "Bearer ".concat(this.apiKey),
                                'HTTP-Referer': 'https://gravityclaw.app',
                                'X-Title': this.appName,
                            },
                            body: JSON.stringify({
                                model: 'nomic-ai/nomic-embed-text-v1.5',
                                input: text
                            })
                        })];
                    case 1:
                        res = _c.sent();
                        if (!!res.ok) return [3 /*break*/, 3];
                        return [4 /*yield*/, res.text()];
                    case 2:
                        errText = _c.sent();
                        throw new Error("OpenRouter Embeddings API error ".concat(res.status, ": ").concat(errText));
                    case 3: return [4 /*yield*/, res.json()];
                    case 4:
                        data = _c.sent();
                        return [2 /*return*/, (_b = (_a = data.data[0]) === null || _a === void 0 ? void 0 : _a.embedding) !== null && _b !== void 0 ? _b : []];
                }
            });
        });
    };
    return OpenRouterProvider;
}());
exports.OpenRouterProvider = OpenRouterProvider;
// ─── LLM Router (compatível com failover) ──────────────────────
var LLMRouter = /** @class */ (function () {
    function LLMRouter(defaultProvider) {
        if (defaultProvider === void 0) { defaultProvider = 'openrouter'; }
        this.providers = [];
        this.defaultProvider = defaultProvider;
    }
    LLMRouter.prototype.addProvider = function (provider) {
        this.providers.push(provider);
    };
    LLMRouter.prototype.getAvailableProviders = function () {
        return this.providers.filter(function (p) { return p.isAvailable(); });
    };
    /**
     * Retorna o provedor OpenRouter se disponível.
     */
    LLMRouter.prototype.getOpenRouter = function () {
        return this.providers.find(function (p) { return p instanceof OpenRouterProvider; });
    };
    /**
     * Completação para uma função específica do agente.
     * Usa o modelo correto de acordo com a função.
     */
    LLMRouter.prototype.completeForFunction = function (fn, messages, options) {
        return __awaiter(this, void 0, void 0, function () {
            var openRouter, fnConfig;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                openRouter = this.getOpenRouter();
                if (openRouter) {
                    fnConfig = openRouter.getModelForFunction(fn);
                    return [2 /*return*/, this.complete(messages, __assign(__assign({}, options), { model: (_a = options === null || options === void 0 ? void 0 : options.model) !== null && _a !== void 0 ? _a : fnConfig.model, maxTokens: (_b = options === null || options === void 0 ? void 0 : options.maxTokens) !== null && _b !== void 0 ? _b : fnConfig.maxTokens, temperature: (_c = options === null || options === void 0 ? void 0 : options.temperature) !== null && _c !== void 0 ? _c : fnConfig.temperature }))];
                }
                // Fallback para o método genérico
                return [2 /*return*/, this.complete(messages, options)];
            });
        });
    };
    /**
     * Completação com failover automático.
     */
    LLMRouter.prototype.complete = function (messages, options) {
        return __awaiter(this, void 0, void 0, function () {
            var available, sorted, errors, _i, sorted_1, provider, result, err_1, msg;
            var _this = this;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        available = this.getAvailableProviders();
                        if (available.length === 0) {
                            throw new Error('Nenhum provedor de LLM disponível. Configure a OPENROUTER_API_KEY.');
                        }
                        sorted = __spreadArray(__spreadArray([], available.filter(function (p) { return p.name === _this.defaultProvider; }), true), available.filter(function (p) { return p.name !== _this.defaultProvider; }), true);
                        errors = [];
                        _i = 0, sorted_1 = sorted;
                        _b.label = 1;
                    case 1:
                        if (!(_i < sorted_1.length)) return [3 /*break*/, 6];
                        provider = sorted_1[_i];
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        console.log("[LLM] Usando: ".concat(provider.name, " \u2192 ").concat((_a = options === null || options === void 0 ? void 0 : options.model) !== null && _a !== void 0 ? _a : 'padrão'));
                        return [4 /*yield*/, provider.complete(messages, options)];
                    case 3:
                        result = _b.sent();
                        console.log("[LLM] \u2705 ".concat(result.model).concat(result.usage ? " (".concat(result.usage.inputTokens, "+").concat(result.usage.outputTokens, " tokens)") : ''));
                        return [2 /*return*/, result];
                    case 4:
                        err_1 = _b.sent();
                        msg = err_1 instanceof Error ? err_1.message : String(err_1);
                        console.warn("[LLM] \u274C Falha em ".concat(provider.name, ": ").concat(msg));
                        errors.push("".concat(provider.name, ": ").concat(msg));
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: throw new Error("Todos os provedores falharam:\n".concat(errors.map(function (e, i) { return "  ".concat(i + 1, ". ").concat(e); }).join('\n')));
                }
            });
        });
    };
    /**
     * Geração de embeddings com failover.
     */
    LLMRouter.prototype.embed = function (text) {
        return __awaiter(this, void 0, void 0, function () {
            var available, sorted, errors, _i, sorted_2, provider, result, err_2, msg;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        available = this.getAvailableProviders();
                        if (available.length === 0) {
                            throw new Error('Nenhum provedor de LLM disponível.');
                        }
                        sorted = __spreadArray(__spreadArray([], available.filter(function (p) { return p.name === _this.defaultProvider; }), true), available.filter(function (p) { return p.name !== _this.defaultProvider; }), true);
                        errors = [];
                        _i = 0, sorted_2 = sorted;
                        _a.label = 1;
                    case 1:
                        if (!(_i < sorted_2.length)) return [3 /*break*/, 7];
                        provider = sorted_2[_i];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 5, , 6]);
                        if (!provider.embed) return [3 /*break*/, 4];
                        console.log("[LLM] Gerando embedding com: ".concat(provider.name));
                        return [4 /*yield*/, provider.embed(text)];
                    case 3:
                        result = _a.sent();
                        return [2 /*return*/, result];
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        err_2 = _a.sent();
                        msg = err_2 instanceof Error ? err_2.message : String(err_2);
                        console.warn("[LLM] \u274C Falha no embedding via ".concat(provider.name, ": ").concat(msg));
                        errors.push("".concat(provider.name, ": ").concat(msg));
                        return [3 /*break*/, 6];
                    case 6:
                        _i++;
                        return [3 /*break*/, 1];
                    case 7: throw new Error("Falha na gera\u00E7\u00E3o de embeddings:\n".concat(errors.map(function (e, i) { return "  ".concat(i + 1, ". ").concat(e); }).join('\n')));
                }
            });
        });
    };
    return LLMRouter;
}());
exports.LLMRouter = LLMRouter;
