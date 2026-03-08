"use strict";
/**
 * GravityClaw — Prompt Injection Defense
 *
 * Detecta e bloqueia tentativas de prompt injection em mensagens de entrada.
 * Usa detecção de padrões em múltiplas camadas:
 *   1. Padrões suspeitsos conhecidos (regex)
 *   2. Análise heurística de conteúdo
 *   3. Sanitização do texto
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanForInjection = scanForInjection;
exports.enforceInputSafety = enforceInputSafety;
// ─── Padrões suspeitos conhecidos ──────────────────────────────
var INJECTION_PATTERNS = [
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
function heuristicAnalysis(text) {
    var _a;
    var threats = [];
    // Texto muito longo com instruções embutidas
    if (text.length > 3000 && /instruc|prompt|rules/i.test(text)) {
        threats.push('Mensagem excessivamente longa com referências a instruções');
    }
    // Uso excessivo de caracteres de markup
    var markupChars = ((_a = text.match(/[<>\[\]{}]/g)) !== null && _a !== void 0 ? _a : []).length;
    if (markupChars > 20) {
        threats.push('Uso excessivo de caracteres de markup/formatação');
    }
    // Múltiplas quebras de linha com "instruções" intercaladas
    var lineBreaks = text.split('\n').length;
    if (lineBreaks > 20 && /step\s+\d|instruc/i.test(text)) {
        threats.push('Estrutura multi-linha suspeita com instruções numeradas');
    }
    return threats;
}
// ─── Scanner Principal ─────────────────────────────────────────
/**
 * Analisa uma mensagem de entrada em busca de tentativas de prompt injection.
 */
function scanForInjection(text) {
    var threats = [];
    // Camada 1: Padrões conhecidos
    for (var _i = 0, INJECTION_PATTERNS_1 = INJECTION_PATTERNS; _i < INJECTION_PATTERNS_1.length; _i++) {
        var _a = INJECTION_PATTERNS_1[_i], pattern = _a.pattern, threat = _a.threat;
        if (pattern.test(text)) {
            threats.push(threat);
        }
    }
    // Camada 2: Heurísticas
    threats.push.apply(threats, heuristicAnalysis(text));
    // Calcular confiança
    var confidence = threats.length === 0
        ? 1.0
        : Math.max(0, 1.0 - threats.length * 0.2);
    // Sanitização básica: remove tags falsas
    var sanitized = text
        .replace(/\[SYSTEM\]|\[ADMIN\]|\[OVERRIDE\]/gi, '[BLOQUEADO]')
        .replace(/<!--[\s\S]*?-->/g, ''); // remove comentários HTML ocultos
    return {
        isSafe: threats.length === 0,
        threats: threats,
        sanitizedContent: sanitized,
        confidence: confidence,
    };
}
/**
 * Verifica se o input é seguro. Se não for, retorna um aviso.
 * Use como middleware antes de enviar ao LLM.
 */
function enforceInputSafety(text) {
    var _a;
    var result = scanForInjection(text);
    if (result.isSafe) {
        return { safe: true, cleanText: text };
    }
    var warning = "\u26A0\uFE0F Alerta de seguran\u00E7a: ".concat(result.threats.length, " amea\u00E7a(s) detectada(s):\n") +
        result.threats.map(function (t, i) { return "  ".concat(i + 1, ". ").concat(t); }).join('\n');
    return {
        safe: false,
        warning: warning,
        cleanText: (_a = result.sanitizedContent) !== null && _a !== void 0 ? _a : text,
    };
}
