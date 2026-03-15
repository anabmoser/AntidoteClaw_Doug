import type { Skill, SkillInput, SkillOutput } from '../../core/types.js';
import { DriveService } from '../../services/drive.js';

export const driveDiagSkill: Skill = {
    name: 'drive_diag',
    description: 'Diagnostica a configuração do Google Drive na instância atual do Doug.',
    version: '1.0.0',
    triggers: ['/diagdrive', 'diagnostique o drive', 'diagnosticar drive', 'cheque o drive', 'verifique o drive'],

    async execute(_input: SkillInput): Promise<SkillOutput> {
        const root = process.env['GOOGLE_DRIVE_ROOT_FOLDER_ID'];
        const oauth = process.env['GOOGLE_OAUTH_CREDENTIALS'];
        const token = process.env['GOOGLE_TOKEN'];

        const lines: string[] = [
            'Diagnóstico do Google Drive nesta instância:',
            '',
            `GOOGLE_DRIVE_ROOT_FOLDER_ID: ${root ? 'presente' : 'ausente'}`,
            `GOOGLE_OAUTH_CREDENTIALS: ${oauth ? 'presente' : 'ausente'}`,
            `GOOGLE_TOKEN: ${token ? 'presente' : 'ausente'}`,
        ];

        let credentialsOk = false;
        let tokenOk = false;

        if (oauth) {
            try {
                const parsed = JSON.parse(oauth);
                const client = parsed.installed || parsed.web || parsed;
                credentialsOk = Boolean(client?.client_id && client?.client_secret);
                lines.push(`Credenciais OAuth: ${credentialsOk ? 'JSON válido' : 'JSON sem client_id/client_secret'}`);
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                lines.push(`Credenciais OAuth: JSON inválido (${msg})`);
            }
        }

        if (token) {
            try {
                const parsed = JSON.parse(token);
                tokenOk = Boolean(parsed?.refresh_token || parsed?.access_token);
                lines.push(`Token OAuth: ${tokenOk ? 'JSON válido' : 'JSON sem refresh_token/access_token'}`);
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                lines.push(`Token OAuth: JSON inválido (${msg})`);
            }
        }

        if (!root) {
            lines.push('', 'Resultado: o Drive não sobe porque a pasta raiz não está configurada.');
            return { text: lines.join('\n') };
        }

        if (!oauth || !token || !credentialsOk || !tokenOk) {
            lines.push('', 'Resultado: o Drive não sobe porque as variáveis necessárias estão ausentes ou inválidas.');
            return { text: lines.join('\n') };
        }

        try {
            const drive = new DriveService(root);
            await drive.init();
            const folders = drive.getFolders();
            lines.push('', 'Resultado: conexão com o Google Drive OK.');
            if (folders) {
                lines.push(`Pasta raiz: ${folders.root}`);
                lines.push(`OUTPUTS/videos: ${folders.outputsVideos}`);
                lines.push(`OUTPUTS/imagens: ${folders.outputsImagens}`);
                lines.push(`OUTPUTS/posts: ${folders.outputsPosts}`);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            lines.push('', `Resultado: falha ao conectar no Drive (${msg})`);
        }

        return { text: lines.join('\n') };
    },
};
