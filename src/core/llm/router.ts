/**
 * GravityClaw — LLM Router via OpenRouter
 *
 * Usa OpenRouter como gateway único para acessar múltiplos LLMs.
 * Cada função do agente usa um modelo diferente otimizado:
 *   - Chat: Claude Sonnet (qualidade de conversa)
 *   - Summarize: Gemini Flash (rápido e barato para resumos)
 *   - Analyze: GPT-4o-mini (bom custo-benefício para análise)
 */

import type { LLMProvider, LLMProviderName, LLMMessage, LLMCompletionOptions, LLMResponse, LLMToolCall } from '../types.js';

// ─── Funções do Agente (cada uma pode usar um modelo diferente) ─

export type AgentFunction = 'chat' | 'summarize' | 'analyze' | 'skill';

export interface ModelConfig {
    model: string;
    maxTokens: number;
    temperature: number;
}

/** Modelos padrão otimizados por função */
const DEFAULT_MODEL_MAP: Record<AgentFunction, ModelConfig> = {
    chat: {
        model: 'google/gemini-3.1-pro-preview',
        maxTokens: 4096,
        temperature: 0.7,
    },
    summarize: {
        model: 'qwen/qwen3.5-27b',
        maxTokens: 2048,
        temperature: 0.5,
    },
    analyze: {
        model: 'anthropic/claude-sonnet-4.6',
        maxTokens: 4096,
        temperature: 0.4,
    },
    skill: {
        model: 'google/gemini-3.1-pro-preview',
        maxTokens: 2048,
        temperature: 0.3,
    },
};

// ─── OpenRouter Provider ───────────────────────────────────────

export class OpenRouterProvider implements LLMProvider {
    readonly name: LLMProviderName = 'openrouter';
    private apiKey: string;
    private modelMap: Record<AgentFunction, ModelConfig>;
    private appName: string;

    constructor(
        apiKey: string,
        modelOverrides?: Partial<Record<AgentFunction, Partial<ModelConfig>>>,
        appName = 'GravityClaw'
    ) {
        this.apiKey = apiKey;
        this.appName = appName;

        // Mescla configurações padrão com overrides
        this.modelMap = { ...DEFAULT_MODEL_MAP };
        if (modelOverrides) {
            for (const [fn, override] of Object.entries(modelOverrides)) {
                const key = fn as AgentFunction;
                if (this.modelMap[key] && override) {
                    this.modelMap[key] = { ...this.modelMap[key], ...override };
                }
            }
        }
    }

    isAvailable(): boolean {
        return this.apiKey.length > 0;
    }

    /**
     * Retorna a configuração do modelo para uma função específica.
     */
    getModelForFunction(fn: AgentFunction): ModelConfig {
        return this.modelMap[fn];
    }

    /**
     * Lista os modelos configurados por função.
     */
    listModels(): Record<AgentFunction, string> {
        const result: Record<string, string> = {};
        for (const [fn, config] of Object.entries(this.modelMap)) {
            result[fn] = config.model;
        }
        return result as Record<AgentFunction, string>;
    }

    /**
     * Completação via OpenRouter. Compatible com a OpenAI API.
     * Use options.model para especificar o modelo, ou deixe usar o padrão de 'chat'.
     */
    async complete(messages: LLMMessage[], options?: LLMCompletionOptions): Promise<LLMResponse> {
        // Determina qual configuração de modelo usar
        const agentFn = (options?.metadata as Record<string, unknown>)?.['agentFunction'] as AgentFunction | undefined;
        const fnConfig = agentFn ? this.modelMap[agentFn] : this.modelMap.chat;
        const model = options?.model ?? fnConfig.model;
        const maxTokens = options?.maxTokens ?? fnConfig.maxTokens;
        const temperature = options?.temperature ?? fnConfig.temperature;

        // Monta as mensagens: system prompt primeiro se houver
        const allMessages: LLMMessage[] = [];
        if (options?.systemPrompt) {
            allMessages.push({ role: 'system', content: options.systemPrompt });
        }
        // Adiciona as mensagens da conversa (sem system, que já foi separado)
        for (const m of messages) {
            if (m.role !== 'system') {
                allMessages.push(m);
            }
        }

        const body = {
            model,
            messages: allMessages.map(m => {
                const mapMsg: any = { role: m.role, content: m.content };
                if (m.name) mapMsg.name = m.name;
                if (m.tool_call_id) mapMsg.tool_call_id = m.tool_call_id;
                return mapMsg;
            }),
            max_tokens: maxTokens,
            temperature,
            ...(options?.stopSequences ? { stop: options.stopSequences } : {}),
            ...(options?.tools && options.tools.length > 0 ? { tools: options.tools } : {}),
        };

        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'HTTP-Referer': 'https://gravityclaw.app',
                'X-Title': this.appName,
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`OpenRouter API error ${res.status}: ${errText}`);
        }

        const data = await res.json() as {
            choices: { message: { content: string; tool_calls?: any[] } }[];
            model: string;
            usage?: { prompt_tokens: number; completion_tokens: number };
        };

        const message = data.choices[0]?.message;
        const content = message?.content ?? '';
        let mappedToolCalls: LLMToolCall[] | undefined;

        if (message?.tool_calls && message.tool_calls.length > 0) {
            mappedToolCalls = message.tool_calls.map(tc => ({
                id: tc.id,
                type: tc.type,
                function: {
                    name: tc.function.name,
                    arguments: tc.function.arguments,
                }
            }));
        }

        return {
            content,
            model: data.model,
            provider: 'openrouter',
            toolCalls: mappedToolCalls,
            usage: data.usage ? {
                inputTokens: data.usage.prompt_tokens,
                outputTokens: data.usage.completion_tokens,
            } : undefined,
        };
    }

    /**
     * Gera os embeddings de um texto via OpenRouter.
     */
    async embed(text: string): Promise<number[]> {
        const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'HTTP-Referer': 'https://gravityclaw.app',
                'X-Title': this.appName,
            },
            body: JSON.stringify({
                model: 'nomic-ai/nomic-embed-text-v1.5',
                input: text
            })
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`OpenRouter Embeddings API error ${res.status}: ${errText}`);
        }

        const data = await res.json() as {
            data: { embedding: number[] }[];
        };

        return data.data[0]?.embedding ?? [];
    }
}

