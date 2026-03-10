/**
 * GravityClaw — Designer Specialist
 *
 * Gera imagens e banners usando Leonardo.ai e HTML/CSS.
 * Prioriza banner com texto e moldura como caso principal.
 */

import { Specialist, type SpecialistInput, type SpecialistOutput } from '../core/specialist.js';
import type { LLMRouter } from '../core/llm/router.js';
import { bannerTemplate } from '../templates/banner.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const nodeHtmlToImage = require('node-html-to-image');

const LEONARDO_API = 'https://cloud.leonardo.ai/api/rest/v1';

type DesignerMode = 'imagem' | 'banner';

interface DesignerSession {
    step: 'awaiting_mode' | 'awaiting_prompt' | 'editing_existing';
    selectedMode?: DesignerMode;
    lastPrompt?: string;
    lastBannerCopy?: BannerCopy;
    lastImageUrl?: string;
}

interface BannerCopy {
    title: string | null;
    number: string | null;
    body: string;
    highlight: string | null;
    isQuote: boolean;
    bgColor: string;
    accentColor: string;
    fontColor: string | null;
    frameStyle: 'accent' | 'clean' | 'double';
}

export class DesignerSpecialist extends Specialist {
    private leonardoApiKey: string;
    private pendingSessions = new Map<string, DesignerSession>();

    constructor(leonardoApiKey: string) {
        super({
            name: 'Designer',
            description: 'Gera imagens visuais (Leonardo.ai) ou banners textuais com moldura em HTML/CSS.',
            model: 'google/gemini-3.1-pro-preview',
            systemPrompt: `Você é o Designer, especialista em criação visual para a Ana Moser.

## Capacidades
1. Modo Banner: peças com texto, tarja, moldura, destaque e composição previsível.
2. Modo Ilustração: imagens via Leonardo.ai, sem texto escrito.
3. Continuação: quando o usuário trouxer ajuste para uma peça já criada, preserve o contexto da tarefa.

## Regras
- Se o usuário pedir texto escrito na peça, banner, moldura, box, aspas, frase, citação ou slide: use MODO BANNER.
- Se o usuário pedir imagem artística/fotográfica sem texto: use MODO ILUSTRAÇÃO.
- Responda com clareza curta e preserve o contexto quando a tarefa já estiver em andamento.`,
            triggers: [
                'criar imagem', 'gerar imagem', 'design', 'slide',
                'imagem de', 'foto de', 'visual', 'banner',
                'ilustração', 'arte', 'thumbnail', 'post escrito', 'frase',
                'moldura', 'tarja', '/designer', '/imagem', 'escrever na imagem'
            ],
            temperature: 0.5,
            maxTokens: 1800,
        });
        this.leonardoApiKey = leonardoApiKey;
    }

    override hasActiveSession(senderId: string): boolean {
        return this.pendingSessions.has(senderId);
    }

    override clearSession(senderId: string): void {
        this.pendingSessions.delete(senderId);
    }

