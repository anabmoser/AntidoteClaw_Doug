"use strict";
/**
 * GravityClaw — Webhook Triggers
 *
 * Servidor HTTP leve que recebe webhooks de serviços externos
 * (Zapier, n8n, Shopify, GitHub, etc.) e aciona o agente.
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
exports.WebhookServer = void 0;
var node_http_1 = require("node:http");
var WebhookServer = /** @class */ (function () {
    function WebhookServer(options) {
        this.server = null;
        this.routes = new Map();
        this.port = options.port;
        this.token = options.token;
    }
    // ─── Route Registration ────────────────────────────────────
    /**
     * Registra uma rota de webhook.
     * @param path Caminho da URL (ex: "/webhook/zapier")
     * @param name Nome descritivo
     * @param handler Função que processa o payload do webhook
     */
    WebhookServer.prototype.addRoute = function (path, name, handler) {
        this.routes.set(path, { path: path, name: name, handler: handler });
        console.log("[Webhook] Rota registrada: ".concat(name, " \u2192 ").concat(path));
    };
    /**
     * Remove uma rota pelo caminho.
     */
    WebhookServer.prototype.removeRoute = function (path) {
        return this.routes.delete(path);
    };
    /**
     * Lista todas as rotas registradas.
     */
    WebhookServer.prototype.listRoutes = function () {
        return __spreadArray([], this.routes.values(), true);
    };
    // ─── Server Lifecycle ──────────────────────────────────────
    WebhookServer.prototype.start = function () {
        var _this = this;
        return new Promise(function (resolve) {
            _this.server = (0, node_http_1.createServer)(function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.handleRequest(req, res)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            _this.server.listen(_this.port, function () {
                console.log("[Webhook] \uD83D\uDD17 Servidor HTTP na porta ".concat(_this.port));
                resolve();
            });
        });
    };
    WebhookServer.prototype.stop = function () {
        var _this = this;
        return new Promise(function (resolve) {
            if (_this.server) {
                _this.server.close(function () {
                    console.log('[Webhook] Servidor encerrado.');
                    resolve();
                });
            }
            else {
                resolve();
            }
        });
    };
    // ─── Request Handler ───────────────────────────────────────
    WebhookServer.prototype.handleRequest = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var url, path, authHeader, queryToken, route, body, headers, _i, _a, _b, key, value, response, err_1, msg;
            var _c, _d, _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        url = new URL((_c = req.url) !== null && _c !== void 0 ? _c : '/', "http://localhost:".concat(this.port));
                        path = url.pathname;
                        // Health check
                        if (path === '/health') {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ status: 'ok', routes: this.routes.size }));
                            return [2 /*return*/];
                        }
                        // Apenas POST é aceito para webhooks
                        if (req.method !== 'POST') {
                            res.writeHead(405, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Método não permitido. Use POST.' }));
                            return [2 /*return*/];
                        }
                        authHeader = (_d = req.headers['authorization']) !== null && _d !== void 0 ? _d : '';
                        queryToken = (_e = url.searchParams.get('token')) !== null && _e !== void 0 ? _e : '';
                        if (authHeader !== "Bearer ".concat(this.token) && queryToken !== this.token) {
                            res.writeHead(401, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Não autorizado.' }));
                            return [2 /*return*/];
                        }
                        route = this.routes.get(path);
                        if (!route) {
                            res.writeHead(404, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: "Rota n\u00E3o encontrada: ".concat(path) }));
                            return [2 /*return*/];
                        }
                        _g.label = 1;
                    case 1:
                        _g.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, this.readBody(req)];
                    case 2:
                        body = _g.sent();
                        headers = {};
                        for (_i = 0, _a = Object.entries(req.headers); _i < _a.length; _i++) {
                            _b = _a[_i], key = _b[0], value = _b[1];
                            if (typeof value === 'string')
                                headers[key] = value;
                        }
                        console.log("[Webhook] \u26A1 ".concat(route.name, " via ").concat(path));
                        return [4 /*yield*/, route.handler(body, headers)];
                    case 3:
                        response = _g.sent();
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            ok: true,
                            response: (_f = response === null || response === void 0 ? void 0 : response.text) !== null && _f !== void 0 ? _f : 'Processado',
                        }));
                        return [3 /*break*/, 5];
                    case 4:
                        err_1 = _g.sent();
                        msg = err_1 instanceof Error ? err_1.message : String(err_1);
                        console.error("[Webhook] Erro em ".concat(route.name, ": ").concat(msg));
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: msg }));
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    // ─── Helpers ───────────────────────────────────────────────
    WebhookServer.prototype.readBody = function (req) {
        return new Promise(function (resolve, reject) {
            var chunks = [];
            req.on('data', function (chunk) { return chunks.push(chunk); });
            req.on('end', function () {
                try {
                    var raw = Buffer.concat(chunks).toString('utf-8');
                    var parsed = raw ? JSON.parse(raw) : {};
                    resolve(parsed);
                }
                catch (_a) {
                    resolve({});
                }
            });
            req.on('error', reject);
        });
    };
    return WebhookServer;
}());
exports.WebhookServer = WebhookServer;
