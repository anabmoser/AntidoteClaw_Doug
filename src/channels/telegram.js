"use strict";
/**
 * GravityClaw — Telegram Channel Connector
 *
 * Integração com o Telegram Bot API usando long polling.
 * Suporta mensagens de texto, mídia (imagens, áudio, vídeo, documentos),
 * botões inline e comandos.
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
exports.TelegramChannel = void 0;
var uuid_1 = require("uuid");
var TELEGRAM_API = 'https://api.telegram.org';
var TelegramChannel = /** @class */ (function () {
    function TelegramChannel(options) {
        var _a;
        this.type = 'telegram';
        this.polling = false;
        this.lastUpdateId = 0;
        this.abortController = null;
        this.token = options.botToken;
        this.onMessageHandler = options.onMessage;
        this.allowedChatIds = (_a = options.allowedChatIds) !== null && _a !== void 0 ? _a : null;
    }
    // ─── Lifecycle ─────────────────────────────────────────────
    TelegramChannel.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var me, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.apiCall('getMe')];
                    case 1:
                        me = _a.sent();
                        console.log("[Telegram] \uD83E\uDD16 Bot conectado: @".concat(me.username, " (").concat(me.first_name, ")"));
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.apiCall('setMyCommands', {
                                commands: JSON.stringify([
                                    { command: 'writer', description: 'Chama o Especialista em Textos' },
                                    { command: 'video', description: 'Chama o Editor de Vídeo' },
                                    { command: 'designer', description: 'Chama o Criador de Imagens' },
                                    { command: 'scout', description: 'Chama o Pesquisador Web' },
                                    { command: 'social', description: 'Chama o Gestor de Redes Sociais' },
                                    { command: 'clima', description: 'Consulta o clima (Skill)' },
                                ]),
                            })];
                    case 3:
                        _a.sent();
                        console.log("[Telegram] \uD83D\uDCDC Menu de comandos atualizado com sucesso.");
                        return [3 /*break*/, 5];
                    case 4:
                        err_1 = _a.sent();
                        console.error("[Telegram] \u26A0\uFE0F Erro ao atualizar menu de comandos:", err_1);
                        return [3 /*break*/, 5];
                    case 5:
                        // Inicia long polling
                        this.polling = true;
                        this.pollUpdates();
                        return [2 /*return*/];
                }
            });
        });
    };
    TelegramChannel.prototype.stop = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.polling = false;
                if (this.abortController) {
                    this.abortController.abort();
                }
                console.log('[Telegram] Bot desconectado.');
                return [2 /*return*/];
            });
        });
    };
    // ─── Send Messages ─────────────────────────────────────────
    TelegramChannel.prototype.send = function (recipientId, message) {
        return __awaiter(this, void 0, void 0, function () {
            var chatId, replyMarkup, maxLen, fullText, _loop_1, this_1, i;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        chatId = parseInt(recipientId, 10);
                        replyMarkup = message.buttons && message.buttons.length > 0
                            ? {
                                inline_keyboard: [
                                    message.buttons.map(function (btn) { return ({
                                        text: btn.label,
                                        callback_data: btn.action,
                                    }); }),
                                ],
                            }
                            : undefined;
                        if (!message.mediaUrl) return [3 /*break*/, 2];
                        // Tenta enviar como foto
                        return [4 /*yield*/, this.apiCall('sendPhoto', {
                                chat_id: chatId,
                                photo: message.mediaUrl,
                                caption: message.text,
                                parse_mode: 'Markdown',
                                reply_markup: replyMarkup ? JSON.stringify(replyMarkup) : undefined,
                            })];
                    case 1:
                        // Tenta enviar como foto
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 2:
                        maxLen = 4000;
                        fullText = message.text;
                        _loop_1 = function (i) {
                            var chunk, isLast;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        chunk = fullText.slice(i, i + maxLen);
                                        isLast = (i + maxLen) >= fullText.length;
                                        return [4 /*yield*/, this_1.apiCall('sendMessage', {
                                                chat_id: chatId,
                                                text: chunk,
                                                parse_mode: 'Markdown',
                                                reply_markup: (isLast && replyMarkup) ? JSON.stringify(replyMarkup) : undefined,
                                            }).catch(function (err) { return __awaiter(_this, void 0, void 0, function () {
                                                return __generator(this, function (_a) {
                                                    switch (_a.label) {
                                                        case 0:
                                                            // Fallback sem markdown caso falhe a formatação no meio do chunk
                                                            console.error("[Telegram] Erro Markdown no chunk, tentando sem formata\u00E7\u00E3o...");
                                                            return [4 /*yield*/, this.apiCall('sendMessage', {
                                                                    chat_id: chatId,
                                                                    text: chunk,
                                                                    reply_markup: (isLast && replyMarkup) ? JSON.stringify(replyMarkup) : undefined,
                                                                })];
                                                        case 1:
                                                            _a.sent();
                                                            return [2 /*return*/];
                                                    }
                                                });
                                            }); })];
                                    case 1:
                                        _b.sent();
                                        return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        i = 0;
                        _a.label = 3;
                    case 3:
                        if (!(i < fullText.length)) return [3 /*break*/, 6];
                        return [5 /*yield**/, _loop_1(i)];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        i += maxLen;
                        return [3 /*break*/, 3];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    // ─── Polling Loop ──────────────────────────────────────────
    TelegramChannel.prototype.pollUpdates = function () {
        return __awaiter(this, void 0, void 0, function () {
            var updates, _i, updates_1, update, err_2, msg;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.polling) return [3 /*break*/, 10];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 7, , 9]);
                        this.abortController = new AbortController();
                        return [4 /*yield*/, this.getUpdates()];
                    case 2:
                        updates = _a.sent();
                        _i = 0, updates_1 = updates;
                        _a.label = 3;
                    case 3:
                        if (!(_i < updates_1.length)) return [3 /*break*/, 6];
                        update = updates_1[_i];
                        this.lastUpdateId = update.update_id + 1;
                        return [4 /*yield*/, this.handleUpdate(update)];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6: return [3 /*break*/, 9];
                    case 7:
                        err_2 = _a.sent();
                        if (!this.polling)
                            return [3 /*break*/, 10]; // abort esperado
                        msg = err_2 instanceof Error ? err_2.message : String(err_2);
                        console.error("[Telegram] Erro no polling: ".concat(msg));
                        // Espera antes de tentar novamente
                        return [4 /*yield*/, this.sleep(3000)];
                    case 8:
                        // Espera antes de tentar novamente
                        _a.sent();
                        return [3 /*break*/, 9];
                    case 9: return [3 /*break*/, 0];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    TelegramChannel.prototype.getUpdates = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.apiCall('getUpdates', {
                            offset: this.lastUpdateId,
                            timeout: 30,
                            allowed_updates: JSON.stringify(['message', 'callback_query']),
                        })];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result];
                }
            });
        });
    };
    // ─── Update Handler ────────────────────────────────────────
    TelegramChannel.prototype.handleUpdate = function (update) {
        return __awaiter(this, void 0, void 0, function () {
            var cb, chatId, incoming_1, response_1, msg, text, mediaUrl, mediaType, largest, incoming, sendProgress, sendFile, response;
            var _this = this;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!update.callback_query) return [3 /*break*/, 5];
                        cb = update.callback_query;
                        chatId = (_a = cb.message) === null || _a === void 0 ? void 0 : _a.chat.id;
                        if (!chatId)
                            return [2 /*return*/];
                        // Responde ao callback
                        return [4 /*yield*/, this.apiCall('answerCallbackQuery', { callback_query_id: cb.id })];
                    case 1:
                        // Responde ao callback
                        _d.sent();
                        incoming_1 = {
                            id: (0, uuid_1.v4)(),
                            channel: 'telegram',
                            senderId: String(chatId),
                            senderName: cb.from.first_name,
                            text: (_b = cb.data) !== null && _b !== void 0 ? _b : '',
                            timestamp: new Date(),
                            metadata: { telegramCallbackQuery: true },
                        };
                        return [4 /*yield*/, this.onMessageHandler(incoming_1)];
                    case 2:
                        response_1 = _d.sent();
                        if (!response_1) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.send(String(chatId), response_1)];
                    case 3:
                        _d.sent();
                        _d.label = 4;
                    case 4: return [2 /*return*/];
                    case 5:
                        msg = update.message;
                        if (!msg)
                            return [2 /*return*/];
                        // Verifica restrição de chat IDs
                        if (this.allowedChatIds && !this.allowedChatIds.includes(msg.chat.id)) {
                            console.log("[Telegram] Chat ".concat(msg.chat.id, " n\u00E3o autorizado. Ignorando."));
                            return [2 /*return*/];
                        }
                        text = (_c = msg.text) !== null && _c !== void 0 ? _c : '';
                        if (!(msg.photo && msg.photo.length > 0)) return [3 /*break*/, 8];
                        largest = msg.photo[msg.photo.length - 1];
                        if (!largest) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.getFileUrl(largest.file_id)];
                    case 6:
                        mediaUrl = _d.sent();
                        mediaType = 'image';
                        _d.label = 7;
                    case 7: return [3 /*break*/, 14];
                    case 8:
                        if (!msg.voice) return [3 /*break*/, 10];
                        return [4 /*yield*/, this.getFileUrl(msg.voice.file_id)];
                    case 9:
                        mediaUrl = _d.sent();
                        mediaType = 'audio';
                        return [3 /*break*/, 14];
                    case 10:
                        if (!msg.video) return [3 /*break*/, 12];
                        return [4 /*yield*/, this.getFileUrl(msg.video.file_id)];
                    case 11:
                        mediaUrl = _d.sent();
                        mediaType = 'video';
                        return [3 /*break*/, 14];
                    case 12:
                        if (!msg.document) return [3 /*break*/, 14];
                        return [4 /*yield*/, this.getFileUrl(msg.document.file_id)];
                    case 13:
                        mediaUrl = _d.sent();
                        mediaType = 'document';
                        _d.label = 14;
                    case 14:
                        if (!text && !mediaUrl)
                            return [2 /*return*/]; // Nada para processar
                        incoming = {
                            id: (0, uuid_1.v4)(),
                            channel: 'telegram',
                            senderId: String(msg.chat.id),
                            senderName: "".concat(msg.from.first_name).concat(msg.from.last_name ? ' ' + msg.from.last_name : ''),
                            text: text,
                            timestamp: new Date(msg.date * 1000),
                            metadata: {
                                telegramMessageId: msg.message_id,
                                telegramChatType: msg.chat.type,
                                telegramUsername: msg.from.username,
                            },
                        };
                        if (mediaUrl) {
                            incoming.mediaUrl = mediaUrl;
                        }
                        if (mediaType) {
                            incoming.mediaType = mediaType;
                        }
                        // Envia "digitando..."
                        return [4 /*yield*/, this.apiCall('sendChatAction', {
                                chat_id: msg.chat.id,
                                action: 'typing',
                            })];
                    case 15:
                        // Envia "digitando..."
                        _d.sent();
                        sendProgress = function (text) { return __awaiter(_this, void 0, void 0, function () {
                            var _a, _b;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        _c.trys.push([0, 2, , 7]);
                                        return [4 /*yield*/, this.apiCall('sendMessage', {
                                                chat_id: msg.chat.id,
                                                text: text,
                                                parse_mode: 'Markdown',
                                            })];
                                    case 1:
                                        _c.sent();
                                        return [3 /*break*/, 7];
                                    case 2:
                                        _a = _c.sent();
                                        _c.label = 3;
                                    case 3:
                                        _c.trys.push([3, 5, , 6]);
                                        return [4 /*yield*/, this.apiCall('sendMessage', {
                                                chat_id: msg.chat.id,
                                                text: text,
                                            })];
                                    case 4:
                                        _c.sent();
                                        return [3 /*break*/, 6];
                                    case 5:
                                        _b = _c.sent();
                                        return [3 /*break*/, 6];
                                    case 6: return [3 /*break*/, 7];
                                    case 7: return [2 /*return*/];
                                }
                            });
                        }); };
                        sendFile = function (filePath, caption) { return __awaiter(_this, void 0, void 0, function () {
                            var createReadStream, FormData_1, fileStream, boundary, readFileSync, fileBuffer, fileName, parts, body, url, res, errText, err_3, errMsg;
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _b.trys.push([0, 7, , 8]);
                                        return [4 /*yield*/, Promise.resolve().then(function () { return require('fs'); })];
                                    case 1:
                                        createReadStream = (_b.sent()).createReadStream;
                                        return [4 /*yield*/, Promise.resolve().then(function () { return require('node:buffer'); })];
                                    case 2:
                                        FormData_1 = (_b.sent()).Blob ? null : null;
                                        fileStream = createReadStream(filePath);
                                        boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
                                        return [4 /*yield*/, Promise.resolve().then(function () { return require('fs'); })];
                                    case 3:
                                        readFileSync = (_b.sent()).readFileSync;
                                        fileBuffer = readFileSync(filePath);
                                        fileName = (_a = filePath.split('/').pop()) !== null && _a !== void 0 ? _a : 'video.mp4';
                                        parts = [];
                                        parts.push(Buffer.from("--".concat(boundary, "\r\nContent-Disposition: form-data; name=\"chat_id\"\r\n\r\n").concat(msg.chat.id, "\r\n")));
                                        parts.push(Buffer.from("--".concat(boundary, "\r\nContent-Disposition: form-data; name=\"caption\"\r\n\r\n").concat(caption, "\r\n")));
                                        parts.push(Buffer.from("--".concat(boundary, "\r\nContent-Disposition: form-data; name=\"video\"; filename=\"").concat(fileName, "\"\r\nContent-Type: video/mp4\r\n\r\n")));
                                        parts.push(fileBuffer);
                                        parts.push(Buffer.from("\r\n--".concat(boundary, "--\r\n")));
                                        body = Buffer.concat(parts);
                                        url = "".concat(TELEGRAM_API, "/bot").concat(this.token, "/sendVideo");
                                        return [4 /*yield*/, fetch(url, {
                                                method: 'POST',
                                                headers: { 'Content-Type': "multipart/form-data; boundary=".concat(boundary) },
                                                body: new Uint8Array(body),
                                            })];
                                    case 4:
                                        res = _b.sent();
                                        if (!!res.ok) return [3 /*break*/, 6];
                                        return [4 /*yield*/, res.text()];
                                    case 5:
                                        errText = _b.sent();
                                        console.error("[Telegram] Erro sendVideo: ".concat(errText));
                                        _b.label = 6;
                                    case 6: return [3 /*break*/, 8];
                                    case 7:
                                        err_3 = _b.sent();
                                        errMsg = err_3 instanceof Error ? err_3.message : String(err_3);
                                        console.error("[Telegram] Erro ao enviar arquivo: ".concat(errMsg));
                                        return [3 /*break*/, 8];
                                    case 8: return [2 /*return*/];
                                }
                            });
                        }); };
                        return [4 /*yield*/, this.onMessageHandler(incoming, sendProgress, sendFile)];
                    case 16:
                        response = _d.sent();
                        if (!response) return [3 /*break*/, 18];
                        return [4 /*yield*/, this.send(String(msg.chat.id), response)];
                    case 17:
                        _d.sent();
                        _d.label = 18;
                    case 18: return [2 /*return*/];
                }
            });
        });
    };
    // ─── Telegram API Helpers ──────────────────────────────────
    TelegramChannel.prototype.apiCall = function (method, params) {
        return __awaiter(this, void 0, void 0, function () {
            var url, fetchOptions, res, errText, data;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        url = "".concat(TELEGRAM_API, "/bot").concat(this.token, "/").concat(method);
                        fetchOptions = {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                        };
                        if (params) {
                            fetchOptions.body = JSON.stringify(params);
                        }
                        if (this.abortController) {
                            fetchOptions.signal = this.abortController.signal;
                        }
                        return [4 /*yield*/, fetch(url, fetchOptions)];
                    case 1:
                        res = _b.sent();
                        if (!!res.ok) return [3 /*break*/, 3];
                        return [4 /*yield*/, res.text()];
                    case 2:
                        errText = _b.sent();
                        throw new Error("Telegram API ".concat(method, " falhou (").concat(res.status, "): ").concat(errText));
                    case 3: return [4 /*yield*/, res.json()];
                    case 4:
                        data = _b.sent();
                        if (!data.ok) {
                            throw new Error("Telegram API ".concat(method, ": ").concat((_a = data.description) !== null && _a !== void 0 ? _a : 'Erro desconhecido'));
                        }
                        return [2 /*return*/, data.result];
                }
            });
        });
    };
    TelegramChannel.prototype.getFileUrl = function (fileId) {
        return __awaiter(this, void 0, void 0, function () {
            var file;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.apiCall('getFile', { file_id: fileId })];
                    case 1:
                        file = _a.sent();
                        return [2 /*return*/, "".concat(TELEGRAM_API, "/file/bot").concat(this.token, "/").concat(file.file_path)];
                }
            });
        });
    };
    TelegramChannel.prototype.sleep = function (ms) {
        return new Promise(function (resolve) { return setTimeout(resolve, ms); });
    };
    return TelegramChannel;
}());
exports.TelegramChannel = TelegramChannel;
