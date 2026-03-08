// @ts-ignore
import express, { Request, Response } from 'express';
// @ts-ignore
import cors from 'cors';
import { Agent } from '../core/agent.js';
import { MemoryManager } from '../memory/manager.js';
import { SkillsRegistry } from '../skills/registry.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export class DashboardApi {
    private app = express();
    private port = process.env.DASHBOARD_PORT || 3000;

    constructor(
        private agent: Agent,
        private memory: MemoryManager,
        private registry: SkillsRegistry
    ) {
        this.setupRoutes();
    }

    private setupRoutes() {
        // Enable CORS for all routes (Dashboard frontend is on 5173)
        this.app.use(cors());
        this.app.use(express.json());

        // --- 1. System Status ---
        this.app.get('/api/agent/status', (req: Request, res: Response) => {
            res.json({
                status: 'online',
                version: '1.1.0',
                uptime: process.uptime(),
                memoryUsed: process.memoryUsage().heapUsed,
                mcpServers: this.agent.getMcpManager() ? 'connected' : 'offline',
            });
        });

        // --- 2. Memory & History ---
        this.app.get('/api/memory/history', async (req: Request, res: Response) => {
            try {
                // In a real app we might paginate or search. 
                // For the dashboard, we retrieve all or the last N entries.
                const allEntries = this.memory.getAllEntries();
                // Return newest first, capped at 200 for UI performance
                const sorted = allEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 200);
                res.json({ history: sorted });
            } catch (err) {
                res.status(500).json({ error: String(err) });
            }
        });

        this.app.get('/api/memory/facts', async (req: Request, res: Response) => {
            try {
                const facts = this.memory.getFacts();
                res.json({ facts });
            } catch (err) {
                res.status(500).json({ error: String(err) });
            }
        });

        // --- 3. MCP Servers ---
        this.app.get('/api/mcp/servers', async (req: Request, res: Response) => {
            try {
                const tools = await this.agent.getMcpManager().listAllTools();
                res.json({ servers: tools });
            } catch (err) {
                res.status(500).json({ error: String(err) });
            }
        });

        // --- 4. Skills ---
        this.app.get('/api/skills', (req: Request, res: Response) => {
            const skills = this.registry.list().map((s: any) => ({
                name: s.name,
                version: s.version,
                description: s.description,
            }));
            res.json({ skills });
        });

        // --- 4.5. Agents Configuration ---
        this.app.get('/api/agents', async (req: Request, res: Response) => {
            try {
                const configs = this.agent.getOrchestrator().list().map(s => s.config);
                res.json({ agents: configs });
            } catch (err) {
                res.status(500).json({ error: String(err) });
            }
        });

        this.app.put('/api/agents/:name', async (req: Request, res: Response) => {
            try {
                const { name } = req.params;
                const newSettings = req.body;

                const orchestrator = this.agent.getOrchestrator();
                const success = await orchestrator.updateSpecialistConfig(name!, newSettings);

                if (success) {
                    res.json({ success: true, message: `Configurações do agente ${name} atualizadas.` });
                } else {
                    res.status(404).json({ error: `Agente ${name} não encontrado.` });
                }
            } catch (err) {
                res.status(500).json({ error: String(err) });
            }
        });

        // --- 5. Skill Creator ---
        this.app.post('/api/skills/create', (req: Request, res: Response) => {
            const { name, description, triggerRegex, actionCode } = req.body;

            if (!name || !description || !triggerRegex || !actionCode) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            try {
                // Determine file name
                const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                const filePath = path.join(process.cwd(), 'src', 'skills', 'custom', `${safeName}.ts`);

                // Create the dir if not exists
                const dir = path.dirname(filePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                // Write the skeleton logic representing a new skill
                const fileContent = `
import { Skill } from '../../core/types.js';

export const skill: Skill = {
    name: '${name}',
    version: '1.0.0',
    description: '${description}',
    matches: (text) => /${triggerRegex}/i.test(text),
    execute: async (context) => {
        ${actionCode}
    }
};
`;
                fs.writeFileSync(filePath, fileContent.trim());
                res.json({ success: true, message: `Skill ${name} created at ${filePath}` });
            } catch (err) {
                res.status(500).json({ error: String(err) });
            }
        });
    }

    public start() {
        this.app.listen(this.port, () => {
            console.log(`[Dashboard API] 📊 Servidor REST rodando na porta ${this.port}`);
        });
    }
}
