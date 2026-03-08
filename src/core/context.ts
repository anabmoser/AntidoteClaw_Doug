import * as fs from 'fs';
import * as path from 'path';

/**
 * ContextManager - Lê arquivos estáticos do sistema para injetar contexto 
 * global de longo prazo (Shared Context Layer) em todos os agentes.
 */
export class ContextManager {
    /**
     * Retorna a string combinada dos arquivos de contexto compartilhados.
     */
    static getSharedContext(): string {
        try {
            const basePath = process.cwd();
            const userPath = path.resolve(basePath, 'data/context/USER.md');
            const rulesPath = path.resolve(basePath, 'data/context/SHARED-RULES.md');

            let context = '';

            if (fs.existsSync(userPath)) {
                context += '\n\n---\n# CONTEXTO SOBRE O USUÁRIO (LÓGICA SUPERIOR)\n' + fs.readFileSync(userPath, 'utf8');
            }

            if (fs.existsSync(rulesPath)) {
                context += '\n\n---\n# REGRAS COMPARTILHADAS (LÓGICA SUPERIOR)\n' + fs.readFileSync(rulesPath, 'utf8');
            }

            return context;
        } catch (e) {
            console.error('[ContextManager] Erro ao ler arquivos de contexto compartilhado', e);
            return '';
        }
    }
}
