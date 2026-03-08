# GravityClaw 🦀

Framework de Agente de IA personalizado e modular. Construído em TypeScript com suporte a múltiplos canais de comunicação, memória persistente, skills extensíveis e segurança embutida.

## Início Rápido

```bash
# 1. Instale as dependências
npm install

# 2. Configure o ambiente
cp .env.example .env
# Edite .env com suas API keys

# 3. Compile e execute
npm run build
npm start
```

## Arquitetura

```
                    ┌─────────────┐
                    │   Agente    │
                    │  (Core AI)  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         ┌────▼───┐  ┌─────▼────┐ ┌────▼────┐
         │ Memory │  │   LLM    │ │ Skills  │
         │ 2-Layer│  │ Router   │ │Registry │
         └────────┘  │(Failover)│ └─────────┘
                     └──────────┘
                           │
                    ┌──────▼──────┐
                    │   Gateway   │
                    │  WebSocket  │
                    └──────┬──────┘
              ┌────────────┼────────────┐
         ┌────▼───┐  ┌────▼───┐  ┌─────▼────┐
         │Telegram│  │Discord │  │   Web    │
         └────────┘  └────────┘  │Dashboard │
                                 └──────────┘
```

## Módulos

| Módulo | Descrição |
|--------|-----------|
| `core/agent.ts` | Loop principal do agente |
| `core/soul.ts` | Carregador de personalidade (Soul.md) |
| `core/security.ts` | Defesa contra prompt injection |
| `core/llm/router.ts` | Router multi-provedor com failover |
| `gateway/websocket.ts` | Hub central WebSocket |
| `memory/manager.ts` | Memória de 2 camadas + compactação |
| `skills/registry.ts` | Registro e execução de skills |

## Configuração (.env)

| Variável | Descrição |
|----------|-----------|
| `ANTHROPIC_API_KEY` | Chave da API Anthropic (Claude) |
| `OPENAI_API_KEY` | Chave da API OpenAI (GPT) |
| `LOCAL_LLM_URL` | URL do LLM local (Ollama) |
| `DEFAULT_LLM_PROVIDER` | Provedor padrão: `anthropic`, `openai`, `local` |
| `GATEWAY_PORT` | Porta do Gateway WebSocket (padrão: 3100) |
| `GATEWAY_TOKEN` | Token de autenticação do Gateway |

## Licença

ISC