// ─── LLM Router (compatível com failover) ──────────────────────

export class LLMRouter {
    private providers: LLMProvider[] = [];
    private defaultProvider: LLMProviderName;

    constructor(defaultProvider: LLMProviderName = 'openrouter') {
        this.defaultProvider = defaultProvider;
    }

    addProvider(provider: LLMProvider): void {
        this.providers.push(provider);
    }

    getAvailableProviders(): LLMProvider[] {
        return this.providers.filter(p => p.isAvailable());
    }

    /**
     * Retorna o provedor OpenRouter se disponível.
     */
    getOpenRouter(): OpenRouterProvider | undefined {
        return this.providers.find(p => p instanceof OpenRouterProvider) as OpenRouterProvider | undefined;
    }

    /**
     * Completação para uma função específica do agente.
     * Usa o modelo correto de acordo com a função.
     */
    async completeForFunction(
        fn: AgentFunction,
        messages: LLMMessage[],
        options?: LLMCompletionOptions
    ): Promise<LLMResponse> {
        const openRouter = this.getOpenRouter();
        if (openRouter) {
            const fnConfig = openRouter.getModelForFunction(fn);
            return this.complete(messages, {
                ...options,
                model: options?.model ?? fnConfig.model,
                maxTokens: options?.maxTokens ?? fnConfig.maxTokens,
                temperature: options?.temperature ?? fnConfig.temperature,
            });
        }
        // Fallback para o método genérico
        return this.complete(messages, options);
    }

    /**
     * Completação com failover automático.
     */
    async complete(messages: LLMMessage[], options?: LLMCompletionOptions): Promise<LLMResponse> {
        const available = this.getAvailableProviders();
        if (available.length === 0) {
            throw new Error('Nenhum provedor de LLM disponível. Configure a OPENROUTER_API_KEY.');
        }

        // Ordena: provedor padrão primeiro
        const sorted = [
            ...available.filter(p => p.name === this.defaultProvider),
            ...available.filter(p => p.name !== this.defaultProvider),
        ];

        const errors: string[] = [];

        for (const provider of sorted) {
            try {
                console.log(`[LLM] Usando: ${provider.name} → ${options?.model ?? 'padrão'}`);
                const result = await provider.complete(messages, options);
                console.log(`[LLM] ✅ ${result.model}${result.usage ? ` (${result.usage.inputTokens}+${result.usage.outputTokens} tokens)` : ''}`);
                return result;
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                console.warn(`[LLM] ❌ Falha em ${provider.name}: ${msg}`);
                errors.push(`${provider.name}: ${msg}`);
            }
        }

        throw new Error(
            `Todos os provedores falharam:\n${errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}`
        );
    }

    /**
     * Geração de embeddings com failover.
     */
    async embed(text: string): Promise<number[]> {
        const available = this.getAvailableProviders();
        if (available.length === 0) {
            throw new Error('Nenhum provedor de LLM disponível.');
        }

        const sorted = [
            ...available.filter(p => p.name === this.defaultProvider),
            ...available.filter(p => p.name !== this.defaultProvider),
        ];

        const errors: string[] = [];

        for (const provider of sorted) {
            try {
                if (provider.embed) {
                    console.log(`[LLM] Gerando embedding com: ${provider.name}`);
                    const result = await provider.embed(text);
                    return result;
                }
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                console.warn(`[LLM] ❌ Falha no embedding via ${provider.name}: ${msg}`);
                errors.push(`${provider.name}: ${msg}`);
            }
        }

        throw new Error(
            `Falha na geração de embeddings:\n${errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}`
        );
    }
}
