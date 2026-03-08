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
            [{ role: 'user', content: `Extraia a query de pesquisa ideal (em português ou inglês, o que for mais relevante) para esta solicitação: "${input.text}". Responda APENAS com a query, sem explicações. Se a solicitação for muito vaga, for apenas um cumprimento, ou não tiver um tema claro para busca na internet, responda exatamente com a palavra VAZIO.` }],
            {
                model: this.config.model,
                maxTokens: 100,
                temperature: 0.1,
            }
        );

        let query = queryResult.content.trim();
        // Remove aspas caso o LLM adicione acidentalmente
        query = query.replace(/^["']|["']$/g, '');

        console.log(`[Scout] 🔍 Extraiu query: "${query}"`);

        // 2. Pesquisa via Brave Search
        let searchResults: string;

        if (!query || query.toUpperCase() === 'VAZIO' || query.toUpperCase().includes('VAZIO')) {
            console.log(`[Scout] ⚠️ Consulta vaga ou vazia. Pulando pesquisa na web.`);
            searchResults = `[SISTEMA: O usuário acionou o Scout, mas não especificou um tema claro ou forneceu termos muito vagos para pesquisar na internet. Aja com polidez e peça para ele especificar exatamente qual assunto, notícia ou tendência ele gostaria que você buscasse hoje.]`;
            query = ''; // Limpa a query para os metadados
        } else {
            try {
                if (query.trim().length > 0) {
                    console.log(`[Scout] 🌐 Executando Brave Search para: "${query}"`);
                    searchResults = await this.braveSearch(query);
                } else {
                    searchResults = `[Erro Interno: Consulta vazia após limpeza]`;
                }
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                console.error(`[Scout] ❌ Erro Brave Search: ${msg}`);
                searchResults = `[Pesquisa indisponível na internet neste momento devido a um erro técnico: ${msg}. Informe o usuário que você não conseguiu acessar a internet, mas tente responder da melhor forma possível com seu conhecimento prévio.]`;
            }
        }

        // 3. Analisa os resultados com o LLM
        const analysis = await llmRouter.complete(
            [{ role: 'user', content: `Aqui está a solicitação do usuário: "${input.text}"\n\nE aqui estão as informações retornadas do sistema ou da internet:\n${searchResults}\n\nResponda diretamente ao usuário.` }],
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
