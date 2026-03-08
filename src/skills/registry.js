"use strict";
/**
 * GravityClaw — Skills Registry
 *
 * Gerencia o registro, descoberta e execução de Skills.
 * Skills são módulos autocontidos que adicionam capacidades ao agente.
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
exports.SkillsRegistry = void 0;
var SkillsRegistry = /** @class */ (function () {
    function SkillsRegistry() {
        this.skills = new Map();
    }
    /**
     * Registra uma nova skill no sistema.
     */
    SkillsRegistry.prototype.register = function (skill) {
        if (this.skills.has(skill.name)) {
            console.warn("[Skills] Substituindo skill existente: ".concat(skill.name));
        }
        this.skills.set(skill.name, skill);
        console.log("[Skills] Registrada: ".concat(skill.name, " v").concat(skill.version, " \u2014 ").concat(skill.description));
    };
    /**
     * Remove uma skill do registro.
     */
    SkillsRegistry.prototype.unregister = function (name) {
        var removed = this.skills.delete(name);
        if (removed) {
            console.log("[Skills] Removida: ".concat(name));
        }
        return removed;
    };
    /**
     * Busca uma skill pelo nome.
     */
    SkillsRegistry.prototype.get = function (name) {
        return this.skills.get(name);
    };
    /**
     * Lista todas as skills registradas.
     */
    SkillsRegistry.prototype.list = function () {
        return __spreadArray([], this.skills.values(), true);
    };
    /**
     * Tenta encontrar uma skill com base nos triggers definidos.
     * Retorna a primeira skill cujo trigger corresponde ao texto.
     */
    SkillsRegistry.prototype.findByTrigger = function (text) {
        var lower = text.toLowerCase().trim();
        for (var _i = 0, _a = this.skills.values(); _i < _a.length; _i++) {
            var skill = _a[_i];
            if (skill.triggers) {
                for (var _b = 0, _c = skill.triggers; _b < _c.length; _b++) {
                    var trigger = _c[_b];
                    if (lower.startsWith(trigger.toLowerCase())) {
                        return skill;
                    }
                }
            }
        }
        return undefined;
    };
    /**
     * Executa uma skill pelo nome.
     */
    SkillsRegistry.prototype.execute = function (name, input) {
        return __awaiter(this, void 0, void 0, function () {
            var skill, result, err_1, msg;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        skill = this.skills.get(name);
                        if (!skill) {
                            return [2 /*return*/, { error: "Skill \"".concat(name, "\" n\u00E3o encontrada.") }];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        console.log("[Skills] Executando: ".concat(name));
                        return [4 /*yield*/, skill.execute(input)];
                    case 2:
                        result = _a.sent();
                        console.log("[Skills] Conclu\u00EDda: ".concat(name));
                        return [2 /*return*/, result];
                    case 3:
                        err_1 = _a.sent();
                        msg = err_1 instanceof Error ? err_1.message : String(err_1);
                        console.error("[Skills] Erro em ".concat(name, ": ").concat(msg));
                        return [2 /*return*/, { error: "Erro ao executar \"".concat(name, "\": ").concat(msg) }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Gera uma descrição formatada de todas as skills disponíveis,
     * útil para incluir no system prompt do LLM.
     */
    SkillsRegistry.prototype.describeForLLM = function () {
        var skills = this.list();
        if (skills.length === 0) {
            return 'Nenhuma skill disponível no momento.';
        }
        var lines = ['## Skills Disponíveis\n'];
        for (var _i = 0, skills_1 = skills; _i < skills_1.length; _i++) {
            var skill = skills_1[_i];
            lines.push("### ".concat(skill.name, " (v").concat(skill.version, ")"));
            lines.push(skill.description);
            if (skill.triggers && skill.triggers.length > 0) {
                lines.push("Triggers: ".concat(skill.triggers.join(', ')));
            }
            lines.push('');
        }
        return lines.join('\n');
    };
    return SkillsRegistry;
}());
exports.SkillsRegistry = SkillsRegistry;
