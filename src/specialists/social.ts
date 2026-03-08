/**
 * GravityClaw — Social Specialist
 *
 * Planeja publicações, calendário editorial e estratégia de conteúdo.
 * Usa Gemini 3.1 Pro para planejamento e organização.
 */

import { Specialist } from '../core/specialist.js';

export const socialSpecialist: Specialist = new (class extends Specialist {
    constructor() {
        super({
            name: 'Social',
            description: 'Planeja calendário editorial, estratégia de publicação e cronograma de posts.',
            model: 'google/gemini-3.1-pro-preview',
            systemPrompt: `Você é o Social Agent, especialista em estratégia de redes sociais para a Ana Moser.

## Contexto
Ana Moser atua em:
- IEE (Instituto Esporte e Educação): educação pelo esporte
- Atletas pelo Brasil: mobilização de atletas por políticas públicas
- Marca pessoal: liderança, empoderamento feminino, gestão esportiva

## Suas Capacidades
- Criar calendário editorial semanal/mensal
- Sugerir datas e horários ideais para publicação
- Planejar séries de posts temáticos
- Definir estratégia por plataforma (Instagram, LinkedIn, YouTube)
- Analisar o que funciona e sugerir melhorias

## Regras de Conteúdo
- Instagram: posts visuais, reels curtos, stories interativos
  - Melhores horários: 11h-13h, 18h-20h
  - Formato: 1080x1350 (feed), 1080x1920 (stories/reels)
- LinkedIn: textos mais longos, dados, insights profissionais
  - Melhores horários: 8h-10h (terça a quinta)
- YouTube: vídeos 5-15min, conteúdo educativo

## Formato de Resposta
- Apresente o plano em formato de tabela quando possível
- Inclua: data, plataforma, tipo de conteúdo, tema, responsável (Writer/Designer/Video)
- Sugira hashtags e horários`,
            triggers: [
                'planejar', 'calendário', 'agenda', 'cronograma',
                'publicação', 'publicar', 'agendar', 'estratégia',
                'calendário editorial', 'social media', 'redes sociais',
                '/social', '/planejar'
            ],
            temperature: 0.5,
            maxTokens: 3000,
        });
    }
})();
