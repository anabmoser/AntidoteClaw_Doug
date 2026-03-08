/**
 * GravityClaw — Entry Point
 *
 * Inicializa e conecta todos os módulos do framework:
 * Agent, Gateway, Channels, Scheduler, Webhooks, Skills.
 */

import * as dotenv from 'dotenv';
dotenv.config({ override: true });
import { Agent } from './core/agent.js';
import { Gateway } from './gateway/websocket.js';
import { MemoryManager } from './memory/manager.js';
import { SkillsRegistry } from './skills/registry.js';
import { DashboardApi } from './gateway/api.js';
import { TelegramChannel } from './channels/telegram.js';
import { Scheduler, Heartbeat } from './automation/scheduler.js';
import { WebhookServer } from './automation/webhooks.js';
import { weatherSkill } from './skills/builtin/weather.js';
import { writerSpecialist } from './specialists/writer.js';
import { DesignerSpecialist } from './specialists/designer.js';
import { ScoutSpecialist } from './specialists/scout.js';
import { VideoSpecialist } from './specialists/video.js';
import { socialSpecialist } from './specialists/social.js';
import { DriveService } from './services/drive.js';

async function bootstrap(): Promise<void> {
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║       🤖 Doug AI — Content Engine      ║');
    console.log('║          v1.1.0 — Starting up…           ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');

    // ─── Configuração via variáveis de ambiente ────────────────

    const gatewayPort = parseInt(process.env['GATEWAY_PORT'] ?? '3100', 10);
    const gatewayToken = process.env['GATEWAY_TOKEN'] ?? 'dev-token';
    const webhookPort = parseInt(process.env['WEBHOOK_PORT'] ?? '3101', 10);

    // ─── Google Drive ──────────────────────────────────────────

    let driveService: DriveService | null = null;
    const driveRootId = process.env['GOOGLE_DRIVE_ROOT_FOLDER_ID'];

    if (driveRootId) {
        try {
            driveService = new DriveService(driveRootId);
            await driveService.init();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[Main] ⚠️ Falha ao conectar Google Drive: ${msg}`);
            driveService = null;
        }
    } else {
        console.log('[Main] Google Drive não configurado (GOOGLE_DRIVE_ROOT_FOLDER_ID ausente)');
    }

    // ─── Inicializa o Agente ───────────────────────────────────

    const agentConfig: any = {
        openRouterApiKey: process.env['OPENROUTER_API_KEY'],
        memoryDir: process.env['MEMORY_DIR'],
    };
    if (driveService) {
        agentConfig.driveService = driveService;
    }

    const agent = new Agent(agentConfig);

    await agent.init();

    // ─── Registra Skills Integradas ────────────────────────────

    agent.getSkills().register(weatherSkill);

    // ─── Registra Specialists (Agentes Especializados) ─────────

    const orch = agent.getOrchestrator();

    orch.register(writerSpecialist);

    const leonardoKey = process.env['LEONARDO_API_KEY'];
    if (leonardoKey) {
        orch.register(new DesignerSpecialist(leonardoKey));
    }

    const braveKey = process.env['BRAVE_SEARCH_API_KEY'];
    if (braveKey) {
        orch.register(new ScoutSpecialist(braveKey));
    }

    const assemblyaiKey = process.env['ASSEMBLYAI_API_KEY'];
    if (assemblyaiKey) {
        orch.register(new VideoSpecialist(assemblyaiKey, driveService));
    }

    orch.register(socialSpecialist);

    // ─── Inicializa o Gateway WebSocket ────────────────────────

    const gateway = new Gateway({
        port: gatewayPort,
        token: gatewayToken,
    });

    gateway.onMessage(async (incoming) => {
        return agent.processMessage(incoming);
    });

    gateway.onEvent(async (event) => {
        switch (event.type) {
            case 'channel_connected':
                console.log(`[Main] Canal conectado: ${event.payload.channel}`);
                break;
            case 'channel_disconnected':
                console.log(`[Main] Canal desconectado: ${event.payload.channel}`);
                break;
            case 'message_received':
                console.log(`[Main] 📩 ${event.payload.channel}/${event.payload.senderId}: ${event.payload.text.slice(0, 60)}${event.payload.text.length > 60 ? '...' : ''}`);
                break;
            case 'error':
                console.error(`[Main] ❌ Erro:`, event.payload.error.message);
                break;
        }
    });

    await gateway.start();

    // MCP: Conecta a servidores externos se configurados
    const sqlitePath = process.env.MCP_SQLITE_PATH;
    if (sqlitePath) {
        try {
            await agent.getMcpManager().connectStdioServer({
                name: 'sqlite_local',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-sqlite', sqlitePath]
            });
            console.log(`[Main] MCP SQLite Server inicializado em: ${sqlitePath}`);
        } catch (err) {
            console.warn('[Main] Falha ao inicializar MCP SQLite Server:', err);
        }
    }

    const githubToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
    if (githubToken) {
        try {
            await agent.getMcpManager().connectStdioServer({
                name: 'github',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-github'],
                env: {
                    ...process.env,
                    GITHUB_PERSONAL_ACCESS_TOKEN: githubToken
                }
            });
            console.log(`[Main] 🐙 MCP GitHub Server conectado com sucesso.`);
        } catch (err) {
            console.warn('[Main] Falha ao inicializar MCP GitHub Server:', err);
        }
    }

    const notionToken = process.env.NOTION_API_KEY;
    if (notionToken) {
        try {
            await agent.getMcpManager().connectStdioServer({
                name: 'notion',
                command: 'npx',
                args: ['-y', '@notionhq/notion-mcp-server'],
                env: {
                    ...process.env,
                    NOTION_API_KEY: notionToken
                }
            });
            console.log(`[Main] 📝 MCP Notion Server conectado com sucesso.`);
        } catch (err) {
            console.warn('[Main] Falha ao inicializar MCP Notion Server:', err);
        }
    }

    const gdriveToken = process.env.GOOGLE_DRIVE_MCP_AUTH_TOKEN;
    if (gdriveToken) {
        try {
            await agent.getMcpManager().connectStdioServer({
                name: 'google-drive',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-google-drive'],
                env: {
                    ...process.env,
                    // Drive MCP expects credentials mechanism, usually configured via JSON path or tokens.
                    // This is a placeholder standard environment variable, users must configure appropriately.
                    GOOGLE_DRIVE_AUTH_TOKEN: gdriveToken
                }
            });
            console.log(`[Main] ☁️ MCP Google Drive Server conectado com sucesso.`);
        } catch (err) {
            console.warn('[Main] Falha ao inicializar MCP Google Drive Server:', err);
        }
    }

    const postgresUrl = process.env.MCP_POSTGRES_URL;
    if (postgresUrl) {
        try {
            await agent.getMcpManager().connectStdioServer({
                name: 'postgres',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-postgres', postgresUrl]
            });
            console.log(`[Main] 🐘 MCP PostgreSQL Server conectado com sucesso.`);
        } catch (err) {
            console.warn('[Main] Falha ao inicializar MCP PostgreSQL Server:', err);
        }
    }

    try {
        await agent.getMcpManager().connectStdioServer({
            name: 'puppeteer',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-puppeteer']
        });
        console.log(`[Main] 🌐 MCP Puppeteer Server conectado com sucesso.`);
    } catch (err) {
        console.warn('[Main] Falha ao inicializar MCP Puppeteer Server:', err);
    }

    // ─── Inicializa Canal Telegram (se configurado) ────────────

    let telegram: TelegramChannel | null = null;
    const telegramToken = process.env['TELEGRAM_BOT_TOKEN'];

    if (telegramToken) {
        const allowedIds = process.env['TELEGRAM_ALLOWED_CHAT_IDS']
            ?.split(',')
            .map(id => parseInt(id.trim(), 10))
            .filter(id => !isNaN(id));

        telegram = new TelegramChannel({
            botToken: telegramToken,
            onMessage: async (incoming, sendProgress, sendFile) => agent.processMessage(incoming, sendProgress, sendFile),
            allowedChatIds: allowedIds,
        });

        try {
            await telegram.start();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[Main] ⚠️ Falha ao iniciar Telegram: ${msg}`);
            telegram = null;
        }
    } else {
        console.log('[Main] Telegram não configurado (TELEGRAM_BOT_TOKEN ausente)');
    }

    // ─── Scheduler & Heartbeat ─────────────────────────────────

    const scheduler = new Scheduler();

    const heartbeat = new Heartbeat(scheduler, async () => {
        const soul = agent.getSoul();
        console.log(`[Heartbeat] 💓 ${soul?.name ?? 'GravityClaw'} está vivo — ${new Date().toLocaleTimeString('pt-BR')}`);
        // Aqui podem ser adicionadas verificações proativas
        // Por exemplo: checar emails pendentes, rappels, etc.
    }, parseInt(process.env['HEARTBEAT_INTERVAL_MIN'] ?? '30', 10));

    heartbeat.start();
    scheduler.start();

    // ─── Webhook Server ────────────────────────────────────────

    const webhookServer = new WebhookServer({
        port: webhookPort,
        token: gatewayToken,
    });

    // Rota genérica: qualquer serviço externo pode acionar o agente
    webhookServer.addRoute('/webhook/trigger', 'Gatilho Genérico', async (body) => {
        const text = (body['message'] as string) ?? (body['text'] as string) ?? JSON.stringify(body);
        return agent.processMessage({
            id: crypto.randomUUID(),
            channel: 'webhook',
            senderId: (body['source'] as string) ?? 'webhook',
            text,
            timestamp: new Date(),
        });
    });

    await webhookServer.start();

    // ─── Inicializa API do Dashboard Web ─────────────────────────
    const dashboard = new DashboardApi(agent, (agent as any).memory, agent.getSkills());
    dashboard.start();

    // ─── Status Final ──────────────────────────────────────────

    const soul = agent.getSoul();
    const skills = agent.getSkills().list();

    console.log('');
    console.log('┌──────────────────────────────────────────────┐');
    console.log(`│  🤖 ${(soul?.name ?? 'GravityClaw').padEnd(41)}│`);
    console.log('├──────────────────────────────────────────────┤');
    console.log(`│  Gateway WS : ws://localhost:${String(gatewayPort).padEnd(16)}│`);
    console.log(`│  Webhook HTTP: http://localhost:${String(webhookPort).padEnd(13)}│`);
    console.log(`│  Telegram  : ${(telegram ? '✅ Ativo' : '⬚ Não configurado').padEnd(32)}│`);
    console.log(`│  Skills    : ${String(skills.length + ' registrada(s)').padEnd(32)}│`);
    console.log(`│  Heartbeat : ✅ a cada ${process.env['HEARTBEAT_INTERVAL_MIN'] ?? '30'}min${' '.repeat(17)}│`);
    console.log('└──────────────────────────────────────────────┘');
    console.log('');
    console.log('Aguardando conexões e mensagens...');

    // ─── Graceful Shutdown ─────────────────────────────────────

    const shutdown = async (): Promise<void> => {
        console.log('\n[Main] 🛑 Encerrando GravityClaw...');
        scheduler.stop();
        if (telegram) await telegram.stop();
        await webhookServer.stop();
        await gateway.stop();
        console.log('[Main] Encerrado com sucesso. Até logo! 👋');
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
    console.error('❌ Erro fatal ao iniciar GravityClaw:', err);
    process.exit(1);
});
