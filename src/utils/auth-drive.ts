import { google } from 'googleapis';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as readline from 'readline';

const CREDENTIALS_PATH = join(process.cwd(), 'data', 'google-oauth-credentials.json');
const TOKEN_PATH = join(process.cwd(), 'data', 'google-token.json');

// Define the scopes the bot needs to read and write to Drive
const SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file'
];

async function authorize() {
    console.log('--- Iniciando Configuração do Google Drive OAuth 2.0 ---');

    // 1. Lê o arquivo de credenciais
    let credentials;
    try {
        const content = readFileSync(CREDENTIALS_PATH, 'utf-8');
        credentials = JSON.parse(content);
    } catch (err: any) {
        console.error('❌ Erro: Não foi possível ler data/google-oauth-credentials.json\nVerifique se o arquivo existe e é um JSON válido.');
        return;
    }

    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // 2. Gera a URL de Autenticação
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline', // Pede refresh_token permanente
        scope: SCOPES,
        prompt: 'consent' // Força a tela para garantir o refresh_token
    });

    console.log('\n======================================================');
    console.log('🤖 DOUG PRECISA DA SUA PERMISSÃO PARA ACESSAR O DRIVE');
    console.log('======================================================\n');
    console.log('1. Abra o link abaixo no seu navegador:');
    console.log(authUrl);
    console.log('\n2. Faça login com a conta Google dona da pasta de 2TB.');
    console.log('3. Como o app não foi publicado, o Google vai dar uma tela de aviso vermelho "O Google não verificou este app".');
    console.log('   -> Clique em "Avançado" e depois em "Acessar doug-api (não seguro)".');
    console.log('4. Marque TODAS as caixinhas de permissão de edição do Drive e clique em Continuar.');
    console.log('5. O navegador vai redirecionar para um erro localhost (tipo "Não é possível acessar esse site"). Tudo bem!');
    console.log('6. Copie a URL inteira da barra de endereços (ela tem um "code=...").');
    console.log('\n======================================================\n');

    // 3. Pede o código de volta
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.question('Cole a URL INTEIRA (ou apenas o valor do code=) aqui: ', async (codeSnippet) => {
        rl.close();

        let code = codeSnippet.trim();
        // Extrai o code se o usuário colou a URL inteira
        if (code.includes('code=')) {
            const urlParts = new URL(code.startsWith('http') ? code : `http://localhost/?${code}`);
            code = urlParts.searchParams.get('code') || code;
        }

        try {
            console.log('\n⏳ Trocando o código pelo Token de Acesso...');
            // 4. Troca o código pelo access_token e refresh_token
            const { tokens } = await oAuth2Client.getToken(code);

            // 5. Salva no disco
            writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
            console.log(`\n✅ SUCESSO! Token permanente salvo em: data/google-token.json`);
            console.log('   O Doug agora tem acesso vitalício ao seu Drive em nome da Ana.');
            console.log('   Você já pode iniciar o servidor do bot!');
        } catch (err: any) {
            console.error('\n❌ Erro ao validar o código. Verifique se copiou certo ou se ele já expirou.');
            console.error(err.message);
        }
    });
}

authorize();
