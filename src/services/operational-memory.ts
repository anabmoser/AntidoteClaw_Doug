import type { DriveService } from './drive.js';
import { GitHubRepoService } from './github.js';

const DRIVE_DOC_NAME = 'MEMORIA-OPERACIONAL-DOUG-ATUAL.md';
const GITHUB_MEMORY_PATH = process.env['GITHUB_MEMORY_FILE_PATH'] ?? 'docs/MEMORIA-OPERACIONAL-DOUG-ATUAL.md';

export interface OperationalMemorySyncResult {
    markdown: string;
    driveLink?: string;
    githubUrl?: string;
}

export class OperationalMemoryService {
    constructor(
        private readonly driveService?: DriveService,
        private readonly githubService: GitHubRepoService | null = GitHubRepoService.fromEnv()
    ) {}

    async syncUpdate(note: string, senderId?: string): Promise<OperationalMemorySyncResult> {
        const currentMarkdown = await this.loadCurrentMarkdown();
        const markdown = this.prependEntry(currentMarkdown, note, senderId);

        const result: OperationalMemorySyncResult = { markdown };

        if (this.driveService?.getFolders()?.root) {
            const driveFile = await this.driveService.upsertText(
                DRIVE_DOC_NAME,
                markdown,
                this.driveService.getFolders()!.root
            );
            result.driveLink = driveFile.webViewLink;
        }

        if (this.githubService) {
            const githubFile = await this.githubService.upsertTextFile(
                GITHUB_MEMORY_PATH,
                markdown,
                `docs(memory): update Doug operational memory`
            );
            result.githubUrl = githubFile.url;
        }

        return result;
    }

    private async loadCurrentMarkdown(): Promise<string> {
        if (this.githubService) {
            const current = await this.githubService.getTextFile(GITHUB_MEMORY_PATH);
            if (current?.content?.trim()) {
                return current.content;
            }
        }

        return this.buildInitialDocument();
    }

    private buildInitialDocument(): string {
        return [
            '# Memoria Operacional do Doug',
            '',
            `Ultima atualizacao: ${this.nowLabel()}`,
            '',
            '## Registro de Atualizacoes',
            '',
            '_Este documento e mantido pelo Doug para registrar construcoes, correcoes, decisoes e pendencias operacionais._',
            '',
        ].join('\n');
    }

    private prependEntry(existing: string, note: string, senderId?: string): string {
        const cleaned = note.trim() || 'Atualizacao operacional registrada sem detalhe adicional.';
        const entry = [
            `### ${this.nowLabel()}`,
            senderId ? `Origem: ${senderId}` : 'Origem: Doug',
            '',
            cleaned,
            '',
        ].join('\n');

        const normalized = existing.trim() || this.buildInitialDocument();
        const lines = normalized.split('\n');
        const updatedLines = lines.map(line =>
            line.startsWith('Ultima atualizacao:')
                ? `Ultima atualizacao: ${this.nowLabel()}`
                : line
        );

        const marker = '## Registro de Atualizacoes';
        const markerIndex = updatedLines.findIndex(line => line.trim() === marker);
        if (markerIndex === -1) {
            return [
                normalized,
                '',
                marker,
                '',
                entry.trimEnd(),
                '',
            ].join('\n');
        }

        updatedLines.splice(markerIndex + 1, 0, '', entry.trimEnd());
        return `${updatedLines.join('\n').trim()}\n`;
    }

    private nowLabel(): string {
        return new Intl.DateTimeFormat('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short',
            timeZone: 'America/Sao_Paulo',
        }).format(new Date());
    }
}
