/**
 * GravityClaw — Gateway WebSocket Hub
 *
 * Servidor central ao qual todos os canais (Telegram, Discord, Web, etc.)
 * se conectam via WebSockets em tempo real. Funciona como a "torre de controle"
 * do framework, roteando mensagens entre canais e o agente.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuid } from 'uuid';
import type { IncomingMessage, OutgoingMessage, ChannelType, GatewayClient, AgentEvent, EventHandler } from '../core/types.js';

interface GatewayOptions {
    port: number;
    token: string;
}

interface WSMessage {
    type: string;
    payload: Record<string, unknown>;
}

export class Gateway {
    private wss: WebSocketServer | null = null;
    private clients = new Map<string, { ws: WebSocket; meta: GatewayClient }>();
    private eventHandlers: EventHandler[] = [];
    private messageHandler: ((msg: IncomingMessage) => Promise<OutgoingMessage | null>) | null = null;
    private port: number;
    private token: string;

    constructor(options: GatewayOptions) {
        this.port = options.port;
        this.token = options.token;
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
                console.error('[Gateway] Erro em event handler:', err);
            }
        }
    }

    // ─── Message Handler ───────────────────────────────────────

    /**
     * Define o handler principal que processa mensagens recebidas e retorna respostas.
     */
    onMessage(handler: (msg: IncomingMessage) => Promise<OutgoingMessage | null>): void {
        this.messageHandler = handler;
    }

    // ─── Server Lifecycle ──────────────────────────────────────

    start(): Promise<void> {
        return new Promise((resolve) => {
            this.wss = new WebSocketServer({ port: this.port });

            this.wss.on('listening', () => {
                console.log(`[Gateway] 🚀 WebSocket Hub rodando na porta ${this.port}`);
                resolve();
            });

            this.wss.on('connection', (ws, req) => {
                const clientId = uuid();
                console.log(`[Gateway] Nova conexão: ${clientId} de ${req.socket.remoteAddress}`);

                const clientMeta: GatewayClient = {
                    id: clientId,
                    channelType: 'web',
                    authenticated: false,
                    connectedAt: new Date(),
                };

                this.clients.set(clientId, { ws, meta: clientMeta });

                ws.on('message', async (data) => {
                    try {
                        const parsed = JSON.parse(data.toString()) as WSMessage;
                        await this.handleWSMessage(clientId, parsed);
                    } catch (err) {
                        this.sendToClient(clientId, {
                            type: 'error',
                            payload: { message: 'Mensagem inválida' },
                        });
                    }
                });

                ws.on('close', () => {
                    const client = this.clients.get(clientId);
                    if (client) {
                        this.emitEvent({
                            type: 'channel_disconnected',
                            payload: { channel: client.meta.channelType },
                        });
                    }
                    this.clients.delete(clientId);
                    console.log(`[Gateway] Cliente desconectado: ${clientId}`);
                });

                ws.on('error', (err) => {
                    console.error(`[Gateway] Erro no cliente ${clientId}:`, err.message);
                });

                // Solicita autenticação
                this.sendToClient(clientId, {
                    type: 'auth_required',
                    payload: { message: 'Envie o token de autenticação.' },
                });
            });
        });
    }

    stop(): Promise<void> {
        return new Promise((resolve) => {
            if (this.wss) {
                // Fecha todas as conexões
                for (const [, { ws }] of this.clients) {
                    ws.close(1000, 'Servidor encerrando');
                }
                this.clients.clear();
                this.wss.close(() => {
                    console.log('[Gateway] Servidor encerrado.');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    // ─── Internal WS Message Handling ──────────────────────────

    private async handleWSMessage(clientId: string, msg: WSMessage): Promise<void> {
        const client = this.clients.get(clientId);
        if (!client) return;

        switch (msg.type) {
            case 'auth': {
                const token = msg.payload['token'] as string | undefined;
                if (token === this.token) {
                    client.meta.authenticated = true;
                    client.meta.channelType = (msg.payload['channel'] as ChannelType) ?? 'web';
                    this.sendToClient(clientId, {
                        type: 'auth_success',
                        payload: { message: 'Autenticado com sucesso!' },
                    });
                    await this.emitEvent({
                        type: 'channel_connected',
                        payload: { channel: client.meta.channelType },
                    });
                } else {
                    this.sendToClient(clientId, {
                        type: 'auth_failed',
                        payload: { message: 'Token inválido.' },
                    });
                }
                break;
            }

            case 'message': {
                if (!client.meta.authenticated) {
                    this.sendToClient(clientId, {
                        type: 'error',
                        payload: { message: 'Não autenticado. Envie auth primeiro.' },
                    });
                    return;
                }

                const incomingMsg: IncomingMessage = {
                    id: uuid(),
                    channel: client.meta.channelType,
                    senderId: msg.payload['senderId'] as string ?? clientId,
                    text: msg.payload['text'] as string ?? '',
                    timestamp: new Date(),
                };
                const senderName = msg.payload['senderName'] as string | undefined;
                if (senderName) { incomingMsg.senderName = senderName; }
                const metadata = msg.payload['metadata'] as Record<string, unknown> | undefined;
                if (metadata) { incomingMsg.metadata = metadata; }

                await this.emitEvent({
                    type: 'message_received',
                    payload: incomingMsg,
                });

                // Processa com o handler do agente
                if (this.messageHandler) {
                    const response = await this.messageHandler(incomingMsg);
                    if (response) {
                        this.sendToClient(clientId, {
                            type: 'response',
                            payload: response as unknown as Record<string, unknown>,
                        });
                        await this.emitEvent({
                            type: 'message_sent',
                            payload: { ...response, recipientId: incomingMsg.senderId },
                        });
                    }
                }
                break;
            }

            default:
                this.sendToClient(clientId, {
                    type: 'error',
                    payload: { message: `Tipo de mensagem desconhecido: ${msg.type}` },
                });
        }
    }

    // ─── Utilities ─────────────────────────────────────────────

    private sendToClient(clientId: string, msg: WSMessage): void {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(msg));
        }
    }

    /**
     * Envia uma mensagem para todos os clientes autenticados de um canal específico.
     */
    broadcast(channelType: ChannelType, msg: OutgoingMessage): void {
        for (const [id, { meta }] of this.clients) {
            if (meta.authenticated && meta.channelType === channelType) {
                this.sendToClient(id, {
                    type: 'response',
                    payload: msg as unknown as Record<string, unknown>,
                });
            }
        }
    }

    /**
     * Retorna informações sobre os clientes conectados.
     */
    getConnectedClients(): GatewayClient[] {
        return [...this.clients.values()].map(c => c.meta);
    }
}
