/**
 * GravityClaw — Designer Specialist
 *
 * Gera imagens e slides usando Leonardo.ai API.
 * Usa Gemini 3.1 Pro para formular prompts visuais.
 */

import { Specialist, type SpecialistInput, type SpecialistOutput } from '../core/specialist.js';
import type { LLMRouter } from '../core/llm/router.js';
import { bannerTemplate } from '../templates/banner.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const nodeHtmlToImage = require('node-html-to-image');

const LEONARDO_API = 'https://cloud.leonardo.ai/api/rest/v1';

export class DesignerSpecialist extends Specialist {
    private leonardoApiKey: string;

    private pendingSessions = new Map<string, {
        step: 'awaiting_mode' | 'awaiting_prompt',
        selectedMode?: 'imagem' | 'banner'
    }>();

    constructor(leonardoApiKey: string) {
        super({
            name: 'Designer',
            description: 'Gera imagens visuais (Leonardo.ai) ou Banners Textuais (HTML Dinâmico).',
            model: 'google/gemini-3.1-pro-preview',
            systemPrompt: `Você é o Designer, especialista em criação visual para a Ana Moser.

## Suas Capacidades (Dois Modos)
1. **Modo Ilustração**: Para fotos, ilustrações realistas, cenários. Usamos a API do Leonardo.ai.
2. **Modo Banner**: Para slides com textos e frases (ex: frases de motivação, autismo, comprometimento). Usamos um motor HTML para escrever a tipografia perfeitamente.

## Regras
- Se o usuário pedir um texto escrito na imagem, banner, post ou slide com texto: use o MODO BANNER.
- Se pedir imagem pura, arte livre, fotografia: use o MODO ILUSTRAÇÃO.
- Responda brevemente descrevendo o que vai fazer antes de chamar as funções.`,
            triggers: [
                'criar imagem', 'gerar imagem', 'design', 'slide',
                'imagem de', 'foto de', 'visual', 'banner',
                'ilustração', 'arte', 'thumbnail', 'post escrito', 'frase',
                '/designer', '/imagem', 'escrever na imagem'
            ],
            temperature: 0.6,
            maxTokens: 1500,
        });
        this.leonardoApiKey = leonardoApiKey;
    }

    hasActiveSession(senderId: string): boolean {
        return this.pendingSessions.has(senderId);
    }

    async run(input: SpecialistInput, llmRouter: LLMRouter): Promise<SpecialistOutput> {
        const sourceId = input.senderId;

        // 0. Processamento de Sessão Interativa Ativa
        if (this.pendingSessions.has(sourceId)) {
            const session = this.pendingSessions.get(sourceId)!;
            const text = input.text.toLowerCase().trim();

            // Opção de cancelar o menu
            if (text === 'cancelar' || text === 'sair' || text === 'voltar') {
                this.pendingSessions.delete(sourceId);
                return { text: '❌ Menu do Designer cancelado. Pode me pedir outra coisa.' };
            }

            if (session.step === 'awaiting_mode') {
                if (text === '1' || text.includes('imagem') || text.includes('foto') || text.includes('ilustra')) {
                    session.selectedMode = 'imagem';
                    session.step = 'awaiting_prompt';
                    return { text: '🎨 **Modo Ilustração Selecionado**\nÓtimo! Vou gerar uma ilustração via AI. O que você gostaria de ver na imagem? (Me dê detalhes ou envie um prompt)' };
                } else if (text === '2' || text.includes('banner') || text.includes('texto') || text.includes('slide')) {
                    session.selectedMode = 'banner';
                    session.step = 'awaiting_prompt';
                    return { text: '✍️ **Modo Banner Selecionado**\nPerfeito! Vou criar um slide usando as cores e a fonte oficiais. Qual é o título e o texto da mensagem?' };
                } else {
                    return { text: 'Não entendi. Por favor, responda apenas com **1** (para Imagem AI) ou **2** (para Banner com Texto), ou digite "cancelar".' };
                }
            }

            if (session.step === 'awaiting_prompt') {
                const mode = session.selectedMode;
                this.pendingSessions.delete(sourceId); // Finaliza o menu interativo

                if (mode === 'banner') {
                    return this.runBannerMode(input, llmRouter);
                } else {
                    return this.runImageMode(input, llmRouter);
                }
            }
        }

        // 1. Menu Inicial (Acionado apenas se o comando for direto e sem prompt adicional)
        const cleanInput = input.text.replace(/\/designer/i, '').replace(/\/imagem/i, '').trim();

        if (cleanInput === '' || cleanInput.length < 5) {
            this.pendingSessions.set(sourceId, { step: 'awaiting_mode' });
            return {
                text: `🎨 **Bem-vindo ao Estúdio do Designer!**\nO que você quer criar neste momento?\n\n1️⃣ **Ilustração (AI)**: Fotos realistas, concept art, abstrato.\n2️⃣ **Banner (Texto)**: Slide estruturado com a tipografia oficial e frases.\n\nResponda com **1** ou **2**.`
            };
        }

        // 2. Fluxo Tradicional "Tudo de uma Vez" (O usuário mandou o prompt direto, delegamos ao LLM classificar)
        const intentResult = await llmRouter.complete(
            [{
                role: 'user', content: `Analise este pedido: "${input.text}".
Regras estritas de classificação:
1. Se o usuário pedir um "slide", "post", "banner", "escrever" algo, "frase", ou "texto": responda modo_banner.
2. Se o usuário pedir apenas uma imagem puramente artística, fotografia realista sem menção a texto explícito: responda modo_imagem.
Qual é a intenção? Responda APENAS com modo_imagem ou modo_banner.` }],
            { model: this.config.model, maxTokens: 50, temperature: 0.1 }
        );

        const mode = intentResult.content.trim().toLowerCase().includes('banner') ? 'banner' : 'imagem';
        console.log(`[Designer] 🎨 Modo de Geração Automático Escolhido via LLM: ${mode}`);

        if (mode === 'banner') {
            return this.runBannerMode(input, llmRouter);
        } else {
            return this.runImageMode(input, llmRouter);
        }
    }

