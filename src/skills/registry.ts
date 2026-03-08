/**
 * GravityClaw — Skills Registry
 *
 * Gerencia o registro, descoberta e execução de Skills.
 * Skills são módulos autocontidos que adicionam capacidades ao agente.
 */

import type { Skill, SkillInput, SkillOutput } from '../core/types.js';

export class SkillsRegistry {
    private skills = new Map<string, Skill>();

    /**
     * Registra uma nova skill no sistema.
     */
    register(skill: Skill): void {
        if (this.skills.has(skill.name)) {
            console.warn(`[Skills] Substituindo skill existente: ${skill.name}`);
        }
        this.skills.set(skill.name, skill);
        console.log(`[Skills] Registrada: ${skill.name} v${skill.version} — ${skill.description}`);
    }

    /**
     * Remove uma skill do registro.
     */
    unregister(name: string): boolean {
        const removed = this.skills.delete(name);
        if (removed) {
            console.log(`[Skills] Removida: ${name}`);
        }
        return removed;
    }

    /**
     * Busca uma skill pelo nome.
     */
    get(name: string): Skill | undefined {
        return this.skills.get(name);
    }

    /**
     * Lista todas as skills registradas.
     */
    list(): Skill[] {
        return [...this.skills.values()];
    }

    /**
     * Tenta encontrar uma skill com base nos triggers definidos.
     * Retorna a primeira skill cujo trigger corresponde ao texto.
     */
    findByTrigger(text: string): Skill | undefined {
        const lower = text.toLowerCase().trim();
        for (const skill of this.skills.values()) {
            if (skill.triggers) {
                for (const trigger of skill.triggers) {
                    if (lower.startsWith(trigger.toLowerCase())) {
                        return skill;
                    }
                }
            }
        }
        return undefined;
    }

    /**
     * Executa uma skill pelo nome.
     */
    async execute(name: string, input: SkillInput): Promise<SkillOutput> {
        const skill = this.skills.get(name);
        if (!skill) {
            return { error: `Skill "${name}" não encontrada.` };
        }

        try {
            console.log(`[Skills] Executando: ${name}`);
            const result = await skill.execute(input);
            console.log(`[Skills] Concluída: ${name}`);
            return result;
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[Skills] Erro em ${name}: ${msg}`);
            return { error: `Erro ao executar "${name}": ${msg}` };
        }
    }

    /**
     * Gera uma descrição formatada de todas as skills disponíveis,
     * útil para incluir no system prompt do LLM.
     */
    describeForLLM(): string {
        const skills = this.list();
        if (skills.length === 0) {
            return 'Nenhuma skill disponível no momento.';
        }

        const lines = ['## Skills Disponíveis\n'];
        for (const skill of skills) {
            lines.push(`### ${skill.name} (v${skill.version})`);
            lines.push(skill.description);
            if (skill.triggers && skill.triggers.length > 0) {
                lines.push(`Triggers: ${skill.triggers.join(', ')}`);
            }
            lines.push('');
        }
        return lines.join('\n');
    }
}
