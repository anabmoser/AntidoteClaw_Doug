/**
 * GravityClaw — Google Drive Service
 *
 * Integração com Google Drive via Service Account.
 * Permite listar, upload e download de arquivos nas pastas do Doug.
 */

import { google, type drive_v3 } from 'googleapis';
import { readFileSync, createReadStream } from 'fs';
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
        // Usa caminhos absolutos base para os arquivos de OAuth gerados
        const basePath = process.cwd();
        const credPath = `${basePath}/data/google-oauth-credentials.json`;
        const tokenPath = `${basePath}/data/google-token.json`;

        let credentials;
        try {
            if (process.env['GOOGLE_OAUTH_CREDENTIALS']) {
                credentials = JSON.parse(process.env['GOOGLE_OAUTH_CREDENTIALS']);
            } else {
                credentials = JSON.parse(readFileSync(credPath, 'utf-8'));
            }
        } catch (err: any) {
            throw new Error(`[Drive] Erro ao carregar credenciais. Verifique a variável GOOGLE_OAUTH_CREDENTIALS ou o arquivo local.`);
        }

        const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web || credentials;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris?.[0] || 'urn:ietf:wg:oauth:2.0:oob');

        let token;
        try {
            if (process.env['GOOGLE_TOKEN']) {
                token = JSON.parse(process.env['GOOGLE_TOKEN']);
            } else {
                token = JSON.parse(readFileSync(tokenPath, 'utf-8'));
            }
        } catch (err: any) {
            throw new Error(`[Drive] Erro ao carregar token de acesso. Verifique a variável GOOGLE_TOKEN ou o arquivo local.`);
        }

        oAuth2Client.setCredentials(token);
        this.drive = google.drive({ version: 'v3', auth: oAuth2Client });
        this.rootFolderId = rootFolderId;
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
     * Faz upload de um arquivo binário para uma pasta do Drive.
     * Usa resumable upload para evitar problemas de quota.
     */
    async uploadFile(
        fileName: string,
        content: Buffer,
        mimeType: string,
        folderId: string
    ): Promise<{ id: string; webViewLink: string }> {
        const media = {
            mimeType,
            body: Readable.from([new Uint8Array(content)]),
        };

        const res = await this.drive.files.create({
            requestBody: {
                name: fileName,
                parents: [folderId],
            },
            media,
            fields: 'id,webViewLink',
            supportsAllDrives: true,
        });

        console.log(`[Drive] 📤 Upload: ${fileName} → ${res.data.id}`);
        return {
            id: res.data.id!,
            webViewLink: res.data.webViewLink ?? `https://drive.google.com/file/d/${res.data.id}/view`,
        };
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
        const media = {
            mimeType,
            body: createReadStream(filePath),
        };

        const res = await this.drive.files.create({
            requestBody: {
                name: fileName,
                parents: [folderId],
            },
            media,
            fields: 'id,webViewLink',
            supportsAllDrives: true,
        });

        console.log(`[Drive] 📤 Upload (Stream): ${fileName} → ${res.data.id}`);
        return {
            id: res.data.id!,
            webViewLink: res.data.webViewLink ?? `https://drive.google.com/file/d/${res.data.id}/view`,
        };
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
}