    private async runBannerMode(input: SpecialistInput, llmRouter: LLMRouter): Promise<SpecialistOutput> {
        // O LLM age como Redator
        const copyPrompt = `
Gere a estrutura JSON para um banner/slide com a exata mensagem fornecida pelo usuário: "${input.text}".
Você DEVE retornar **estritamente em formato JSON valido**, sem crases no começo ou fim, usando a seguinte estrutura exata:
{
  "title": "TÍTULO CURTO EM MAIÚSCULO (OPCIONAL. Retorne SOMENTE se o usuário pedir explicitamente um título. Se não pedir título, retorne null!)",
  "number": "NÚMERO OU ÍCONE CURTO (OPCIONAL. Retorne SOMENTE se o usuário pedir explicitamente um número no topo do slide. Ex: '1', '2'. Se não pedir, retorne null!)",
  "body": "USE EXATAMENTE O TEXTO FORNECIDO PELO USUÁRIO. Não invente, não expanda e não adicione informações extras. Se o texto for longo, mas for o que o usuário enviou, mantenha. Use '\\n' se precisar quebrar a linha do texto original de forma semântica.",
  "highlight": "FRASE DE DESTAQUE (OPCIONAL. Retorne SOMENTE se o usuário pediu explicitamente para colocar um texto num box, num bloco amarelo, ou destacá-lo separado. Se não houver pedido explícito de box, retorne null obrigatoriamente!)",
  "isQuote": true ou false (se o usuário estiver fornecendo claramente uma citação de alguém),
  "bgColor": "CÓDIGO HEXADECIMAL da cor de fundo. Se o usuário NÃO pedir uma cor específica, use OBRIGATORIAMENTE o padrão '#0B192C' (Azul Escuro). Se pedir, traduza para um HEX bonito e elegante.",
  "accentColor": "CÓDIGO HEXADECIMAL da cor de destaque (usada no bloco e nas aspas). Se o usuário NÃO pedir cor de destaque, use OBRIGATORIAMENTE o padrão '#F6C90E' (Amarelo). Se pedir, traduza para HEX.",
  "fontColor": "CÓDIGO HEXADECIMAL da cor da fonte. (OPCIONAL. Retorne SOMENTE se o usuário pedir explicitamente para a fonte/letra ter uma cor específica. Se não pedir explícito, retorne null!)"
}
Mantenha fidelidade total ao pedido de texto do usuário. Se as cores não forem mencionadas, use os padrões.
        `;

        let copyData;
        const copyResult = await llmRouter.complete([{ role: 'user', content: copyPrompt }], { model: this.config.model, temperature: 0.7 });

        try {
            let cleanJson = copyResult.content.trim();
            if (cleanJson.startsWith('\`\`\`json')) cleanJson = cleanJson.replace('\`\`\`json', '');
            if (cleanJson.startsWith('\`\`\`')) cleanJson = cleanJson.replace('\`\`\`', '');
            if (cleanJson.endsWith('\`\`\`')) cleanJson = cleanJson.slice(0, -3);
            copyData = JSON.parse(cleanJson.trim());
        } catch (err) {
            console.error('[Designer] Falha ao fazer parse do JSON do Banner:', copyResult.content);
            return { text: `Desculpe, tentei desenhar o banner mas meu redator engasgou. Tente reabrir o pedido de forma levemente diferente!` };
        }

        if (input.onProgress) await input.onProgress('🧑‍💻 Compilando layout HTML...');

        // Cálculo de Fonte Dinâmica para o Corpo (Menos texto = Fonte maior)
        const textLen = copyData.body.length;
        let dynamicFontSize = '42px';
        if (textLen <= 60) dynamicFontSize = '75px';
        else if (textLen <= 120) dynamicFontSize = '60px';
        else if (textLen <= 180) dynamicFontSize = '48px';
        else dynamicFontSize = '38px';

        // Cálculo de Fonte Dinâmica para o Título
        let titleFontSize = '52px'; // Default
        if (copyData.title) {
            const titleLen = copyData.title.length;
            if (titleLen <= 10) titleFontSize = '90px'; // Very short titles can be huge
            else if (titleLen <= 20) titleFontSize = '70px';
            else titleFontSize = '52px';
        }

        // Cálculo de Contraste para a Cor da Fonte (W3C YIQ)
        const getContrastYIQ = (hexcolor: string) => {
            hexcolor = hexcolor.replace("#", "");
            if (hexcolor.length === 3) hexcolor = hexcolor.split('').map(c => c + c).join('');
            const r = parseInt(hexcolor.slice(0, 2), 16);
            const g = parseInt(hexcolor.slice(2, 4), 16);
            const b = parseInt(hexcolor.slice(4, 6), 16);
            const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
            return (yiq >= 128) ? '#0B192C' : '#FFFFFF'; // Dark text on light bgs, light on dark
        };

        const bgColor = copyData.bgColor || '#0B192C';
        const accentColor = copyData.accentColor || '#F6C90E';
        const fontColor = copyData.fontColor || getContrastYIQ(bgColor);

        try {
            if (input.onProgress) await input.onProgress('✨ Renderizando tipografia do Banner...');
            const imageBuffer = await nodeHtmlToImage({
                html: bannerTemplate,
                content: {
                    title: copyData.title,
                    number: copyData.number,
                    body: copyData.body,
                    highlight: copyData.highlight,
                    isQuote: copyData.isQuote,
                    fontSize: dynamicFontSize,
                    titleFontSize: titleFontSize,
                    bgColor: bgColor,
                    accentColor: accentColor,
                    fontColor: fontColor
                },
                type: 'png',
                puppeteerArgs: {
                    args: ['--no-sandbox', '--disable-setuid-sandbox'],
                    userDataDir: './.puppeteer_cache'
                }
            }) as Buffer;

            let driveLink = '';
            if (input.driveService) {
                try {
                    if (input.onProgress) await input.onProgress('☁️ Salvando banner final no Drive...');
                    const folders = input.driveService.getFolders();
                    if (folders) {
                        const fileName = `banner_${Date.now()}.png`;
                        const driveFile = await input.driveService.uploadFile(fileName, imageBuffer, 'image/png', folders.outputsImagens);
                        driveLink = `\n\n[🖼️ Salvo no Drive: ${driveFile.webViewLink} ]`;
                    }
                } catch (err) {
                    console.error('[Designer] Erro ao salvar no Drive:', err);
                }
            }

            return {
                text: `🎨 **Banner Renderizado com Sucesso!**\n\nTítulo: ${copyData.title}\n_Gerado via Motor Visual (HTML/CSS)_${driveLink}`,
                mediaBuffer: imageBuffer,
                metadata: { type: 'banner_html', copy: copyData },
            };

        } catch (err) {
            console.error('[Designer] Erro no render-html:', err);
            return { text: `Algo deu errado na máquina de renderizar o banner: ${err}` };
        }
    }

