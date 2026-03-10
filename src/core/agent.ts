/**
 * GravityClaw — Agent Core
 *
 * Classe principal do agente que conecta todos os módulos:
 * Soul, LLM, Memory, Security, Skills, Gateway.
 *
 * Loop principal: recebe mensagem → valida segurança → busca skill →
 * monta contexto (memória + fatos) → envia ao LLM → responde.
 */

import type {
    IncomingMessage,
    OutgoingMessage,
    LLMMessage,
    DynamicRule,
    SoulConfig,
    AgentEvent,
    EventHandler,
    LLMToolCall,
    LLMProvider,
    LLMProviderName,
    LLMResponse,
} from './types.js';

import { loadSoul, buildSystemPrompt, createDynamicRule } from './soul.js';
import { enforceInputSafety } from './security.js';
import { LLMRouter, OpenRouterProvider } from './llm/router.js';
import { MemoryManager } from '../memory/manager.js';
import { SkillsRegistry } from '../skills/registry.js';
import { Orchestrator } from './orchestrator.js';
import { McpManager } from './mcp.js';
import { TranscriberService } from '../services/transcriber.js';
import type { DriveService } from '../services/drive.js';
import { resolve } from 'path';

export interface AgentConfig {
    soulPath?: string | undefined;
    memoryDir?: string | undefined;
    openRouterApiKey?: string | undefined;
    driveService?: DriveService;
}

export class Agent {
    private soul: SoulConfig | null = null;
    private dynamicRules: DynamicRule[] = [];
    private llmRouter: LLMRouter;
    private memory: MemoryManager;
    private skills: SkillsRegistry;
    private orchestrator: Orchestrator;
    private mcp: McpManager;
    private transcriber: TranscriberService | null = null;
    private eventHandlers: EventHandler[] = [];
    private config: AgentConfig;

    // Injectable services
    private driveService: DriveService | undefined;

    constructor(config: AgentConfig) {
        this.config = config;
        this.driveService = config.driveService;
        this.llmRouter = new LLMRouter('openrouter');
        this.memory = new MemoryManager(config.memoryDir);
        this.skills = new SkillsRegistry();
        this.orchestrator = new Orchestrator(config.driveService);
        this.mcp = new McpManager();

        if (process.env['ASSEMBLYAI_API_KEY']) {
            this.transcriber = new TranscriberService(process.env['ASSEMBLYAI_API_KEY']);
        }

        // Carrega regras base do diretório de assets
        const assetsDir = resolve(process.cwd(), 'src', 'assets');
    }

    // ─── Inicialização ────────────────────────────────────────

    async init(): Promise<void> {
        // Carrega a personalidade
        this.soul = await loadSoul(this.config.soulPath);
        console.log(`[Agent] Personalidade carregada: ${this.soul.name}`);

        // Configura OpenRouter
        if (this.config.openRouterApiKey) {
            const provider = new OpenRouterProvider(this.config.openRouterApiKey);
            this.llmRouter.addProvider(provider);
            const models = provider.listModels();
            console.log('[Agent] 🔌 OpenRouter configurado:');
            console.log(`  Chat     → ${models.chat}`);
            console.log(`  Resumo   → ${models.summarize}`);
            console.log(`  Análise  → ${models.analyze}`);
            console.log(`  Skills   → ${models.skill}`);
        } else {
            console.warn('[Agent] ⚠️  OPENROUTER_API_KEY não configurada!');
        }

        // Inicializa memória
        await this.memory.init();

        console.log(`[Agent] ✅ ${this.soul.name} inicializado e pronto!`);
    }

    // ─── Getters Públicos ──────────────────────────────────────

    getSoul(): SoulConfig | null {
        return this.soul;
    }

    getMemory(): MemoryManager {
        return this.memory;
    }

    getSkills(): SkillsRegistry {
        return this.skills;
    }

    getOrchestrator(): Orchestrator {
        return this.orchestrator;
    }

    getLLMRouter(): LLMRouter {
        return this.llmRouter;
    }

    getMcpManager(): McpManager {
        return this.mcp;
    }

    // ─── Regras Dinâmicas ──────────────────────────────────────

    addDynamicRule(condition: string, behavior: string): DynamicRule {
        const rule = createDynamicRule(condition, behavior);
        this.dynamicRules.push(rule);
        console.log(`[Agent] Nova regra dinâmica: "${condition}" → "${behavior}"`);
        return rule;
    }

