"use strict";
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
exports.DashboardApi = void 0;
// @ts-ignore
var express_1 = require("express");
// @ts-ignore
var cors_1 = require("cors");
var fs = require("node:fs");
var path = require("node:path");
var DashboardApi = /** @class */ (function () {
    function DashboardApi(agent, memory, registry) {
        this.agent = agent;
        this.memory = memory;
        this.registry = registry;
        this.app = (0, express_1.default)();
        this.port = process.env.DASHBOARD_PORT || 3000;
        this.setupRoutes();
    }
    DashboardApi.prototype.setupRoutes = function () {
        var _this = this;
        // Enable CORS for all routes (Dashboard frontend is on 5173)
        this.app.use((0, cors_1.default)());
        this.app.use(express_1.default.json());
        // --- 1. System Status ---
        this.app.get('/api/agent/status', function (req, res) {
            res.json({
                status: 'online',
                version: '1.1.0',
                uptime: process.uptime(),
                memoryUsed: process.memoryUsage().heapUsed,
                mcpServers: _this.agent.getMcpManager() ? 'connected' : 'offline',
            });
        });
        // --- 2. Memory & History ---
        this.app.get('/api/memory/history', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var allEntries, sorted;
            return __generator(this, function (_a) {
                try {
                    allEntries = this.memory.getAllEntries();
                    sorted = allEntries.sort(function (a, b) { return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(); }).slice(0, 200);
                    res.json({ history: sorted });
                }
                catch (err) {
                    res.status(500).json({ error: String(err) });
                }
                return [2 /*return*/];
            });
        }); });
        this.app.get('/api/memory/facts', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var facts;
            return __generator(this, function (_a) {
                try {
                    facts = this.memory.getFacts();
                    res.json({ facts: facts });
                }
                catch (err) {
                    res.status(500).json({ error: String(err) });
                }
                return [2 /*return*/];
            });
        }); });
        // --- 3. MCP Servers ---
        this.app.get('/api/mcp/servers', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var tools, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.agent.getMcpManager().listAllTools()];
                    case 1:
                        tools = _a.sent();
                        res.json({ servers: tools });
                        return [3 /*break*/, 3];
                    case 2:
                        err_1 = _a.sent();
                        res.status(500).json({ error: String(err_1) });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); });
        // --- 4. Skills ---
        this.app.get('/api/skills', function (req, res) {
            var skills = _this.registry.list().map(function (s) { return ({
                name: s.name,
                version: s.version,
                description: s.description,
            }); });
            res.json({ skills: skills });
        });
        // --- 5. Skill Creator ---
        this.app.post('/api/skills/create', function (req, res) {
            var _a = req.body, name = _a.name, description = _a.description, triggerRegex = _a.triggerRegex, actionCode = _a.actionCode;
            if (!name || !description || !triggerRegex || !actionCode) {
                return res.status(400).json({ error: 'Missing required fields' });
            }
            try {
                // Determine file name
                var safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                var filePath = path.join(process.cwd(), 'src', 'skills', 'custom', "".concat(safeName, ".ts"));
                // Create the dir if not exists
                var dir = path.dirname(filePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                // Write the skeleton logic representing a new skill
                var fileContent = "\nimport { Skill } from '../../core/types.js';\n\nexport const skill: Skill = {\n    name: '".concat(name, "',\n    version: '1.0.0',\n    description: '").concat(description, "',\n    matches: (text) => /").concat(triggerRegex, "/i.test(text),\n    execute: async (context) => {\n        ").concat(actionCode, "\n    }\n};\n");
                fs.writeFileSync(filePath, fileContent.trim());
                res.json({ success: true, message: "Skill ".concat(name, " created at ").concat(filePath) });
            }
            catch (err) {
                res.status(500).json({ error: String(err) });
            }
        });
    };
    DashboardApi.prototype.start = function () {
        var _this = this;
        this.app.listen(this.port, function () {
            console.log("[Dashboard API] \uD83D\uDCCA Servidor REST rodando na porta ".concat(_this.port));
        });
    };
    return DashboardApi;
}());
exports.DashboardApi = DashboardApi;
