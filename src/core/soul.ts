/**
 * GravityClaw — Soul Loader
 *
 * Carrega e parseia o arquivo Soul.md, transformando a personalidade
 * do agente em uma configuração estruturada + system prompt para o LLM.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SoulConfig, DynamicRule } from './types.js';
import { v4 as uuid } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_SOUL_PATH = path.resolve(process.cwd(), 'data', 'Soul.md');

/**
 * Parseia seções do arquivo Soul.md para extrair configurações.
 */
function parseSections(markdown: string): Map<string, string[]> {
    const sections = new Map<string, string[]>();
    let currentSection = '';

    for (const line of markdown.split('\n')) {
        const headerMatch = line.match(/^##\s+(.+)/);
        if (headerMatch && headerMatch[1]) {
            currentSection = headerMatch[1].trim().toLowerCase();
            sections.set(currentSection, []);
            continue;
        }
        if (currentSection) {
            const bulletMatch = line.match(/^[-*]\s+\*\*(.+?)\*\*:\s*(.+)/);
            const simpleBullet = line.match(/^[-*]\s+(.+)/);
            if (bulletMatch && bulletMatch[1] && bulletMatch[2]) {
                sections.get(currentSection)!.push(`${bulletMatch[1]}: ${bulletMatch[2]}`);
            } else if (simpleBullet && simpleBullet[1]) {
                sections.get(currentSection)!.push(simpleBullet[1]);
            }
        }
    }
    return sections;
}

/**
 * Carrega o Soul.md e retorna uma configuração estruturada.
 */
export async function loadSoul(soulPath?: string): Promise<SoulConfig> {
    const filePath = soulPath ?? DEFAULT_SOUL_PATH;
    const raw = await readFile(filePath, 'utf-8');
    const sections = parseSections(raw);

    // Extrai o nome do header H1
    const nameMatch = raw.match(/^#\s+(.+?)(?:\s*—.*)?$/m);

    return {
        name: nameMatch?.[1]?.trim() ?? 'GravityClaw',
        role: sections.get('papel')?.[0] ?? 'Assistente de IA',
        language: sections.get('idioma principal')?.[0] ?? 'Português (Brasil)',
        values: sections.get('valores') ?? [],
        tone: sections.get('tom de comunicação') ?? [],
        rules: sections.get('regras de comportamento') ?? [],
        specialAbilities: sections.get('habilidades especiais') ?? [],
    };
}

/**
 * Constrói o system prompt a partir do SoulConfig para envio ao LLM.
 */
export function buildSystemPrompt(soul: SoulConfig, dynamicRules: DynamicRule[] = []): string {
    const lines: string[] = [];

    lines.push(`Você é ${soul.name}. ${soul.role}`);
    lines.push(`Idioma preferido: ${soul.language}`);
    lines.push('');

    if (soul.values.length > 0) {
        lines.push('## Valores');
        soul.values.forEach(v => lines.push(`- ${v}`));
        lines.push('');
    }

    if (soul.tone.length > 0) {
        lines.push('## Tom de Comunicação');
        soul.tone.forEach(t => lines.push(`- ${t}`));
        lines.push('');
    }

    if (soul.rules.length > 0) {
        lines.push('## Regras de Comportamento');
        soul.rules.forEach(r => lines.push(`- ${r}`));
        lines.push('');
    }

    if (soul.specialAbilities.length > 0) {
        lines.push('## Habilidades');
        soul.specialAbilities.forEach(a => lines.push(`- ${a}`));
        lines.push('');
    }

    // Adiciona regras dinâmicas ativas
    const activeRules = dynamicRules.filter(r => r.active);
    if (activeRules.length > 0) {
        lines.push('## Regras Dinâmicas (ativas nesta sessão)');
        activeRules.forEach(r => {
            lines.push(`- [${r.id}] Quando ${r.condition}: ${r.behavior}`);
        });
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Cria uma nova regra dinâmica de comportamento.
 */
export function createDynamicRule(condition: string, behavior: string): DynamicRule {
    return {
        id: uuid().slice(0, 8),
        condition,
        behavior,
        active: true,
        addedAt: new Date(),
    };
}