    async run(input: SpecialistInput, llmRouter: LLMRouter): Promise<SpecialistOutput> {
        const sourceId = input.senderId;
        const session = this.pendingSessions.get(sourceId);
        const normalizedText = input.text.trim();
        const lower = normalizedText.toLowerCase();

        if (session) {
            if (lower === 'cancelar' || lower === 'sair' || lower === 'voltar') {
                this.pendingSessions.delete(sourceId);
                return { text: '❌ Sessão do Designer cancelada. O Doug pode encaminhar a próxima tarefa.' };
            }

            if (session.step === 'awaiting_mode') {
                const selectedMode = this.resolveInteractiveMode(normalizedText);
                if (!selectedMode) {
                    return { text: 'Responda com **1** para ilustração ou **2** para banner com texto e moldura. Se preferir, diga "cancelar".' };
                }

                session.selectedMode = selectedMode;
                session.step = 'awaiting_prompt';
                return {
                    text: selectedMode === 'banner'
                        ? '✍️ **Modo Banner Selecionado**\nEnvie o texto da peça, e se quiser, já diga cor, moldura, destaque ou ajustes de layout.'
                        : '🎨 **Modo Ilustração Selecionado**\nEnvie a descrição da imagem que devo criar.'
                };
            }

            if (session.step === 'awaiting_prompt') {
                session.lastPrompt = normalizedText;
                if (session.selectedMode === 'banner') {
                    const result = await this.runBannerMode(input, llmRouter, session);
                    session.step = 'editing_existing';
                    return result;
                }

                const result = await this.runImageMode(input, llmRouter, session);
                session.step = 'editing_existing';
                return result;
            }

            if (session.step === 'editing_existing') {
                const inferredMode = session.selectedMode ?? await this.classifyMode(normalizedText, llmRouter);
                session.selectedMode = inferredMode;
                session.lastPrompt = normalizedText;

                if (inferredMode === 'banner') {
                    const result = await this.runBannerMode(input, llmRouter, session);
                    return result;
                }

                return this.runImageMode(input, llmRouter, session);
            }
        }

        const cleanInput = normalizedText.replace(/\/designer/i, '').replace(/\/imagem/i, '').trim();
        if (cleanInput === '' || cleanInput.length < 5) {
            this.pendingSessions.set(sourceId, { step: 'awaiting_mode' });
            return {
                text: '🎨 **Estúdio do Designer**\n1️⃣ Ilustração AI\n2️⃣ Banner com texto e moldura\n\nResponda com **1** ou **2**.'
            };
        }

        const selectedMode = await this.classifyMode(cleanInput, llmRouter);
        const nextSession: DesignerSession = {
            step: 'editing_existing',
            selectedMode,
            lastPrompt: cleanInput,
        };
        this.pendingSessions.set(sourceId, nextSession);

        if (selectedMode === 'banner') {
            return this.runBannerMode({ ...input, text: cleanInput }, llmRouter, nextSession);
        }

        return this.runImageMode({ ...input, text: cleanInput }, llmRouter, nextSession);
    }

    private resolveInteractiveMode(text: string): DesignerMode | null {
        const lower = text.toLowerCase().trim();
        if (lower === '1' || lower.includes('imagem') || lower.includes('foto') || lower.includes('ilustra')) return 'imagem';
        if (lower === '2' || lower.includes('banner') || lower.includes('texto') || lower.includes('moldura') || lower.includes('slide')) return 'banner';
        return null;
    }

    private async classifyMode(text: string, llmRouter: LLMRouter): Promise<DesignerMode> {
        const intentResult = await llmRouter.complete(
            [{
                role: 'user',
                content: `Analise este pedido: "${text}".
Regras:
1. Se houver banner, frase, texto, escrever, moldura, tarja, post ou slide: responda APENAS com modo_banner.
2. Se for imagem artística/fotográfica sem texto: responda APENAS com modo_imagem.`
            }],
            { model: this.config.model, maxTokens: 30, temperature: 0.1 }
        );

        return intentResult.content.toLowerCase().includes('banner') ? 'banner' : 'imagem';
    }

