# GravityClaw 🦀

Framework de agente de IA personalizado e modular. Neste repositório ele está configurado como o Doug, com specialists para texto, design, vídeo e pesquisa.

## Início Rápido

```bash
# 1. Instale as dependências
npm install

# 2. Configure o ambiente
cp .env.example .env
# Edite .env com suas chaves e tokens

# 3. Compile e execute
npm run build
npm start
```

## Fluxo Atual do Doug

- O Doug é o gerente principal da conversa.
- Você pode acionar specialists diretamente com `/video` e `/designer`.
- Quando você pedir troca de agent, o Doug encerra a etapa atual, transfere o contexto e abre a próxima sessão.
- O Video Agent mantém aprovação humana antes da renderização final.
- O Designer prioriza banner com texto, tarja e moldura e preserva o contexto ao iterar sobre uma peça.

## Google Drive

- Textos do Doug e do Writer sobem como texto.
- Imagens e banners sobem pelo Designer em `OUTPUTS/imagens`.
- Vídeos sobem pelo Video Agent em `OUTPUTS/videos`.
- Para upload binário no Railway, configure `GOOGLE_DRIVE_ROOT_FOLDER_ID`, `GOOGLE_OAUTH_CREDENTIALS` e `GOOGLE_TOKEN`.
- `GOOGLE_OAUTH_CREDENTIALS` deve ser o JSON serializado do cliente OAuth.
- `GOOGLE_TOKEN` deve ser o JSON serializado com `refresh_token` válido para Drive.
- Em ambiente local, o `DriveService` também pode usar o login já autenticado do `gws` como fallback, sem afetar a produção.

## Memória Operacional

- O Doug pode atualizar a memória operacional quando você pedir explicitamente.
- Comandos/frases suportados:
  - `/memoria`
  - `Doug, atualize a memória do Doug: ...`
  - `Doug, registre na memória do Doug: ...`
  - `Doug, registre no GitHub: ...`
- O fluxo tenta sincronizar:
  - Google Drive: documento `MEMORIA-OPERACIONAL-DOUG-ATUAL`
  - GitHub: arquivo `docs/MEMORIA-OPERACIONAL-DOUG-ATUAL.md`
- Para sincronizar no GitHub via API, configure `GITHUB_PERSONAL_ACCESS_TOKEN`.
- Variáveis opcionais para customizar o destino:
  - `GITHUB_REPO_OWNER`
  - `GITHUB_REPO_NAME`
  - `GITHUB_REPO_BRANCH`
  - `GITHUB_MEMORY_FILE_PATH`

## Railway

- O deploy principal é o serviço Node deste repositório.
- No Railway, a porta HTTP pública é `PORT`; a API do dashboard agora honra `PORT` automaticamente.
- O bot do Telegram continua funcionando por polling; ele não depende de webhook público para operar.
- Variáveis mínimas para produção:
  - `TELEGRAM_BOT_TOKEN`
  - `OPENROUTER_API_KEY`
  - `ASSEMBLYAI_API_KEY` para o Video Agent
  - `LEONARDO_API_KEY` para o Designer
  - `GOOGLE_DRIVE_ROOT_FOLDER_ID`
  - `GOOGLE_OAUTH_CREDENTIALS`
  - `GOOGLE_TOKEN`
  - `GITHUB_PERSONAL_ACCESS_TOKEN` se quiser memória sincronizada no GitHub pelo Doug
- Rotas úteis após subir:
  - `/`
  - `/health`
  - `/api/agent/status`

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
| `OPENROUTER_API_KEY` | Chave do OpenRouter para o Doug e specialists |
| `ASSEMBLYAI_API_KEY` | Chave de transcrição usada pelo Video Agent |
| `LEONARDO_API_KEY` | Chave de geração/edição de imagens do Designer |
| `TELEGRAM_BOT_TOKEN` | Token do bot do Telegram |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Pasta raiz do Drive onde o Doug organiza saídas |
| `GOOGLE_OAUTH_CREDENTIALS` | JSON serializado do cliente OAuth do Google |
| `GOOGLE_TOKEN` | JSON serializado do token OAuth com refresh token válido |
| `GATEWAY_PORT` | Porta do Gateway WebSocket (padrão: 3100) |
| `WEBHOOK_PORT` | Porta do servidor de webhooks interno |
| `GATEWAY_TOKEN` | Token de autenticação do Gateway |
| `DASHBOARD_PORT` | Porta local da API do dashboard fora do Railway |
| `PORT` | Porta HTTP pública injetada pelo Railway |

## Licença

ISC
