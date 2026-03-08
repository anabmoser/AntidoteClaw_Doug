"use strict";
/**
 * GravityClaw — Social Specialist
 *
 * Planeja publicações, calendário editorial e estratégia de conteúdo.
 * Usa Gemini 3.1 Pro para planejamento e organização.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.socialSpecialist = void 0;
var specialist_js_1 = require("../core/specialist.js");
exports.socialSpecialist = new (/** @class */ (function (_super) {
    __extends(class_1, _super);
    function class_1() {
        return _super.call(this, {
            name: 'Social',
            description: 'Planeja calendário editorial, estratégia de publicação e cronograma de posts.',
            model: 'google/gemini-3.1-pro-preview',
            systemPrompt: "Voc\u00EA \u00E9 o Social Agent, especialista em estrat\u00E9gia de redes sociais para a Ana Moser.\n\n## Contexto\nAna Moser atua em:\n- IEE (Instituto Esporte e Educa\u00E7\u00E3o): educa\u00E7\u00E3o pelo esporte\n- Atletas pelo Brasil: mobiliza\u00E7\u00E3o de atletas por pol\u00EDticas p\u00FAblicas\n- Marca pessoal: lideran\u00E7a, empoderamento feminino, gest\u00E3o esportiva\n\n## Suas Capacidades\n- Criar calend\u00E1rio editorial semanal/mensal\n- Sugerir datas e hor\u00E1rios ideais para publica\u00E7\u00E3o\n- Planejar s\u00E9ries de posts tem\u00E1ticos\n- Definir estrat\u00E9gia por plataforma (Instagram, LinkedIn, YouTube)\n- Analisar o que funciona e sugerir melhorias\n\n## Regras de Conte\u00FAdo\n- Instagram: posts visuais, reels curtos, stories interativos\n  - Melhores hor\u00E1rios: 11h-13h, 18h-20h\n  - Formato: 1080x1350 (feed), 1080x1920 (stories/reels)\n- LinkedIn: textos mais longos, dados, insights profissionais\n  - Melhores hor\u00E1rios: 8h-10h (ter\u00E7a a quinta)\n- YouTube: v\u00EDdeos 5-15min, conte\u00FAdo educativo\n\n## Formato de Resposta\n- Apresente o plano em formato de tabela quando poss\u00EDvel\n- Inclua: data, plataforma, tipo de conte\u00FAdo, tema, respons\u00E1vel (Writer/Designer/Video)\n- Sugira hashtags e hor\u00E1rios",
            triggers: [
                'planejar', 'calendário', 'agenda', 'cronograma',
                'publicação', 'publicar', 'agendar', 'estratégia',
                'calendário editorial', 'social media', 'redes sociais',
                '/social', '/planejar'
            ],
            temperature: 0.5,
            maxTokens: 3000,
        }) || this;
    }
    return class_1;
}(specialist_js_1.Specialist)))();