    private async runBannerMode(input: SpecialistInput, llmRouter: LLMRouter, session: DesignerSession): Promise<SpecialistOutput> {
        const originalText = input.text.trim();
        const previousCopy = session.lastBannerCopy ? JSON.stringify(session.lastBannerCopy, null, 2) : 'null';
        const copyPrompt = `
Gere a estrutura JSON para um banner de Ana Moser.

Pedido atual do usuário:
"${originalText}"

Última peça já gerada nesta sessão:
${previousCopy}

Regras:
- Se o pedido atual for ajuste, preserve a peça anterior e altere apenas o que foi pedido.
- O caso principal é banner com texto, moldura, destaque e composição previsível.
- O texto principal deve ficar em "body".
- Se não houver título explícito, use null.
- Se não houver número explícito, use null.
- Se não houver destaque em box, use null.
- Se não houver cor pedida, use bgColor "#0B192C" e accentColor "#F6C90E".
- Se não houver cor de fonte pedida, use null.
- frameStyle deve ser "accent", "clean" ou "double". Se o usuário falar em moldura ou borda forte, prefira "double".

Responda APENAS com JSON válido nesta estrutura:
{
  "title": string | null,
  "number": string | null,
  "body": string,
  "highlight": string | null,
  "isQuote": boolean,
  "bgColor": string,
  "accentColor": string,
  "fontColor": string | null,
  "frameStyle": "accent" | "clean" | "double"
}`;

        const copyResult = await llmRouter.complete(
            [{ role: 'user', content: copyPrompt }],
            { model: this.config.model, temperature: 0.4, maxTokens: 1200 }
        );

        let copyData: BannerCopy;
        try {
            let cleanJson = copyResult.content.trim();
            cleanJson = cleanJson.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
            copyData = JSON.parse(cleanJson) as BannerCopy;
        } catch {
            console.error('[Designer] Falha ao fazer parse do JSON do banner:', copyResult.content);
            return { text: 'Não consegui estruturar o banner com segurança. Reenvie o texto principal da peça de forma mais direta.' };
        }

        const bannerText = typeof copyData.body === 'string' ? copyData.body : originalText;
        const textLen = bannerText.length;
        let dynamicFontSize = '42px';
        if (textLen <= 60) dynamicFontSize = '76px';
        else if (textLen <= 120) dynamicFontSize = '60px';
        else if (textLen <= 180) dynamicFontSize = '48px';
        else dynamicFontSize = '38px';

        let titleFontSize = '52px';
        if (copyData.title) {
            const titleLen = copyData.title.length;
            if (titleLen <= 10) titleFontSize = '88px';
            else if (titleLen <= 20) titleFontSize = '68px';
        }

        const bgColor = copyData.bgColor || '#0B192C';
        const accentColor = copyData.accentColor || '#F6C90E';
        const fontColor = copyData.fontColor || this.getContrastYIQ(bgColor);
        const frameStyle = copyData.frameStyle || 'accent';
        const frameBorder = frameStyle === 'double'
            ? `16px double ${accentColor}`
            : frameStyle === 'clean'
                ? '2px solid rgba(255,255,255,0.24)'
                : `10px solid ${accentColor}`;
        const frameShadow = frameStyle === 'clean'
            ? '0 12px 40px rgba(0,0,0,0.32)'
            : '0 20px 50px rgba(0,0,0,0.5)';

        if (input.onProgress) await input.onProgress('🧑‍💻 Compilando banner com tipografia, destaque e moldura...');

        try {
            const imageBuffer = await nodeHtmlToImage({
                html: bannerTemplate,
                content: {
                    title: copyData.title,
                    number: copyData.number,
                    body: bannerText,
                    highlight: copyData.highlight,
                    isQuote: copyData.isQuote,
                    fontSize: dynamicFontSize,
                    titleFontSize,
                    bgColor,
                    accentColor,
                    fontColor,
                    frameStyle,
                    frameBorder,
                    frameShadow,
                },
                type: 'png',
                puppeteerArgs: {
                    args: ['--no-sandbox', '--disable-setuid-sandbox'],
                    userDataDir: './.puppeteer_cache'
                }
            }) as Buffer;

            session.lastBannerCopy = copyData;
            session.selectedMode = 'banner';

            let driveLink = '';
            let driveWarning = '';
            if (input.driveService) {
                try {
                    if (input.onProgress) await input.onProgress('☁️ Salvando banner final no Drive...');
                    const fileName = `banner_${Date.now()}.png`;
                    const driveFile = await input.driveService.saveDesignerAsset(fileName, imageBuffer, 'image/png');
                    driveLink = `\n\n[🖼️ Salvo no Drive: ${driveFile.webViewLink} ]`;
                } catch (err) {
                    console.error('[Designer] Erro ao salvar banner no Drive:', err);
                    driveWarning = '\n\n[⚠️ Banner gerado, mas o upload no Drive falhou.]';
                }
            }

            return {
                text: `🎨 **Banner pronto!**\n\nPeça montada com texto, moldura e destaque.${driveLink}${driveWarning}\n\nSe quiser, posso ajustar cor, moldura, hierarquia ou texto na mesma sessão.`,
                mediaBuffer: imageBuffer,
                metadata: {
                    type: 'banner_html',
                    mimeType: 'image/png',
                    fileName: `banner-${Date.now()}.png`,
                    copy: copyData,
                },
            };
        } catch (err) {
            console.error('[Designer] Erro no render do banner:', err);
            return { text: `Algo falhou ao renderizar o banner: ${String(err)}` };
        }
    }

