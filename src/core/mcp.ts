/**
 * GravityClaw — Model Context Protocol (MCP) Manager
 *
 * Gerencia clientes MCP (Model Context Protocol) para conectar o 
 * agente a integrações e ferramentas externas via stdio ou SSE.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { CallToolResult, ListToolsResult } from "@modelcontextprotocol/sdk/types.js";

export interface McpServerConfig {
    name: string;
    command: string;
    args: string[];
    env?: Record<string, string>;
}

export class McpManager {
    private clients: Map<string, Client> = new Map();

    /**
     * Conecta a um servidor MCP local rodando via stdio.
     */
    async connectStdioServer(config: McpServerConfig): Promise<void> {
        if (this.clients.has(config.name)) {
            console.log(`[MCP] Servidor ${config.name} já conectado.`);
            return;
        }

        console.log(`[MCP] 🔌 Conectando ao servidor stdio: ${config.name}`);

        const transportArgs: Record<string, any> = {
            command: config.command,
            args: config.args,
        };
        if (config.env) {
            transportArgs.env = config.env;
        }

        const transport = new StdioClientTransport(transportArgs as any);

        const client = new Client(
            {
                name: "GravityClaw-Client",
                version: "1.1.0",
            },
            {
                capabilities: {},
            }
        );

        try {
            await client.connect(transport);
            this.clients.set(config.name, client);
            console.log(`[MCP] ✅ Servidor ${config.name} conectado com sucesso!`);
        } catch (err) {
            console.error(`[MCP] ❌ Erro ao conectar no servidor ${config.name}:`, err);
            throw err;
        }
    }

    /**
     * Retorna a lista completa de ferramentas de todos os servidores MCP conectados.
     */
    async listAllTools(): Promise<{ serverName: string; tools: ListToolsResult['tools'] }[]> {
        const allTools = [];
        for (const [name, client] of Array.from(this.clients.entries())) {
            try {
                const result = await client.listTools();
                if (result.tools && result.tools.length > 0) {
                    allTools.push({
                        serverName: name,
                        tools: result.tools,
                    });
                }
            } catch (err) {
                console.error(`[MCP] Falha ao listar ferramentas do servidor ${name}:`, err);
            }
        }
        return allTools;
    }

    /**
     * Chama uma ferramenta específica roteando para o servidor correto.
     */
    async callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<CallToolResult> {
        const client = this.clients.get(serverName);
        if (!client) {
            throw new Error(`Servidor MCP '${serverName}' não está conectado.`);
        }

        console.log(`[MCP] 🛠️ Executando tool '${toolName}' no servidor '${serverName}'...`);
        const result = await client.callTool({
            name: toolName,
            arguments: args,
        });
        return result as unknown as CallToolResult;
    }

    /**
     * Encerra todas as conexões ativas.
     */
    async disconnectAll(): Promise<void> {
        for (const [name, client] of Array.from(this.clients.entries())) {
            try {
                await client.close();
                console.log(`[MCP] 🔌 Servidor ${name} desconectado.`);
            } catch (err) {
                console.error(`[MCP] Erro ao desconectar ${name}:`, err);
            }
        }
        this.clients.clear();
    }
}
