/**
 * GravityClaw — Scout Specialist
 *
 * Pesquisa tendências, notícias e informações usando Brave Search API.
 * Usa Minimax M2.5 para análise e síntese.
 */

import { Specialist, type SpecialistInput, type SpecialistOutput } from '../core/specialist.js';
import type { LLMRouter } from '../core/llm/router.js';

export class ScoutSpecialist extends Specialist {
    private braveApiKey: string;

    constructor(braveApiKey: string) {
        super({
            name: 'Scout',
            description: 'Pesquisa tendências, notícias e informações relevantes na web.',
            model: 'minimax/minimax-m2.5',
            systemPrompt: `Você é o Scout, um especialista em pesquisa e análise de tendências.

## Suas Capacidades
- Pesquisar notícias e tendências atuais via Brave Search
- Analisar dados e sintetizar informações
- Identificar oportunidades de conteúdo
- Gerar relatórios concisos
- Para consultas sobre clima, tempo ou previsão, utilize suas integrações de internet para fornecer informações precisas e atualizadas.

## Áreas de Foco
- Esporte brasileiro e internacional
- Políticas públicas de esporte e educação
- Tendências de redes sociais
- Tecnologia e inovação no esporte

## Formato de Resposta
- Apresente os resultados de forma organizada
- Cite as fontes quando possível
- Destaque os insights mais relevantes
- Sugira ações baseadas nas descobertas`,
            triggers: [
                'pesquisar', 'pesquisa', 'tendências', 'analisar',
                'buscar', 'notícias', 'tendência', 'research',
                'o que está acontecendo', 'novidades sobre',
                '/scout', '/pesquisar',
                'clima', 'tempo', 'previsão', 'temperatura'
            ],
            temperature: 0.4,
            maxTokens: 3000,
        });
        this.braveApiKey = braveApiKey;
    }

    async run(input: SpecialistInput, llmRouter: LLMRouter): Promise<SpecialistOutput> {
        // 1. Extrai a query de pesquisa
        const queryResult = await llmRouter.complete(
            [{ role: 'user', content: `Extraia a query de pesquisa ideal (em português ou inglês, o que for mais relevante) para esta solicitação: "${input.text}". Responda APENAS com a query, sem explicações.` }],
            {
                model: this.config.model,
                maxTokens: 100,
                temperature: 0.2,
            }
        );

        const query = queryResult.content.trim();
        console.log(`[Scout] 🔍 Pesquisando: "${query}"`);

        // 2. Pesquisa via Brave Search
        let searchResults: string;
        try {
            searchResults = await this.braveSearch(query);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[Scout] ❌ Erro Brave Search: ${msg}`);
            searchResults = `[Pesquisa indisponível: ${msg}]`;
        }

        // 3. Analisa os resultados com o LLM
        const analysis = await llmRouter.complete(
            [{ role: 'user', content: `Com base na pesquisa "${input.text}", analise estes resultados e crie um relatório conciso:\n\n${searchResults}` }],
            {
                model: this.config.model,
                systemPrompt: this.config.systemPrompt,
                maxTokens: this.config.maxTokens ?? 3000,
                temperature: this.config.temperature ?? 0.4,
            }
        );

        return {
            text: analysis.content,
            metadata: { query, provider: 'brave-search' },
        };
    }

    private async braveSearch(query: string): Promise<string> {
        const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=8`;

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
            return 'Nenhum resultado encontrado.';
        }

        return data.web.results
            .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.description}\n   Fonte: ${r.url}`)
            .join('\n\n');
    }
}