    removeDynamicRule(id: string): boolean {
        const idx = this.dynamicRules.findIndex(r => r.id === id);
        if (idx === -1) return false;
        this.dynamicRules.splice(idx, 1);
        return true;
    }

    getDynamicRules(): DynamicRule[] {
        return [...this.dynamicRules];
    }

    // ─── Event System ──────────────────────────────────────────

    onEvent(handler: EventHandler): void {
        this.eventHandlers.push(handler);
    }

    private async emitEvent(event: AgentEvent): Promise<void> {
        for (const handler of this.eventHandlers) {
            try {
                await handler(event);
            } catch (err) {
                console.error('[Agent] Erro em event handler:', err);
            }
        }
    }

    // ─── Loop Principal de Processamento ───────────────────────

    /**
     * Processa uma mensagem de entrada e retorna a resposta do agente.
     * Este é o ponto central de orquestração.
     * @param sendProgress - callback opcional para enviar mensagens intermediárias ao usuário
     */
    async processMessage(
        incoming: IncomingMessage,
        sendProgress?: (message: string) => Promise<void>,
        sendFile?: (filePath: string, caption: string) => Promise<void>
    ): Promise<OutgoingMessage> {
        const startTime = Date.now();
        const isBinaryDriveRequest = (text: string): boolean => {
            const lower = text.toLowerCase();
            const mentionsDrive = lower.includes('drive');
            const asksToSave = lower.includes('salv') || lower.includes('guard') || lower.includes('sub') || lower.includes('envia');
            const mentionsBinary = lower.includes('vídeo') || lower.includes('video') || lower.includes('imagem') || lower.includes('banner') || lower.includes('foto') || lower.includes('.mp4') || lower.includes('.png') || lower.includes('.jpg');
            return mentionsDrive && asksToSave && mentionsBinary;
        };

        try {
            // 1. Verificação de segurança
            const safety = enforceInputSafety(incoming.text);
            if (!safety.safe) {
                console.warn(`[Agent] ⚠️ Alerta de segurança para mensagem de ${incoming.senderId}`);
                console.warn(safety.warning);
                // Usa o texto sanitizado, mas continua processando
            }
            let cleanText = safety.cleanText;

            // 1.5. Pré-processamento de Áudio (Transcreve mensagens de voz para texto)
            if (incoming.mediaType === 'audio' && incoming.mediaUrl && this.transcriber) {
                console.log(`[Agent] 🎤 Recebeu áudio/voz. Iniciando STT automático...`);
                if (sendProgress) await sendProgress('🎙️ Aguarde, estou escutando seu áudio...');
                try {
                    const audioBuffer = await this.transcriber.downloadFile(incoming.mediaUrl);
                    const uploadUrl = await this.transcriber.uploadToAssemblyAI(audioBuffer);
                    const transcript = await this.transcriber.transcribe(uploadUrl);
                    cleanText = transcript;
                    incoming.text = transcript; // Atualiza a mensagem original para os specialists
                    delete incoming.mediaUrl;
                    delete incoming.mediaType;
                    console.log(`[Agent] 🗣️ Transcrição concluída: "${cleanText}"`);
                } catch (err) {
                    console.error('[Agent] ❌ Falha na transcrição do áudio:', err);
                    return { text: `Desculpe, não consegui entender o áudio. Pode digitar? (${String(err)})` };
                }
            }

            // 2. Verifica se alguma skill corresponde
            const matchedSkill = this.skills.findByTrigger(cleanText);
            if (matchedSkill) {
                console.log(`[Agent] Skill encontrada: ${matchedSkill.name}`);
                const skillResult = await this.skills.execute(matchedSkill.name, {
                    command: cleanText.split(' ')[0] ?? '',
                    args: cleanText.split(' ').slice(1),
                    rawText: cleanText,
                    context: {
                        senderId: incoming.senderId,
                        channel: incoming.channel,
                        mcpManager: this.getMcpManager(),
                        llmRouter: this.llmRouter,
                    },
                });

                if (skillResult.text) {
                    await this.memory.addEntry('user', incoming.text, incoming.channel, incoming.senderId, this.llmRouter);
                    await this.memory.addEntry('assistant', skillResult.text, incoming.channel, 'agent', this.llmRouter);

                    const response: OutgoingMessage = { text: skillResult.text };
                    if (skillResult.mediaUrl) { response.mediaUrl = skillResult.mediaUrl; }
                    return response;
                }
            }

            // Recuperar histórico recente antes do tryProcess para o Specialist ter contexto em casos de Handoff
            const specialistHistory = this.memory.getRecentHistory(5).map(entry => ({
                role: entry.role,
                name: entry.role === 'assistant' ? entry.senderId : undefined, // Se for do assistente, envia o nome do Specialist que gerou
                content: entry.content
            } as LLMMessage));

            // 2.5. Tenta delegar a um Specialist
            const specialistResult = await this.orchestrator.tryProcess(
                { ...incoming, text: cleanText },
                this.llmRouter,
                this.buildFullSystemPrompt(),
                sendProgress,
                sendFile,
                specialistHistory
            );
            if (specialistResult) {
                await this.memory.addEntry('user', incoming.text, incoming.channel, incoming.senderId, this.llmRouter);
                await this.memory.addEntry('assistant', specialistResult.text, incoming.channel, specialistResult.specialist || 'agent', this.llmRouter);
                const elapsed = Date.now() - startTime;
                console.log(`[Agent] Specialist respondeu em ${elapsed}ms`);
                return specialistResult;
            }

            // 3. Monta o contexto para o LLM
            const systemPrompt = this.buildFullSystemPrompt();

            // Recuperar histórico recente
            const recentHistory = this.memory.getRecentHistory(20);
            const messages: LLMMessage[] = recentHistory.map(entry => ({
                role: entry.role,
                content: entry.content,
            }));

            // Adiciona a mensagem atual
            messages.push({ role: 'user', content: cleanText });

            // 4. Busca contexto relevante na memória
            const relevantMemory = await this.memory.search(cleanText, 3, this.llmRouter);
            let contextNote = '';
            if (relevantMemory.length > 0) {
                contextNote = '\n\n[Contexto relevante da memória]:\n' +
                    relevantMemory.map(r =>
                        `- (${new Date(r.entry.timestamp).toLocaleDateString('pt-BR')}): ${r.entry.content.slice(0, 150)}`
                    ).join('\n');
                // Injeta no system prompt como nota
            }

            // 5. Injeta ferramentas MCP dinâmicas
            const mcpToolsList = await this.mcp.listAllTools();
            const openaiTools: any[] = mcpToolsList.flatMap(server =>
                server.tools.map(t => ({
                    type: 'function',
                    function: {
                        name: `mcp_${server.serverName}_${t.name}`,
                        description: t.description,
                        parameters: t.inputSchema,
                    }
                }))
            );

            // Ferramenta nativa do GravityClaw para o Doug salvar no Google Drive
            if (this.driveService) {
                openaiTools.push({
                    type: 'function',
                    function: {
                        name: 'gravityclaw_save_drive',
                        description: 'Ferramenta de uso RESTRITO. Salva o texto no Google Drive do usuário. Você SÓ PODE usar esta ferramenta se o usuário EXIGIR ou PEDIR EXPLICITAMENTE para "salvar no drive", "guardar no drive" ou "criar arquivo no drive". NUNCA use esta ferramenta de forma proativa ou autônoma sem o comando claro.',
                        parameters: {
                            type: 'object',
                            properties: {
                                title: { type: 'string', description: 'O título curto do arquivo (ex: reuniao-01.txt)' },
                                content: { type: 'string', description: 'O texto integral do documento a ser salvo' }
                            },
                            required: ['title', 'content']
                        }
                    }
                });
            }

            // 6. Envia ao LLM (usando modelo otimizado para chat)
            let llmResponse = await this.llmRouter.completeForFunction('chat', messages, {
                systemPrompt: systemPrompt + contextNote,
                tools: openaiTools.length > 0 ? openaiTools : undefined,
            });

            // 6.5. Trata chamadas de ferramentas (MCP)
            if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
                console.log(`[Agent] 🛠️ LLM solicitou o uso de ${llmResponse.toolCalls.length} ferramenta(s)...`);

                // Adiciona a resposta de assistant com as chamadas das tools
                messages.push({
                    role: 'assistant',
                    content: llmResponse.content,
                    // @ts-ignore
                    tool_calls: llmResponse.toolCalls
                });

                for (const tc of llmResponse.toolCalls) {
                    try {
                        // Ferramenta Nativa: Google Drive
                        if (tc.function.name === 'gravityclaw_save_drive' && this.driveService) {
                            const { title, content } = JSON.parse(tc.function.arguments);
                            let textResult = '';
                            if (isBinaryDriveRequest(cleanText)) {
                                textResult = '[ERRO] Esta ferramenta salva apenas documentos de texto. Não confirme upload de vídeo/imagem/banner sem um link real gerado pelo specialist responsável.';
                            } else if (this.driveService.getFolders()) {
                                const res = await this.driveService.saveAgentText(title, content);
                                textResult = `[SISTEMA] Sucesso! Documento "${title}" salvo no seu Google Drive (Pasta OUTPUTS/posts). Link: ${res.webViewLink}. Comunique esse link ao usuário!`;
                            } else {
                                textResult = `[ERRO] Google Drive não mapeou a pasta de outputs.`;
                            }

                            messages.push({
                                role: 'tool',
                                name: tc.function.name,
                                tool_call_id: tc.id,
                                content: textResult,
                            });
                            continue;
                        }

                        // Formato esperado: mcp_{serverName}_{toolName}
                        const prefix = 'mcp_';
                        if (!tc.function.name.startsWith(prefix)) continue;

                        const rest = tc.function.name.substring(prefix.length);
                        const firstUnderscore = rest.indexOf('_');
                        const serverName = rest.substring(0, firstUnderscore);
                        const toolName = rest.substring(firstUnderscore + 1);

                        const args = JSON.parse(tc.function.arguments);
                        const mcpResult = await this.mcp.callTool(serverName, toolName, args);

                        // Formata o resultado do MCP para o LLM
                        const textResult = mcpResult.content.map((c: any) => c.text || JSON.stringify(c)).join('\n');

                        messages.push({
                            role: 'tool',
                            name: tc.function.name,
                            tool_call_id: tc.id,
                            content: textResult,
                        });
                    } catch (err) {
                        const msg = err instanceof Error ? err.message : String(err);
                        console.error(`[Agent] ❌ Erro ao executar toll ${tc.function.name}:`, msg);
                        messages.push({
                            role: 'tool',
                            name: tc.function.name,
                            tool_call_id: tc.id,
                            content: `Error executing tool: ${msg}`,
                        });
                    }
                }

                // 6.6. Nova rodada no LLM com os resultados
                llmResponse = await this.llmRouter.completeForFunction('chat', messages, {
                    systemPrompt: systemPrompt + contextNote,
                });
            }

            // 7. Salva no histórico
            await this.memory.addEntry('user', incoming.text, incoming.channel, incoming.senderId, this.llmRouter);
            await this.memory.addEntry('assistant', llmResponse.content, incoming.channel, 'agent', this.llmRouter);

            const elapsed = Date.now() - startTime;
            console.log(`[Agent] Resposta gerada em ${elapsed}ms via ${llmResponse.provider}/${llmResponse.model}`);

            return { text: llmResponse.content };

        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[Agent] Erro ao processar mensagem: ${msg}`);

            await this.emitEvent({
                type: 'error',
                payload: { source: 'processMessage', error: err as Error },
            });

            return {
                text: '❌ Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.',
            };
        }
    }

    // ─── Construção do System Prompt ────────────────────────────

    private buildFullSystemPrompt(): string {
        if (!this.soul) {
            return 'Você é um assistente de IA útil e eficiente.';
        }

        let prompt = buildSystemPrompt(this.soul, this.dynamicRules);

        // Adiciona fatos da memória
        const facts = this.memory.getAllFacts();
        if (facts.length > 0) {
            prompt += '\n\n## Informações do Usuário (da memória)\n';
            facts.forEach(f => {
                prompt += `- **${f.key}**: ${f.value}\n`;
            });
        }

        // Adiciona descrição das skills
        const skillsDesc = this.skills.describeForLLM();
        if (skillsDesc !== 'Nenhuma skill disponível no momento.') {
            prompt += '\n\n' + skillsDesc;
            prompt += '\nSe o usuário pedir algo que uma skill pode resolver, use-a.';
        }

        return prompt;
    }
}
