"use strict";
/**
 * GravityClaw — Google Drive Service
 *
 * Integração com Google Drive via Service Account.
 * Permite listar, upload e download de arquivos nas pastas do Doug.
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
exports.DriveService = void 0;
var googleapis_1 = require("googleapis");
var fs_1 = require("fs");
var stream_1 = require("stream");
var DriveService = /** @class */ (function () {
    function DriveService(rootFolderId) {
        this.folders = null;
        // Usa caminhos absolutos base para os arquivos de OAuth gerados
        var basePath = process.cwd();
        var credPath = "".concat(basePath, "/data/google-oauth-credentials.json");
        var tokenPath = "".concat(basePath, "/data/google-token.json");
        var credentials;
        try {
            credentials = JSON.parse((0, fs_1.readFileSync)(credPath, 'utf-8'));
        }
        catch (err) {
            throw new Error("[Drive] Erro ao ler google-oauth-credentials.json. O arquivo existe?");
        }
        var _a = credentials.installed, client_secret = _a.client_secret, client_id = _a.client_id, redirect_uris = _a.redirect_uris;
        var oAuth2Client = new googleapis_1.google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        var token;
        try {
            token = JSON.parse((0, fs_1.readFileSync)(tokenPath, 'utf-8'));
        }
        catch (err) {
            throw new Error("[Drive] Erro ao ler google-token.json. Voc\u00EA j\u00E1 rodou o utils/auth-drive.js?");
        }
        oAuth2Client.setCredentials(token);
        this.drive = googleapis_1.google.drive({ version: 'v3', auth: oAuth2Client });
        this.rootFolderId = rootFolderId;
    }
    /**
     * Inicializa o serviço descobrindo os IDs das subpastas.
     */
    DriveService.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var root, err_1, msg, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log('[Drive] 🔗 Conectando ao Google Drive...');
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.drive.files.get({
                                fileId: this.rootFolderId,
                                fields: 'id,name',
                                supportsAllDrives: true,
                            })];
                    case 2:
                        root = _b.sent();
                        console.log("[Drive] \u2705 Pasta raiz: ".concat(root.data.name, " (").concat(root.data.id, ")"));
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _b.sent();
                        msg = err_1 instanceof Error ? err_1.message : String(err_1);
                        throw new Error("Erro ao acessar pasta raiz do Drive: ".concat(msg));
                    case 4:
                        // Descobrir subpastas
                        _a = this;
                        return [4 /*yield*/, this.discoverFolders()];
                    case 5:
                        // Descobrir subpastas
                        _a.folders = _b.sent();
                        console.log("[Drive] \uD83D\uDCC1 Pastas mapeadas:");
                        console.log("    \u251C\u2500 INPUTS: ".concat(this.folders.inputs));
                        console.log("    \u251C\u2500 OUTPUTS: ".concat(this.folders.outputs));
                        console.log("    \u2514\u2500 PROJETOS: ".concat(this.folders.projetos));
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Descobre os IDs de todas as subpastas na estrutura do Doug.
     */
    DriveService.prototype.discoverFolders = function () {
        return __awaiter(this, void 0, void 0, function () {
            var findFolder, root, inputs, outputs, projetos, _a, inputsFotos, inputsVideos, inputsReferencias, _b, outputsImagens, outputsLegendas, outputsPosts, outputsVideos;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        findFolder = function (name, parentId) { return __awaiter(_this, void 0, void 0, function () {
                            var res, folder, created;
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0: return [4 /*yield*/, this.drive.files.list({
                                            q: "name='".concat(name, "' and '").concat(parentId, "' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"),
                                            fields: 'files(id,name)',
                                            supportsAllDrives: true,
                                            includeItemsFromAllDrives: true,
                                        })];
                                    case 1:
                                        res = _b.sent();
                                        folder = (_a = res.data.files) === null || _a === void 0 ? void 0 : _a[0];
                                        if (!!(folder === null || folder === void 0 ? void 0 : folder.id)) return [3 /*break*/, 3];
                                        // Cria a pasta se não existir
                                        console.log("[Drive] \uD83D\uDCC1 Criando pasta: ".concat(name));
                                        return [4 /*yield*/, this.drive.files.create({
                                                requestBody: {
                                                    name: name,
                                                    mimeType: 'application/vnd.google-apps.folder',
                                                    parents: [parentId],
                                                },
                                                fields: 'id',
                                                supportsAllDrives: true,
                                            })];
                                    case 2:
                                        created = _b.sent();
                                        return [2 /*return*/, created.data.id];
                                    case 3: return [2 /*return*/, folder.id];
                                }
                            });
                        }); };
                        root = this.rootFolderId;
                        return [4 /*yield*/, findFolder('INPUTS', root)];
                    case 1:
                        inputs = _c.sent();
                        return [4 /*yield*/, findFolder('OUTPUTS', root)];
                    case 2:
                        outputs = _c.sent();
                        return [4 /*yield*/, findFolder('PROJETOS', root)];
                    case 3:
                        projetos = _c.sent();
                        return [4 /*yield*/, Promise.all([
                                findFolder('fotos', inputs),
                                findFolder('videos', inputs),
                                findFolder('referencias', inputs),
                            ])];
                    case 4:
                        _a = _c.sent(), inputsFotos = _a[0], inputsVideos = _a[1], inputsReferencias = _a[2];
                        return [4 /*yield*/, Promise.all([
                                findFolder('imagens', outputs),
                                findFolder('legendas', outputs),
                                findFolder('posts', outputs),
                                findFolder('videos', outputs),
                            ])];
                    case 5:
                        _b = _c.sent(), outputsImagens = _b[0], outputsLegendas = _b[1], outputsPosts = _b[2], outputsVideos = _b[3];
                        return [2 /*return*/, {
                                root: root,
                                inputs: inputs,
                                inputsFotos: inputsFotos,
                                inputsVideos: inputsVideos,
                                inputsReferencias: inputsReferencias,
                                outputs: outputs,
                                outputsImagens: outputsImagens,
                                outputsLegendas: outputsLegendas,
                                outputsPosts: outputsPosts,
                                outputsVideos: outputsVideos,
                                projetos: projetos,
                            }];
                }
            });
        });
    };
    /**
     * Retorna o mapa de pastas.
     */
    DriveService.prototype.getFolders = function () {
        return this.folders;
    };
    /**
     * Faz upload de um arquivo binário para uma pasta do Drive.
     * Usa resumable upload para evitar problemas de quota.
     */
    DriveService.prototype.uploadFile = function (fileName, content, mimeType, folderId) {
        return __awaiter(this, void 0, void 0, function () {
            var media, res;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        media = {
                            mimeType: mimeType,
                            body: stream_1.Readable.from([new Uint8Array(content)]),
                        };
                        return [4 /*yield*/, this.drive.files.create({
                                requestBody: {
                                    name: fileName,
                                    parents: [folderId],
                                },
                                media: media,
                                fields: 'id,webViewLink',
                                supportsAllDrives: true,
                            })];
                    case 1:
                        res = _b.sent();
                        console.log("[Drive] \uD83D\uDCE4 Upload: ".concat(fileName, " \u2192 ").concat(res.data.id));
                        return [2 /*return*/, {
                                id: res.data.id,
                                webViewLink: (_a = res.data.webViewLink) !== null && _a !== void 0 ? _a : "https://drive.google.com/file/d/".concat(res.data.id, "/view"),
                            }];
                }
            });
        });
    };
    /**
     * Salva texto como Google Doc no Drive (Google Docs NÃO contam contra quota de storage).
     */
    DriveService.prototype.saveText = function (fileName, text, folderId) {
        return __awaiter(this, void 0, void 0, function () {
            var res;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.drive.files.create({
                            requestBody: {
                                name: fileName.replace(/\.(txt|md)$/, ''),
                                mimeType: 'application/vnd.google-apps.document',
                                parents: [folderId],
                            },
                            media: {
                                mimeType: 'text/plain',
                                body: stream_1.Readable.from([text]),
                            },
                            fields: 'id,webViewLink',
                            supportsAllDrives: true,
                        })];
                    case 1:
                        res = _b.sent();
                        console.log("[Drive] \uD83D\uDCC4 Google Doc criado: ".concat(fileName, " \u2192 ").concat(res.data.id));
                        return [2 /*return*/, {
                                id: res.data.id,
                                webViewLink: (_a = res.data.webViewLink) !== null && _a !== void 0 ? _a : "https://docs.google.com/document/d/".concat(res.data.id, "/edit"),
                            }];
                }
            });
        });
    };
    /**
     * Lista arquivos em uma pasta.
     */
    DriveService.prototype.listFiles = function (folderId) {
        return __awaiter(this, void 0, void 0, function () {
            var res;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.drive.files.list({
                            q: "'".concat(folderId, "' in parents and trashed=false"),
                            fields: 'files(id,name,mimeType)',
                            supportsAllDrives: true,
                            includeItemsFromAllDrives: true,
                            orderBy: 'modifiedTime desc',
                        })];
                    case 1:
                        res = _b.sent();
                        return [2 /*return*/, ((_a = res.data.files) !== null && _a !== void 0 ? _a : []).map(function (f) { return ({
                                id: f.id,
                                name: f.name,
                                mimeType: f.mimeType,
                            }); })];
                }
            });
        });
    };
    /**
     * Baixa um arquivo do Drive como Buffer.
     */
    DriveService.prototype.downloadFile = function (fileId) {
        return __awaiter(this, void 0, void 0, function () {
            var res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.drive.files.get({ fileId: fileId, alt: 'media', supportsAllDrives: true }, { responseType: 'arraybuffer' })];
                    case 1:
                        res = _a.sent();
                        return [2 /*return*/, Buffer.from(res.data)];
                }
            });
        });
    };
    return DriveService;
}());
exports.DriveService = DriveService;
