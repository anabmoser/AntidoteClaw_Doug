/**
 * GravityClaw — Telegram Channel Connector
 *
 * Integração com o Telegram Bot API usando long polling.
 * Suporta mensagens de texto, mídia (imagens, áudio, vídeo, documentos),
 * botões inline e comandos.
 */

import type { Channel, ChannelType, IncomingMessage, OutgoingMessage, MessageButton } from '../core/types.js';
import { v4 as uuid } from 'uuid';

const TELEGRAM_API = 'https://api.telegram.org';

interface TelegramUpdate {
    update_id: number;
    message?: {
        message_id: number;
        from: { id: number; first_name: string; last_name?: string; username?: string };
        chat: { id: number; type: string };
        date: number;
        text?: string;
        photo?: { file_id: string }[];
        voice?: { file_id: string };
        video?: { file_id: string };
        document?: { file_id: string; file_name?: string };
        caption?: string;
    };
    callback_query?: {
        id: string;
        from: { id: number; first_name: string };
        data?: string;
        message?: { chat: { id: number } };
    };
}

interface TelegramChannelOptions {
    botToken: string;
    onMessage: (
        msg: IncomingMessage,
        sendProgress?: (text: string) => Promise<void>,
        sendFile?: (filePath: string, caption: string) => Promise<void>
    ) => Promise<OutgoingMessage | null>;
    allowedChatIds?: number[] | undefined;
}

export class TelegramChannel implements Channel {
    readonly type: ChannelType = 'telegram';
    private token: string;
    private onMessageHandler: (
        msg: IncomingMessage,
        sendProgress?: (text: string) => Promise<void>,
        sendFile?: (filePath: string, caption: string) => Promise<void>
    ) => Promise<OutgoingMessage | null>;
    private allowedChatIds: number[] | null;
    private polling = false;
    private lastUpdateId = 0;
    private abortController: AbortController | null = null;

    constructor(options: TelegramChannelOptions) {
        this.token = options.botToken;
        this.onMessageHandler = options.onMessage;
        this.allowedChatIds = options.allowedChatIds ?? null;
    }

    // ─── Lifecycle ─────────────────────────────────────────────

    async start(): Promise<void> {
        // Verifica se o token é válido
        const me = await this.apiCall('getMe') as { username: string; first_name: string };
        console.log(`[Telegram] 🤖 Bot conectado: @${me.username} (${me.first_name})`);

        // Configura os comandos no menu do Telegram
        try {
            await this.apiCall('setMyCommands', {
                commands: JSON.stringify([
                    { command: 'writer', description: 'Chama o Especialista em Textos' },
                    { command: 'video', description: 'Chama o Editor de Vídeo' },
                    { command: 'designer', description: 'Chama o Criador de Imagens' },
                    { command: 'scout', description: 'Chama o Pesquisador Web' },
                    { command: 'social', description: 'Chama o Gestor de Redes Sociais' },
                    { command: 'clima', description: 'Consulta o clima (Skill)' },
                ]),
            });
            console.log(`[Telegram] 📜 Menu de comandos atualizado com sucesso.`);
        } catch (err) {
            console.error(`[Telegram] ⚠️ Erro ao atualizar menu de comandos:`, err);
        }

        // Inicia long polling
        this.polling = true;
        this.pollUpdates();
    }

    async stop(): Promise<void> {
        this.polling = false;
        if (this.abortController) {
            this.abortController.abort();
        }
        console.log('[Telegram] Bot desconectado.');
    }

    // ─── Send Messages ─────────────────────────────────────────

