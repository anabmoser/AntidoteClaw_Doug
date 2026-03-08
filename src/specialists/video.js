"use strict";
/**
 * GravityClaw — Video Specialist
 *
 * Pipeline autônomo COMPLETO de vídeo:
 * 1. Recebe vídeo/áudio do Telegram
 * 2. Baixa o arquivo e faz upload no AssemblyAI
 * 3. Transcreve automaticamente
 * 4. Analisa, faz decupagem e define cortes com LLM
 * 5. Executa FFmpeg para gerar os clipes editados
 * 6. Salva relatório e vídeos no Google Drive
 * 7. Envia atualizações de progresso ao usuário via Telegram
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
exports.VideoSpecialist = void 0;
var specialist_js_1 = require("../core/specialist.js");
var child_process_1 = require("child_process");
var fs_1 = require("fs");
var path_1 = require("path");
// Importa ffmpeg-static (binário portátil com todas as libs, incluindo freetype)
var ffmpeg_static_1 = require("ffmpeg-static");
var VideoSpecialist = /** @class */ (function (_super) {
    __extends(VideoSpecialist, _super);
    function VideoSpecialist(assemblyaiKey, drive) {
        var _this = _super.call(this, {
            name: 'Video',
            description: 'Processa vídeos de forma autônoma: transcreve, faz decupagem, executa cortes e salva no Drive.',
            model: 'google/gemini-3.1-pro-preview',
            systemPrompt: "Voc\u00EA \u00E9 o Video Agent do Doug, especialista em produ\u00E7\u00E3o de v\u00EDdeo para Ana Moser.\n\n## Seu Comportamento\nVoc\u00EA \u00E9 AUT\u00D4NOMO. Quando recebe um v\u00EDdeo:\n1. Transcreve automaticamente\n2. Analisa o conte\u00FAdo e faz a decupagem\n3. Executa os cortes com FFmpeg\n4. Salva tudo no Google Drive\n5. Entrega o resultado PRONTO\n\nNUNCA pe\u00E7a ao usu\u00E1rio para fazer algo que voc\u00EA pode fazer sozinho.\nNUNCA diga \"n\u00E3o tenho acesso\" \u2014 voc\u00EA TEM as ferramentas.\n\n## Contexto\nAna Moser atua com IEE e Atletas pelo Brasil.\nPriorize trechos sobre: esporte, educa\u00E7\u00E3o, lideran\u00E7a, empoderamento.",
            triggers: [
                'editar vídeo', 'cortar vídeo', 'transcrever', 'transcreva',
                'transcrição', 'transcri', 'legendar', 'legenda de vídeo',
                'vídeo', 'video', 'ffmpeg', 'edição de vídeo',
                'corte', 'cortes', 'decupagem', 'decupar',
                '/video', '/transcrever'
            ],
            temperature: 0.3,
            maxTokens: 4000,
        }) || this;
        // Estado em memória para vídeos aguardando revisão do usuário
        // Chave: string (ID do usuário ou chat para isolar sessões) - usando sourceId
        _this.pendingVideos = new Map();
        _this.assemblyaiKey = assemblyaiKey;
        _this.drive = drive !== null && drive !== void 0 ? drive : null;
        return _this;
    }
    VideoSpecialist.prototype.run = function (input, llmRouter) {
        return __awaiter(this, void 0, void 0, function () {
            var progress, sourceId, pending, analysisResponse, analysisText, cuts, err_1, msg, fileBuffer, sizeMB, tempDir, inputPath, uploadUrl, transcript, userRequest, analysisResponse, analysisText, cuts, formatCutsForReview, cleanAnalysis, reply, err_2, msg;
            var _a, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        progress = input.onProgress;
                        sourceId = input.senderId;
                        if (!(!input.mediaUrl && input.text && this.pendingVideos.has(sourceId))) return [3 /*break*/, 8];
                        pending = this.pendingVideos.get(sourceId);
                        console.log("[Video] \uD83D\uDD04 Recebido feedback interativo para corte de v\u00EDdeo.");
                        if (!progress) return [3 /*break*/, 2];
                        return [4 /*yield*/, progress('🎬 Analisando seu feedback e gerando novos cortes...')];
                    case 1:
                        _f.sent();
                        _f.label = 2;
                    case 2:
                        _f.trys.push([2, 7, , 8]);
                        return [4 /*yield*/, llmRouter.complete([{
                                    role: 'user',
                                    content: "O usu\u00E1rio enviou um feedback para alterar a edi\u00E7\u00E3o de um v\u00EDdeo.\nTranscri\u00E7\u00E3o original:\n".concat(pending.transcript, "\n\nCortes anteriores (rascunho):\n").concat(JSON.stringify(pending.initialCuts, null, 2), "\n\nFeedback do usu\u00E1rio: \"").concat(input.text, "\"\n\nINSTRU\u00C7\u00D5ES IMPORTANTES:\n1. Ajuste os cortes com base no feedback do usu\u00E1rio. Se ele pedir para remover algo, ajuste o start/end.\n2. Ao FINAL da sua resposta, inclua um bloco JSON com os novos cortes.\n3. Para cada corte, inclua um campo \"header\" com o t\u00EDtulo.\n4. Para cada corte, inclua \"subtitles\" com timestamps relativos ao in\u00EDcio do corte.\n\nFormato:\n```cuts\n[ { \"name\": \"corte1\", \"start\": \"00:00:00\", \"end\": \"00:00:10\", \"description\": \"...\", \"header\": \"...\", \"subtitles\": [...] } ]\n```\n")
                                }], { model: this.config.model, systemPrompt: this.config.systemPrompt, maxTokens: (_a = this.config.maxTokens) !== null && _a !== void 0 ? _a : 4000, temperature: 0.3 })];
                    case 3:
                        analysisResponse = _f.sent();
                        analysisText = analysisResponse.content;
                        cuts = this.parseCuts(analysisText);
                        if (!(cuts.length > 0)) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.executeCutsAndSend(pending.inputPath, cuts, pending.transcript, analysisText, input, llmRouter)];
                    case 4:
                        _f.sent();
                        this.pendingVideos.delete(sourceId); // Limpa o estado após sucesso
                        return [2 /*return*/, { text: "\u2705 V\u00EDdeo finalizado com base no seu feedback!", metadata: { interactive: true } }];
                    case 5: return [2 /*return*/, { text: "\u26A0\uFE0F N\u00E3o consegui entender os cortes no formato esperado ap\u00F3s o seu feedback. A resposta foi:\n\n".concat(analysisText) }];
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        err_1 = _f.sent();
                        msg = err_1 instanceof Error ? err_1.message : String(err_1);
                        console.error("[Video] \u274C Erro no refinamento: ".concat(msg));
                        return [2 /*return*/, { text: "\u274C Erro ao processar feedback: ".concat(msg) }];
                    case 8:
                        // Se o usuário mandou texto comum e não tem vídeo pendente, tenta interpretar como pedido solto
                        if (!input.mediaUrl && !this.pendingVideos.has(sourceId)) {
                            return [2 /*return*/, _super.prototype.run.call(this, input, llmRouter)];
                        }
                        if (!input.mediaUrl) return [3 /*break*/, 23];
                        console.log("[Video] \uD83C\uDFAC M\u00EDdia recebida (".concat((_b = input.mediaType) !== null && _b !== void 0 ? _b : 'unknown', "), iniciando pipeline de transcri\u00E7\u00E3o..."));
                        _f.label = 9;
                    case 9:
                        _f.trys.push([9, 22, , 23]);
                        if (!progress) return [3 /*break*/, 11];
                        return [4 /*yield*/, progress('🎬 *Video Agent ativado!*\n\n📥 Baixando o vídeo para edição...')];
                    case 10:
                        _f.sent();
                        _f.label = 11;
                    case 11: return [4 /*yield*/, this.downloadFile(input.mediaUrl)];
                    case 12:
                        fileBuffer = _f.sent();
                        sizeMB = (fileBuffer.byteLength / 1024 / 1024).toFixed(1);
                        console.log("[Video] \u2705 Download: ".concat(sizeMB, "MB"));
                        tempDir = (0, path_1.join)(process.cwd(), '.tmp', 'video');
                        if (!(0, fs_1.existsSync)(tempDir))
                            (0, fs_1.mkdirSync)(tempDir, { recursive: true });
                        inputPath = (0, path_1.join)(tempDir, "input-".concat(Date.now(), ".mp4"));
                        (0, fs_1.writeFileSync)(inputPath, fileBuffer);
                        if (!progress) return [3 /*break*/, 14];
                        return [4 /*yield*/, progress("\u2705 Download (".concat(sizeMB, "MB)\n\uD83D\uDCE4 Enviando para transcri\u00E7\u00E3o..."))];
                    case 13:
                        _f.sent();
                        _f.label = 14;
                    case 14: return [4 /*yield*/, this.uploadToAssemblyAI(fileBuffer)];
                    case 15:
                        uploadUrl = _f.sent();
                        if (!progress) return [3 /*break*/, 17];
                        return [4 /*yield*/, progress('📝 Transcrevendo áudio... (1-2 min)')];
                    case 16:
                        _f.sent();
                        _f.label = 17;
                    case 17: return [4 /*yield*/, this.transcribe(uploadUrl, progress)];
                    case 18:
                        transcript = _f.sent();
                        console.log("[Video] \u2705 Transcri\u00E7\u00E3o: ".concat(transcript.length, " chars"));
                        if (!progress) return [3 /*break*/, 20];
                        return [4 /*yield*/, progress('✅ Transcrição pronta!\n🤖 Analisando o roteiro para sugerir cortes iniciais...')];
                    case 19:
                        _f.sent();
                        _f.label = 20;
                    case 20:
                        userRequest = ((_c = input.text) === null || _c === void 0 ? void 0 : _c.trim()) || 'Faça a decupagem completa e sugira os melhores cortes para Reels/TikTok.';
                        return [4 /*yield*/, llmRouter.complete([{
                                    role: 'user',
                                    content: "O usu\u00E1rio enviou um v\u00EDdeo. Solicita\u00E7\u00E3o: \"".concat(userRequest, "\"\n\n## Transcri\u00E7\u00E3o completa:\n").concat(transcript, "\n\nINSTRU\u00C7\u00D5ES IMPORTANTES:\n1. Fa\u00E7a a decupagem e sugira os melhores cortes. N\u00E3o crie v\u00EDdeos muito longos.\n2. Ao FINAL da sua resposta, inclua um bloco JSON com os cortes sugeridos.\n3. Para cada corte, inclua \"header\" (t\u00EDtulo chamativo no topo).\n4. Para cada corte, inclua \"subtitles\" (legendas exatas faladas naquele trecho com timestamps).\n5. Os timestamps das legendas DEVEM SER RELATIVOS ao in\u00EDcio do corte (come\u00E7ando de 00:00:00).\n\nFormato:\n```cuts\n[\n  {\n    \"name\": \"nome_descritivo\",\n    \"start\": \"00:00:00\",\n    \"end\": \"00:00:10\",\n    \"description\": \"descri\u00E7\u00E3o curta\",\n    \"header\": \"T\u00EDtulo do V\u00EDdeo\",\n    \"subtitles\": [\n      {\"start\": \"00:00:00\", \"end\": \"00:00:05\", \"text\": \"Primeira frase da legenda\"},\n      {\"start\": \"00:00:05\", \"end\": \"00:00:10\", \"text\": \"Segunda frase\"}\n    ]\n  }\n]\n```\n\nUse o formato HH:MM:SS para start e end. O nome deve ser sem espa\u00E7os/acentos.\nSe o usu\u00E1rio pedir um header espec\u00EDfico, use-o em todos os cortes.\nInclua entre 1 e 5 cortes sugeridos."),
                                }], {
                                model: this.config.model,
                                systemPrompt: this.config.systemPrompt,
                                maxTokens: (_d = this.config.maxTokens) !== null && _d !== void 0 ? _d : 4000,
                                temperature: (_e = this.config.temperature) !== null && _e !== void 0 ? _e : 0.3,
                            })];
                    case 21:
                        analysisResponse = _f.sent();
                        analysisText = analysisResponse.content;
                        cuts = this.parseCuts(analysisText);
                        if (cuts.length > 0) {
                            this.pendingVideos.set(sourceId, { inputPath: inputPath, transcript: transcript, initialCuts: cuts });
                            formatCutsForReview = function (cutsArr) {
                                return cutsArr.map(function (c, i) {
                                    var str = "**Corte ".concat(i + 1, ": ").concat(c.name, "** (").concat(c.start, " \u279D ").concat(c.end, ")\n");
                                    if (c.header)
                                        str += "- **Header:** ".concat(c.header, "\n");
                                    str += "- **Descri\u00E7\u00E3o:** ".concat(c.description, "\n");
                                    if (c.subtitles && c.subtitles.length > 0) {
                                        str += "- **Legendas mapeadas:**\n";
                                        c.subtitles.forEach(function (sub) {
                                            str += "  [".concat(sub.start, "] ").concat(sub.text, "\n");
                                        });
                                    }
                                    return str;
                                }).join('\n\n');
                            };
                            cleanAnalysis = analysisText.replace(/```cuts[\s\S]*?```/g, '').trim();
                            reply = "\uD83D\uDCFA **An\u00E1lise Conclu\u00EDda!**\n\n".concat(cleanAnalysis, "\n\n") +
                                "---\n\n\uD83D\uDCDC **Transcri\u00E7\u00E3o Original do V\u00EDdeo:**\n_".concat(transcript, "_\n\n") +
                                "---\n\n\uD83C\uDFAC **Cortes Sugeridos (Prontos para renderizar):**\n\n".concat(formatCutsForReview(cuts), "\n\n") +
                                "---\n\n\u23F3 **Aguardando sua aprova\u00E7\u00E3o!**\nVerifique a transcri\u00E7\u00E3o e os cortes sugeridos acima.\n" +
                                "Se quiser mudar algo (ex: \"No Corte 1, remova a legenda [00:00:05] Segunda frase\"), \u00E9 s\u00F3 me avisar aqui. " +
                                "Se estiver tudo OK, responda \"Pode gerar\" ou \"Aprovado\" e eu crio os v\u00EDdeos agora mesmo.";
                            return [2 /*return*/, {
                                    text: reply,
                                    metadata: { transcript: transcript, cuts: cuts.length, status: 'pending_approval' },
                                }];
                        }
                        else {
                            // Se falhou em gerar cortes válidos, não salva estado e informa erro
                            try {
                                (0, fs_1.unlinkSync)(inputPath);
                            }
                            catch ( /* ignore */_g) { /* ignore */ }
                            return [2 /*return*/, { text: "Fiz a transcri\u00E7\u00E3o, mas n\u00E3o consegui estruturar os cortes. Aqui est\u00E1 sua transcri\u00E7\u00E3o:\n\n".concat(transcript) }];
                        }
                        return [3 /*break*/, 23];
                    case 22:
                        err_2 = _f.sent();
                        msg = err_2 instanceof Error ? err_2.message : String(err_2);
                        console.error("[Video] \u274C Erro na fase 1: ".concat(msg));
                        return [2 /*return*/, { text: "\u274C Erro ao processar o v\u00EDdeo inicial: ".concat(msg) }];
                    case 23: return [2 /*return*/, _super.prototype.run.call(this, input, llmRouter)];
                }
            });
        });
    };
    // ─── Phase 2 Execution (FFmpeg & Drive) ────────────────────────────────
    VideoSpecialist.prototype.executeCutsAndSend = function (inputPath, cuts, transcript, analysisText, input, llmRouter) {
        return __awaiter(this, void 0, void 0, function () {
            var progress, tempDir, ffmpegResults, clipPaths, _i, cuts_1, cut, outputPath, srtPath, entry, err_3, msg, sendFile, _a, clipPaths_1, clip, driveLink, dService, folders, fileBuffer, uploadRes, err_4, caption, sendErr_1, _b, clipPaths_2, clip, folders, timestamp, fullReport, uploaded, err_5;
            var _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        progress = input.onProgress;
                        tempDir = (0, path_1.join)(process.cwd(), '.tmp', 'video');
                        ffmpegResults = '';
                        if (!(cuts.length > 0)) return [3 /*break*/, 23];
                        if (!progress) return [3 /*break*/, 2];
                        return [4 /*yield*/, progress("\u2702\uFE0F Renderizando ".concat(cuts.length, " corte(s) com legendas embutidas...\n(Isso pode levar alguns minutos)"))];
                    case 1:
                        _d.sent();
                        _d.label = 2;
                    case 2:
                        console.log("[Video] \u2702\uFE0F ".concat(cuts.length, " cortes para executar"));
                        clipPaths = [];
                        _i = 0, cuts_1 = cuts;
                        _d.label = 3;
                    case 3:
                        if (!(_i < cuts_1.length)) return [3 /*break*/, 8];
                        cut = cuts_1[_i];
                        _d.label = 4;
                    case 4:
                        _d.trys.push([4, 6, , 7]);
                        outputPath = (0, path_1.join)(tempDir, "".concat(cut.name, "-").concat(Date.now(), ".mp4"));
                        srtPath = void 0;
                        if (cut.subtitles && cut.subtitles.length > 0) {
                            srtPath = (0, path_1.join)(tempDir, "".concat(cut.name, "-").concat(Date.now(), ".srt"));
                            this.generateSRT(cut.subtitles, srtPath);
                        }
                        return [4 /*yield*/, this.runFFmpeg(inputPath, outputPath, cut.start, cut.end, cut.header, srtPath)];
                    case 5:
                        _d.sent();
                        entry = { name: cut.name, path: outputPath, description: cut.description };
                        if (cut.header)
                            entry.header = cut.header;
                        if (cut.subtitles)
                            entry.subtitles = cut.subtitles;
                        if (srtPath)
                            entry.srtPath = srtPath;
                        clipPaths.push(entry);
                        console.log("[Video] \u2705 Corte: ".concat(cut.name, " (").concat(cut.start, "\u2192").concat(cut.end, ")"));
                        return [3 /*break*/, 7];
                    case 6:
                        err_3 = _d.sent();
                        msg = err_3 instanceof Error ? err_3.message : String(err_3);
                        console.error("[Video] \u274C FFmpeg erro (".concat(cut.name, "): ").concat(msg));
                        return [3 /*break*/, 7];
                    case 7:
                        _i++;
                        return [3 /*break*/, 3];
                    case 8:
                        sendFile = input.onSendFile;
                        if (!(sendFile && clipPaths.length > 0)) return [3 /*break*/, 22];
                        if (!progress) return [3 /*break*/, 10];
                        return [4 /*yield*/, progress("\uD83D\uDCE4 Salvando no Drive e enviando ".concat(clipPaths.length, " v\u00EDdeo(s)..."))];
                    case 9:
                        _d.sent();
                        _d.label = 10;
                    case 10:
                        _a = 0, clipPaths_1 = clipPaths;
                        _d.label = 11;
                    case 11:
                        if (!(_a < clipPaths_1.length)) return [3 /*break*/, 20];
                        clip = clipPaths_1[_a];
                        driveLink = '';
                        dService = (_c = input.driveService) !== null && _c !== void 0 ? _c : this.drive;
                        if (!dService) return [3 /*break*/, 16];
                        _d.label = 12;
                    case 12:
                        _d.trys.push([12, 15, , 16]);
                        folders = dService.getFolders();
                        if (!folders) return [3 /*break*/, 14];
                        fileBuffer = (0, fs_1.readFileSync)(clip.path);
                        return [4 /*yield*/, dService.uploadFile("".concat(clip.name, "-").concat(Date.now(), ".mp4"), fileBuffer, 'video/mp4', folders.outputsVideos)];
                    case 13:
                        uploadRes = _d.sent();
                        driveLink = "\n\n[\u2601\uFE0F Salvo no Drive: ".concat(uploadRes.webViewLink, " ]");
                        console.log("[Video] \u2601\uFE0F Upload Drive: ".concat(clip.name, ".mp4"));
                        _d.label = 14;
                    case 14: return [3 /*break*/, 16];
                    case 15:
                        err_4 = _d.sent();
                        console.error("[Video] \u26A0\uFE0F Erro no Drive para ".concat(clip.name, ":"), err_4);
                        return [3 /*break*/, 16];
                    case 16:
                        _d.trys.push([16, 18, , 19]);
                        caption = "\u2702\uFE0F ".concat(clip.name, ": ").concat(clip.description);
                        if (clip.header) {
                            caption = "\uD83D\uDCCC ".concat(clip.header, "\n\n").concat(caption);
                        }
                        caption += driveLink;
                        return [4 /*yield*/, sendFile(clip.path, caption)];
                    case 17:
                        _d.sent();
                        console.log("[Video] \uD83D\uDCE4 Enviado: ".concat(clip.name, ".mp4"));
                        return [3 /*break*/, 19];
                    case 18:
                        sendErr_1 = _d.sent();
                        console.error("[Video] \u26A0\uFE0F Erro ao enviar ".concat(clip.name));
                        return [3 /*break*/, 19];
                    case 19:
                        _a++;
                        return [3 /*break*/, 11];
                    case 20:
                        ffmpegResults = "\n\n---\n\n### \u2705 V\u00EDdeos Renderizados\n".concat(clipPaths.map(function (c) { return "\u2022 ".concat(c.name, ": ").concat(c.description); }).join('\n'), "\n\n_Os ").concat(clipPaths.length, " v\u00EDdeo(s) prontos foram enviados acima \u261D\uFE0F_");
                        if (!progress) return [3 /*break*/, 22];
                        return [4 /*yield*/, progress("\u2705 Conclu\u00EDdo!")];
                    case 21:
                        _d.sent();
                        _d.label = 22;
                    case 22:
                        // Cleanup temp files
                        for (_b = 0, clipPaths_2 = clipPaths; _b < clipPaths_2.length; _b++) {
                            clip = clipPaths_2[_b];
                            try {
                                (0, fs_1.unlinkSync)(clip.path);
                            }
                            catch ( /* ignore */_e) { /* ignore */ }
                            if (clip.srtPath) {
                                try {
                                    (0, fs_1.unlinkSync)(clip.srtPath);
                                }
                                catch ( /* ignore */_f) { /* ignore */ }
                            }
                        }
                        _d.label = 23;
                    case 23:
                        // Cleanup input
                        try {
                            (0, fs_1.unlinkSync)(inputPath);
                        }
                        catch ( /* ignore */_g) { /* ignore */ }
                        if (!this.drive) return [3 /*break*/, 28];
                        _d.label = 24;
                    case 24:
                        _d.trys.push([24, 27, , 28]);
                        folders = this.drive.getFolders();
                        if (!folders) return [3 /*break*/, 26];
                        timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                        fullReport = "Decupagem de V\u00EDdeo \u2014 ".concat(new Date().toLocaleDateString('pt-BR'), "\n\nTranscri\u00E7\u00E3o:\n").concat(transcript, "\n\n---\n\n").concat(analysisText);
                        return [4 /*yield*/, this.drive.saveText("decupagem-".concat(timestamp, ".txt"), fullReport, folders.outputsVideos)];
                    case 25:
                        uploaded = _d.sent();
                        console.log("[Video] \uD83D\uDCC4 Relat\u00F3rio Drive: ".concat(uploaded.webViewLink));
                        _d.label = 26;
                    case 26: return [3 /*break*/, 28];
                    case 27:
                        err_5 = _d.sent();
                        console.error("[Video] \u26A0\uFE0F Erro relat\u00F3rio Drive");
                        return [3 /*break*/, 28];
                    case 28: return [2 /*return*/];
                }
            });
        });
    };
    // ─── Helpers ───────────────────────────────────────────
    VideoSpecialist.prototype.parseTimeStr = function (timeStr) {
        var parts = timeStr.trim().split(':').map(Number);
        if (parts.length === 3)
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2)
            return parts[0] * 60 + parts[1];
        return Number(timeStr) || 0;
    };
    VideoSpecialist.prototype.parseCuts = function (text) {
        var match = text.match(/```cuts\s*([\s\S]*?)```/);
        if (!match) {
            console.log('[Video] ⚠️ Nenhum bloco ```cuts``` encontrado na resposta');
            return [];
        }
        try {
            var cuts = JSON.parse(match[1]);
            return cuts.filter(function (c) { return c.name && c.start && c.end; });
        }
        catch (err) {
            console.error('[Video] ❌ Erro ao parsear cortes JSON:', err);
            return [];
        }
    };
    VideoSpecialist.prototype.runFFmpeg = function (inputPath, outputPath, start, end, header, srtPath) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var filters = [];
            // Header bar no topo do vídeo
            if (header) {
                var safeHeader = header.replace(/'/g, '').replace(/:/g, ' ');
                filters.push("drawbox=x=0:y=0:w=iw:h=50:color=black@0.7:t=fill", "drawtext=text='".concat(safeHeader, "':fontsize=24:fontcolor=white:x=(w-text_w)/2:y=15"));
            }
            // Helper para quebrar texto em linhas de max 35 caracteres
            var maxChars = 35;
            var splitTextIntoLines = function (text) {
                var words = text.split(' ');
                var lines = [];
                var currentLine = '';
                for (var _i = 0, words_1 = words; _i < words_1.length; _i++) {
                    var word = words_1[_i];
                    if ((currentLine + word).length > maxChars) {
                        lines.push(currentLine.trim());
                        currentLine = word + ' ';
                    }
                    else {
                        currentLine += word + ' ';
                    }
                }
                if (currentLine.trim())
                    lines.push(currentLine.trim());
                return lines;
            };
            // Legendas - lê SRT e gera drawtext entries (agora suportado via ffmpeg-static)
            if (srtPath) {
                try {
                    var srtContent = (0, fs_1.readFileSync)(srtPath, 'utf-8');
                    var subs = _this.parseSRT(srtContent);
                    var startOffsetSec = _this.parseTimeStr(start);
                    var _loop_1 = function (sub) {
                        // Removemos caracteres que quebram o parser do filtro do FFmpeg (aspas, dois pontos, vírgulas, quebras de linha)
                        var safeText = sub.text.replace(/[':,]/g, '').replace(/\n/g, ' ').trim();
                        var lines = splitTextIntoLines(safeText);
                        // O FFmpeg entende o 't' do drawtext como o tempo absoluto do arquivo de origem (se -ss estiver depois do input).
                        // Como pedimos legendas relativas ao corte, precisamos adicionar o offset inicial do corte:
                        var tStart = sub.startSec + startOffsetSec;
                        var tEnd = sub.endSec + startOffsetSec;
                        // Desenha cada linha empilhada de baixo pra cima
                        // A última linha fica em h-60, a penúltima em h-90, etc.
                        lines.reverse().forEach(function (lineText, i) {
                            var yPos = "h-".concat(60 + (i * 30));
                            filters.push("drawtext=text='".concat(lineText, "':fontsize=20:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=").concat(yPos, ":enable='between(t,").concat(tStart, ",").concat(tEnd, ")'"));
                        });
                    };
                    for (var _i = 0, subs_1 = subs; _i < subs_1.length; _i++) {
                        var sub = subs_1[_i];
                        _loop_1(sub);
                    }
                }
                catch (err) {
                    console.error("[Video] \u26A0\uFE0F Erro ao ler SRT: ".concat(err));
                }
            }
            var args = [
                '-i', inputPath,
                '-ss', start,
                '-to', end,
            ];
            if (filters.length > 0) {
                args.push('-vf', filters.join(','));
            }
            args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-c:a', 'aac', '-b:a', '128k', '-y', outputPath);
            console.log("[Video] \uD83D\uDD27 ffmpeg (static) -ss ".concat(start, " -to ").concat(end));
            // Usa o ffmpegPath do ffmpeg-static (já inclui freetype) em vez do ffmpeg global do sistema
            var binPath = ffmpeg_static_1.default;
            if (!binPath) {
                reject(new Error("ffmpeg-static binary path not found."));
                return;
            }
            (0, child_process_1.execFile)(binPath, args, { timeout: 180000 }, function (error, _stdout, stderr) {
                if (error) {
                    reject(new Error("FFmpeg: ".concat(error.message, "\n").concat(stderr)));
                }
                else {
                    resolve();
                }
            });
        });
    };
    /**
     * Parse SRT content to extract subtitle entries with timestamps in seconds.
     */
    VideoSpecialist.prototype.parseSRT = function (content) {
        var blocks = content.trim().split(/\n\n+/);
        var result = [];
        for (var _i = 0, blocks_1 = blocks; _i < blocks_1.length; _i++) {
            var block = blocks_1[_i];
            var lines = block.trim().split('\n');
            if (lines.length < 3)
                continue;
            var timeLine = lines[1];
            if (!timeLine)
                continue;
            var match = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),\d+\s*-->\s*(\d{2}):(\d{2}):(\d{2}),\d+/);
            if (!match)
                continue;
            var startSec = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]);
            var endSec = parseInt(match[4]) * 3600 + parseInt(match[5]) * 60 + parseInt(match[6]);
            var text = lines.slice(2).join(' ');
            result.push({ text: text, startSec: startSec, endSec: endSec });
        }
        return result;
    };
    /**
     * Gera arquivo SRT a partir dos subtítulos definidos pelo LLM.
     */
    VideoSpecialist.prototype.generateSRT = function (subtitles, outputPath) {
        var lines = [];
        subtitles.forEach(function (sub, i) {
            var startSrt = sub.start.length <= 5 ? "00:".concat(sub.start, ",000") : "".concat(sub.start, ",000");
            var endSrt = sub.end.length <= 5 ? "00:".concat(sub.end, ",000") : "".concat(sub.end, ",000");
            lines.push("".concat(i + 1));
            lines.push("".concat(startSrt, " --> ").concat(endSrt));
            lines.push(sub.text);
            lines.push('');
        });
        (0, fs_1.writeFileSync)(outputPath, lines.join('\n'), 'utf-8');
        console.log("[Video] \uD83D\uDCDD SRT gerado: ".concat(outputPath, " (").concat(subtitles.length, " legendas)"));
    };
    VideoSpecialist.prototype.downloadFile = function (url) {
        return __awaiter(this, void 0, void 0, function () {
            var res, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, fetch(url)];
                    case 1:
                        res = _c.sent();
                        if (!res.ok)
                            throw new Error("Download falhou: ".concat(res.status, " ").concat(res.statusText));
                        _b = (_a = Buffer).from;
                        return [4 /*yield*/, res.arrayBuffer()];
                    case 2: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
                }
            });
        });
    };
    VideoSpecialist.prototype.uploadToAssemblyAI = function (fileBuffer) {
        return __awaiter(this, void 0, void 0, function () {
            var res, errText;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, fetch('https://api.assemblyai.com/v2/upload', {
                            method: 'POST',
                            headers: {
                                'Authorization': this.assemblyaiKey,
                                'Content-Type': 'application/octet-stream',
                            },
                            body: new Uint8Array(fileBuffer),
                        })];
                    case 1:
                        res = _a.sent();
                        if (!!res.ok) return [3 /*break*/, 3];
                        return [4 /*yield*/, res.text()];
                    case 2:
                        errText = _a.sent();
                        throw new Error("AssemblyAI upload: ".concat(res.status, " \u2014 ").concat(errText));
                    case 3: return [4 /*yield*/, res.json()];
                    case 4: return [2 /*return*/, (_a.sent()).upload_url];
                }
            });
        });
    };
    VideoSpecialist.prototype.transcribe = function (audioUrl, progress) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.submitAndPoll(audioUrl, 'universal-3-pro', progress)];
                    case 1:
                        result = _a.sent();
                        if (!(!result || result.trim() === '')) return [3 /*break*/, 5];
                        console.log('[Video] ⚠️ Vazio com universal-3-pro, tentando universal-2...');
                        if (!progress) return [3 /*break*/, 3];
                        return [4 /*yield*/, progress('⚠️ Primeiro modelo vazio. Tentando alternativo...')];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [4 /*yield*/, this.submitAndPoll(audioUrl, 'universal-2', progress)];
                    case 4:
                        result = _a.sent();
                        _a.label = 5;
                    case 5:
                        if (!result || result.trim() === '') {
                            throw new Error('Transcrição retornou vazia — áudio sem fala detectável.');
                        }
                        return [2 /*return*/, result];
                }
            });
        });
    };
    VideoSpecialist.prototype.submitAndPoll = function (audioUrl, model, progress) {
        return __awaiter(this, void 0, void 0, function () {
            var submitRes, errText, transcriptId, i, pollRes, data, elapsed;
            var _this = this;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, fetch('https://api.assemblyai.com/v2/transcript', {
                            method: 'POST',
                            headers: { 'Authorization': this.assemblyaiKey, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ audio_url: audioUrl, speech_models: [model], language_code: 'pt', speaker_labels: true }),
                        })];
                    case 1:
                        submitRes = _b.sent();
                        if (!!submitRes.ok) return [3 /*break*/, 3];
                        return [4 /*yield*/, submitRes.text()];
                    case 2:
                        errText = _b.sent();
                        throw new Error("AssemblyAI submit: ".concat(submitRes.status, " \u2014 ").concat(errText));
                    case 3: return [4 /*yield*/, submitRes.json()];
                    case 4:
                        transcriptId = (_b.sent()).id;
                        console.log("[Video] \uD83D\uDCCB ID: ".concat(transcriptId, " (").concat(model, ")"));
                        i = 0;
                        _b.label = 5;
                    case 5:
                        if (!(i < 120)) return [3 /*break*/, 13];
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 5000); })];
                    case 6:
                        _b.sent();
                        return [4 /*yield*/, fetch("https://api.assemblyai.com/v2/transcript/".concat(transcriptId), {
                                headers: { 'Authorization': this.assemblyaiKey },
                            })];
                    case 7:
                        pollRes = _b.sent();
                        if (!pollRes.ok)
                            return [3 /*break*/, 12];
                        return [4 /*yield*/, pollRes.json()];
                    case 8:
                        data = _b.sent();
                        if (!(data.status === 'processing' || data.status === 'queued')) return [3 /*break*/, 11];
                        elapsed = (i + 1) * 5;
                        if (!(elapsed % 30 === 0)) return [3 /*break*/, 10];
                        console.log("[Video] \u23F3 ".concat(elapsed, "s..."));
                        if (!progress) return [3 /*break*/, 10];
                        return [4 /*yield*/, progress("\u23F3 Transcrevendo... (".concat(elapsed, "s)"))];
                    case 9:
                        _b.sent();
                        _b.label = 10;
                    case 10: return [3 /*break*/, 12];
                    case 11:
                        if (data.status === 'completed') {
                            if (data.utterances && data.utterances.length > 0) {
                                return [2 /*return*/, data.utterances.map(function (u) {
                                        var s = _this.fmtTime(u.start), e = _this.fmtTime(u.end);
                                        return "[".concat(s, "\u2013").concat(e, "] Speaker ").concat(u.speaker, ": ").concat(u.text);
                                    }).join('\n')];
                            }
                            return [2 /*return*/, (_a = data.text) !== null && _a !== void 0 ? _a : ''];
                        }
                        if (data.status === 'error')
                            throw new Error('Transcrição falhou no AssemblyAI');
                        _b.label = 12;
                    case 12:
                        i++;
                        return [3 /*break*/, 5];
                    case 13: throw new Error('Timeout (10 min)');
                }
            });
        });
    };
    VideoSpecialist.prototype.fmtTime = function (ms) {
        var s = Math.floor(ms / 1000);
        return "".concat(Math.floor(s / 60).toString().padStart(2, '0'), ":").concat((s % 60).toString().padStart(2, '0'));
    };
    return VideoSpecialist;
}(specialist_js_1.Specialist));
exports.VideoSpecialist = VideoSpecialist;
