/**
 * GravityClaw — Google Drive Service
 *
 * Integração com Google Drive via OAuth do usuário.
 * Texto é salvo como Google Doc; binários são enviados pelos specialists.
 */

import { google, type drive_v3 } from 'googleapis';
import { readFileSync, createReadStream, existsSync } from 'fs';
import { homedir } from 'os';
import { execFileSync } from 'child_process';
import { Readable } from 'stream';

export interface DriveFolderMap {
    root: string;
    inputs: string;
    inputsFotos: string;
    inputsVideos: string;
    inputsReferencias: string;
    outputs: string;
    outputsImagens: string;
    outputsLegendas: string;
    outputsPosts: string;
    outputsVideos: string;
    projetos: string;
}

export class DriveService {
    private drive: drive_v3.Drive;
    private folders: DriveFolderMap | null = null;
    private rootFolderId: string;

    constructor(rootFolderId: string) {
        const basePath = process.cwd();
        const credPath = `${basePath}/data/google-oauth-credentials.json`;
        const tokenPath = `${basePath}/data/google-token.json`;
        const gwsClientPath = `${homedir()}/.config/gws/client_secret.json`;
        const canUseGwsFallback = process.env['NODE_ENV'] !== 'production' || process.env['DOUG_ENABLE_GWS_FALLBACK'] === '1';

        const credentials = this.loadCredentials(credPath, gwsClientPath, canUseGwsFallback);

        const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web || credentials;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris?.[0] || 'urn:ietf:wg:oauth:2.0:oob');

        const token = this.loadToken(tokenPath, canUseGwsFallback);