    private async runImageMode(input: SpecialistInput, llmRouter: LLMRouter): Promise<SpecialistOutput> {
        // 1. Usa o LLM para criar um prompt visual detalhado em inglês
        const promptResult = await llmRouter.complete(
            [{ role: 'user', content: `Crie um prompt detalhado em INGLÊS para gerar esta imagem (SEM TEXTOS ESCRITOS): "${input.text}". Responda APENAS com o prompt, sem explicações.` }],
            {
                model: this.config.model,
                systemPrompt: 'Você é um especialista em prompts para geração de imagens fotográficas/abstratas. Crie prompts descritivos, focando em iluminação, mood e paleta. IMPORTANTE: IA geradora de imagem não sabe escrever. Não inclua textos soltos no prompt.',
                maxTokens: 500,
                temperature: 0.7,
            }
        );

        const imagePrompt = promptResult.content.trim();
        console.log(`[Designer] 🎨 Prompt gerado (Leonardo): ${imagePrompt.slice(0, 80)}...`);

        // 2. Gera a imagem via Leonardo.ai
        try {
            if (input.onProgress) await input.onProgress('🖌️ Desenhando pixels com Leonardo.ai...');
            const imageUrl = await this.generateImage(imagePrompt);

            let driveLink = '';
            if (input.driveService) {
                try {
                    if (input.onProgress) await input.onProgress('☁️ Salvando cópia no Drive...');
                    const imgRes = await fetch(imageUrl);
                    const arrayBuffer = await imgRes.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);

                    const folders = input.driveService.getFolders();
                    if (folders) {
                        const fileName = `imagem_${Date.now()}.png`;
                        const driveFile = await input.driveService.uploadFile(fileName, buffer, 'image/png', folders.outputsImagens);
                        driveLink = `\n\n[🖼️ Salvo no Drive: ${driveFile.webViewLink} ]`;
                    }
                } catch (err) {
                    console.error('[Designer] Erro ao salvar no Drive:', err);
                }
            }

            return {
                text: `🎨 Ilustração criada!\n\n**Prompt usado:** ${imagePrompt}\n\n_Gerada via Leonardo.ai_${driveLink}`,
                mediaUrl: imageUrl,
                metadata: { prompt: imagePrompt, provider: 'leonardo.ai' },
            };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[Designer] ❌ Erro Leonardo.ai: ${msg}`);
            return {
                text: `Não consegui gerar a imagem agorinha. Erro do Provedor Visual: ${msg}\n\n**Prompt que seria usado:** ${imagePrompt}`,
            };
        }
    }

    private async generateImage(prompt: string): Promise<string> {
        // Inicia geração
        const genRes = await fetch(`${LEONARDO_API}/generations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.leonardoApiKey}`,
            },
            body: JSON.stringify({
                prompt,
                modelId: '6b645e3a-d64f-4341-a6d8-7a3690fbf042', // Leonardo Phoenix
                width: 768,
                height: 1024,
                num_images: 1,
            }),
        });

        if (!genRes.ok) {
            throw new Error(`Leonardo API: ${genRes.status} ${await genRes.text()}`);
        }

        const genData = await genRes.json() as {
            sdGenerationJob: { generationId: string };
        };
        const generationId = genData.sdGenerationJob.generationId;

        // Aguarda resultado (polling)
        for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 3000));

            const statusRes = await fetch(`${LEONARDO_API}/generations/${generationId}`, {
                headers: { 'Authorization': `Bearer ${this.leonardoApiKey}` },
            });

            if (!statusRes.ok) continue;

            const statusData = await statusRes.json() as {
                generations_by_pk: {
                    status: string;
                    generated_images: { url: string }[];
                };
            };

            if (statusData.generations_by_pk.status === 'COMPLETE') {
                const images = statusData.generations_by_pk.generated_images;
                if (images.length > 0 && images[0]) {
                    return images[0].url;
                }
            }
        }

        throw new Error('Timeout aguardando geração da imagem');
    }
}
