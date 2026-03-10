/**
 * GravityClaw — Video Specialist
 *
 * Pipeline autônomo COMPLETO de vídeo:
 * 1. Recebe vídeo/áudio do Telegram
 * 2. Baixa o arquivo e faz upload no AssemblyAI
 * 3. Transcreve automaticamente
 * 4. Analisa, faz decupagem e define cortes com LLM
 * 5. Executa FFmpeg para gerar os clipes editados
 * 6. Salva relatório e vídeos no Google Drive
 * 7. Envia atualizações de progresso ao usuário via Telegram
 */

import { Specialist, type SpecialistInput, type SpecialistOutput } from '../core/specialist.js';
import type { LLMRouter } from '../core/llm/router.js';
import type { DriveService } from '../services/drive.js';
import { execFile } from 'child_process';
import { createReadStream, createWriteStream, readFileSync, unlinkSync, mkdirSync, existsSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

// Importa ffmpeg-static (binário portátil com todas as libs, incluindo freetype)
import ffmpegPath from 'ffmpeg-static';

interface CutDefinition {
    name: string;
    start: string;
    end: string;
    description: string;
    header?: string;
    subtitles?: { start: string; end: string; text: string }[];
}

export class VideoSpecialist extends Specialist {
    private assemblyaiKey: string;
    private drive: DriveService | null;
    private completedVideos = new Map<string, {
        clips: {
            name: string;
            description: string;
            path?: string;
            srtPath?: string;
            driveLink?: string;
            uploadError?: string;
        }[];
        createdAt: number;
    }>();

    constructor(assemblyaiKey: string, drive?: DriveService | null) {
        super({
            name: 'Video',
            description: 'Processa vídeos de forma autônoma: transcreve, faz decupagem, executa cortes e salva no Drive.',
            model: 'google/gemini-3.1-pro-preview',
            systemPrompt: `Você é o Video Agent do Doug, especialista em produção de vídeo para Ana Moser.

## Seu Comportamento
Você é AUTÔNOMO. Quando recebe um vídeo:
1. Transcreve automaticamente
2. Analisa o conteúdo e faz a decupagem
3. Executa os cortes com FFmpeg
4. Salva tudo no Google Drive
5. Entrega o resultado PRONTO

NUNCA peça ao usuário para fazer algo que você pode fazer sozinho.
NUNCA diga "não tenho acesso" — você TEM as ferramentas.

## Contexto
Ana Moser atua com IEE e Atletas pelo Brasil.
Priorize trechos sobre: esporte, educação, liderança, empoderamento.`,
            triggers: [
                'editar vídeo', 'cortar vídeo', 'transcrever', 'transcreva',
                'transcrição', 'transcri', 'legendar', 'legenda de vídeo',
                'vídeo', 'video', 'ffmpeg', 'edição de vídeo',
                'corte', 'cortes', 'decupagem', 'decupar',
                '/video', '/transcrever'
            ],
            temperature: 0.3,
            maxTokens: 4000,
        });
        this.assemblyaiKey = assemblyaiKey;
        this.drive = drive ?? null;
    }

    // Estado em memória para vídeos aguardando revisão do usuário
    // Chave: string (ID do usuário ou chat para isolar sessões) - usando sourceId
    private pendingVideos = new Map<string, {
        inputPath: string,
        transcript: string,
        initialCuts: CutDefinition[]
    }>();

    override hasActiveSession(senderId: string): boolean {
        return this.pendingVideos.has(senderId);
    }

    override clearSession(senderId: string): void {
        const pending = this.pendingVideos.get(senderId);
        if (pending?.inputPath) {
            try { unlinkSync(pending.inputPath); } catch { /* ignore */ }
        }
        const completed = this.completedVideos.get(senderId);
        if (completed) {
            for (const clip of completed.clips) {
                if (clip.path) {
                    try { unlinkSync(clip.path); } catch { /* ignore */ }
                }
                if (clip.srtPath) {
                    try { unlinkSync(clip.srtPath); } catch { /* ignore */ }
                }
            }
        }
        this.pendingVideos.delete(senderId);
        this.completedVideos.delete(senderId);
    }

    async run(input: SpecialistInput, llmRouter: LLMRouter): Promise<SpecialistOutput> {
        const progress = input.onProgress;
        const sourceId = input.senderId;

        if (!input.mediaUrl && input.text) {
            const completedFollowUp = await this.handleCompletedVideoFollowUp(sourceId, input);
            if (completedFollowUp) {
                return completedFollowUp;
            }
        }

        // === FASE 0: Verifica se o usuário enviou feedback de um vídeo pendente ===
        if (!input.mediaUrl && input.text && this.pendingVideos.has(sourceId)) {
            const pending = this.pendingVideos.get(sourceId)!;
            console.log(`[Video] 🔄 Recebido feedback interativo para corte de vídeo.`);
            if (progress) await progress('🎬 Analisando seu feedback e gerando novos cortes...');

            try {
                const analysisResponse = await llmRouter.complete(
                    [{
                        role: 'user',
                        content: `O usuário enviou um feedback para alterar a edição de um vídeo.
Transcrição original:
${pending.transcript}

Cortes anteriores (rascunho):
${JSON.stringify(pending.initialCuts, null, 2)}

Feedback do usuário: "${input.text}"

INSTRUÇÕES IMPORTANTES:
1. Ajuste os cortes com base no feedback do usuário. Se ele pedir para remover algo, ajuste o start/end.
2. Ao FINAL da sua resposta, inclua um bloco JSON com os novos cortes.
3. Para cada corte, inclua um campo "header" com o título.
4. Para cada corte, inclua "subtitles" com timestamps relativos ao início do corte.

Formato:
\`\`\`cuts
[ { "name": "corte1", "start": "00:00:00", "end": "00:00:10", "description": "...", "header": "...", "subtitles": [...] } ]
\`\`\`
`
                    }],
                    { model: this.config.model, systemPrompt: this.config.systemPrompt, maxTokens: this.config.maxTokens ?? 4000, temperature: 0.3 }
                );

                const analysisText = analysisResponse.content;
                const cuts = this.parseCuts(analysisText);

                if (cuts.length > 0) {
                    await this.executeCutsAndSend(pending.inputPath, cuts, pending.transcript, analysisText, input, llmRouter);
                    this.pendingVideos.delete(sourceId); // Limpa o estado após sucesso
                    return { text: `✅ Vídeo finalizado com base no seu feedback!`, metadata: { interactive: true } };
                } else {
                    return { text: `⚠️ Não consegui entender os cortes no formato esperado após o seu feedback. A resposta foi:\n\n${analysisText}` };
                }
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                console.error(`[Video] ❌ Erro no refinamento: ${msg}`);
                return { text: `❌ Erro ao processar feedback: ${msg}` };
            }
        }

        // Se o usuário mandou texto comum e não tem vídeo pendente, tenta interpretar como pedido solto
        if (!input.mediaUrl && !this.pendingVideos.has(sourceId)) {
            return super.run(input, llmRouter);
        }

        if (input.mediaUrl) {
            console.log(`[Video] 🎬 Mídia recebida (${input.mediaType ?? 'unknown'}), iniciando pipeline de transcrição...`);

            try {
                // === FASE 1: Download ===
                if (progress) {
                    await progress('🎬 *Video Agent ativado!*\n\n📥 Baixando o vídeo para edição...');
                }

                const tempDir = join(process.cwd(), '.tmp', 'video');
                if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });
                const inputPath = join(tempDir, `input-${Date.now()}.mp4`);

                const sizeBytes = await this.downloadFileToPath(input.mediaUrl, inputPath);
                const sizeMB = (sizeBytes / 1024 / 1024).toFixed(1);
                console.log(`[Video] ✅ Download: ${sizeMB}MB`);

                if (progress) {
                    await progress(`✅ Download (${sizeMB}MB)\n📤 Enviando para transcrição...`);
                }

                // === FASE 2: Upload + Transcrição ===
                const uploadUrl = await this.uploadToAssemblyAIFromPath(inputPath);
                if (progress) await progress('📝 Transcrevendo áudio... (1-2 min)');

                const transcript = await this.transcribe(uploadUrl, progress);
                console.log(`[Video] ✅ Transcrição: ${transcript.length} chars`);

                if (progress) await progress('✅ Transcrição pronta!\n🤖 Analisando o roteiro para sugerir cortes iniciais...');

                // === FASE 3: LLM Análise + Sugestão Inicial ===
                const userRequest = input.text?.trim() || 'Faça a decupagem completa e sugira os melhores cortes para Reels/TikTok.';
                const analysisResponse = await llmRouter.complete(
                    [{
                        role: 'user',
                        content: `O usuário enviou um vídeo. Solicitação: "${userRequest}"

## Transcrição completa:
${transcript}

INSTRUÇÕES IMPORTANTES:
1. Faça a decupagem e sugira os melhores cortes. Não crie vídeos muito longos.
2. Ao FINAL da sua resposta, inclua um bloco JSON com os cortes sugeridos.
3. Para cada corte, inclua "header" (título chamativo no topo).
4. Para cada corte, inclua "subtitles" (legendas exatas faladas naquele trecho com timestamps).
5. Os timestamps das legendas DEVEM SER RELATIVOS ao início do corte (começando de 00:00:00).

Formato:
\`\`\`cuts
[
  {
    "name": "nome_descritivo",
    "start": "00:00:00",
    "end": "00:00:10",
    "description": "descrição curta",
    "header": "Título do Vídeo",
    "subtitles": [
      {"start": "00:00:00", "end": "00:00:05", "text": "Primeira frase da legenda"},
      {"start": "00:00:05", "end": "00:00:10", "text": "Segunda frase"}
    ]
  }
]
\`\`\`

Use o formato HH:MM:SS para start e end. O nome deve ser sem espaços/acentos.
Se o usuário pedir um header específico, use-o em todos os cortes.
Inclua entre 1 e 5 cortes sugeridos.`,
                    }],
                    {
                        model: this.config.model,
                        systemPrompt: this.config.systemPrompt,
                        maxTokens: this.config.maxTokens ?? 4000,
                        temperature: this.config.temperature ?? 0.3,
                    }
                );

                const analysisText = analysisResponse.content;

                // === FASE 4: Salva no Estado Interativo ===
                const cuts = this.parseCuts(analysisText);

                if (cuts.length > 0) {
                    this.pendingVideos.set(sourceId, { inputPath, transcript, initialCuts: cuts });

                    // Helper para formatar os cortes pro usuário revisar
                    const formatCutsForReview = (cutsArr: CutDefinition[]) => {
                        return cutsArr.map((c, i) => {
                            let str = `**Corte ${i + 1}: ${c.name}** (${c.start} ➝ ${c.end})\n`;
                            if (c.header) str += `- **Header:** ${c.header}\n`;
                            str += `- **Descrição:** ${c.description}\n`;
                            if (c.subtitles && c.subtitles.length > 0) {
                                str += `- **Legendas mapeadas:**\n`;
                                c.subtitles.forEach(sub => {
                                    str += `  [${sub.start}] ${sub.text}\n`;
                                });
                            }
                            return str;
                        }).join('\n\n');
                    };

                    const cleanAnalysis = analysisText.replace(/```cuts[\s\S]*?```/g, '').trim();
                    const reply = `📺 **Análise Concluída!**\n\n${cleanAnalysis}\n\n` +
                        `---\n\n📜 **Transcrição Original do Vídeo:**\n_${transcript}_\n\n` +
                        `---\n\n🎬 **Cortes Sugeridos (Prontos para renderizar):**\n\n${formatCutsForReview(cuts)}\n\n` +
                        `---\n\n⏳ **Aguardando sua aprovação!**\nVerifique a transcrição e os cortes sugeridos acima.\n` +
                        `Se quiser mudar algo (ex: "No Corte 1, remova a legenda [00:00:05] Segunda frase"), é só me avisar aqui. ` +
                        `Se estiver tudo OK, responda "Pode gerar" ou "Aprovado" e eu crio os vídeos agora mesmo.`;

                    return {
                        text: reply,
                        metadata: { transcript, cuts: cuts.length, status: 'pending_approval' },
                    };
                } else {
                    // Se falhou em gerar cortes válidos, não salva estado e informa erro
                    try { unlinkSync(inputPath); } catch { /* ignore */ }
                    return { text: `Fiz a transcrição, mas não consegui estruturar os cortes. Aqui está sua transcrição:\n\n${transcript}` };
                }
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                console.error(`[Video] ❌ Erro na fase 1: ${msg}`);
                return { text: `❌ Erro ao processar o vídeo inicial: ${msg}` };
            }
        }

        return super.run(input, llmRouter);
    }

    // ─── Phase 2 Execution (FFmpeg & Drive) ────────────────────────────────

    private async executeCutsAndSend(
        inputPath: string,
        cuts: CutDefinition[],
        transcript: string,
        analysisText: string,
        input: SpecialistInput,
        llmRouter: LLMRouter
    ) {
        const progress = input.onProgress;
        const tempDir = join(process.cwd(), '.tmp', 'video');
        let ffmpegResults = '';
        const completedClips: {
            name: string;
            description: string;
            path?: string;
            srtPath?: string;
            driveLink?: string;
            uploadError?: string;
        }[] = [];

        if (cuts.length > 0) {
            if (progress) await progress(`✂️ Renderizando ${cuts.length} corte(s) com legendas embutidas...\n(Isso pode levar alguns minutos)`);
            console.log(`[Video] ✂️ ${cuts.length} cortes para executar`);

            const clipPaths: { name: string; path: string; description: string; header?: string; subtitles?: { start: string; end: string; text: string }[], srtPath?: string }[] = [];

            for (const cut of cuts) {
                try {
                    const outputPath = join(tempDir, `${cut.name}-${Date.now()}.mp4`);

                    // Gera SRT se há legendas
                    let srtPath: string | undefined;
                    if (cut.subtitles && cut.subtitles.length > 0) {
                        srtPath = join(tempDir, `${cut.name}-${Date.now()}.srt`);
                        this.generateSRT(cut.subtitles, srtPath);
                    }

                    await this.runFFmpeg(inputPath, outputPath, cut.start, cut.end, cut.header, srtPath);
                    const entry: typeof clipPaths[0] = { name: cut.name, path: outputPath, description: cut.description };
                    if (cut.header) entry.header = cut.header;
                    if (cut.subtitles) entry.subtitles = cut.subtitles;
                    if (srtPath) entry.srtPath = srtPath;
                    clipPaths.push(entry);
                    console.log(`[Video] ✅ Corte: ${cut.name} (${cut.start}→${cut.end})`);
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    console.error(`[Video] ❌ FFmpeg erro (${cut.name}): ${msg}`);
                }
            }

            // === FASE 5: Enviar clipes via Telegram e Salvar no Drive ===
            const sendFile = input.onSendFile;
            if (sendFile && clipPaths.length > 0) {
                if (progress) await progress(`📤 Salvando no Drive e enviando ${clipPaths.length} vídeo(s)...`);

                for (const clip of clipPaths) {
                    let driveLink = '';
                    let driveWarning = '';
                    let uploadError = '';
                    const dService = input.driveService ?? this.drive;

                    if (dService) {
                        try {
                            const uploadRes = await dService.saveVideoAsset(`${clip.name}-${Date.now()}.mp4`, clip.path, 'video/mp4');
                            driveLink = `\n\n[☁️ Salvo no Drive: ${uploadRes.webViewLink} ]`;
                            console.log(`[Video] ☁️ Upload Drive: ${clip.name}.mp4`);
                        } catch (err) {
                            uploadError = err instanceof Error ? err.message : String(err);
                            console.error(`[Video] ⚠️ Erro no Drive para ${clip.name}:`, err);
                            driveWarning = `\n\n[⚠️ ${clip.name} gerado, mas o upload no Drive falhou.]`;
                        }
                    }

                    completedClips.push({
                        name: clip.name,
                        description: clip.description,
                        path: driveLink ? undefined : clip.path,
                        srtPath: driveLink ? undefined : clip.srtPath,
                        driveLink: driveLink ? driveLink.replace(/\n\n|\[|\]/g, '').replace('☁️ Salvo no Drive: ', '').trim() : undefined,
                        uploadError: uploadError || undefined,
                    });

                    try {
                        let caption = `✂️ ${clip.name}: ${clip.description}`;
                        if (clip.header) { caption = `📌 ${clip.header}\n\n${caption}`; }
                        caption += `${driveLink}${driveWarning}`;
                        await sendFile(clip.path, caption);
                        console.log(`[Video] 📤 Enviado: ${clip.name}.mp4`);
                    } catch (sendErr) {
                        console.error(`[Video] ⚠️ Erro ao enviar ${clip.name}`);
                    }
                }

                ffmpegResults = `\n\n---\n\n### ✅ Vídeos Renderizados\n${clipPaths.map(c => `• ${c.name}: ${c.description}`).join('\n')}\n\n_Os ${clipPaths.length} vídeo(s) prontos foram enviados acima ☝️_`;
                if (progress) await progress(`✅ Concluído!`);
            }

            // Cleanup temp files
            for (let i = 0; i < clipPaths.length; i++) {
                const clip = clipPaths[i]!;
                const completed = completedClips[i];
                if (!completed?.path) {
                    try { unlinkSync(clip.path); } catch { /* ignore */ }
                }
                if (clip.srtPath && !completed?.srtPath) {
                    try { unlinkSync(clip.srtPath); } catch { /* ignore */ }
                }
            }
        }

        this.completedVideos.set(input.senderId, {
            clips: completedClips,
            createdAt: Date.now(),
        });

        // Cleanup input
        try { unlinkSync(inputPath); } catch { /* ignore */ }

        // === FASE 6: Salvar relatório no Drive ===
        if (this.drive) {
            try {
                const folders = this.drive.getFolders();
                if (folders) {
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                    const fullReport = `Decupagem de Vídeo — ${new Date().toLocaleDateString('pt-BR')}\n\nTranscrição:\n${transcript}\n\n---\n\n${analysisText}`;
                    const uploaded = await this.drive.saveText(`decupagem-${timestamp}.txt`, fullReport, folders.outputsVideos);
                    console.log(`[Video] 📄 Relatório Drive: ${uploaded.webViewLink}`);
                }
            } catch (err) {
                console.error(`[Video] ⚠️ Erro relatório Drive`);
            }
        }
    }

    private async handleCompletedVideoFollowUp(sourceId: string, input: SpecialistInput): Promise<SpecialistOutput | null> {
        const text = input.text.toLowerCase().trim();
        const completed = this.completedVideos.get(sourceId);
        if (!completed) return null;

        const wantsDrive = text.includes('drive') && (
            text.includes('salv') ||
            text.includes('guard') ||
            text.includes('sub') ||
            text.includes('manda') ||
            text.includes('envia') ||
            text.includes('link')
        );

        if (!wantsDrive) return null;

        const dService = input.driveService ?? this.drive;
        for (const clip of completed.clips) {
            if (clip.driveLink || !clip.path || !dService) continue;
            try {
                const uploadRes = await dService.saveVideoAsset(`${clip.name}-${Date.now()}.mp4`, clip.path, 'video/mp4');
                clip.driveLink = uploadRes.webViewLink;
                clip.uploadError = undefined;
                try { unlinkSync(clip.path); } catch { /* ignore */ }
                clip.path = undefined;
                if (clip.srtPath) {
                    try { unlinkSync(clip.srtPath); } catch { /* ignore */ }
                    clip.srtPath = undefined;
                }
            } catch (err) {
                clip.uploadError = err instanceof Error ? err.message : String(err);
            }
        }

        const links = completed.clips.filter(clip => clip.driveLink);
        if (links.length > 0) {
            return {
                text: `✅ Upload confirmado no Google Drive.\n\n${links.map(clip => `- ${clip.name}: ${clip.driveLink}`).join('\n')}`
            };
        }

        const firstError = completed.clips.find(clip => clip.uploadError)?.uploadError;
        if (!dService) {
            return {
                text: '⚠️ O Drive não está configurado nesta execução do Video Agent. Não vou confirmar upload sem link real.'
            };
        }

        return {
            text: `⚠️ Eu não consegui confirmar o upload do vídeo no Drive. Não vou afirmar que salvou sem link real.${firstError ? `\n\nErro: ${firstError}` : ''}`
        };
    }

    // ─── Helpers ───────────────────────────────────────────

    private parseTimeStr(timeStr: string): number {
        const parts = timeStr.trim().split(':').map(Number);
        if (parts.length === 3) return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
        if (parts.length === 2) return parts[0]! * 60 + parts[1]!;
        return Number(timeStr) || 0;
    }

    private parseCuts(text: string): CutDefinition[] {
        const match = text.match(/```cuts\s*([\s\S]*?)```/);
        if (!match) {
            console.log('[Video] ⚠️ Nenhum bloco ```cuts``` encontrado na resposta');
            return [];
        }
        try {
            const cuts = JSON.parse(match[1]!) as CutDefinition[];
            return cuts.filter(c => c.name && c.start && c.end);
        } catch (err) {
            console.error('[Video] ❌ Erro ao parsear cortes JSON:', err);
            return [];
        }
    }

    private runFFmpeg(
        inputPath: string,
        outputPath: string,
        start: string,
        end: string,
        header?: string,
        srtPath?: string
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const filters: string[] = [];

            // Header bar no topo do vídeo
            if (header) {
                const safeHeader = header.replace(/'/g, '').replace(/:/g, ' ');
                filters.push(
                    `drawbox=x=0:y=0:w=iw:h=50:color=black@0.7:t=fill`,
                    `drawtext=text='${safeHeader}':fontsize=24:fontcolor=white:x=(w-text_w)/2:y=15`
                );
            }

            // Helper para quebrar texto em linhas de max 35 caracteres
            const maxChars = 35;
            const splitTextIntoLines = (text: string): string[] => {
                const words = text.split(' ');
                const lines: string[] = [];
                let currentLine = '';
                for (const word of words) {
                    if ((currentLine + word).length > maxChars) {
                        lines.push(currentLine.trim());
                        currentLine = word + ' ';
                    } else {
                        currentLine += word + ' ';
                    }
                }
                if (currentLine.trim()) lines.push(currentLine.trim());
                return lines;
            };

            // Legendas - lê SRT e gera drawtext entries (agora suportado via ffmpeg-static)
            if (srtPath) {
                try {
                    const srtContent = readFileSync(srtPath, 'utf-8');
                    const subs = this.parseSRT(srtContent);
                    const startOffsetSec = this.parseTimeStr(start);

                    for (const sub of subs) {
                        // Removemos caracteres que quebram o parser do filtro do FFmpeg (aspas, dois pontos, vírgulas, quebras de linha)
                        const safeText = sub.text.replace(/[':,]/g, '').replace(/\n/g, ' ').trim();
                        const lines = splitTextIntoLines(safeText);

                        // O FFmpeg entende o 't' do drawtext como o tempo absoluto do arquivo de origem (se -ss estiver depois do input).
                        // Como pedimos legendas relativas ao corte, precisamos adicionar o offset inicial do corte:
                        const tStart = sub.startSec + startOffsetSec;
                        const tEnd = sub.endSec + startOffsetSec;

                        // Desenha cada linha empilhada de baixo pra cima
                        // A última linha fica em h-60, a penúltima em h-90, etc.
                        lines.reverse().forEach((lineText, i) => {
                            const yPos = `h-${60 + (i * 30)}`;
                            filters.push(
                                `drawtext=text='${lineText}':fontsize=20:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=${yPos}:enable='between(t,${tStart},${tEnd})'`
                            );
                        });
                    }
                } catch (err) {
                    console.error(`[Video] ⚠️ Erro ao ler SRT: ${err}`);
                }
            }



            const args = [
                '-i', inputPath,
                '-ss', start,
                '-to', end,
            ];

            if (filters.length > 0) {
                args.push('-vf', filters.join(','));
            }

            args.push(
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '23',
                '-c:a', 'aac',
                '-b:a', '128k',
                '-y',
                outputPath
            );

            console.log(`[Video] 🔧 ffmpeg (static) -ss ${start} -to ${end}`);

            // Usa o ffmpegPath do ffmpeg-static (já inclui freetype) em vez do ffmpeg global do sistema
            const binPath = ffmpegPath as unknown as string;
            if (!binPath) {
                reject(new Error("ffmpeg-static binary path not found."));
                return;
            }

            execFile(binPath, args, { timeout: 180000 }, (error, _stdout, stderr) => {
                if (error) {
                    reject(new Error(`FFmpeg: ${error.message}\n${stderr}`));
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Parse SRT content to extract subtitle entries with timestamps in seconds.
     */
    private parseSRT(content: string): { text: string; startSec: number; endSec: number }[] {
        const blocks = content.trim().split(/\n\n+/);
        const result: { text: string; startSec: number; endSec: number }[] = [];

        for (const block of blocks) {
            const lines = block.trim().split('\n');
            if (lines.length < 3) continue;

            const timeLine = lines[1];
            if (!timeLine) continue;
            const match = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),\d+\s*-->\s*(\d{2}):(\d{2}):(\d{2}),\d+/);
            if (!match) continue;

            const startSec = parseInt(match[1]!) * 3600 + parseInt(match[2]!) * 60 + parseInt(match[3]!);
            const endSec = parseInt(match[4]!) * 3600 + parseInt(match[5]!) * 60 + parseInt(match[6]!);
            const text = lines.slice(2).join(' ');

            result.push({ text, startSec, endSec });
        }

        return result;
    }

    /**
     * Gera arquivo SRT a partir dos subtítulos definidos pelo LLM.
     */
    private generateSRT(subtitles: { start: string; end: string; text: string }[], outputPath: string): void {
        const lines: string[] = [];
        subtitles.forEach((sub, i) => {
            const startSrt = sub.start.length <= 5 ? `00:${sub.start},000` : `${sub.start},000`;
            const endSrt = sub.end.length <= 5 ? `00:${sub.end},000` : `${sub.end},000`;
            lines.push(`${i + 1}`);
            lines.push(`${startSrt} --> ${endSrt}`);
            lines.push(sub.text);
            lines.push('');
        });
        writeFileSync(outputPath, lines.join('\n'), 'utf-8');
        console.log(`[Video] 📝 SRT gerado: ${outputPath} (${subtitles.length} legendas)`);
    }

    private async downloadFileToPath(url: string, outputPath: string): Promise<number> {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Download falhou: ${res.status} ${res.statusText}`);
        if (!res.body) throw new Error('Download retornou body vazio.');

        await pipeline(Readable.fromWeb(res.body as any), createWriteStream(outputPath));
        return statSync(outputPath).size;
    }

    private async uploadToAssemblyAIFromPath(filePath: string): Promise<string> {
        const requestInit = {
            method: 'POST',
            headers: {
                'Authorization': this.assemblyaiKey,
                'Content-Type': 'application/octet-stream',
            },
            duplex: 'half',
            body: createReadStream(filePath) as any,
        } as RequestInit & { duplex: 'half' };

        const res = await fetch('https://api.assemblyai.com/v2/upload', requestInit);
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`AssemblyAI upload: ${res.status} — ${errText}`);
        }
        return ((await res.json()) as { upload_url: string }).upload_url;
    }

    private async transcribe(
        audioUrl: string,
        progress?: (msg: string) => Promise<void>
    ): Promise<string> {
        let result = await this.submitAndPoll(audioUrl, 'universal-3-pro', progress);
        if (!result || result.trim() === '') {
            console.log('[Video] ⚠️ Vazio com universal-3-pro, tentando universal-2...');
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
            headers: { 'Authorization': this.assemblyaiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio_url: audioUrl, speech_models: [model], language_code: 'pt', speaker_labels: true }),
        });
        if (!submitRes.ok) {
            const errText = await submitRes.text();
            throw new Error(`AssemblyAI submit: ${submitRes.status} — ${errText}`);
        }
        const { id: transcriptId } = await submitRes.json() as { id: string };
        console.log(`[Video] 📋 ID: ${transcriptId} (${model})`);

        for (let i = 0; i < 120; i++) {
            await new Promise(r => setTimeout(r, 5000));
            const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
                headers: { 'Authorization': this.assemblyaiKey },
            });
            if (!pollRes.ok) continue;
            const data = await pollRes.json() as {
                status: string; text?: string;
                utterances?: { speaker: string; text: string; start: number; end: number }[];
            };
            if (data.status === 'processing' || data.status === 'queued') {
                const elapsed = (i + 1) * 5;
                if (elapsed % 30 === 0) {
                    console.log(`[Video] ⏳ ${elapsed}s...`);
                    if (progress) await progress(`⏳ Transcrevendo... (${elapsed}s)`);
                }
                continue;
            }
            if (data.status === 'completed') {
                if (data.utterances && data.utterances.length > 0) {
                    return data.utterances.map(u => {
                        const s = this.fmtTime(u.start), e = this.fmtTime(u.end);
                        return `[${s}–${e}] Speaker ${u.speaker}: ${u.text}`;
                    }).join('\n');
                }
                return data.text ?? '';
            }
            if (data.status === 'error') throw new Error('Transcrição falhou no AssemblyAI');
        }
        throw new Error('Timeout (10 min)');
    }

    private fmtTime(ms: number): string {
        const s = Math.floor(ms / 1000);
        return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
    }
}
