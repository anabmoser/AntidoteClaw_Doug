export interface GitHubRepoConfig {
    token: string;
    owner: string;
    repo: string;
    branch: string;
}

interface GitHubContentResponse {
    sha: string;
    content?: string;
    encoding?: string;
}

export class GitHubRepoService {
    constructor(private readonly config: GitHubRepoConfig) {}

    static fromEnv(): GitHubRepoService | null {
        const token = process.env['GITHUB_PERSONAL_ACCESS_TOKEN'];
        if (!token) return null;

        return new GitHubRepoService({
            token,
            owner: process.env['GITHUB_REPO_OWNER'] ?? 'anabmoser',
            repo: process.env['GITHUB_REPO_NAME'] ?? 'AntidoteClaw_Doug',
            branch: process.env['GITHUB_REPO_BRANCH'] ?? 'main',
        });
    }

    async getTextFile(path: string): Promise<{ content: string; sha: string } | null> {
        const response = await fetch(this.buildContentsUrl(path), {
            headers: this.headers(),
        });

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            throw new Error(`[GitHub] Falha ao ler ${path}: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as GitHubContentResponse;
        const content = data.content
            ? Buffer.from(data.content, data.encoding === 'base64' ? 'base64' : 'utf-8').toString('utf-8')
            : '';

        return { content, sha: data.sha };
    }

    async upsertTextFile(path: string, content: string, message: string): Promise<{ url: string; sha: string }> {
        const current = await this.getTextFile(path);
        const body = {
            message,
            content: Buffer.from(content, 'utf-8').toString('base64'),
            branch: this.config.branch,
            sha: current?.sha,
        };

        const response = await fetch(this.buildContentsUrl(path), {
            method: 'PUT',
            headers: this.headers(),
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`[GitHub] Falha ao atualizar ${path}: ${response.status} ${response.statusText} ${text}`);
        }

        const data = await response.json() as { content?: { sha?: string; html_url?: string } };
        return {
            sha: data.content?.sha ?? current?.sha ?? '',
            url: data.content?.html_url ?? `https://github.com/${this.config.owner}/${this.config.repo}/blob/${this.config.branch}/${path}`,
        };
    }

    private buildContentsUrl(path: string): string {
        return `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${path}`;
    }

    private headers(): Record<string, string> {
        return {
            'Authorization': `Bearer ${this.config.token}`,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'User-Agent': 'GravityClaw-Doug',
        };
    }
}
