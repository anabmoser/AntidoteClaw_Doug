/**
 * GravityClaw — Prompt Injection Defense
 *
 * Detecta e bloqueia tentativas de prompt injection em mensagens de entrada.
 * Usa detecção de padrões em múltiplas camadas:
 *   1. Padrões suspeitsos conhecidos (regex)
 *   2. Análise heurística de conteúdo
 *   3. Sanitização do texto
 */

import type { SecurityScanResult } from './types.js';

// ─── Padrões suspeitos conhecidos ──────────────────────────────

const INJECTION_PATTERNS: { pattern: RegExp; threat: string }[] = [
    {
        pattern: /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|directions?)/i,
        threat: 'Tentativa de ignorar instruções anteriores',
    },
    {
        pattern: /you\s+are\s+now\s+(a|an)\s+/i,
        threat: 'Tentativa de redefinir identidade do agente',
    },
    {
        pattern: /system\s*prompt/i,
        threat: 'Referência ao system prompt',
    },
    {
        pattern: /\bDAN\b.*\bmode\b/i,
        threat: 'Tentativa de ativação do modo DAN (jailbreak)',
    },
    {
        pattern: /pretend\s+(to\s+be|you\s+are|that)/i,
        threat: 'Tentativa de roleplay malicioso',
    },
    {
        pattern: /from\s+now\s+on\s+(you|ignore|forget|disregard)/i,
        threat: 'Tentativa de redefinição de regras',
    },
    {
        pattern: /\[SYSTEM\]|\[ADMIN\]|\[OVERRIDE\]/i,
        threat: 'Tags falsas de sistema/admin',
    },
    {
        pattern: /reveal\s+(your|the)\s+(system|secret|internal|hidden)/i,
        threat: 'Tentativa de extrair informações internas',
    },
    {
        pattern: /base64|eval\s*\(|exec\s*\(/i,
        threat: 'Tentativa de execução de código',
    },
    {
        pattern: /disregard\s+all/i,
        threat: 'Tentativa de descartar todas as regras',
    },
];

// ─── Heurísticas adicionais ────────────────────────────────────

function heuristicAnalysis(text: string): string[] {
    const threats: string[] = [];

    // Texto muito longo com instruções embutidas
    if (text.length > 3000 && /instruc|prompt|rules/i.test(text)) {
        threats.push('Mensagem excessivamente longa com referências a instruções');
    }

    // Uso excessivo de caracteres de markup
    const markupChars = (text.match(/[<>\[\]{}]/g) ?? []).length;
    if (markupChars > 20) {
        threats.push('Uso excessivo de caracteres de markup/formatação');
    }

    // Múltiplas quebras de linha com "instruções" intercaladas
    const lineBreaks = text.split('\n').length;
    if (lineBreaks > 20 && /step\s+\d|instruc/i.test(text)) {
        threats.push('Estrutura multi-linha suspeita com instruções numeradas');
    }

    return threats;
}

// ─── Scanner Principal ─────────────────────────────────────────

/**
 * Analisa uma mensagem de entrada em busca de tentativas de prompt injection.
 */
export function scanForInjection(text: string): SecurityScanResult {
    const threats: string[] = [];

    // Camada 1: Padrões conhecidos
    for (const { pattern, threat } of INJECTION_PATTERNS) {
        if (pattern.test(text)) {
            threats.push(threat);
        }
    }

    // Camada 2: Heurísticas
    threats.push(...heuristicAnalysis(text));

    // Calcular confiança
    const confidence = threats.length === 0
        ? 1.0
        : Math.max(0, 1.0 - threats.length * 0.2);

    // Sanitização básica: remove tags falsas
    const sanitized = text
        .replace(/\[SYSTEM\]|\[ADMIN\]|\[OVERRIDE\]/gi, '[BLOQUEADO]')
        .replace(/<!--[\s\S]*?-->/g, ''); // remove comentários HTML ocultos

    return {
        isSafe: threats.length === 0,
        threats,
        sanitizedContent: sanitized,
        confidence,
    };
}

/**
 * Verifica se o input é seguro. Se não for, retorna um aviso.
 * Use como middleware antes de enviar ao LLM.
 */
export function enforceInputSafety(text: string): { safe: boolean; warning?: string; cleanText: string } {
    const result = scanForInjection(text);

    if (result.isSafe) {
        return { safe: true, cleanText: text };
    }

    const warning = `⚠️ Alerta de segurança: ${result.threats.length} ameaça(s) detectada(s):\n` +
        result.threats.map((t, i) => `  ${i + 1}. ${t}`).join('\n');

    return {
        safe: false,
        warning,
        cleanText: result.sanitizedContent ?? text,
    };
}
