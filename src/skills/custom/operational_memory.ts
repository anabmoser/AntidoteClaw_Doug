import type { Skill, SkillInput, SkillOutput } from '../../core/types.js';
import { OperationalMemoryService } from '../../services/operational-memory.js';

const TRIGGER_PATTERNS = [
    /^\/memoria\b/i,
    /\batualiz(e|a) (a )?mem[oó]ria do doug\b/i,
    /\bregistre (isso )?na mem[oó]ria do doug\b/i,
    /\bsalve (isso )?na mem[oó]ria do doug\b/i,
    /\bsincronize (a )?mem[oó]ria do doug\b/i,
    /\bregistre (isso )?no github\b/i,
];

export const operationalMemorySkill: Skill = {
    name: 'operational_memory',
    description: 'Atualiza a memória operacional do Doug no Drive e no GitHub quando a usuária pedir explicitamente.',
    version: '1.0.0',
    triggers: [
        '/memoria',
        'atualize a memória do doug',
        'atualize a memoria do doug',
        'registre na memória do doug',
        'registre na memoria do doug',
        'salve na memória do doug',
        'salve na memoria do doug',
        'sincronize a memória do doug',
        'sincronize a memoria do doug',
        'registre no github',
    ],

    async execute(input: SkillInput): Promise<SkillOutput> {
        const driveService = input.context.driveService;
        const memoryService = new OperationalMemoryService(driveService);
        const note = extractNote(input.rawText);

        try {
            const result = await memoryService.syncUpdate(note, input.context.senderId);
            const lines = [
                'Memória operacional do Doug atualizada.',
                '',
                `Resumo registrado: ${note}`,
            ];

            if (result.driveLink) {
                lines.push('', `Drive: ${result.driveLink}`);
            } else {
                lines.push('', 'Drive: indisponível nesta instância.');
            }

            if (result.githubUrl) {
                lines.push(`GitHub: ${result.githubUrl}`);
            } else {
                lines.push('GitHub: indisponível nesta instância.');
            }

            return { text: lines.join('\n') };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { text: `❌ Não consegui atualizar a memória operacional do Doug.\n\nErro: ${msg}` };
        }
    },
};

function extractNote(rawText: string): string {
    const trimmed = rawText.trim();
    const afterColon = trimmed.includes(':') ? trimmed.split(':').slice(1).join(':').trim() : '';
    if (afterColon) return afterColon;

    let cleaned = trimmed;
    for (const pattern of TRIGGER_PATTERNS) {
        cleaned = cleaned.replace(pattern, '').trim();
    }

    cleaned = cleaned.replace(/^doug[,:\s-]*/i, '').trim();
    return cleaned || 'Atualizacao operacional registrada por comando explicito da usuaria.';
}
