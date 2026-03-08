/**
 * GravityClaw — Weather Skill (exemplo)
 *
 * Skill integrada: obtenha o clima atual de qualquer cidade.
 * Usa a API gratuita wttr.in (sem chave de API necessária).
 */

import type { Skill, SkillInput, SkillOutput } from '../../core/types.js';

export const weatherSkill: Skill = {
    name: 'weather',
    description: 'Consulta o clima atual de uma cidade. Uso: /clima <cidade>',
    version: '1.0.0',
    triggers: ['/clima', '/weather', '/tempo'],

    async execute(input: SkillInput): Promise<SkillOutput> {
        const city = input.args.join(' ').trim();

        if (!city) {
            return {
                text: '🌤️ Uso: `/clima São Paulo` ou `/clima Tokyo`',
            };
        }

        try {
            const encodedCity = encodeURIComponent(city);
            const res = await fetch(`https://wttr.in/${encodedCity}?format=j1&lang=pt`);

            if (!res.ok) {
                return { text: `❌ Não foi possível encontrar o clima para "${city}".` };
            }

            const data = await res.json() as {
                current_condition: [{
                    temp_C: string;
                    FeelsLikeC: string;
                    humidity: string;
                    windspeedKmph: string;
                    lang_pt: [{ value: string }];
                }];
                nearest_area: [{ areaName: [{ value: string }]; country: [{ value: string }] }];
            };

            const current = data.current_condition[0];
            const area = data.nearest_area[0];
            if (!current || !area) {
                return { text: `❌ Dados indisponíveis para "${city}".` };
            }

            const condition = current.lang_pt?.[0]?.value ?? 'Desconhecido';

            const text = [
                `🌍 **${area.areaName[0]?.value}, ${area.country[0]?.value}**`,
                ``,
                `🌡️ Temperatura: ${current.temp_C}°C (sensação: ${current.FeelsLikeC}°C)`,
                `☁️ Condição: ${condition}`,
                `💧 Umidade: ${current.humidity}%`,
                `💨 Vento: ${current.windspeedKmph} km/h`,
            ].join('\n');

            return { text };

        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { text: `❌ Erro ao consultar clima: ${msg}` };
        }
    },
};
