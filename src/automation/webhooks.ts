/**
 * GravityClaw — Webhook Triggers
 *
 * Servidor HTTP leve que recebe webhooks de serviços externos
 * (Zapier, n8n, Shopify, GitHub, etc.) e aciona o agente.
 */

import { createServer, type IncomingMessage as HttpRequest, type ServerResponse } from 'node:http';
import { v4 as uuid } from 'uuid';
import type { IncomingMessage, OutgoingMessage } from '../core/types.js';

interface WebhookRoute {
    path: string;
    name: string;
    handler: (body: Record<string, unknown>, headers: Record<string, string>) => Promise<OutgoingMessage | null>;
}

interface WebhookServerOptions {
    port: number;
    token: string;
}

export class WebhookServer {
    private server: ReturnType<typeof createServer> | null = null;
    private routes = new Map<string, WebhookRoute>();
    private port: number;
    private token: string;

    constructor(options: WebhookServerOptions) {
        this.port = options.port;
        this.token = options.token;
    }

    // ─── Route Registration ────────────────────────────────────

    /**
     * Registra uma rota de webhook.
     * @param path Caminho da URL (ex: "/webhook/zapier")
     * @param name Nome descritivo
     * @param handler Função que processa o payload do webhook
     */
    addRoute(path: string, name: string, handler: WebhookRoute['handler']): void {
        this.routes.set(path, { path, name, handler });
        console.log(`[Webhook] Rota registrada: ${name} → ${path}`);
    }

    /**
     * Remove uma rota pelo caminho.
     */
    removeRoute(path: string): boolean {
        return this.routes.delete(path);
    }

    /**
     * Lista todas as rotas registradas.
     */
    listRoutes(): WebhookRoute[] {
        return [...this.routes.values()];
    }

    // ─── Server Lifecycle ──────────────────────────────────────

    start(): Promise<void> {
        return new Promise((resolve) => {
            this.server = createServer(async (req, res) => {
                await this.handleRequest(req, res);
            });

            this.server.listen(this.port, () => {
                console.log(`[Webhook] 🔗 Servidor HTTP na porta ${this.port}`);
                resolve();
            });
        });
    }

    stop(): Promise<void> {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('[Webhook] Servidor encerrado.');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    // ─── Request Handler ───────────────────────────────────────

    private async handleRequest(req: HttpRequest, res: ServerResponse): Promise<void> {
        const url = new URL(req.url ?? '/', `http://localhost:${this.port}`);
        const path = url.pathname;

        // Health check
        if (path === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', routes: this.routes.size }));
            return;
        }

        // Apenas POST é aceito para webhooks
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Método não permitido. Use POST.' }));
            return;
        }

        // Verifica autenticação via header ou query
        const authHeader = req.headers['authorization'] ?? '';
        const queryToken = url.searchParams.get('token') ?? '';
        if (authHeader !== `Bearer ${this.token}` && queryToken !== this.token) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Não autorizado.' }));
            return;
        }

        // Encontra a rota
        const route = this.routes.get(path);
        if (!route) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Rota não encontrada: ${path}` }));
            return;
        }

        try {
            // Lê o body
            const body = await this.readBody(req);
            const headers: Record<string, string> = {};
            for (const [key, value] of Object.entries(req.headers)) {
                if (typeof value === 'string') headers[key] = value;
            }

            console.log(`[Webhook] ⚡ ${route.name} via ${path}`);

            const response = await route.handler(body, headers);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                ok: true,
                response: response?.text ?? 'Processado',
            }));

        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[Webhook] Erro em ${route.name}: ${msg}`);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: msg }));
        }
    }

    // ─── Helpers ───────────────────────────────────────────────

    private readBody(req: HttpRequest): Promise<Record<string, unknown>> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            req.on('data', (chunk: Buffer) => chunks.push(chunk));
            req.on('end', () => {
                try {
                    const raw = Buffer.concat(chunks).toString('utf-8');
                    const parsed = raw ? JSON.parse(raw) as Record<string, unknown> : {};
                    resolve(parsed);
                } catch {
                    resolve({});
                }
            });
            req.on('error', reject);
        });
    }
}
