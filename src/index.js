"use strict";
/**
 * GravityClaw — Entry Point
 *
 * Inicializa e conecta todos os módulos do framework:
 * Agent, Gateway, Channels, Scheduler, Webhooks, Skills.
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
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv = require("dotenv");
dotenv.config({ override: true });
var agent_js_1 = require("./core/agent.js");
var websocket_js_1 = require("./gateway/websocket.js");
var api_js_1 = require("./gateway/api.js");
var telegram_js_1 = require("./channels/telegram.js");
var scheduler_js_1 = require("./automation/scheduler.js");
var webhooks_js_1 = require("./automation/webhooks.js");
var weather_js_1 = require("./skills/builtin/weather.js");
var writer_js_1 = require("./specialists/writer.js");
var designer_js_1 = require("./specialists/designer.js");
var scout_js_1 = require("./specialists/scout.js");
var video_js_1 = require("./specialists/video.js");
var social_js_1 = require("./specialists/social.js");
var drive_js_1 = require("./services/drive.js");
function bootstrap() {
    return __awaiter(this, void 0, void 0, function () {
        var gatewayPort, gatewayToken, webhookPort, driveService, driveRootId, err_1, msg, agentConfig, agent, orch, leonardoKey, braveKey, assemblyaiKey, gateway, sqlitePath, err_2, githubToken, err_3, notionToken, err_4, gdriveToken, err_5, postgresUrl, err_6, err_7, telegram, telegramToken, allowedIds, err_8, msg, scheduler, heartbeat, webhookServer, dashboard, soul, skills, shutdown;
        var _this = this;
        var _a, _b, _c, _d, _e, _f, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    console.log('');
                    console.log('╔══════════════════════════════════════════╗');
                    console.log('║       🤖 Doug AI — Content Engine      ║');
                    console.log('║          v1.1.0 — Starting up…           ║');
                    console.log('╚══════════════════════════════════════════╝');
                    console.log('');
                    gatewayPort = parseInt((_a = process.env['GATEWAY_PORT']) !== null && _a !== void 0 ? _a : '3100', 10);
                    gatewayToken = (_b = process.env['GATEWAY_TOKEN']) !== null && _b !== void 0 ? _b : 'dev-token';
                    webhookPort = parseInt((_c = process.env['WEBHOOK_PORT']) !== null && _c !== void 0 ? _c : '3101', 10);
                    driveService = null;
                    driveRootId = process.env['GOOGLE_DRIVE_ROOT_FOLDER_ID'];
                    if (!driveRootId) return [3 /*break*/, 5];
                    _h.label = 1;
                case 1:
                    _h.trys.push([1, 3, , 4]);
                    driveService = new drive_js_1.DriveService(driveRootId);
                    return [4 /*yield*/, driveService.init()];
                case 2:
                    _h.sent();
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _h.sent();
                    msg = err_1 instanceof Error ? err_1.message : String(err_1);
                    console.error("[Main] \u26A0\uFE0F Falha ao conectar Google Drive: ".concat(msg));
                    driveService = null;
                    return [3 /*break*/, 4];
                case 4: return [3 /*break*/, 6];
                case 5:
                    console.log('[Main] Google Drive não configurado (GOOGLE_DRIVE_ROOT_FOLDER_ID ausente)');
                    _h.label = 6;
                case 6:
                    agentConfig = {
                        openRouterApiKey: process.env['OPENROUTER_API_KEY'],
                        memoryDir: process.env['MEMORY_DIR'],
                    };
                    if (driveService) {
                        agentConfig.driveService = driveService;
                    }
                    agent = new agent_js_1.Agent(agentConfig);
                    return [4 /*yield*/, agent.init()];
                case 7:
                    _h.sent();
                    // ─── Registra Skills Integradas ────────────────────────────
                    agent.getSkills().register(weather_js_1.weatherSkill);
                    orch = agent.getOrchestrator();
                    orch.register(writer_js_1.writerSpecialist);
                    leonardoKey = process.env['LEONARDO_API_KEY'];
                    if (leonardoKey) {
                        orch.register(new designer_js_1.DesignerSpecialist(leonardoKey));
                    }
                    braveKey = process.env['BRAVE_SEARCH_API_KEY'];
                    if (braveKey) {
                        orch.register(new scout_js_1.ScoutSpecialist(braveKey));
                    }
                    assemblyaiKey = process.env['ASSEMBLYAI_API_KEY'];
                    if (assemblyaiKey) {
                        orch.register(new video_js_1.VideoSpecialist(assemblyaiKey, driveService));
                    }
                    orch.register(social_js_1.socialSpecialist);
                    gateway = new websocket_js_1.Gateway({
                        port: gatewayPort,
                        token: gatewayToken,
                    });
                    gateway.onMessage(function (incoming) { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/, agent.processMessage(incoming)];
                        });
                    }); });
                    gateway.onEvent(function (event) { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (event.type) {
                                case 'channel_connected':
                                    console.log("[Main] Canal conectado: ".concat(event.payload.channel));
                                    break;
                                case 'channel_disconnected':
                                    console.log("[Main] Canal desconectado: ".concat(event.payload.channel));
                                    break;
                                case 'message_received':
                                    console.log("[Main] \uD83D\uDCE9 ".concat(event.payload.channel, "/").concat(event.payload.senderId, ": ").concat(event.payload.text.slice(0, 60)).concat(event.payload.text.length > 60 ? '...' : ''));
                                    break;
                                case 'error':
                                    console.error("[Main] \u274C Erro:", event.payload.error.message);
                                    break;
                            }
                            return [2 /*return*/];
                        });
                    }); });
                    return [4 /*yield*/, gateway.start()];
                case 8:
                    _h.sent();
                    sqlitePath = process.env.MCP_SQLITE_PATH;
                    if (!sqlitePath) return [3 /*break*/, 12];
                    _h.label = 9;
                case 9:
                    _h.trys.push([9, 11, , 12]);
                    return [4 /*yield*/, agent.getMcpManager().connectStdioServer({
                            name: 'sqlite_local',
                            command: 'npx',
                            args: ['-y', '@modelcontextprotocol/server-sqlite', sqlitePath]
                        })];
                case 10:
                    _h.sent();
                    console.log("[Main] MCP SQLite Server inicializado em: ".concat(sqlitePath));
                    return [3 /*break*/, 12];
                case 11:
                    err_2 = _h.sent();
                    console.warn('[Main] Falha ao inicializar MCP SQLite Server:', err_2);
                    return [3 /*break*/, 12];
                case 12:
                    githubToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
                    if (!githubToken) return [3 /*break*/, 16];
                    _h.label = 13;
                case 13:
                    _h.trys.push([13, 15, , 16]);
                    return [4 /*yield*/, agent.getMcpManager().connectStdioServer({
                            name: 'github',
                            command: 'npx',
                            args: ['-y', '@modelcontextprotocol/server-github'],
                            env: __assign(__assign({}, process.env), { GITHUB_PERSONAL_ACCESS_TOKEN: githubToken })
                        })];
                case 14:
                    _h.sent();
                    console.log("[Main] \uD83D\uDC19 MCP GitHub Server conectado com sucesso.");
                    return [3 /*break*/, 16];
                case 15:
                    err_3 = _h.sent();
                    console.warn('[Main] Falha ao inicializar MCP GitHub Server:', err_3);
                    return [3 /*break*/, 16];
                case 16:
                    notionToken = process.env.NOTION_API_KEY;
                    if (!notionToken) return [3 /*break*/, 20];
                    _h.label = 17;
                case 17:
                    _h.trys.push([17, 19, , 20]);
                    return [4 /*yield*/, agent.getMcpManager().connectStdioServer({
                            name: 'notion',
                            command: 'npx',
                            args: ['-y', '@notionhq/notion-mcp-server'],
                            env: __assign(__assign({}, process.env), { NOTION_API_KEY: notionToken })
                        })];
                case 18:
                    _h.sent();
                    console.log("[Main] \uD83D\uDCDD MCP Notion Server conectado com sucesso.");
                    return [3 /*break*/, 20];
                case 19:
                    err_4 = _h.sent();
                    console.warn('[Main] Falha ao inicializar MCP Notion Server:', err_4);
                    return [3 /*break*/, 20];
                case 20:
                    gdriveToken = process.env.GOOGLE_DRIVE_MCP_AUTH_TOKEN;
                    if (!gdriveToken) return [3 /*break*/, 24];
                    _h.label = 21;
                case 21:
                    _h.trys.push([21, 23, , 24]);
                    return [4 /*yield*/, agent.getMcpManager().connectStdioServer({
                            name: 'google-drive',
                            command: 'npx',
                            args: ['-y', '@modelcontextprotocol/server-google-drive'],
                            env: __assign(__assign({}, process.env), { 
                                // Drive MCP expects credentials mechanism, usually configured via JSON path or tokens.
                                // This is a placeholder standard environment variable, users must configure appropriately.
                                GOOGLE_DRIVE_AUTH_TOKEN: gdriveToken })
                        })];
                case 22:
                    _h.sent();
                    console.log("[Main] \u2601\uFE0F MCP Google Drive Server conectado com sucesso.");
                    return [3 /*break*/, 24];
                case 23:
                    err_5 = _h.sent();
                    console.warn('[Main] Falha ao inicializar MCP Google Drive Server:', err_5);
                    return [3 /*break*/, 24];
                case 24:
                    postgresUrl = process.env.MCP_POSTGRES_URL;
                    if (!postgresUrl) return [3 /*break*/, 28];
                    _h.label = 25;
                case 25:
                    _h.trys.push([25, 27, , 28]);
                    return [4 /*yield*/, agent.getMcpManager().connectStdioServer({
                            name: 'postgres',
                            command: 'npx',
                            args: ['-y', '@modelcontextprotocol/server-postgres', postgresUrl]
                        })];
                case 26:
                    _h.sent();
                    console.log("[Main] \uD83D\uDC18 MCP PostgreSQL Server conectado com sucesso.");
                    return [3 /*break*/, 28];
                case 27:
                    err_6 = _h.sent();
                    console.warn('[Main] Falha ao inicializar MCP PostgreSQL Server:', err_6);
                    return [3 /*break*/, 28];
                case 28:
                    _h.trys.push([28, 30, , 31]);
                    return [4 /*yield*/, agent.getMcpManager().connectStdioServer({
                            name: 'puppeteer',
                            command: 'npx',
                            args: ['-y', '@modelcontextprotocol/server-puppeteer']
                        })];
                case 29:
                    _h.sent();
                    console.log("[Main] \uD83C\uDF10 MCP Puppeteer Server conectado com sucesso.");
                    return [3 /*break*/, 31];
                case 30:
                    err_7 = _h.sent();
                    console.warn('[Main] Falha ao inicializar MCP Puppeteer Server:', err_7);
                    return [3 /*break*/, 31];
                case 31:
                    telegram = null;
                    telegramToken = process.env['TELEGRAM_BOT_TOKEN'];
                    if (!telegramToken) return [3 /*break*/, 36];
                    allowedIds = (_d = process.env['TELEGRAM_ALLOWED_CHAT_IDS']) === null || _d === void 0 ? void 0 : _d.split(',').map(function (id) { return parseInt(id.trim(), 10); }).filter(function (id) { return !isNaN(id); });
                    telegram = new telegram_js_1.TelegramChannel({
                        botToken: telegramToken,
                        onMessage: function (incoming, sendProgress, sendFile) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, agent.processMessage(incoming, sendProgress, sendFile)];
                        }); }); },
                        allowedChatIds: allowedIds,
                    });
                    _h.label = 32;
                case 32:
                    _h.trys.push([32, 34, , 35]);
                    return [4 /*yield*/, telegram.start()];
                case 33:
                    _h.sent();
                    return [3 /*break*/, 35];
                case 34:
                    err_8 = _h.sent();
                    msg = err_8 instanceof Error ? err_8.message : String(err_8);
                    console.error("[Main] \u26A0\uFE0F Falha ao iniciar Telegram: ".concat(msg));
                    telegram = null;
                    return [3 /*break*/, 35];
                case 35: return [3 /*break*/, 37];
                case 36:
                    console.log('[Main] Telegram não configurado (TELEGRAM_BOT_TOKEN ausente)');
                    _h.label = 37;
                case 37:
                    scheduler = new scheduler_js_1.Scheduler();
                    heartbeat = new scheduler_js_1.Heartbeat(scheduler, function () { return __awaiter(_this, void 0, void 0, function () {
                        var soul;
                        var _a;
                        return __generator(this, function (_b) {
                            soul = agent.getSoul();
                            console.log("[Heartbeat] \uD83D\uDC93 ".concat((_a = soul === null || soul === void 0 ? void 0 : soul.name) !== null && _a !== void 0 ? _a : 'GravityClaw', " est\u00E1 vivo \u2014 ").concat(new Date().toLocaleTimeString('pt-BR')));
                            return [2 /*return*/];
                        });
                    }); }, parseInt((_e = process.env['HEARTBEAT_INTERVAL_MIN']) !== null && _e !== void 0 ? _e : '30', 10));
                    heartbeat.start();
                    scheduler.start();
                    webhookServer = new webhooks_js_1.WebhookServer({
                        port: webhookPort,
                        token: gatewayToken,
                    });
                    // Rota genérica: qualquer serviço externo pode acionar o agente
                    webhookServer.addRoute('/webhook/trigger', 'Gatilho Genérico', function (body) { return __awaiter(_this, void 0, void 0, function () {
                        var text;
                        var _a, _b, _c;
                        return __generator(this, function (_d) {
                            text = (_b = (_a = body['message']) !== null && _a !== void 0 ? _a : body['text']) !== null && _b !== void 0 ? _b : JSON.stringify(body);
                            return [2 /*return*/, agent.processMessage({
                                    id: crypto.randomUUID(),
                                    channel: 'webhook',
                                    senderId: (_c = body['source']) !== null && _c !== void 0 ? _c : 'webhook',
                                    text: text,
                                    timestamp: new Date(),
                                })];
                        });
                    }); });
                    return [4 /*yield*/, webhookServer.start()];
                case 38:
                    _h.sent();
                    dashboard = new api_js_1.DashboardApi(agent, agent.memory, agent.getSkills());
                    dashboard.start();
                    soul = agent.getSoul();
                    skills = agent.getSkills().list();
                    console.log('');
                    console.log('┌──────────────────────────────────────────────┐');
                    console.log("\u2502  \uD83E\uDD16 ".concat(((_f = soul === null || soul === void 0 ? void 0 : soul.name) !== null && _f !== void 0 ? _f : 'GravityClaw').padEnd(41), "\u2502"));
                    console.log('├──────────────────────────────────────────────┤');
                    console.log("\u2502  Gateway WS : ws://localhost:".concat(String(gatewayPort).padEnd(16), "\u2502"));
                    console.log("\u2502  Webhook HTTP: http://localhost:".concat(String(webhookPort).padEnd(13), "\u2502"));
                    console.log("\u2502  Telegram  : ".concat((telegram ? '✅ Ativo' : '⬚ Não configurado').padEnd(32), "\u2502"));
                    console.log("\u2502  Skills    : ".concat(String(skills.length + ' registrada(s)').padEnd(32), "\u2502"));
                    console.log("\u2502  Heartbeat : \u2705 a cada ".concat((_g = process.env['HEARTBEAT_INTERVAL_MIN']) !== null && _g !== void 0 ? _g : '30', "min").concat(' '.repeat(17), "\u2502"));
                    console.log('└──────────────────────────────────────────────┘');
                    console.log('');
                    console.log('Aguardando conexões e mensagens...');
                    shutdown = function () { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    console.log('\n[Main] 🛑 Encerrando GravityClaw...');
                                    scheduler.stop();
                                    if (!telegram) return [3 /*break*/, 2];
                                    return [4 /*yield*/, telegram.stop()];
                                case 1:
                                    _a.sent();
                                    _a.label = 2;
                                case 2: return [4 /*yield*/, webhookServer.stop()];
                                case 3:
                                    _a.sent();
                                    return [4 /*yield*/, gateway.stop()];
                                case 4:
                                    _a.sent();
                                    console.log('[Main] Encerrado com sucesso. Até logo! 👋');
                                    process.exit(0);
                                    return [2 /*return*/];
                            }
                        });
                    }); };
                    process.on('SIGINT', shutdown);
                    process.on('SIGTERM', shutdown);
                    return [2 /*return*/];
            }
        });
    });
}
bootstrap().catch(function (err) {
    console.error('❌ Erro fatal ao iniciar GravityClaw:', err);
    process.exit(1);
});
