"use strict";
/**
 * GravityClaw — Writer Specialist
 *
 * Cria textos, legendas, posts e conteúdo escrito.
 * Usa Qwen 3.5 para escrita criativa.
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
exports.writerSpecialist = void 0;
var specialist_js_1 = require("../core/specialist.js");
exports.writerSpecialist = new (/** @class */ (function (_super) {
    __extends(class_1, _super);
    function class_1() {
        return _super.call(this, {
            name: 'Writer',
            description: 'Cria textos, legendas, posts, roteiros e conteúdo escrito para redes sociais e comunicação.',
            model: 'qwen/qwen3.5-27b',
            systemPrompt: "Voc\u00EA \u00E9 o Writer, um especialista em cria\u00E7\u00E3o de conte\u00FAdo para a Ana Moser.\n\n## Contexto\nAna Moser \u00E9 ex-jogadora de v\u00F4lei, presidente do IEE (Instituto Esporte e Educa\u00E7\u00E3o) e l\u00EDder do movimento Atletas pelo Brasil. Seu conte\u00FAdo \u00E9 voltado para:\n- Esporte e educa\u00E7\u00E3o\n- Pol\u00EDticas p\u00FAblicas de esporte\n- Empoderamento feminino\n- Lideran\u00E7a e gest\u00E3o esportiva\n\n## Suas Capacidades\n- Criar legendas para Instagram (tom inspirador, direto, engajador)\n- Escrever posts para LinkedIn (tom profissional, dados, insights)\n- Criar roteiros para v\u00EDdeos (curtos e objetivos)\n- Adaptar tom conforme a plataforma\n\n## Regras\n- Use linguagem inclusiva e acess\u00EDvel\n- Mantenha o tom aut\u00EAntico da Ana: forte, acolhedor, vision\u00E1rio\n- Inclua hashtags relevantes quando for para Instagram\n- Sempre pergunte se precisa de ajustes antes de finalizar\n- Formato padr\u00E3o de legenda: gancho \u2192 desenvolvimento \u2192 CTA",
            triggers: [
                'escrever', 'criar texto', 'legenda', 'post',
                'roteiro', 'caption', 'escribir', 'redação',
                'criar conteúdo', 'conteúdo para', 'copy',
                '/writer', '/escrever'
            ],
            temperature: 0.8,
            maxTokens: 3000,
        }) || this;
    }
    class_1.prototype.run = function (input, llmRouter) {
        return __awaiter(this, void 0, void 0, function () {
            var messages, options, response, folders, isCaption, targetFolder, titleMatch, title, driveDoc, err_1;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!input.onProgress) return [3 /*break*/, 2];
                        return [4 /*yield*/, input.onProgress('📝 Escrevendo...')];
                    case 1:
                        _b.sent();
                        _b.label = 2;
                    case 2:
                        messages = [
                            { role: 'system', content: this.config.systemPrompt },
                            { role: 'user', content: input.text },
                        ];
                        if (input.context) {
                            messages.push({ role: 'system', content: "Contexto Adicional:\n".concat(input.context) });
                        }
                        options = { model: this.config.model };
                        if (this.config.temperature !== undefined)
                            options.temperature = this.config.temperature;
                        if (this.config.maxTokens !== undefined)
                            options.maxTokens = this.config.maxTokens;
                        return [4 /*yield*/, llmRouter.complete(messages, options)];
                    case 3:
                        response = _b.sent();
                        if (!input.driveService) return [3 /*break*/, 10];
                        _b.label = 4;
                    case 4:
                        _b.trys.push([4, 9, , 10]);
                        folders = input.driveService.getFolders();
                        if (!folders) return [3 /*break*/, 8];
                        isCaption = input.text.toLowerCase().includes('legenda');
                        targetFolder = isCaption ? folders.outputsLegendas : folders.outputsPosts;
                        titleMatch = (_a = response.content.split('\n')[0]) === null || _a === void 0 ? void 0 : _a.replace(/[#*]/g, '').trim();
                        title = titleMatch ? "".concat(titleMatch.substring(0, 30), ".txt") : "post_".concat(Date.now(), ".txt");
                        if (!input.onProgress) return [3 /*break*/, 6];
                        return [4 /*yield*/, input.onProgress('☁️ Salvando cópia no Drive...')];
                    case 5:
                        _b.sent();
                        _b.label = 6;
                    case 6: return [4 /*yield*/, input.driveService.saveText(title, response.content, targetFolder)];
                    case 7:
                        driveDoc = _b.sent();
                        return [2 /*return*/, {
                                text: "".concat(response.content, "\n\n[\uD83D\uDCC4 Salvo no Drive: ").concat(driveDoc.webViewLink, " ]")
                            }];
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        err_1 = _b.sent();
                        console.error('[Writer] Erro ao salvar no Drive:', err_1);
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/, { text: response.content }];
                }
            });
        });
    };
    return class_1;
}(specialist_js_1.Specialist)))();