    async send(recipientId: string, message: OutgoingMessage): Promise<void> {
        const chatId = parseInt(recipientId, 10);

        // Monta o teclado inline se houver botões
        const replyMarkup = message.buttons && message.buttons.length > 0
            ? {
                inline_keyboard: [
                    message.buttons.map((btn: MessageButton) => ({
                        text: btn.label,
                        callback_data: btn.action,
                    })),
                ],
            }
            : undefined;

        if (message.mediaUrl) {
            // Tenta enviar como foto
            await this.apiCall('sendPhoto', {
                chat_id: chatId,
                photo: message.mediaUrl,
                caption: message.text,
                parse_mode: 'Markdown',
                reply_markup: replyMarkup ? JSON.stringify(replyMarkup) : undefined,
            });
        } else {
            // Envia texto (com suporte a chunking para mensagens > 4000 chars)
            const maxLen = 4000;
            const fullText = message.text;

            for (let i = 0; i < fullText.length; i += maxLen) {
                const chunk = fullText.slice(i, i + maxLen);
                // Manda teclado apenas no último chunk
                const isLast = (i + maxLen) >= fullText.length;

                await this.apiCall('sendMessage', {
                    chat_id: chatId,
                    text: chunk,
                    parse_mode: 'Markdown',
                    reply_markup: (isLast && replyMarkup) ? JSON.stringify(replyMarkup) : undefined,
                }).catch(async (err) => {
                    // Fallback sem markdown caso falhe a formatação no meio do chunk
                    console.error(`[Telegram] Erro Markdown no chunk, tentando sem formatação...`);
                    await this.apiCall('sendMessage', {
                        chat_id: chatId,
                        text: chunk,
                        reply_markup: (isLast && replyMarkup) ? JSON.stringify(replyMarkup) : undefined,
                    });
                });
            }
        }
    }

    // ─── Polling Loop ──────────────────────────────────────────

    private async pollUpdates(): Promise<void> {
        while (this.polling) {
            try {
                this.abortController = new AbortController();
                const updates = await this.getUpdates();

                for (const update of updates) {
                    this.lastUpdateId = update.update_id + 1;
                    await this.handleUpdate(update);
                }
            } catch (err) {
                if (!this.polling) break; // abort esperado
                const msg = err instanceof Error ? err.message : String(err);
                console.error(`[Telegram] Erro no polling: ${msg}`);
                // Espera antes de tentar novamente
                await this.sleep(3000);
            }
        }
    }

    private async getUpdates(): Promise<TelegramUpdate[]> {
        const result = await this.apiCall('getUpdates', {
            offset: this.lastUpdateId,
            timeout: 30,
            allowed_updates: JSON.stringify(['message', 'callback_query']),
        });
        return result as TelegramUpdate[];
    }

    // ─── Update Handler ────────────────────────────────────────

