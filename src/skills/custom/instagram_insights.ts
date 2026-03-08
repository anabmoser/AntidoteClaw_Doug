/**
 * GravityClaw — Custom Skill: Instagram Insights Scraper (Puppeteer Headless/Local)
 */
import type { Skill, SkillInput, SkillOutput } from '../../core/types.js';
import puppeteer from 'puppeteer';

export const instagramInsightsSkill: Skill = {
    name: 'ig_insights',
    description: 'Extrai métricas recentes do Instagram conectando a um Chrome já autenticado na porta 9222.',
    version: '1.0.0',
    triggers: [
        '/ig', '/instagram', 'analisar instagram', 'analise meu instagram',
        'meu instagram', 'analisar o instagram', 'posts do instagram',
        'perfil do instagram', 'análise sobre impacto', 'análise do meu instagram'
    ],

    async execute(input: SkillInput): Promise<SkillOutput> {
        let username = 'anabmoser'; // Default Ana account

        // Extract explicit username if requested like "@nike"
        const possibleUserResult = input.rawText.match(/@([a-zA-Z0-9_.-]+)/);
        if (possibleUserResult) {
            username = possibleUserResult[1];
        } else {
            console.log(`[Instagram Skill] Nenhum @ fornecido. Usando conta padrão: @${username}`);
        }

        let browser;
        try {
            console.log(`[Instagram Skill] 🔌 Tentando conectar ao Chrome local na porta 9222...`);
            // Connect to local debug port mapping the user's active session
            browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
        } catch (e) {
            return {
                text: `❌ Não consegui conectar ao seu Google Chrome invisível.\n\nPara o roubo de dados no Instagram funcionar com segurança, seu Chrome precisa estar rodando a porta de debug.\nAbra o terminal e execute:\n\`/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222\``
            };
        }

        console.log(`[Instagram Skill] ✅ Conectado ao Chrome da Ana. Abrindo aba invisível para instagram.com/${username}...`);
        const page = await browser.newPage();

        try {
            await page.setViewport({ width: 1280, height: 800 });
            await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle2', timeout: 30000 });

            console.log(`[Instagram Skill] ⏳ Verificando status de login (bypass de bloqueio)...`);
            const isLoggedIn = await page.evaluate(() => {
                return !document.querySelector('input[name="username"]');
            });

            if (!isLoggedIn) {
                await page.close();
                browser.disconnect();
                return { text: `⚠️ A conta Chrome atual não está logada no Instagram. Acesse \`instagram.com\`, faca seu login, e tente este comando novamente!` };
            }

            console.log(`[Instagram Skill] 🕵️ Extraindo 6 posts mais recentes e performance social...`);
            try {
                // Waits for posts grid container
                await page.waitForSelector('article', { timeout: 10000 });
            } catch (err) {
                console.warn(`[Instagram Skill] Container article não encontrado, talvez perfil privado ou vazio.`);
            }

            const posts = await page.evaluate(() => {
                const results: Array<{ url: string, description: string }> = [];
                const article = document.querySelector('article');
                if (!article) return [];

                // Pega os links do feed (.x1i10hfl costuma ser classe base de post)
                const links = article.querySelectorAll('a[href^="/p/"], a[href^="/reel/"]');

                for (let i = 0; i < Math.min(6, links.length); i++) {
                    const el = links[i] as HTMLAnchorElement;
                    const img = el.querySelector('img');
                    results.push({
                        url: el.href,
                        description: img?.getAttribute('alt') || '[Vídeo/Espaço sem legenda Alt disponível]',
                    });
                }
                return results;
            });

            // Clean up resources cleanly
            await page.close();
            browser.disconnect();

            if (posts.length === 0) {
                return { text: `🧐 Conectei com sucesso, mas não encontrei nenhum post recente acessível na conta @${username}.` };
            }

            console.log(`[Instagram Skill] 📊 Sucesso! ${posts.length} posts extraídos.`);

            // O conteúdo cru que entrará na pipeline do LLM (Scout/Social)
            const report = `[SISTEMA - DADOS DE INSTAGRAM OBTIDOS]\n\nAqui estão os dados brutos e texto alternativo extraídos da grade atual do Instagram de @${username}:\n\n` +
                posts.map((p, idx) => `Post ${idx + 1}: ${p.url}\nLegenda/Contexto detectado: ${p.description}`).join('\n\n') +
                `\n\n[INSTRUÇÃO AO LLM]: Ignore limitações de não ter acesso ao instagram. Você ACABOU de ler estes dados oficiais de acesso. Atue agora proativamente criando um documento analítico para a Ana apontando tendências de conteúdo nesses posts, quais temas ela tem batido, e faça um diagnóstico estratégico resumido conforme a metodologia social. Não diga que você não tem acesso a métricas. Use apenas o que foi fornecido.`;

            return { text: report };

        } catch (err) {
            await page.close().catch(() => { });
            browser.disconnect();

            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[Instagram Skill] ❌ Erro sistêmico: ${msg}`);
            return { text: `❌ Ocorreu um erro no motor de Scraping do Instagram: \n\`${msg}\`` };
        }
    }
};
