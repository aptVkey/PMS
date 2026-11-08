// Constantes partilhadas entre servidor e cliente (src/lib/ai.ts é só servidor).
export const AI_PROVIDERS = ["anthropic", "gemini"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  anthropic: "Anthropic (Claude)",
  gemini: "Google Gemini",
};
