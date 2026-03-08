/**
 * GravityClaw — Social Specialist
 *
 * Planeja publicações, calendário editorial e estratégia de conteúdo.
 * Usa Gemini 3.1 Pro para planejamento e organização.
 */

import { Specialist } from '../core/specialist.js';

import type { LLMRouter } from '../core/llm/router.js';

export class SocialSpecialist extends Specialist {
  private braveApiKey: string;

  constructor(braveApiKey: string) {
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
- Buscar notícias e tendências atuais na internet para embasar a estratégia

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
    this.braveApiKey = braveApiKey;
  }

  async run(input: import('../core/specialist.js').SpecialistInput, llmRouter: LLMRouter): Promise<import('../core/specialist.js').SpecialistOutput> {
    // Verifica se o usuário pediu para pesquisar algo (heurística simples)
    const needsSearch = input.text.toLowerCase().match(/busc|pesquis|notícia|atual|recente|trend|internet|brave/);
    let searchResults = '';

    if (needsSearch) {
      console.log(`[Social] 🔍 Identificada necessidade de pesquisa na web.`);
      const queryResult = await llmRouter.complete(
        [{ role: 'user', content: `O usuário quer planejar redes sociais mas precisa de informações atuais. Baseado no pedido: "${input.text}", extraia a query de pesquisa ideal (em português ou inglês) para buscas no Brave Search. Responda APENAS com a query de busca, sem explicações. Se a solicitação não for clara o suficiente para gerar uma busca objetiva, responda exatamente com a palavra VAZIO.` }],
        {
          model: this.config.model,
          maxTokens: 100,
          temperature: 0.1,
        }
      );

      let query = queryResult.content.trim();
      query = query.replace(/^["']|["']$/g, '');
      console.log(`[Social] 🔍 Extratou query: "${query}"`);

      if (!query || query.toUpperCase() === 'VAZIO' || query.toUpperCase().includes('VAZIO')) {
        console.log(`[Social] ⚠️ Consulta vaga ou vazia. Pulando pesquisa na web.`);
        searchResults = `[SISTEMA: O usuário acionou a análise mas não especificou um tema claro para busca na internet. Aja com polidez e peça para ele especificar exatamente o que gostaria de pesquisar.]`;
      } else {
        if (input.onProgress) {
          await input.onProgress(`🔍 Buscando informações atualizadas sobre "${query}" na internet...`);
        }

        try {
          searchResults = await this.braveSearch(query);
        } catch (err) {
          console.error(`[Social] ❌ Erro Brave Search: ${err}`);
          searchResults = `[SISTEMA: A pesquisa não pôde ser executada na internet neste momento devido a um erro técnico: ${err}. Em vez disso, guie o usuário com seu conhecimento prévio sobre redes sociais.]`;
        }
      }
    }

    const context = searchResults ? `\n\n[DADOS DE PESQUISA RECENTES NA INTERNET (Use isso para basear sua resposta)]:\n${searchResults}` : '';

    const response = await llmRouter.complete(
      [
        ...(input.context ? [{ role: 'system', content: input.context }] as any : []),
        { role: 'user', content: input.text + context }
      ],
      {
        model: this.config.model,
        systemPrompt: this.config.systemPrompt,
        maxTokens: this.config.maxTokens ?? 3000,
        temperature: this.config.temperature ?? 0.5,
      }
    );

    return {
      text: response.content,
    };
  }

  private async braveSearch(query: string): Promise<string> {
    if (!this.braveApiKey) {
      return 'Acesso à internet não configurado.';
    }
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;

    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': this.braveApiKey,
      },
    });

    if (!res.ok) {
      throw new Error(`Brave Search API: ${res.status}`);
    }

    const data = await res.json() as {
      web?: { results: { title: string; url: string; description: string }[] };
    };

    if (!data.web?.results.length) {
      return 'Nenhum resultado encontrado na web.';
    }

    return data.web.results
      .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.description}\n   Fonte: ${r.url}`)
      .join('\n\n');
  }
}
