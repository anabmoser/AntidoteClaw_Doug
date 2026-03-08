import fetch from 'node-fetch';

export class TranscriberService {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async downloadFile(url: string): Promise<Buffer> {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Download falhou: ${res.status} ${res.statusText}`);
        return Buffer.from(await res.arrayBuffer());
    }

    async uploadToAssemblyAI(fileBuffer: Buffer): Promise<string> {
        const res = await fetch('https://api.assemblyai.com/v2/upload', {
            method: 'POST',
            headers: {
                'Authorization': this.apiKey,
                'Content-Type': 'application/octet-stream',
            },
            body: fileBuffer,
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`AssemblyAI upload: ${res.status} — ${errText}`);
        }
        return ((await res.json()) as { upload_url: string }).upload_url;
    }

    async transcribe(
        audioUrl: string,
        progress?: (msg: string) => Promise<void>
    ): Promise<string> {
        let result = await this.submitAndPoll(audioUrl, 'universal-3-pro', progress);
        if (!result || result.trim() === '') {
            if (progress) await progress('⚠️ Primeiro modelo vazio. Tentando alternativo...');
            result = await this.submitAndPoll(audioUrl, 'universal-2', progress);
        }
        if (!result || result.trim() === '') {
            throw new Error('Transcrição retornou vazia — áudio sem fala detectável.');
        }
        return result;
    }

    private async submitAndPoll(audioUrl: string, model: string, progress?: (msg: string) => Promise<void>): Promise<string> {
        const submitRes = await fetch('https://api.assemblyai.com/v2/transcript', {
            method: 'POST',
            headers: { 'Authorization': this.apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio_url: audioUrl, speech_models: [model], language_code: 'pt', speaker_labels: false }),
        });
        if (!submitRes.ok) {
            const errText = await submitRes.text();
            throw new Error(`AssemblyAI submit: ${submitRes.status} — ${errText}`);
        }
        const { id: transcriptId } = await submitRes.json() as { id: string };

        for (let i = 0; i < 60; i++) {
            await new Promise(r => setTimeout(r, 2500));
            const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
                headers: { 'Authorization': this.apiKey },
            });
            if (!pollRes.ok) continue;
            const data = await pollRes.json() as { status: string; text?: string; };

            if (data.status === 'completed') {
                return data.text ?? '';
            }
            if (data.status === 'error') throw new Error('Transcrição falhou no AssemblyAI');
        }
        throw new Error('Timeout da API de Transcrição');
    }
}
