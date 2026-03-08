"use strict";
/**
 * GravityClaw — Gateway WebSocket Hub
 *
 * Servidor central ao qual todos os canais (Telegram, Discord, Web, etc.)
 * se conectam via WebSockets em tempo real. Funciona como a "torre de controle"
 * do framework, roteando mensagens entre canais e o agente.
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
exports.Gateway = void 0;
var ws_1 = require("ws");
var uuid_1 = require("uuid");
var Gateway = /** @class */ (function () {
    function Gateway(options) {
        this.wss = null;
        this.clients = new Map();
        this.eventHandlers = [];
        this.messageHandler = null;
        this.port = options.port;
        this.token = options.token;
    }
    // ─── Event System ──────────────────────────────────────────
    Gateway.prototype.onEvent = function (handler) {
        this.eventHandlers.push(handler);
    };
    Gateway.prototype.emitEvent = function (event) {
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
                        console.error('[Gateway] Erro em event handler:', err_1);
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    // ─── Message Handler ───────────────────────────────────────
    /**
     * Define o handler principal que processa mensagens recebidas e retorna respostas.
     */
    Gateway.prototype.onMessage = function (handler) {
        this.messageHandler = handler;
    };
    // ─── Server Lifecycle ──────────────────────────────────────
    Gateway.prototype.start = function () {
        var _this = this;
        return new Promise(function (resolve) {
            _this.wss = new ws_1.WebSocketServer({ port: _this.port });
            _this.wss.on('listening', function () {
                console.log("[Gateway] \uD83D\uDE80 WebSocket Hub rodando na porta ".concat(_this.port));
                resolve();
            });
            _this.wss.on('connection', function (ws, req) {
                var clientId = (0, uuid_1.v4)();
                console.log("[Gateway] Nova conex\u00E3o: ".concat(clientId, " de ").concat(req.socket.remoteAddress));
                var clientMeta = {
                    id: clientId,
                    channelType: 'web',
                    authenticated: false,
                    connectedAt: new Date(),
                };
                _this.clients.set(clientId, { ws: ws, meta: clientMeta });
                ws.on('message', function (data) { return __awaiter(_this, void 0, void 0, function () {
                    var parsed, err_2;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                _a.trys.push([0, 2, , 3]);
                                parsed = JSON.parse(data.toString());
                                return [4 /*yield*/, this.handleWSMessage(clientId, parsed)];
                            case 1:
                                _a.sent();
                                return [3 /*break*/, 3];
                            case 2:
                                err_2 = _a.sent();
                                this.sendToClient(clientId, {
                                    type: 'error',
                                    payload: { message: 'Mensagem inválida' },
                                });
                                return [3 /*break*/, 3];
                            case 3: return [2 /*return*/];
                        }
                    });
                }); });
                ws.on('close', function () {
                    var client = _this.clients.get(clientId);
                    if (client) {
                        _this.emitEvent({
                            type: 'channel_disconnected',
                            payload: { channel: client.meta.channelType },
                        });
                    }
                    _this.clients.delete(clientId);
                    console.log("[Gateway] Cliente desconectado: ".concat(clientId));
                });
                ws.on('error', function (err) {
                    console.error("[Gateway] Erro no cliente ".concat(clientId, ":"), err.message);
                });
                // Solicita autenticação
                _this.sendToClient(clientId, {
                    type: 'auth_required',
                    payload: { message: 'Envie o token de autenticação.' },
                });
            });
        });
    };
    Gateway.prototype.stop = function () {
        var _this = this;
        return new Promise(function (resolve) {
            if (_this.wss) {
                // Fecha todas as conexões
                for (var _i = 0, _a = _this.clients; _i < _a.length; _i++) {
                    var _b = _a[_i], ws = _b[1].ws;
                    ws.close(1000, 'Servidor encerrando');
                }
                _this.clients.clear();
                _this.wss.close(function () {
                    console.log('[Gateway] Servidor encerrado.');
                    resolve();
                });
            }
            else {
                resolve();
            }
        });
    };
    // ─── Internal WS Message Handling ──────────────────────────
    Gateway.prototype.handleWSMessage = function (clientId, msg) {
        return __awaiter(this, void 0, void 0, function () {
            var client, _a, token, incomingMsg, senderName, metadata, response;
            var _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        client = this.clients.get(clientId);
                        if (!client)
                            return [2 /*return*/];
                        _a = msg.type;
                        switch (_a) {
                            case 'auth': return [3 /*break*/, 1];
                            case 'message': return [3 /*break*/, 5];
                        }
                        return [3 /*break*/, 10];
                    case 1:
                        token = msg.payload['token'];
                        if (!(token === this.token)) return [3 /*break*/, 3];
                        client.meta.authenticated = true;
                        client.meta.channelType = (_b = msg.payload['channel']) !== null && _b !== void 0 ? _b : 'web';
                        this.sendToClient(clientId, {
                            type: 'auth_success',
                            payload: { message: 'Autenticado com sucesso!' },
                        });
                        return [4 /*yield*/, this.emitEvent({
                                type: 'channel_connected',
                                payload: { channel: client.meta.channelType },
                            })];
                    case 2:
                        _e.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        this.sendToClient(clientId, {
                            type: 'auth_failed',
                            payload: { message: 'Token inválido.' },
                        });
                        _e.label = 4;
                    case 4: return [3 /*break*/, 11];
                    case 5:
                        if (!client.meta.authenticated) {
                            this.sendToClient(clientId, {
                                type: 'error',
                                payload: { message: 'Não autenticado. Envie auth primeiro.' },
                            });
                            return [2 /*return*/];
                        }
                        incomingMsg = {
                            id: (0, uuid_1.v4)(),
                            channel: client.meta.channelType,
                            senderId: (_c = msg.payload['senderId']) !== null && _c !== void 0 ? _c : clientId,
                            text: (_d = msg.payload['text']) !== null && _d !== void 0 ? _d : '',
                            timestamp: new Date(),
                        };
                        senderName = msg.payload['senderName'];
                        if (senderName) {
                            incomingMsg.senderName = senderName;
                        }
                        metadata = msg.payload['metadata'];
                        if (metadata) {
                            incomingMsg.metadata = metadata;
                        }
                        return [4 /*yield*/, this.emitEvent({
                                type: 'message_received',
                                payload: incomingMsg,
                            })];
                    case 6:
                        _e.sent();
                        if (!this.messageHandler) return [3 /*break*/, 9];
                        return [4 /*yield*/, this.messageHandler(incomingMsg)];
                    case 7:
                        response = _e.sent();
                        if (!response) return [3 /*break*/, 9];
                        this.sendToClient(clientId, {
                            type: 'response',
                            payload: response,
                        });
                        return [4 /*yield*/, this.emitEvent({
                                type: 'message_sent',
                                payload: __assign(__assign({}, response), { recipientId: incomingMsg.senderId }),
                            })];
                    case 8:
                        _e.sent();
                        _e.label = 9;
                    case 9: return [3 /*break*/, 11];
                    case 10:
                        this.sendToClient(clientId, {
                            type: 'error',
                            payload: { message: "Tipo de mensagem desconhecido: ".concat(msg.type) },
                        });
                        _e.label = 11;
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    // ─── Utilities ─────────────────────────────────────────────
    Gateway.prototype.sendToClient = function (clientId, msg) {
        var client = this.clients.get(clientId);
        if (client && client.ws.readyState === ws_1.WebSocket.OPEN) {
            client.ws.send(JSON.stringify(msg));
        }
    };
    /**
     * Envia uma mensagem para todos os clientes autenticados de um canal específico.
     */
    Gateway.prototype.broadcast = function (channelType, msg) {
        for (var _i = 0, _a = this.clients; _i < _a.length; _i++) {
            var _b = _a[_i], id = _b[0], meta = _b[1].meta;
            if (meta.authenticated && meta.channelType === channelType) {
                this.sendToClient(id, {
                    type: 'response',
                    payload: msg,
                });
            }
        }
    };
    /**
     * Retorna informações sobre os clientes conectados.
     */
    Gateway.prototype.getConnectedClients = function () {
        return __spreadArray([], this.clients.values(), true).map(function (c) { return c.meta; });
    };
    return Gateway;
}());
exports.Gateway = Gateway;