        oAuth2Client.setCredentials(token);
        this.drive = google.drive({ version: 'v3', auth: oAuth2Client });
        this.rootFolderId = rootFolderId;
    }

    private loadCredentials(repoPath: string, gwsPath: string, canUseGwsFallback: boolean): any {
        try {
            if (process.env['GOOGLE_OAUTH_CREDENTIALS']) {
                return JSON.parse(process.env['GOOGLE_OAUTH_CREDENTIALS']);
            }

            if (existsSync(repoPath)) {
                return JSON.parse(readFileSync(repoPath, 'utf-8'));
            }

            if (canUseGwsFallback && existsSync(gwsPath)) {
                console.log('[Drive] Usando client_secret.json do gws como fallback local.');
                return JSON.parse(readFileSync(gwsPath, 'utf-8'));
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            throw new Error(`[Drive] Erro ao carregar credenciais: ${msg}`);
        }

        throw new Error('[Drive] Erro ao carregar credenciais. Verifique GOOGLE_OAUTH_CREDENTIALS, data/google-oauth-credentials.json ou ~/.config/gws/client_secret.json.');
    }

    private loadToken(repoPath: string, canUseGwsFallback: boolean): any {
        try {
            if (process.env['GOOGLE_TOKEN']) {
                return JSON.parse(process.env['GOOGLE_TOKEN']);
            }

            if (existsSync(repoPath)) {
                return JSON.parse(readFileSync(repoPath, 'utf-8'));
            }

            if (canUseGwsFallback) {
                const exported = this.loadUnmaskedGwsCredentials();
                if (exported) {
                    console.log('[Drive] Usando credenciais OAuth do gws como fallback local.');
                    return {
                        refresh_token: exported.refresh_token,
                        access_token: exported.access_token,
                        scope: 'https://www.googleapis.com/auth/drive',
                        token_type: 'Bearer',
                    };
                }
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            throw new Error(`[Drive] Erro ao carregar token de acesso: ${msg}`);
        }

        throw new Error('[Drive] Erro ao carregar token de acesso. Verifique GOOGLE_TOKEN, data/google-token.json ou o login local do gws.');
    }

    private loadUnmaskedGwsCredentials(): {
        client_id?: string;
        client_secret?: string;
        refresh_token?: string;
        access_token?: string;
        type?: string;
    } | null {
        try {
            const output = execFileSync('gws', ['auth', 'export', '--unmasked'], {
                encoding: 'utf-8',
                stdio: ['ignore', 'pipe', 'pipe'],
            });
            return JSON.parse(output);
        } catch {
            return null;
        }
    }

    /**
     * Inicializa o serviço descobrindo os IDs das subpastas.
     */
    async init(): Promise<void> {
        console.log('[Drive] 🔗 Conectando ao Google Drive...');

        // Verificar acesso à pasta raiz
        try {
            const root = await this.drive.files.get({
                fileId: this.rootFolderId,
                fields: 'id,name',
                supportsAllDrives: true,
            });
            console.log(`[Drive] ✅ Pasta raiz: ${root.data.name} (${root.data.id})`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            throw new Error(`Erro ao acessar pasta raiz do Drive: ${msg}`);
        }

        // Descobrir subpastas
        this.folders = await this.discoverFolders();
        console.log(`[Drive] 📁 Pastas mapeadas:`);
        console.log(`    ├─ INPUTS: ${this.folders.inputs}`);
        console.log(`    ├─ OUTPUTS: ${this.folders.outputs}`);
        console.log(`    └─ PROJETOS: ${this.folders.projetos}`);
    }

    /**
     * Descobre os IDs de todas as subpastas na estrutura do Doug.
     */
    private async discoverFolders(): Promise<DriveFolderMap> {
        const findFolder = async (name: string, parentId: string): Promise<string> => {
            const res = await this.drive.files.list({
                q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                fields: 'files(id,name)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
            });
            const folder = res.data.files?.[0];
            if (!folder?.id) {
                // Cria a pasta se não existir
                console.log(`[Drive] 📁 Criando pasta: ${name}`);
                const created = await this.drive.files.create({
                    requestBody: {
                        name,
                        mimeType: 'application/vnd.google-apps.folder',
                        parents: [parentId],
                    },
                    fields: 'id',
                    supportsAllDrives: true,
                });
                return created.data.id!;
            }
            return folder.id;
        };

        const root = this.rootFolderId;
        const inputs = await findFolder('INPUTS', root);
        const outputs = await findFolder('OUTPUTS', root);
        const projetos = await findFolder('PROJETOS', root);

        const [inputsFotos, inputsVideos, inputsReferencias] = await Promise.all([
            findFolder('fotos', inputs),
            findFolder('videos', inputs),
            findFolder('referencias', inputs),
        ]);

        const [outputsImagens, outputsLegendas, outputsPosts, outputsVideos] = await Promise.all([
            findFolder('imagens', outputs),
            findFolder('legendas', outputs),
            findFolder('posts', outputs),
            findFolder('videos', outputs),
        ]);

        return {
            root, inputs, inputsFotos, inputsVideos, inputsReferencias,
            outputs, outputsImagens, outputsLegendas, outputsPosts, outputsVideos,
            projetos,
        };
    }

    /**
     * Retorna o mapa de pastas.
     */
    getFolders(): DriveFolderMap | null {
        return this.folders;
    }

    /**
     * Doug central só deve salvar texto explicitamente solicitado.
     * Uploads binários são responsabilidade dos specialists.
     */
    getUploadOwnership() {
        return {
            text: 'Doug',
            image: 'Designer',
            video: 'Video',
        } as const;
    }

    /**
     * Faz upload de um arquivo binário para uma pasta do Drive.
     * Usa resumable upload para evitar problemas de quota.
     */
    async uploadFile(
        fileName: string,
        content: Buffer,
        mimeType: string,
        folderId: string
    ): Promise<{ id: string; webViewLink: string }> {
        return this.createBinaryUpload(
            {
                fileName,
                mimeType,
                folderId,
                body: Readable.from([new Uint8Array(content)]),
            },
            'memory'
        );
    }

    /**
     * Faz upload de um arquivo usando stream (ideal para vídeos/arquivos grandes).
     */
    async uploadFileStream(
        fileName: string,
        filePath: string,
        mimeType: string,
        folderId: string
    ): Promise<{ id: string; webViewLink: string }> {
        return this.createBinaryUpload(
            {
                fileName,
                mimeType,
                folderId,
                body: createReadStream(filePath),
            },
            'stream'
        );
    }

    /**
     * Salva texto como Google Doc no Drive (Google Docs NÃO contam contra quota de storage).
     */
    async saveText(
        fileName: string,
        text: string,
        folderId: string
    ): Promise<{ id: string; webViewLink: string }> {
        // Cria como Google Doc para evitar erro de quota do Service Account
        const res = await this.drive.files.create({
            requestBody: {
                name: fileName.replace(/\.(txt|md)$/, ''),
                mimeType: 'application/vnd.google-apps.document',
                parents: [folderId],
            },
            media: {
                mimeType: 'text/plain',
                body: Readable.from([text]),
            },
            fields: 'id,webViewLink',
            supportsAllDrives: true,
        });

        console.log(`[Drive] 📄 Google Doc criado: ${fileName} → ${res.data.id}`);
        return {
            id: res.data.id!,
            webViewLink: res.data.webViewLink ?? `https://docs.google.com/document/d/${res.data.id}/edit`,
        };
    }

    async saveDesignerAsset(
        fileName: string,
        content: Buffer,
        mimeType: string
    ): Promise<{ id: string; webViewLink: string }> {
        const folders = this.requireFolders();
        return this.uploadFile(fileName, content, mimeType, folders.outputsImagens);
    }

    async saveVideoAsset(
        fileName: string,
        filePath: string,
        mimeType: string
    ): Promise<{ id: string; webViewLink: string }> {
        const folders = this.requireFolders();
        return this.uploadFileStream(fileName, filePath, mimeType, folders.outputsVideos);
    }

    async saveAgentText(
        fileName: string,
        text: string
    ): Promise<{ id: string; webViewLink: string }> {
        const folders = this.requireFolders();
        return this.saveText(fileName, text, folders.outputsPosts);
    }

    /**
     * Lista arquivos em uma pasta.
     */
    async listFiles(folderId: string): Promise<{ id: string; name: string; mimeType: string }[]> {
        const res = await this.drive.files.list({
            q: `'${folderId}' in parents and trashed=false`,
            fields: 'files(id,name,mimeType)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
            orderBy: 'modifiedTime desc',
        });
        return (res.data.files ?? []).map(f => ({
            id: f.id!,
            name: f.name!,
            mimeType: f.mimeType!,
        }));
    }

    /**
     * Baixa um arquivo do Drive como Buffer.
     */
    async downloadFile(fileId: string): Promise<Buffer> {
        const res = await this.drive.files.get(
            { fileId, alt: 'media', supportsAllDrives: true },
            { responseType: 'arraybuffer' }
        );
        return Buffer.from(res.data as ArrayBuffer);
    }

    private requireFolders(): DriveFolderMap {
        if (!this.folders) {
            throw new Error('[Drive] Pastas ainda não foram inicializadas.');
        }
        return this.folders;
    }

    private async createBinaryUpload(
        input: {
            fileName: string;
            mimeType: string;
            folderId: string;
            body: NodeJS.ReadableStream;
        },
        mode: 'memory' | 'stream'
    ): Promise<{ id: string; webViewLink: string }> {
        try {
            const res = await this.drive.files.create({
                requestBody: {
                    name: input.fileName,
                    mimeType: input.mimeType,
                    parents: [input.folderId],
                },
                media: {
                    mimeType: input.mimeType,
                    body: input.body,
                },
                fields: 'id,webViewLink,webContentLink',
                supportsAllDrives: true,
                uploadType: 'resumable',
            });

            console.log(`[Drive] 📤 Upload (${mode}): ${input.fileName} → ${res.data.id}`);
            return {
                id: res.data.id!,
                webViewLink: res.data.webViewLink ?? res.data.webContentLink ?? `https://drive.google.com/file/d/${res.data.id}/view`,
            };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            throw new Error(`[Drive] Falha no upload binário (${mode}) de "${input.fileName}": ${msg}`);
        }
    }
}
