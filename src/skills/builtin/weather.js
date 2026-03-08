"use strict";
/**
 * GravityClaw — Weather Skill (exemplo)
 *
 * Skill integrada: obtenha o clima atual de qualquer cidade.
 * Usa a API gratuita wttr.in (sem chave de API necessária).
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
exports.weatherSkill = void 0;
exports.weatherSkill = {
    name: 'weather',
    description: 'Consulta o clima atual de uma cidade. Uso: /clima <cidade>',
    version: '1.0.0',
    triggers: ['/clima', '/weather', '/tempo'],
    execute: function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var city, encodedCity, res, data, current, area, condition, text, err_1, msg;
            var _a, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        city = input.args.join(' ').trim();
                        if (!city) {
                            return [2 /*return*/, {
                                    text: '🌤️ Uso: `/clima São Paulo` ou `/clima Tokyo`',
                                }];
                        }
                        _f.label = 1;
                    case 1:
                        _f.trys.push([1, 4, , 5]);
                        encodedCity = encodeURIComponent(city);
                        return [4 /*yield*/, fetch("https://wttr.in/".concat(encodedCity, "?format=j1&lang=pt"))];
                    case 2:
                        res = _f.sent();
                        if (!res.ok) {
                            return [2 /*return*/, { text: "\u274C N\u00E3o foi poss\u00EDvel encontrar o clima para \"".concat(city, "\".") }];
                        }
                        return [4 /*yield*/, res.json()];
                    case 3:
                        data = _f.sent();
                        current = data.current_condition[0];
                        area = data.nearest_area[0];
                        if (!current || !area) {
                            return [2 /*return*/, { text: "\u274C Dados indispon\u00EDveis para \"".concat(city, "\".") }];
                        }
                        condition = (_c = (_b = (_a = current.lang_pt) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value) !== null && _c !== void 0 ? _c : 'Desconhecido';
                        text = [
                            "\uD83C\uDF0D **".concat((_d = area.areaName[0]) === null || _d === void 0 ? void 0 : _d.value, ", ").concat((_e = area.country[0]) === null || _e === void 0 ? void 0 : _e.value, "**"),
                            "",
                            "\uD83C\uDF21\uFE0F Temperatura: ".concat(current.temp_C, "\u00B0C (sensa\u00E7\u00E3o: ").concat(current.FeelsLikeC, "\u00B0C)"),
                            "\u2601\uFE0F Condi\u00E7\u00E3o: ".concat(condition),
                            "\uD83D\uDCA7 Umidade: ".concat(current.humidity, "%"),
                            "\uD83D\uDCA8 Vento: ".concat(current.windspeedKmph, " km/h"),
                        ].join('\n');
                        return [2 /*return*/, { text: text }];
                    case 4:
                        err_1 = _f.sent();
                        msg = err_1 instanceof Error ? err_1.message : String(err_1);
                        return [2 /*return*/, { text: "\u274C Erro ao consultar clima: ".concat(msg) }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    },
};
