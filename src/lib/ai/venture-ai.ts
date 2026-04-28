import Anthropic from "@anthropic-ai/sdk";
import type { VentureAIProfile } from "@/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Eres Venture AI, el asesor inteligente de negocios de Mundo Academy.
Actúas como el CFO + CMO + estratega que el emprendedor latinoamericano nunca pudo pagar.
Respondes siempre en español, de forma directa, con ejemplos concretos y acciones específicas.
Conoces el mercado latinoamericano profundamente: México, Colombia, Argentina, España.
Cuando das consejos, siempre incluyes: 1) acción concreta, 2) métrica de éxito, 3) plazo realista.`;

export async function chatWithVentureAI(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  profile?: Partial<VentureAIProfile>
) {
  const contextBlock = profile
    ? `\n\nPerfil del emprendedor:\n${JSON.stringify(profile, null, 2)}`
    : "";

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT + contextBlock,
    messages,
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

export async function generateBusinessPlan(idea: string, target: string, price: string) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Genera un plan de negocio estructurado para:
Idea: ${idea}
Público objetivo: ${target}
Precio estimado: ${price}

Incluye:
1. Nombre y tagline sugerido
2. Propuesta de valor en una oración
3. Estructura del producto (módulos o tiers)
4. Precio recomendado con benchmark del mercado
5. Plan de lanzamiento de 30 días (semana a semana)
6. 3 riesgos principales y cómo mitigarlos`,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

export async function calculateEntrepreneurScore(profile: VentureAIProfile) {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Dado este perfil de emprendedor, calcula un score del 0-100 y devuelve JSON:
${JSON.stringify(profile, null, 2)}

Responde SOLO con JSON válido:
{
  "score": <número>,
  "breakdown": {
    "idea_clarity": <0-20>,
    "market_fit": <0-20>,
    "execution_capacity": <0-20>,
    "financial_readiness": <0-20>,
    "network_leverage": <0-20>
  },
  "top_strengths": ["...", "..."],
  "critical_gaps": ["...", "..."],
  "next_3_actions": ["...", "...", "..."]
}`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  return JSON.parse(text);
}