    private async handleUpdate(update: TelegramUpdate): Promise<void> {
        // Callback query (botões inline)
        if (update.callback_query) {
            const cb = update.callback_query;
            const chatId = cb.message?.chat.id;
            if (!chatId) return;

            // Responde ao callback
            await this.apiCall('answerCallbackQuery', { callback_query_id: cb.id });

            const incoming: IncomingMessage = {
                id: uuid(),
                channel: 'telegram',
                senderId: String(chatId),
                senderName: cb.from.first_name,
                text: cb.data ?? '',
                timestamp: new Date(),
                metadata: { telegramCallbackQuery: true },
            };

            const response = await this.onMessageHandler(incoming);
            if (response) {
                await this.send(String(chatId), response);
            }
            return;
        }

        // Mensagem normal
        const msg = update.message;
        if (!msg) return;

        // Verifica restrição de chat IDs
        if (this.allowedChatIds && !this.allowedChatIds.includes(msg.chat.id)) {
            console.log(`[Telegram] Chat ${msg.chat.id} não autorizado. Ignorando.`);
            return;
        }

        // Determina o conteúdo
        let text = msg.text ?? msg.caption ?? '';
        let mediaUrl: string | undefined;
        let mediaType: 'image' | 'audio' | 'video' | 'document' | undefined;

        if (msg.photo && msg.photo.length > 0) {
            // Pega a maior resolução
            const largest = msg.photo[msg.photo.length - 1];
            if (largest) {
                mediaUrl = await this.getFileUrl(largest.file_id);
                mediaType = 'image';
            }
        } else if (msg.voice) {
            mediaUrl = await this.getFileUrl(msg.voice.file_id);
            mediaType = 'audio';
        } else if (msg.video) {
            mediaUrl = await this.getFileUrl(msg.video.file_id);
            mediaType = 'video';
        } else if (msg.document) {
            mediaUrl = await this.getFileUrl(msg.document.file_id);
            mediaType = 'document';
        }

        if (!text && !mediaUrl) return; // Nada para processar

        const incoming: IncomingMessage = {
            id: uuid(),
            channel: 'telegram',
            senderId: String(msg.chat.id),
            senderName: `${msg.from.first_name}${msg.from.last_name ? ' ' + msg.from.last_name : ''}`,
            text,
            timestamp: new Date(msg.date * 1000),
            metadata: {
                telegramMessageId: msg.message_id,
                telegramChatType: msg.chat.type,
                telegramUsername: msg.from.username,
            },
        };

        if (mediaUrl) { incoming.mediaUrl = mediaUrl; }
        if (mediaType) { incoming.mediaType = mediaType; }

        // Envia "digitando..."
        await this.apiCall('sendChatAction', {
            chat_id: msg.chat.id,
            action: 'typing',
        });

        // Cria callback para mensagens de progresso
        const sendProgress = async (text: string): Promise<void> => {
            try {
                await this.apiCall('sendMessage', {
                    chat_id: msg.chat.id,
                    text,
                    parse_mode: 'Markdown',
                });
            } catch {
                // Ignora erros de formatação Markdown
                try {
                    await this.apiCall('sendMessage', {
                        chat_id: msg.chat.id,
                        text,
                    });
                } catch { /* silencioso */ }
            }
        };

        // Cria callback para enviar arquivos de vídeo
        const sendFile = async (filePath: string, caption: string): Promise<void> => {
            try {
                const { createReadStream } = await import('fs');
                const FormData = (await import('node:buffer')).Blob ? null : null;
                // Usa multipart form para enviar vídeo
                const fileStream = createReadStream(filePath);
                const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
                const { readFileSync } = await import('fs');
                const fileBuffer = readFileSync(filePath);
                const fileName = filePath.split('/').pop() ?? 'video.mp4';

                const parts: Buffer[] = [];
                parts.push(Buffer.from(
                    `--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${msg.chat.id}\r\n`
                ));
                parts.push(Buffer.from(
                    `--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`
                ));
                parts.push(Buffer.from(
                    `--${boundary}\r\nContent-Disposition: form-data; name="video"; filename="${fileName}"\r\nContent-Type: video/mp4\r\n\r\n`
                ));
                parts.push(fileBuffer);
                parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

                const body = Buffer.concat(parts);
                const url = `${TELEGRAM_API}/bot${this.token}/sendVideo`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
                    body: new Uint8Array(body),
                });
                if (!res.ok) {
                    const errText = await res.text();
                    console.error(`[Telegram] Erro sendVideo: ${errText}`);
                }
            } catch (err) {
                const errMsg = err instanceof Error ? err.message : String(err);
                console.error(`[Telegram] Erro ao enviar arquivo: ${errMsg}`);
            }
        };

        const response = await this.onMessageHandler(incoming, sendProgress, sendFile);
        if (response) {
            await this.send(String(msg.chat.id), response);
        }
    }

    // ─── Telegram API Helpers ──────────────────────────────────

    private async apiCall(method: string, params?: Record<string, unknown>): Promise<unknown> {
        const url = `${TELEGRAM_API}/bot${this.token}/${method}`;

        const fetchOptions: RequestInit = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        };
        if (params) { fetchOptions.body = JSON.stringify(params); }
        if (this.abortController) { fetchOptions.signal = this.abortController.signal; }
        const res = await fetch(url, fetchOptions);

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Telegram API ${method} falhou (${res.status}): ${errText}`);
        }

        const data = await res.json() as { ok: boolean; result: unknown; description?: string };
        if (!data.ok) {
            throw new Error(`Telegram API ${method}: ${data.description ?? 'Erro desconhecido'}`);
        }

        return data.result;
    }

    private async getFileUrl(fileId: string): Promise<string> {
        const file = await this.apiCall('getFile', { file_id: fileId }) as { file_path: string };
        return `${TELEGRAM_API}/file/bot${this.token}/${file.file_path}`;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
