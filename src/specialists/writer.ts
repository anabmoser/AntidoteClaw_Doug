/**
 * GravityClaw — Writer Specialist
 *
 * Cria textos, legendas, posts e conteúdo escrito.
 * Usa Qwen 3.5 para escrita criativa.
 */

import { Specialist } from '../core/specialist.js';

export const writerSpecialist: Specialist = new (class extends Specialist {
    constructor() {
        super({
            name: 'Writer',
            description: 'Cria textos, legendas, posts, roteiros e conteúdo escrito para redes sociais e comunicação.',
            model: 'qwen/qwen3.5-27b',
            systemPrompt: `Você é o Writer, um especialista em criação de conteúdo para a Ana Moser.

## Contexto
Ana Moser é ex-jogadora de vôlei, presidente do IEE (Instituto Esporte e Educação) e líder do movimento Atletas pelo Brasil. Seu conteúdo é voltado para:
- Esporte e educação
- Políticas públicas de esporte
- Empoderamento feminino
- Liderança e gestão esportiva

## Suas Capacidades
- Criar legendas para Instagram (tom inspirador, direto, engajador)
- Escrever posts para LinkedIn (tom profissional, dados, insights)
- Criar roteiros para vídeos (curtos e objetivos)
- Adaptar tom conforme a plataforma

## Regras
- Use linguagem inclusiva e acessível
- Mantenha o tom autêntico da Ana: forte, acolhedor, visionário
- Inclua hashtags relevantes quando for para Instagram
- Sempre pergunte se precisa de ajustes antes de finalizar
- Formato padrão de legenda: gancho → desenvolvimento → CTA`,
            triggers: [
                'escrever', 'criar texto', 'legenda', 'post',
                'roteiro', 'caption', 'escribir', 'redação',
                'criar conteúdo', 'conteúdo para', 'copy',
                '/writer', '/escrever'
            ],
            temperature: 0.8,
            maxTokens: 3000,
        });
    }

    async run(input: import('../core/specialist.js').SpecialistInput, llmRouter: import('../core/llm/router.js').LLMRouter): Promise<import('../core/specialist.js').SpecialistOutput> {
        if (input.onProgress) await input.onProgress('📝 Escrevendo...');

        const messages = [
            { role: 'system' as const, content: this.config.systemPrompt },
            { role: 'user' as const, content: input.text },
        ];

        if (input.context) {
            messages.push({ role: 'system' as const, content: `Contexto Adicional:\n${input.context}` });
        }

        const options: any = { model: this.config.model };
        if (this.config.temperature !== undefined) options.temperature = this.config.temperature;
        if (this.config.maxTokens !== undefined) options.maxTokens = this.config.maxTokens;

        const response = await llmRouter.complete(messages, options);

        // Tentar salvar no Google Drive se disponível
        if (input.driveService) {
            try {
                const folders = input.driveService.getFolders();
                if (folders) {
                    const isCaption = input.text.toLowerCase().includes('legenda');
                    const targetFolder = isCaption ? folders.outputsLegendas : folders.outputsPosts;

                    const titleMatch = response.content.split('\n')[0]?.replace(/[#*]/g, '').trim();
                    const title = titleMatch ? `${titleMatch.substring(0, 30)}.txt` : `post_${Date.now()}.txt`;

                    if (input.onProgress) await input.onProgress('☁️ Salvando cópia no Drive...');
                    const driveDoc = await input.driveService.saveText(title, response.content, targetFolder);

                    return {
                        text: `${response.content}\n\n[📄 Salvo no Drive: ${driveDoc.webViewLink} ]`
                    };
                }
            } catch (err) {
                console.error('[Writer] Erro ao salvar no Drive:', err);
                // Continua e envia o texto mesmo se falhar no Drive
            }
        }

        return { text: response.content };
    }
})();