    private async runImageMode(input: SpecialistInput, llmRouter: LLMRouter, session: DesignerSession): Promise<SpecialistOutput> {
        const contextNote = session.lastImageUrl
            ? `A última imagem criada nesta sessão foi: ${session.lastImageUrl}. Se o pedido atual for continuação, refine a ideia visual mantendo coerência.`
            : '';

        const promptResult = await llmRouter.complete(
            [{
                role: 'user',
                content: `Crie um prompt detalhado em INGLÊS para gerar esta imagem, sem texto escrito dentro dela: "${input.text}". ${contextNote}`.trim()
            }],
            {
                model: this.config.model,
                systemPrompt: 'Você escreve prompts visuais para geração de imagem. Foque em iluminação, composição, atmosfera e acabamento. Nunca inclua texto legível na imagem.',
                maxTokens: 500,
                temperature: 0.6,
            }
        );

        const imagePrompt = promptResult.content.trim();
        console.log(`[Designer] 🎨 Prompt gerado (Leonardo): ${imagePrompt.slice(0, 80)}...`);

        try {
            if (input.onProgress) await input.onProgress('🖌️ Gerando imagem via Leonardo.ai...');
            const imageUrl = await this.generateImage(imagePrompt);
            session.lastImageUrl = imageUrl;
            session.selectedMode = 'imagem';

            let driveLink = '';
            let driveWarning = '';
            if (input.driveService) {
                try {
                    if (input.onProgress) await input.onProgress('☁️ Salvando imagem no Drive...');
                    const imgRes = await fetch(imageUrl);
                    const arrayBuffer = await imgRes.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    const fileName = `imagem_${Date.now()}.png`;
                    const driveFile = await input.driveService.saveDesignerAsset(fileName, buffer, 'image/png');
                    driveLink = `\n\n[🖼️ Salvo no Drive: ${driveFile.webViewLink} ]`;
                } catch (err) {
                    console.error('[Designer] Erro ao salvar imagem no Drive:', err);
                    driveWarning = '\n\n[⚠️ Imagem criada, mas o upload no Drive falhou.]';
                }
            }

            return {
                text: `🎨 Ilustração criada!${driveLink}${driveWarning}\n\nSe quiser continuar a mesma peça, me diga o ajuste visual.`,
                mediaUrl: imageUrl,
                metadata: { prompt: imagePrompt, provider: 'leonardo.ai' },
            };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[Designer] ❌ Erro Leonardo.ai: ${msg}`);
            return {
                text: `Não consegui gerar a imagem agora. Erro do provedor visual: ${msg}\n\nPrompt usado: ${imagePrompt}`,
            };
        }
    }

    private getContrastYIQ(hexcolor: string): string {
        let normalized = hexcolor.replace('#', '');
        if (normalized.length === 3) normalized = normalized.split('').map(c => c + c).join('');
        const r = parseInt(normalized.slice(0, 2), 16);
        const g = parseInt(normalized.slice(2, 4), 16);
        const b = parseInt(normalized.slice(4, 6), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return yiq >= 128 ? '#0B192C' : '#FFFFFF';
    }

    private async generateImage(prompt: string): Promise<string> {
        const genRes = await fetch(`${LEONARDO_API}/generations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.leonardoApiKey}`,
            },
            body: JSON.stringify({
                prompt,
                modelId: '6b645e3a-d64f-4341-a6d8-7a3690fbf042',
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
