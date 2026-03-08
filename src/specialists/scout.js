"use strict";
/**
 * GravityClaw — Scout Specialist
 *
 * Pesquisa tendências, notícias e informações usando Brave Search API.
 * Usa Minimax M2.5 para análise e síntese.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.ScoutSpecialist = void 0;
var specialist_js_1 = require("../core/specialist.js");
var ScoutSpecialist = /** @class */ (function (_super) {
    __extends(ScoutSpecialist, _super);
    function ScoutSpecialist(braveApiKey) {
        var _this = _super.call(this, {
            name: 'Scout',
            description: 'Pesquisa tendências, notícias e informações relevantes na web.',
            model: 'minimax/minimax-m2.5',
            systemPrompt: "Voc\u00EA \u00E9 o Scout, um especialista em pesquisa e an\u00E1lise de tend\u00EAncias.\n\n## Suas Capacidades\n- Pesquisar not\u00EDcias e tend\u00EAncias atuais via Brave Search\n- Analisar dados e sintetizar informa\u00E7\u00F5es\n- Identificar oportunidades de conte\u00FAdo\n- Gerar relat\u00F3rios concisos\n- Para consultas sobre clima, tempo ou previs\u00E3o, utilize suas integra\u00E7\u00F5es de internet para fornecer informa\u00E7\u00F5es precisas e atualizadas.\n\n## \u00C1reas de Foco\n- Esporte brasileiro e internacional\n- Pol\u00EDticas p\u00FAblicas de esporte e educa\u00E7\u00E3o\n- Tend\u00EAncias de redes sociais\n- Tecnologia e inova\u00E7\u00E3o no esporte\n\n## Formato de Resposta\n- Apresente os resultados de forma organizada\n- Cite as fontes quando poss\u00EDvel\n- Destaque os insights mais relevantes\n- Sugira a\u00E7\u00F5es baseadas nas descobertas",
            triggers: [
                'pesquisar', 'pesquisa', 'tendências', 'analisar',
                'buscar', 'notícias', 'tendência', 'research',
                'o que está acontecendo', 'novidades sobre',
                '/scout', '/pesquisar',
                'clima', 'tempo', 'previsão', 'temperatura'
            ],
            temperature: 0.4,
            maxTokens: 3000,
        }) || this;
        _this.braveApiKey = braveApiKey;
        return _this;
    }
    ScoutSpecialist.prototype.run = function (input, llmRouter) {
        return __awaiter(this, void 0, void 0, function () {
            var queryResult, query, searchResults, err_1, msg, analysis;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, llmRouter.complete([{ role: 'user', content: "Extraia a query de pesquisa ideal (em portugu\u00EAs ou ingl\u00EAs, o que for mais relevante) para esta solicita\u00E7\u00E3o: \"".concat(input.text, "\". Responda APENAS com a query, sem explica\u00E7\u00F5es.") }], {
                            model: this.config.model,
                            maxTokens: 100,
                            temperature: 0.2,
                        })];
                    case 1:
                        queryResult = _c.sent();
                        query = queryResult.content.trim();
                        console.log("[Scout] \uD83D\uDD0D Pesquisando: \"".concat(query, "\""));
                        _c.label = 2;
                    case 2:
                        _c.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.braveSearch(query)];
                    case 3:
                        searchResults = _c.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        err_1 = _c.sent();
                        msg = err_1 instanceof Error ? err_1.message : String(err_1);
                        console.error("[Scout] \u274C Erro Brave Search: ".concat(msg));
                        searchResults = "[Pesquisa indispon\u00EDvel: ".concat(msg, "]");
                        return [3 /*break*/, 5];
                    case 5: return [4 /*yield*/, llmRouter.complete([{ role: 'user', content: "Com base na pesquisa \"".concat(input.text, "\", analise estes resultados e crie um relat\u00F3rio conciso:\n\n").concat(searchResults) }], {
                            model: this.config.model,
                            systemPrompt: this.config.systemPrompt,
                            maxTokens: (_a = this.config.maxTokens) !== null && _a !== void 0 ? _a : 3000,
                            temperature: (_b = this.config.temperature) !== null && _b !== void 0 ? _b : 0.4,
                        })];
                    case 6:
                        analysis = _c.sent();
                        return [2 /*return*/, {
                                text: analysis.content,
                                metadata: { query: query, provider: 'brave-search' },
                            }];
                }
            });
        });
    };
    ScoutSpecialist.prototype.braveSearch = function (query) {
        return __awaiter(this, void 0, void 0, function () {
            var url, res, data;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        url = "https://api.search.brave.com/res/v1/web/search?q=".concat(encodeURIComponent(query), "&count=8");
                        return [4 /*yield*/, fetch(url, {
                                headers: {
                                    'Accept': 'application/json',
                                    'Accept-Encoding': 'gzip',
                                    'X-Subscription-Token': this.braveApiKey,
                                },
                            })];
                    case 1:
                        res = _b.sent();
                        if (!res.ok) {
                            throw new Error("Brave Search API: ".concat(res.status));
                        }
                        return [4 /*yield*/, res.json()];
                    case 2:
                        data = _b.sent();
                        if (!((_a = data.web) === null || _a === void 0 ? void 0 : _a.results.length)) {
                            return [2 /*return*/, 'Nenhum resultado encontrado.'];
                        }
                        return [2 /*return*/, data.web.results
                                .map(function (r, i) { return "".concat(i + 1, ". **").concat(r.title, "**\n   ").concat(r.description, "\n   Fonte: ").concat(r.url); })
                                .join('\n\n')];
                }
            });
        });
    };
    return ScoutSpecialist;
}(specialist_js_1.Specialist));
exports.ScoutSpecialist = ScoutSpecialist;
