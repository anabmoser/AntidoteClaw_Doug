"use strict";
/**
 * GravityClaw — Two-Layer Memory System
 *
 * Camada 1: Fatos rápidos (MEMORY.md) — informações-chave do usuário.
 * Camada 2: Log de histórico pesquisável (JSON) — conversa completa.
 *
 * Também inclui compactação automática de sessões longas.
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
exports.MemoryManager = void 0;
var promises_1 = require("node:fs/promises");
var node_path_1 = require("node:path");
var node_fs_1 = require("node:fs");
var uuid_1 = require("uuid");
var DEFAULT_MEMORY_DIR = (0, node_path_1.resolve)(process.cwd(), 'data', 'memory');
var MemoryManager = /** @class */ (function () {
    function MemoryManager(memoryDir) {
        this.facts = [];
        this.history = [];
        this.maxHistoryBeforeCompaction = 200;
        this.memoryDir = memoryDir !== null && memoryDir !== void 0 ? memoryDir : DEFAULT_MEMORY_DIR;
    }
    // ─── Inicialização ────────────────────────────────────────
    MemoryManager.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!(0, node_fs_1.existsSync)(this.memoryDir)) return [3 /*break*/, 2];
                        return [4 /*yield*/, (0, promises_1.mkdir)(this.memoryDir, { recursive: true })];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [4 /*yield*/, this.loadFacts()];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, this.loadHistory()];
                    case 4:
                        _a.sent();
                        console.log("[Memory] Inicializada: ".concat(this.facts.length, " fatos, ").concat(this.history.length, " entradas de hist\u00F3rico"));
                        return [2 /*return*/];
                }
            });
        });
    };
    Object.defineProperty(MemoryManager.prototype, "factsPath", {
        // ─── Camada 1: Fatos Rápidos (MEMORY.md) ──────────────────
        get: function () {
            return (0, node_path_1.join)(this.memoryDir, 'MEMORY.md');
        },
        enumerable: false,
        configurable: true
    });
    MemoryManager.prototype.loadFacts = function () {
        return __awaiter(this, void 0, void 0, function () {
            var raw, _i, _a, line, match;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(0, node_fs_1.existsSync)(this.factsPath)) {
                            this.facts = [];
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, (0, promises_1.readFile)(this.factsPath, 'utf-8')];
                    case 1:
                        raw = _b.sent();
                        this.facts = [];
                        for (_i = 0, _a = raw.split('\n'); _i < _a.length; _i++) {
                            line = _a[_i];
                            match = line.match(/^-\s+\*\*(.+?)\*\*:\s*(.+)/);
                            if (match && match[1] && match[2]) {
                                this.facts.push({
                                    key: match[1].trim(),
                                    value: match[2].trim(),
                                    updatedAt: new Date(),
                                });
                            }
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    MemoryManager.prototype.saveFacts = function () {
        return __awaiter(this, void 0, void 0, function () {
            var lines, _i, _a, fact;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        lines = ['# Memória — Fatos Rápidos\n'];
                        for (_i = 0, _a = this.facts; _i < _a.length; _i++) {
                            fact = _a[_i];
                            lines.push("- **".concat(fact.key, "**: ").concat(fact.value));
                        }
                        return [4 /*yield*/, (0, promises_1.writeFile)(this.factsPath, lines.join('\n'), 'utf-8')];
                    case 1:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    MemoryManager.prototype.setFact = function (key, value) {
        return __awaiter(this, void 0, void 0, function () {
            var existing;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        existing = this.facts.find(function (f) { return f.key.toLowerCase() === key.toLowerCase(); });
                        if (existing) {
                            existing.value = value;
                            existing.updatedAt = new Date();
                        }
                        else {
                            this.facts.push({ key: key, value: value, updatedAt: new Date() });
                        }
                        return [4 /*yield*/, this.saveFacts()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    MemoryManager.prototype.getFact = function (key) {
        var _a;
        return (_a = this.facts.find(function (f) { return f.key.toLowerCase() === key.toLowerCase(); })) === null || _a === void 0 ? void 0 : _a.value;
    };
    MemoryManager.prototype.getAllFacts = function () {
        return __spreadArray([], this.facts, true);
    };
    MemoryManager.prototype.removeFact = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            var idx;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        idx = this.facts.findIndex(function (f) { return f.key.toLowerCase() === key.toLowerCase(); });
                        if (idx === -1)
                            return [2 /*return*/, false];
                        this.facts.splice(idx, 1);
                        return [4 /*yield*/, this.saveFacts()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, true];
                }
            });
        });
    };
    Object.defineProperty(MemoryManager.prototype, "historyPath", {
        // ─── Camada 2: Histórico Pesquisável ───────────────────────
        get: function () {
            return (0, node_path_1.join)(this.memoryDir, 'history.json');
        },
        enumerable: false,
        configurable: true
    });
    MemoryManager.prototype.getAllEntries = function () {
        return this.history;
    };
    MemoryManager.prototype.getFacts = function () {
        return this.facts;
    };
    MemoryManager.prototype.loadHistory = function () {
        return __awaiter(this, void 0, void 0, function () {
            var raw;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(0, node_fs_1.existsSync)(this.historyPath)) {
                            this.history = [];
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, (0, promises_1.readFile)(this.historyPath, 'utf-8')];
                    case 1:
                        raw = _a.sent();
                        try {
                            this.history = JSON.parse(raw);
                        }
                        catch (_b) {
                            this.history = [];
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    MemoryManager.prototype.saveHistory = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, promises_1.writeFile)(this.historyPath, JSON.stringify(this.history, null, 2), 'utf-8')];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    MemoryManager.prototype.addEntry = function (role, content, channel, senderId, llmRouter) {
        return __awaiter(this, void 0, void 0, function () {
            var vector, err_1, entry;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!llmRouter) return [3 /*break*/, 4];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, llmRouter.embed(content)];
                    case 2:
                        vector = _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _a.sent();
                        console.warn('[Memory] Falha ao gerar embedding para nova entrada:', err_1);
                        return [3 /*break*/, 4];
                    case 4:
                        entry = {
                            id: (0, uuid_1.v4)(),
                            timestamp: new Date(),
                            role: role,
                            content: content,
                            channel: channel,
                            senderId: senderId,
                        };
                        if (vector !== undefined) {
                            entry.vector = vector;
                        }
                        this.history.push(entry);
                        if (!(this.history.length > this.maxHistoryBeforeCompaction)) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.compactHistory()];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6: return [4 /*yield*/, this.saveHistory()];
                    case 7:
                        _a.sent();
                        return [2 /*return*/, entry];
                }
            });
        });
    };
    MemoryManager.prototype.cosineSimilarity = function (vecA, vecB) {
        if (vecA.length !== vecB.length || vecA.length === 0)
            return 0;
        var dotProduct = 0;
        var normA = 0;
        var normB = 0;
        for (var i = 0; i < vecA.length; i++) {
            var a = vecA[i];
            var b = vecB[i];
            dotProduct += a * b;
            normA += a * a;
            normB += b * b;
        }
        if (normA === 0 || normB === 0)
            return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    };
    /**
     * Busca Híbrida no histórico: (Keyword Search simples + Vector Cosine Similarity).
     * Retorna as entradas mais relevantes ordenadas por score.
     */
    MemoryManager.prototype.search = function (query_1) {
        return __awaiter(this, arguments, void 0, function (query, limit, llmRouter) {
            var terms, queryVector, err_2, scored, _i, _a, entry, text, keywordScore, _b, terms_1, term, matches, vectorScore, sim, baseScore, ageMs, ageDays, recencyBoost, finalScore;
            if (limit === void 0) { limit = 10; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        terms = query.toLowerCase().split(/\s+/).filter(function (t) { return t.length > 2; });
                        if (terms.length === 0)
                            return [2 /*return*/, []];
                        if (!llmRouter) return [3 /*break*/, 4];
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, llmRouter.embed(query)];
                    case 2:
                        queryVector = _c.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_2 = _c.sent();
                        console.warn('[Memory] Falha ao gerar embedding para query de busca:', err_2);
                        return [3 /*break*/, 4];
                    case 4:
                        scored = [];
                        for (_i = 0, _a = this.history; _i < _a.length; _i++) {
                            entry = _a[_i];
                            text = entry.content.toLowerCase();
                            keywordScore = 0;
                            for (_b = 0, terms_1 = terms; _b < terms_1.length; _b++) {
                                term = terms_1[_b];
                                if (text.includes(term)) {
                                    matches = text.split(term).length - 1;
                                    keywordScore += matches;
                                }
                            }
                            vectorScore = 0;
                            if (queryVector && entry.vector && entry.vector.length > 0) {
                                sim = this.cosineSimilarity(queryVector, entry.vector);
                                if (sim > 0)
                                    vectorScore = sim * 5; // Scale up to merge with keyword occurrence scale
                            }
                            baseScore = (vectorScore * 0.7) + (keywordScore * 0.3);
                            if (baseScore > 0.1) {
                                ageMs = Date.now() - new Date(entry.timestamp).getTime();
                                ageDays = ageMs / (1000 * 60 * 60 * 24);
                                recencyBoost = Math.max(0.1, 1.0 - ageDays * 0.02);
                                finalScore = baseScore * recencyBoost;
                                scored.push({ entry: entry, score: finalScore });
                            }
                        }
                        return [2 /*return*/, scored
                                .sort(function (a, b) { return b.score - a.score; })
                                .slice(0, limit)];
                }
            });
        });
    };
    /**
     * Retorna as últimas N entradas do histórico (para contexto da conversa).
     */
    MemoryManager.prototype.getRecentHistory = function (count) {
        if (count === void 0) { count = 20; }
        return this.history.slice(-count);
    };
    // ─── Compactação Automática ────────────────────────────────
    /**
     * Compacta as entradas mais antigas, preservando as últimas 50.
     * As antigas são resumidas e salvas como uma única entrada "compactada".
     */
    MemoryManager.prototype.compactHistory = function () {
        return __awaiter(this, void 0, void 0, function () {
            var keepRecent, toCompact, kept, summaryLines, compactedEntry;
            return __generator(this, function (_a) {
                keepRecent = 50;
                if (this.history.length <= keepRecent)
                    return [2 /*return*/];
                toCompact = this.history.slice(0, this.history.length - keepRecent);
                kept = this.history.slice(-keepRecent);
                summaryLines = toCompact.map(function (e) {
                    var date = new Date(e.timestamp).toISOString().split('T')[0];
                    return "[".concat(date, "] ").concat(e.role, ": ").concat(e.content.slice(0, 100)).concat(e.content.length > 100 ? '...' : '');
                });
                compactedEntry = {
                    id: (0, uuid_1.v4)(),
                    timestamp: new Date(toCompact[0].timestamp),
                    role: 'assistant',
                    content: "[HIST\u00D3RICO COMPACTADO - ".concat(toCompact.length, " mensagens]\n").concat(summaryLines.join('\n')),
                    channel: 'web',
                    senderId: 'system',
                    summary: "Resumo de ".concat(toCompact.length, " mensagens compactadas"),
                };
                this.history = __spreadArray([compactedEntry], kept, true);
                console.log("[Memory] Compacta\u00E7\u00E3o: ".concat(toCompact.length, " entradas \u2192 1 resumo + ").concat(kept.length, " recentes"));
                return [2 /*return*/];
            });
        });
    };
    /**
     * Retorna o número total de entradas de histórico.
     */
    MemoryManager.prototype.getHistoryCount = function () {
        return this.history.length;
    };
    return MemoryManager;
}());
exports.MemoryManager = MemoryManager;
