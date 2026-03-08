import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { join } from 'path';

async function clearServiceAccountDrive() {
    console.log('Iniciando limpeza da conta de serviço...');

    // 1. Carregar credenciais
    const credPath = join(process.cwd(), 'data', 'google-service-account.json');
    const credentials = JSON.parse(readFileSync(credPath, 'utf-8'));
    const serviceAccountEmail = credentials.client_email;

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    console.log(`Logado como: ${serviceAccountEmail}`);

    try {
        // 2. Buscar TODOS os arquivos que a service account é DONA
        console.log(`Buscando arquivos criados por ${serviceAccountEmail}...`);

        let pageToken = undefined;
        let deletedCount = 0;
        let totalBytes = 0;

        do {
            const res = await drive.files.list({
                q: `trashed=false`,
                fields: 'nextPageToken, files(id, name, size, mimeType, owners)',
                pageToken: pageToken,
                spaces: 'drive',
            }) as any;

            const files = res.data.files || [];

            if (files.length === 0 && deletedCount === 0) {
                console.log('Nenhum arquivo encontrado. O Drive desta conta já está vazio!');
                return;
            }

            // 3. Deletar (Mover pra lixeira não libera cota na mesma hora, precisa excluir de fato)
            for (const file of files) {
                try {
                    await drive.files.delete({ fileId: file.id });
                    const sizeMB = file.size ? (parseInt(file.size) / (1024 * 1024)).toFixed(2) : '0';
                    totalBytes += file.size ? parseInt(file.size) : 0;

                    console.log(`✅ Deletado: ${file.name} (${sizeMB} MB)`);
                    deletedCount++;
                } catch (delErr: any) {
                    console.error(`❌ Erro ao deletar ${file.name}:`, delErr.message);
                }
            }

            pageToken = res.data.nextPageToken;
        } while (pageToken);

        const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
        console.log(`\n🎉 Limpeza concluída!`);
        console.log(`- Arquivos deletados: ${deletedCount}`);
        console.log(`- Espaço liberado: ~${totalMB} MB`);

        // 4. Esvaziar a lixeira só pra garantir
        console.log('Esvaziando lixeira...');
        await drive.files.emptyTrash();
        console.log('Lixeira esvaziada. Cota 100% restaurada!');

    } catch (err: any) {
        console.error('Erro durante a operação:', err.message);
    }
}

clearServiceAccountDrive();
