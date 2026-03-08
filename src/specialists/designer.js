"use strict";
/**
 * GravityClaw — Designer Specialist
 *
 * Gera imagens e slides usando Leonardo.ai API.
 * Usa Gemini 3.1 Pro para formular prompts visuais.
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
exports.DesignerSpecialist = void 0;
var specialist_js_1 = require("../core/specialist.js");
var banner_js_1 = require("../templates/banner.js");
var module_1 = require("module");
var require = (0, module_1.createRequire)(import.meta.url);
var nodeHtmlToImage = require('node-html-to-image');
var LEONARDO_API = 'https://cloud.leonardo.ai/api/rest/v1';
var DesignerSpecialist = /** @class */ (function (_super) {
    __extends(DesignerSpecialist, _super);
    function DesignerSpecialist(leonardoApiKey) {
        var _this = _super.call(this, {
            name: 'Designer',
            description: 'Gera imagens visuais (Leonardo.ai) ou Banners Textuais (HTML Dinâmico).',
            model: 'google/gemini-3.1-pro-preview',
            systemPrompt: "Voc\u00EA \u00E9 o Designer, especialista em cria\u00E7\u00E3o visual para a Ana Moser.\n\n## Suas Capacidades (Dois Modos)\n1. **Modo Ilustra\u00E7\u00E3o**: Para fotos, ilustra\u00E7\u00F5es realistas, cen\u00E1rios. Usamos a API do Leonardo.ai.\n2. **Modo Banner**: Para slides com textos e frases (ex: frases de motiva\u00E7\u00E3o, autismo, comprometimento). Usamos um motor HTML para escrever a tipografia perfeitamente.\n\n## Regras\n- Se o usu\u00E1rio pedir um texto escrito na imagem, banner, post ou slide com texto: use o MODO BANNER.\n- Se pedir imagem pura, arte livre, fotografia: use o MODO ILUSTRA\u00C7\u00C3O.\n- Responda brevemente descrevendo o que vai fazer antes de chamar as fun\u00E7\u00F5es.",
            triggers: [
                'criar imagem', 'gerar imagem', 'design', 'slide',
                'imagem de', 'foto de', 'visual', 'banner',
                'ilustração', 'arte', 'thumbnail', 'post escrito', 'frase',
                '/designer', '/imagem', 'escrever na imagem'
            ],
            temperature: 0.6,
            maxTokens: 1500,
        }) || this;
        _this.pendingSessions = new Map();
        _this.leonardoApiKey = leonardoApiKey;
        return _this;
    }
    DesignerSpecialist.prototype.hasActiveSession = function (senderId) {
        return this.pendingSessions.has(senderId);
    };
    DesignerSpecialist.prototype.run = function (input, llmRouter) {
        return __awaiter(this, void 0, void 0, function () {
            var sourceId, session, text, mode_1, cleanInput, intentResult, mode;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sourceId = input.senderId;
                        // 0. Processamento de Sessão Interativa Ativa
                        if (this.pendingSessions.has(sourceId)) {
                            session = this.pendingSessions.get(sourceId);
                            text = input.text.toLowerCase().trim();
                            // Opção de cancelar o menu
                            if (text === 'cancelar' || text === 'sair' || text === 'voltar') {
                                this.pendingSessions.delete(sourceId);
                                return [2 /*return*/, { text: '❌ Menu do Designer cancelado. Pode me pedir outra coisa.' }];
                            }
                            if (session.step === 'awaiting_mode') {
                                if (text === '1' || text.includes('imagem') || text.includes('foto') || text.includes('ilustra')) {
                                    session.selectedMode = 'imagem';
                                    session.step = 'awaiting_prompt';
                                    return [2 /*return*/, { text: '🎨 **Modo Ilustração Selecionado**\nÓtimo! Vou gerar uma ilustração via AI. O que você gostaria de ver na imagem? (Me dê detalhes ou envie um prompt)' }];
                                }
                                else if (text === '2' || text.includes('banner') || text.includes('texto') || text.includes('slide')) {
                                    session.selectedMode = 'banner';
                                    session.step = 'awaiting_prompt';
                                    return [2 /*return*/, { text: '✍️ **Modo Banner Selecionado**\nPerfeito! Vou criar um slide usando as cores e a fonte oficiais. Qual é o título e o texto da mensagem?' }];
                                }
                                else {
                                    return [2 /*return*/, { text: 'Não entendi. Por favor, responda apenas com **1** (para Imagem AI) ou **2** (para Banner com Texto), ou digite "cancelar".' }];
                                }
                            }
                            if (session.step === 'awaiting_prompt') {
                                mode_1 = session.selectedMode;
                                this.pendingSessions.delete(sourceId); // Finaliza o menu interativo
                                if (mode_1 === 'banner') {
                                    return [2 /*return*/, this.runBannerMode(input, llmRouter)];
                                }
                                else {
                                    return [2 /*return*/, this.runImageMode(input, llmRouter)];
                                }
                            }
                        }
                        cleanInput = input.text.replace(/\/designer/i, '').replace(/\/imagem/i, '').trim();
                        if (cleanInput === '' || cleanInput.length < 5) {
                            this.pendingSessions.set(sourceId, { step: 'awaiting_mode' });
                            return [2 /*return*/, {
                                    text: "\uD83C\uDFA8 **Bem-vindo ao Est\u00FAdio do Designer!**\nO que voc\u00EA quer criar neste momento?\n\n1\uFE0F\u20E3 **Ilustra\u00E7\u00E3o (AI)**: Fotos realistas, concept art, abstrato.\n2\uFE0F\u20E3 **Banner (Texto)**: Slide estruturado com a tipografia oficial e frases.\n\nResponda com **1** ou **2**."
                                }];
                        }
                        return [4 /*yield*/, llmRouter.complete([{
                                    role: 'user', content: "Analise este pedido: \"".concat(input.text, "\".\nRegras estritas de classifica\u00E7\u00E3o:\n1. Se o usu\u00E1rio pedir um \"slide\", \"post\", \"banner\", \"escrever\" algo, \"frase\", ou \"texto\": responda modo_banner.\n2. Se o usu\u00E1rio pedir apenas uma imagem puramente art\u00EDstica, fotografia realista sem men\u00E7\u00E3o a texto expl\u00EDcito: responda modo_imagem.\nQual \u00E9 a inten\u00E7\u00E3o? Responda APENAS com modo_imagem ou modo_banner.")
                                }], { model: this.config.model, maxTokens: 50, temperature: 0.1 })];
                    case 1:
                        intentResult = _a.sent();
                        mode = intentResult.content.trim().toLowerCase().includes('banner') ? 'banner' : 'imagem';
                        console.log("[Designer] \uD83C\uDFA8 Modo de Gera\u00E7\u00E3o Autom\u00E1tico Escolhido via LLM: ".concat(mode));
                        if (mode === 'banner') {
                            return [2 /*return*/, this.runBannerMode(input, llmRouter)];
                        }
                        else {
                            return [2 /*return*/, this.runImageMode(input, llmRouter)];
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    DesignerSpecialist.prototype.runBannerMode = function (input, llmRouter) {
        return __awaiter(this, void 0, void 0, function () {
            var copyPrompt, copyData, copyResult, cleanJson, textLen, dynamicFontSize, titleFontSize, titleLen, getContrastYIQ, bgColor, accentColor, fontColor, imageBuffer, driveLink, folders, fileName, driveFile, err_1, err_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        copyPrompt = "\nGere a estrutura JSON para um banner/slide com a exata mensagem fornecida pelo usu\u00E1rio: \"".concat(input.text, "\".\nVoc\u00EA DEVE retornar **estritamente em formato JSON valido**, sem crases no come\u00E7o ou fim, usando a seguinte estrutura exata:\n{\n  \"title\": \"T\u00CDTULO CURTO EM MAI\u00DASCULO (OPCIONAL. Retorne SOMENTE se o usu\u00E1rio pedir explicitamente um t\u00EDtulo. Se n\u00E3o pedir t\u00EDtulo, retorne null!)\",\n  \"number\": \"N\u00DAMERO OU \u00CDCONE CURTO (OPCIONAL. Retorne SOMENTE se o usu\u00E1rio pedir explicitamente um n\u00FAmero no topo do slide. Ex: '1', '2'. Se n\u00E3o pedir, retorne null!)\",\n  \"body\": \"USE EXATAMENTE O TEXTO FORNECIDO PELO USU\u00C1RIO. N\u00E3o invente, n\u00E3o expanda e n\u00E3o adicione informa\u00E7\u00F5es extras. Se o texto for longo, mas for o que o usu\u00E1rio enviou, mantenha. Use '\\n' se precisar quebrar a linha do texto original de forma sem\u00E2ntica.\",\n  \"highlight\": \"FRASE DE DESTAQUE (OPCIONAL. Retorne SOMENTE se o usu\u00E1rio pediu explicitamente para colocar um texto num box, num bloco amarelo, ou destac\u00E1-lo separado. Se n\u00E3o houver pedido expl\u00EDcito de box, retorne null obrigatoriamente!)\",\n  \"isQuote\": true ou false (se o usu\u00E1rio estiver fornecendo claramente uma cita\u00E7\u00E3o de algu\u00E9m),\n  \"bgColor\": \"C\u00D3DIGO HEXADECIMAL da cor de fundo. Se o usu\u00E1rio N\u00C3O pedir uma cor espec\u00EDfica, use OBRIGATORIAMENTE o padr\u00E3o '#0B192C' (Azul Escuro). Se pedir, traduza para um HEX bonito e elegante.\",\n  \"accentColor\": \"C\u00D3DIGO HEXADECIMAL da cor de destaque (usada no bloco e nas aspas). Se o usu\u00E1rio N\u00C3O pedir cor de destaque, use OBRIGATORIAMENTE o padr\u00E3o '#F6C90E' (Amarelo). Se pedir, traduza para HEX.\",\n  \"fontColor\": \"C\u00D3DIGO HEXADECIMAL da cor da fonte. (OPCIONAL. Retorne SOMENTE se o usu\u00E1rio pedir explicitamente para a fonte/letra ter uma cor espec\u00EDfica. Se n\u00E3o pedir expl\u00EDcito, retorne null!)\"\n}\nMantenha fidelidade total ao pedido de texto do usu\u00E1rio. Se as cores n\u00E3o forem mencionadas, use os padr\u00F5es.\n        ");
                        return [4 /*yield*/, llmRouter.complete([{ role: 'user', content: copyPrompt }], { model: this.config.model, temperature: 0.7 })];
                    case 1:
                        copyResult = _a.sent();
                        try {
                            cleanJson = copyResult.content.trim();
                            if (cleanJson.startsWith('\`\`\`json'))
                                cleanJson = cleanJson.replace('\`\`\`json', '');
                            if (cleanJson.startsWith('\`\`\`'))
                                cleanJson = cleanJson.replace('\`\`\`', '');
                            if (cleanJson.endsWith('\`\`\`'))
                                cleanJson = cleanJson.slice(0, -3);
                            copyData = JSON.parse(cleanJson.trim());
                        }
                        catch (err) {
                            console.error('[Designer] Falha ao fazer parse do JSON do Banner:', copyResult.content);
                            return [2 /*return*/, { text: "Desculpe, tentei desenhar o banner mas meu redator engasgou. Tente reabrir o pedido de forma levemente diferente!" }];
                        }
                        if (!input.onProgress) return [3 /*break*/, 3];
                        return [4 /*yield*/, input.onProgress('🧑‍💻 Compilando layout HTML...')];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        textLen = copyData.body.length;
                        dynamicFontSize = '42px';
                        if (textLen <= 60)
                            dynamicFontSize = '75px';
                        else if (textLen <= 120)
                            dynamicFontSize = '60px';
                        else if (textLen <= 180)
                            dynamicFontSize = '48px';
                        else
                            dynamicFontSize = '38px';
                        titleFontSize = '52px';
                        if (copyData.title) {
                            titleLen = copyData.title.length;
                            if (titleLen <= 10)
                                titleFontSize = '90px'; // Very short titles can be huge
                            else if (titleLen <= 20)
                                titleFontSize = '70px';
                            else
                                titleFontSize = '52px';
                        }
                        getContrastYIQ = function (hexcolor) {
                            hexcolor = hexcolor.replace("#", "");
                            if (hexcolor.length === 3)
                                hexcolor = hexcolor.split('').map(function (c) { return c + c; }).join('');
                            var r = parseInt(hexcolor.slice(0, 2), 16);
                            var g = parseInt(hexcolor.slice(2, 4), 16);
                            var b = parseInt(hexcolor.slice(4, 6), 16);
                            var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                            return (yiq >= 128) ? '#0B192C' : '#FFFFFF'; // Dark text on light bgs, light on dark
                        };
                        bgColor = copyData.bgColor || '#0B192C';
                        accentColor = copyData.accentColor || '#F6C90E';
                        fontColor = copyData.fontColor || getContrastYIQ(bgColor);
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 15, , 16]);
                        if (!input.onProgress) return [3 /*break*/, 6];
                        return [4 /*yield*/, input.onProgress('✨ Renderizando tipografia do Banner...')];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6: return [4 /*yield*/, nodeHtmlToImage({
                            html: banner_js_1.bannerTemplate,
                            content: {
                                title: copyData.title,
                                number: copyData.number,
                                body: copyData.body,
                                highlight: copyData.highlight,
                                isQuote: copyData.isQuote,
                                fontSize: dynamicFontSize,
                                titleFontSize: titleFontSize,
                                bgColor: bgColor,
                                accentColor: accentColor,
                                fontColor: fontColor
                            },
                            type: 'png',
                            puppeteerArgs: {
                                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                                userDataDir: './.puppeteer_cache'
                            }
                        })];
                    case 7:
                        imageBuffer = _a.sent();
                        driveLink = '';
                        if (!input.driveService) return [3 /*break*/, 14];
                        _a.label = 8;
                    case 8:
                        _a.trys.push([8, 13, , 14]);
                        if (!input.onProgress) return [3 /*break*/, 10];
                        return [4 /*yield*/, input.onProgress('☁️ Salvando banner final no Drive...')];
                    case 9:
                        _a.sent();
                        _a.label = 10;
                    case 10:
                        folders = input.driveService.getFolders();
                        if (!folders) return [3 /*break*/, 12];
                        fileName = "banner_".concat(Date.now(), ".png");
                        return [4 /*yield*/, input.driveService.uploadFile(fileName, imageBuffer, 'image/png', folders.outputsImagens)];
                    case 11:
                        driveFile = _a.sent();
                        driveLink = "\n\n[\uD83D\uDDBC\uFE0F Salvo no Drive: ".concat(driveFile.webViewLink, " ]");
                        _a.label = 12;
                    case 12: return [3 /*break*/, 14];
                    case 13:
                        err_1 = _a.sent();
                        console.error('[Designer] Erro ao salvar no Drive:', err_1);
                        return [3 /*break*/, 14];
                    case 14: return [2 /*return*/, {
                            text: "\uD83C\uDFA8 **Banner Renderizado com Sucesso!**\n\nT\u00EDtulo: ".concat(copyData.title, "\n_Gerado via Motor Visual (HTML/CSS)_").concat(driveLink),
                            mediaBuffer: imageBuffer,
                            metadata: { type: 'banner_html', copy: copyData },
                        }];
                    case 15:
                        err_2 = _a.sent();
                        console.error('[Designer] Erro no render-html:', err_2);
                        return [2 /*return*/, { text: "Algo deu errado na m\u00E1quina de renderizar o banner: ".concat(err_2) }];
                    case 16: return [2 /*return*/];
                }
            });
        });
    };
    DesignerSpecialist.prototype.runImageMode = function (input, llmRouter) {
        return __awaiter(this, void 0, void 0, function () {
            var promptResult, imagePrompt, imageUrl, driveLink, imgRes, arrayBuffer, buffer, folders, fileName, driveFile, err_3, err_4, msg;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, llmRouter.complete([{ role: 'user', content: "Crie um prompt detalhado em INGL\u00CAS para gerar esta imagem (SEM TEXTOS ESCRITOS): \"".concat(input.text, "\". Responda APENAS com o prompt, sem explica\u00E7\u00F5es.") }], {
                            model: this.config.model,
                            systemPrompt: 'Você é um especialista em prompts para geração de imagens fotográficas/abstratas. Crie prompts descritivos, focando em iluminação, mood e paleta. IMPORTANTE: IA geradora de imagem não sabe escrever. Não inclua textos soltos no prompt.',
                            maxTokens: 500,
                            temperature: 0.7,
                        })];
                    case 1:
                        promptResult = _a.sent();
                        imagePrompt = promptResult.content.trim();
                        console.log("[Designer] \uD83C\uDFA8 Prompt gerado (Leonardo): ".concat(imagePrompt.slice(0, 80), "..."));
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 15, , 16]);
                        if (!input.onProgress) return [3 /*break*/, 4];
                        return [4 /*yield*/, input.onProgress('🖌️ Desenhando pixels com Leonardo.ai...')];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [4 /*yield*/, this.generateImage(imagePrompt)];
                    case 5:
                        imageUrl = _a.sent();
                        driveLink = '';
                        if (!input.driveService) return [3 /*break*/, 14];
                        _a.label = 6;
                    case 6:
                        _a.trys.push([6, 13, , 14]);
                        if (!input.onProgress) return [3 /*break*/, 8];
                        return [4 /*yield*/, input.onProgress('☁️ Salvando cópia no Drive...')];
                    case 7:
                        _a.sent();
                        _a.label = 8;
                    case 8: return [4 /*yield*/, fetch(imageUrl)];
                    case 9:
                        imgRes = _a.sent();
                        return [4 /*yield*/, imgRes.arrayBuffer()];
                    case 10:
                        arrayBuffer = _a.sent();
                        buffer = Buffer.from(arrayBuffer);
                        folders = input.driveService.getFolders();
                        if (!folders) return [3 /*break*/, 12];
                        fileName = "imagem_".concat(Date.now(), ".png");
                        return [4 /*yield*/, input.driveService.uploadFile(fileName, buffer, 'image/png', folders.outputsImagens)];
                    case 11:
                        driveFile = _a.sent();
                        driveLink = "\n\n[\uD83D\uDDBC\uFE0F Salvo no Drive: ".concat(driveFile.webViewLink, " ]");
                        _a.label = 12;
                    case 12: return [3 /*break*/, 14];
                    case 13:
                        err_3 = _a.sent();
                        console.error('[Designer] Erro ao salvar no Drive:', err_3);
                        return [3 /*break*/, 14];
                    case 14: return [2 /*return*/, {
                            text: "\uD83C\uDFA8 Ilustra\u00E7\u00E3o criada!\n\n**Prompt usado:** ".concat(imagePrompt, "\n\n_Gerada via Leonardo.ai_").concat(driveLink),
                            mediaUrl: imageUrl,
                            metadata: { prompt: imagePrompt, provider: 'leonardo.ai' },
                        }];
                    case 15:
                        err_4 = _a.sent();
                        msg = err_4 instanceof Error ? err_4.message : String(err_4);
                        console.error("[Designer] \u274C Erro Leonardo.ai: ".concat(msg));
                        return [2 /*return*/, {
                                text: "N\u00E3o consegui gerar a imagem agorinha. Erro do Provedor Visual: ".concat(msg, "\n\n**Prompt que seria usado:** ").concat(imagePrompt),
                            }];
                    case 16: return [2 /*return*/];
                }
            });
        });
    };
    DesignerSpecialist.prototype.generateImage = function (prompt) {
        return __awaiter(this, void 0, void 0, function () {
            var genRes, _a, _b, _c, genData, generationId, i, statusRes, statusData, images;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, fetch("".concat(LEONARDO_API, "/generations"), {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': "Bearer ".concat(this.leonardoApiKey),
                            },
                            body: JSON.stringify({
                                prompt: prompt,
                                modelId: '6b645e3a-d64f-4341-a6d8-7a3690fbf042', // Leonardo Phoenix
                                width: 768,
                                height: 1024,
                                num_images: 1,
                            }),
                        })];
                    case 1:
                        genRes = _d.sent();
                        if (!!genRes.ok) return [3 /*break*/, 3];
                        _a = Error.bind;
                        _c = (_b = "Leonardo API: ".concat(genRes.status, " ")).concat;
                        return [4 /*yield*/, genRes.text()];
                    case 2: throw new (_a.apply(Error, [void 0, _c.apply(_b, [_d.sent()])]))();
                    case 3: return [4 /*yield*/, genRes.json()];
                    case 4:
                        genData = _d.sent();
                        generationId = genData.sdGenerationJob.generationId;
                        i = 0;
                        _d.label = 5;
                    case 5:
                        if (!(i < 30)) return [3 /*break*/, 10];
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                    case 6:
                        _d.sent();
                        return [4 /*yield*/, fetch("".concat(LEONARDO_API, "/generations/").concat(generationId), {
                                headers: { 'Authorization': "Bearer ".concat(this.leonardoApiKey) },
                            })];
                    case 7:
                        statusRes = _d.sent();
                        if (!statusRes.ok)
                            return [3 /*break*/, 9];
                        return [4 /*yield*/, statusRes.json()];
                    case 8:
                        statusData = _d.sent();
                        if (statusData.generations_by_pk.status === 'COMPLETE') {
                            images = statusData.generations_by_pk.generated_images;
                            if (images.length > 0 && images[0]) {
                                return [2 /*return*/, images[0].url];
                            }
                        }
                        _d.label = 9;
                    case 9:
                        i++;
                        return [3 /*break*/, 5];
                    case 10: throw new Error('Timeout aguardando geração da imagem');
                }
            });
        });
    };
    return DesignerSpecialist;
}(specialist_js_1.Specialist));
exports.DesignerSpecialist = DesignerSpecialist;
