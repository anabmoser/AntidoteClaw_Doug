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
var googleapis_1 = require("googleapis");
var fs_1 = require("fs");
var path_1 = require("path");
function clearServiceAccountDrive() {
    return __awaiter(this, void 0, void 0, function () {
        var credPath, credentials, serviceAccountEmail, auth, drive, pageToken, deletedCount, totalBytes, res, files, _i, files_1, file, sizeMB, delErr_1, totalMB, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('Iniciando limpeza da conta de serviço...');
                    credPath = (0, path_1.join)(process.cwd(), 'data', 'google-service-account.json');
                    credentials = JSON.parse((0, fs_1.readFileSync)(credPath, 'utf-8'));
                    serviceAccountEmail = credentials.client_email;
                    auth = new googleapis_1.google.auth.GoogleAuth({
                        credentials: credentials,
                        scopes: ['https://www.googleapis.com/auth/drive'],
                    });
                    drive = googleapis_1.google.drive({ version: 'v3', auth: auth });
                    console.log("Logado como: ".concat(serviceAccountEmail));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 13, , 14]);
                    // 2. Buscar TODOS os arquivos que a service account é DONA
                    console.log("Buscando arquivos criados por ".concat(serviceAccountEmail, "..."));
                    pageToken = undefined;
                    deletedCount = 0;
                    totalBytes = 0;
                    _a.label = 2;
                case 2: return [4 /*yield*/, drive.files.list({
                        q: "trashed=false",
                        fields: 'nextPageToken, files(id, name, size, mimeType, owners)',
                        pageToken: pageToken,
                        spaces: 'drive',
                    })];
                case 3:
                    res = _a.sent();
                    files = res.data.files || [];
                    if (files.length === 0 && deletedCount === 0) {
                        console.log('Nenhum arquivo encontrado. O Drive desta conta já está vazio!');
                        return [2 /*return*/];
                    }
                    _i = 0, files_1 = files;
                    _a.label = 4;
                case 4:
                    if (!(_i < files_1.length)) return [3 /*break*/, 9];
                    file = files_1[_i];
                    _a.label = 5;
                case 5:
                    _a.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, drive.files.delete({ fileId: file.id })];
                case 6:
                    _a.sent();
                    sizeMB = file.size ? (parseInt(file.size) / (1024 * 1024)).toFixed(2) : '0';
                    totalBytes += file.size ? parseInt(file.size) : 0;
                    console.log("\u2705 Deletado: ".concat(file.name, " (").concat(sizeMB, " MB)"));
                    deletedCount++;
                    return [3 /*break*/, 8];
                case 7:
                    delErr_1 = _a.sent();
                    console.error("\u274C Erro ao deletar ".concat(file.name, ":"), delErr_1.message);
                    return [3 /*break*/, 8];
                case 8:
                    _i++;
                    return [3 /*break*/, 4];
                case 9:
                    pageToken = res.data.nextPageToken;
                    _a.label = 10;
                case 10:
                    if (pageToken) return [3 /*break*/, 2];
                    _a.label = 11;
                case 11:
                    totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
                    console.log("\n\uD83C\uDF89 Limpeza conclu\u00EDda!");
                    console.log("- Arquivos deletados: ".concat(deletedCount));
                    console.log("- Espa\u00E7o liberado: ~".concat(totalMB, " MB"));
                    // 4. Esvaziar a lixeira só pra garantir
                    console.log('Esvaziando lixeira...');
                    return [4 /*yield*/, drive.files.emptyTrash()];
                case 12:
                    _a.sent();
                    console.log('Lixeira esvaziada. Cota 100% restaurada!');
                    return [3 /*break*/, 14];
                case 13:
                    err_1 = _a.sent();
                    console.error('Erro durante a operação:', err_1.message);
                    return [3 /*break*/, 14];
                case 14: return [2 /*return*/];
            }
        });
    });
}
clearServiceAccountDrive();
