/**
 * GravityClaw — Two-Layer Memory System
 *
 * Camada 1: Fatos rápidos (MEMORY.md) — informações-chave do usuário.
 * Camada 2: Log de histórico pesquisável (JSON) — conversa completa.
 *
 * Também inclui compactação automática de sessões longas.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import type { LLMRouter } from '../core/llm/router.js';
import type { MemoryEntry, MemoryFact, MemorySearchResult, ChannelType } from '../core/types.js';
import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import { v4 as uuid } from 'uuid';

const DEFAULT_MEMORY_DIR = resolve(process.cwd(), 'data', 'memory');

export class MemoryManager {
    private memoryDir: string;
    private facts: MemoryFact[] = [];
    private history: MemoryEntry[] = [];
    private maxHistoryBeforeCompaction = 200;

    constructor(memoryDir?: string) {
        this.memoryDir = memoryDir ?? DEFAULT_MEMORY_DIR;
    }

    // ─── Inicialização ────────────────────────────────────────

    async init(): Promise<void> {
        if (!existsSync(this.memoryDir)) {
            await mkdir(this.memoryDir, { recursive: true });
        }
        await this.loadFacts();
        await this.loadHistory();
        console.log(`[Memory] Inicializada: ${this.facts.length} fatos, ${this.history.length} entradas de histórico`);
    }

    // ─── Camada 1: Fatos Rápidos (MEMORY.md) ──────────────────

    private get factsPath(): string {
        return join(this.memoryDir, 'MEMORY.md');
    }

    private async loadFacts(): Promise<void> {
        if (!existsSync(this.factsPath)) {
            this.facts = [];
            return;
        }
        const raw = await readFile(this.factsPath, 'utf-8');
        this.facts = [];

        for (const line of raw.split('\n')) {
            const match = line.match(/^-\s+\*\*(.+?)\*\*:\s*(.+)/);
            if (match && match[1] && match[2]) {
                this.facts.push({
                    key: match[1].trim(),
                    value: match[2].trim(),
                    updatedAt: new Date(),
                });
            }
        }
    }

    private async saveFacts(): Promise<void> {
        const lines = ['# Memória — Fatos Rápidos\n'];
        for (const fact of this.facts) {
            lines.push(`- **${fact.key}**: ${fact.value}`);
        }
        await writeFile(this.factsPath, lines.join('\n'), 'utf-8');
    }

    async setFact(key: string, value: string): Promise<void> {
        const existing = this.facts.find(f => f.key.toLowerCase() === key.toLowerCase());
        if (existing) {
            existing.value = value;
            existing.updatedAt = new Date();
        } else {
            this.facts.push({ key, value, updatedAt: new Date() });
        }
        await this.saveFacts();
    }

    getFact(key: string): string | undefined {
        return this.facts.find(f => f.key.toLowerCase() === key.toLowerCase())?.value;
    }

    getAllFacts(): MemoryFact[] {
        return [...this.facts];
    }

    async removeFact(key: string): Promise<boolean> {
        const idx = this.facts.findIndex(f => f.key.toLowerCase() === key.toLowerCase());
        if (idx === -1) return false;
        this.facts.splice(idx, 1);
        await this.saveFacts();
        return true;
    }

    // ─── Camada 2: Histórico Pesquisável ───────────────────────

    private get historyPath(): string {
        return join(this.memoryDir, 'history.json');
    }

    public getAllEntries(): MemoryEntry[] {
        return this.history;
    }

    public getFacts(): MemoryFact[] {
        return this.facts;
    }

    private async loadHistory(): Promise<void> {
        if (!existsSync(this.historyPath)) {
            this.history = [];
            return;
        }
        const raw = await readFile(this.historyPath, 'utf-8');
        try {
            this.history = JSON.parse(raw) as MemoryEntry[];
        } catch {
            this.history = [];
        }
    }

    private async saveHistory(): Promise<void> {
        await writeFile(this.historyPath, JSON.stringify(this.history, null, 2), 'utf-8');
    }

    async addEntry(
        role: 'user' | 'assistant',
        content: string,
        channel: ChannelType,
        senderId: string,
        llmRouter?: LLMRouter
    ): Promise<MemoryEntry> {
        let vector: number[] | undefined;
        if (llmRouter) {
            try {
                vector = await llmRouter.embed(content);
            } catch (err) {
                console.warn('[Memory] Falha ao gerar embedding para nova entrada:', err);
            }
        }

        const entry: MemoryEntry = {
            id: uuid(),
            timestamp: new Date(),
            role,
            content,
            channel,
            senderId,
        };
        if (vector !== undefined) {
            entry.vector = vector;
        }
        this.history.push(entry);

        // Verifica se precisa compactar
        if (this.history.length > this.maxHistoryBeforeCompaction) {
            await this.compactHistory();
        }

        await this.saveHistory();
        return entry;
    }

    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        if (vecA.length !== vecB.length || vecA.length === 0) return 0;
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            const a = vecA[i]!;
            const b = vecB[i]!;
            dotProduct += a * b;
            normA += a * a;
            normB += b * b;
        }
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Busca Híbrida no histórico: (Keyword Search simples + Vector Cosine Similarity).
     * Retorna as entradas mais relevantes ordenadas por score.
     */
    async search(query: string, limit = 10, llmRouter?: LLMRouter): Promise<MemorySearchResult[]> {
        const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
        if (terms.length === 0) return [];

        let queryVector: number[] | undefined;
        if (llmRouter) {
            try {
                queryVector = await llmRouter.embed(query);
            } catch (err) {
                console.warn('[Memory] Falha ao gerar embedding para query de busca:', err);
            }
        }

        const scored: MemorySearchResult[] = [];

        for (const entry of this.history) {
            const text = entry.content.toLowerCase();
            let keywordScore = 0;

            for (const term of terms) {
                if (text.includes(term)) {
                    // Contagem de ocorrências do termo
                    const matches = text.split(term).length - 1;
                    keywordScore += matches;
                }
            }

            let vectorScore = 0;
            if (queryVector && entry.vector && entry.vector.length > 0) {
                const sim = this.cosineSimilarity(queryVector, entry.vector);
                if (sim > 0) vectorScore = sim * 5; // Scale up to merge with keyword occurrence scale
            }

            const baseScore = (vectorScore * 0.7) + (keywordScore * 0.3);

            if (baseScore > 0.1) {
                // Boost para entradas mais recentes
                const ageMs = Date.now() - new Date(entry.timestamp).getTime();
                const ageDays = ageMs / (1000 * 60 * 60 * 24);
                const recencyBoost = Math.max(0.1, 1.0 - ageDays * 0.02);

                const finalScore = baseScore * recencyBoost;
                scored.push({ entry, score: finalScore });
            }
        }

        return scored
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    /**
     * Retorna as últimas N entradas do histórico (para contexto da conversa).
     */
    getRecentHistory(count = 20): MemoryEntry[] {
        return this.history.slice(-count);
    }

    // ─── Compactação Automática ────────────────────────────────

    /**
     * Compacta as entradas mais antigas, preservando as últimas 50.
     * As antigas são resumidas e salvas como uma única entrada "compactada".
     */
    private async compactHistory(): Promise<void> {
        const keepRecent = 50;
        if (this.history.length <= keepRecent) return;

        const toCompact = this.history.slice(0, this.history.length - keepRecent);
        const kept = this.history.slice(-keepRecent);

        // Resumo simples: preserva apenas o essencial
        const summaryLines = toCompact.map(e => {
            const date = new Date(e.timestamp).toISOString().split('T')[0];
            return `[${date}] ${e.role}: ${e.content.slice(0, 100)}${e.content.length > 100 ? '...' : ''}`;
        });

        const compactedEntry: MemoryEntry = {
            id: uuid(),
            timestamp: new Date(toCompact[0]!.timestamp),
            role: 'assistant',
            content: `[HISTÓRICO COMPACTADO - ${toCompact.length} mensagens]\n${summaryLines.join('\n')}`,
            channel: 'web',
            senderId: 'system',
            summary: `Resumo de ${toCompact.length} mensagens compactadas`,
        };

        this.history = [compactedEntry, ...kept];
        console.log(`[Memory] Compactação: ${toCompact.length} entradas → 1 resumo + ${kept.length} recentes`);
    }

    /**
     * Retorna o número total de entradas de histórico.
     */
    getHistoryCount(): number {
        return this.history.length;
    }
}
