"use strict";
/**
 * GravityClaw — Soul Loader
 *
 * Carrega e parseia o arquivo Soul.md, transformando a personalidade
 * do agente em uma configuração estruturada + system prompt para o LLM.
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
exports.loadSoul = loadSoul;
exports.buildSystemPrompt = buildSystemPrompt;
exports.createDynamicRule = createDynamicRule;
var promises_1 = require("node:fs/promises");
var node_path_1 = require("node:path");
var uuid_1 = require("uuid");
var DEFAULT_SOUL_PATH = (0, node_path_1.resolve)(process.cwd(), 'data', 'Soul.md');
/**
 * Parseia seções do arquivo Soul.md para extrair configurações.
 */
function parseSections(markdown) {
    var sections = new Map();
    var currentSection = '';
    for (var _i = 0, _a = markdown.split('\n'); _i < _a.length; _i++) {
        var line = _a[_i];
        var headerMatch = line.match(/^##\s+(.+)/);
        if (headerMatch && headerMatch[1]) {
            currentSection = headerMatch[1].trim().toLowerCase();
            sections.set(currentSection, []);
            continue;
        }
        if (currentSection) {
            var bulletMatch = line.match(/^[-*]\s+\*\*(.+?)\*\*:\s*(.+)/);
            var simpleBullet = line.match(/^[-*]\s+(.+)/);
            if (bulletMatch && bulletMatch[1] && bulletMatch[2]) {
                sections.get(currentSection).push("".concat(bulletMatch[1], ": ").concat(bulletMatch[2]));
            }
            else if (simpleBullet && simpleBullet[1]) {
                sections.get(currentSection).push(simpleBullet[1]);
            }
        }
    }
    return sections;
}
/**
 * Carrega o Soul.md e retorna uma configuração estruturada.
 */
function loadSoul(soulPath) {
    return __awaiter(this, void 0, void 0, function () {
        var filePath, raw, sections, nameMatch;
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        return __generator(this, function (_l) {
            switch (_l.label) {
                case 0:
                    filePath = soulPath !== null && soulPath !== void 0 ? soulPath : DEFAULT_SOUL_PATH;
                    return [4 /*yield*/, (0, promises_1.readFile)(filePath, 'utf-8')];
                case 1:
                    raw = _l.sent();
                    sections = parseSections(raw);
                    nameMatch = raw.match(/^#\s+(.+?)(?:\s*—.*)?$/m);
                    return [2 /*return*/, {
                            name: (_b = (_a = nameMatch === null || nameMatch === void 0 ? void 0 : nameMatch[1]) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : 'GravityClaw',
                            role: (_d = (_c = sections.get('papel')) === null || _c === void 0 ? void 0 : _c[0]) !== null && _d !== void 0 ? _d : 'Assistente de IA',
                            language: (_f = (_e = sections.get('idioma principal')) === null || _e === void 0 ? void 0 : _e[0]) !== null && _f !== void 0 ? _f : 'Português (Brasil)',
                            values: (_g = sections.get('valores')) !== null && _g !== void 0 ? _g : [],
                            tone: (_h = sections.get('tom de comunicação')) !== null && _h !== void 0 ? _h : [],
                            rules: (_j = sections.get('regras de comportamento')) !== null && _j !== void 0 ? _j : [],
                            specialAbilities: (_k = sections.get('habilidades especiais')) !== null && _k !== void 0 ? _k : [],
                        }];
            }
        });
    });
}
/**
 * Constrói o system prompt a partir do SoulConfig para envio ao LLM.
 */
function buildSystemPrompt(soul, dynamicRules) {
    if (dynamicRules === void 0) { dynamicRules = []; }
    var lines = [];
    lines.push("Voc\u00EA \u00E9 ".concat(soul.name, ". ").concat(soul.role));
    lines.push("Idioma preferido: ".concat(soul.language));
    lines.push('');
    if (soul.values.length > 0) {
        lines.push('## Valores');
        soul.values.forEach(function (v) { return lines.push("- ".concat(v)); });
        lines.push('');
    }
    if (soul.tone.length > 0) {
        lines.push('## Tom de Comunicação');
        soul.tone.forEach(function (t) { return lines.push("- ".concat(t)); });
        lines.push('');
    }
    if (soul.rules.length > 0) {
        lines.push('## Regras de Comportamento');
        soul.rules.forEach(function (r) { return lines.push("- ".concat(r)); });
        lines.push('');
    }
    if (soul.specialAbilities.length > 0) {
        lines.push('## Habilidades');
        soul.specialAbilities.forEach(function (a) { return lines.push("- ".concat(a)); });
        lines.push('');
    }
    // Adiciona regras dinâmicas ativas
    var activeRules = dynamicRules.filter(function (r) { return r.active; });
    if (activeRules.length > 0) {
        lines.push('## Regras Dinâmicas (ativas nesta sessão)');
        activeRules.forEach(function (r) {
            lines.push("- [".concat(r.id, "] Quando ").concat(r.condition, ": ").concat(r.behavior));
        });
        lines.push('');
    }
    return lines.join('\n');
}
/**
 * Cria uma nova regra dinâmica de comportamento.
 */
function createDynamicRule(condition, behavior) {
    return {
        id: (0, uuid_1.v4)().slice(0, 8),
        condition: condition,
        behavior: behavior,
        active: true,
        addedAt: new Date(),
    };
}
