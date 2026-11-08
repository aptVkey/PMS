import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { readIntegrationSecret } from "@/lib/integrations";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AiProvider } from "@/lib/ai-providers";

export const ANTHROPIC_API_KEY = "anthropic_api_key";
export const GEMINI_API_KEY = "gemini_api_key";

// Modelo da Gemini (leitura de faturas e assistente). Usa o alias "latest"
// porque a Google retira modelos fixos (o gemini-2.5-flash já dá 404 em contas
// novas). A variante "lite" responde em <1 s; o "flash" normal chega a passar
// dos 50 s por causa do raciocínio, o que não serve para um chat.
export const GEMINI_MODEL = "gemini-flash-lite-latest";
export const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta";

export async function createAnthropicClient(): Promise<Anthropic | null> {
  const apiKey =
    (await readIntegrationSecret(ANTHROPIC_API_KEY)) ??
    process.env.ANTHROPIC_API_KEY ??
    null;

  if (!apiKey) return null;

  return new Anthropic({ apiKey });
}

export type ReceiptExtraction = {
  amount: number | null;
  category: string | null;
  date: string | null;
  description: string | null;
};

const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

// Extrai valor, categoria, data e uma descrição curta de uma foto ou PDF de
// fatura/recibo. `categoryHints` são as categorias já usadas pelo negócio,
// para a IA preferir reutilizá-las a inventar uma nova.
export async function extractReceiptFields(
  client: Anthropic,
  base64: string,
  mimeType: string,
  categoryHints: string[],
): Promise<ReceiptExtraction> {
  const isPdf = mimeType === "application/pdf";
  if (!isPdf && !SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
    throw new Error("Tipo de ficheiro não suportado.");
  }

  const documentBlock = isPdf
    ? ({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      } as const)
    : ({
        type: "image",
        source: {
          type: "base64",
          media_type: mimeType as
            "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: base64,
        },
      } as const);

  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    tools: [
      {
        name: "record_expense",
        description:
          "Regista os dados extraídos de uma fatura ou recibo de despesa.",
        input_schema: {
          type: "object",
          properties: {
            amount: {
              type: ["number", "null"],
              description:
                "Valor total pago, em euros. null se não for legível.",
            },
            category: {
              type: ["string", "null"],
              description:
                "Categoria curta da despesa, em português. Reutiliza uma das categorias existentes se fizer sentido, senão sugere uma nova curta.",
            },
            date: {
              type: ["string", "null"],
              description:
                "Data da despesa no formato YYYY-MM-DD. null se não for legível.",
            },
            description: {
              type: ["string", "null"],
              description:
                "Descrição curta (fornecedor e/ou itens principais), até ~60 caracteres.",
            },
          },
          required: ["amount", "category", "date", "description"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "record_expense" },
    messages: [
      {
        role: "user",
        content: [
          documentBlock,
          {
            type: "text",
            text:
              "Extrai os dados desta fatura ou recibo de despesa." +
              (categoryHints.length > 0
                ? ` Categorias já usadas neste negócio: ${categoryHints.join(", ")}.`
                : ""),
          },
        ],
      },
    ],
  });

  const toolUse = message.content.find(
    (block) => block.type === "tool_use" && block.name === "record_expense",
  );

  if (!toolUse || toolUse.type !== "tool_use") {
    return { amount: null, category: null, date: null, description: null };
  }

  const input = toolUse.input as Record<string, unknown>;
  return {
    amount: typeof input.amount === "number" ? input.amount : null,
    category: typeof input.category === "string" ? input.category : null,
    date: typeof input.date === "string" ? input.date : null,
    description:
      typeof input.description === "string" ? input.description : null,
  };
}

// ---------- Google Gemini ----------

// Confirma a chave com um pedido barato (lista de modelos).
export async function verifyGeminiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${GEMINI_API}/models?pageSize=1`, {
      headers: { "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(15_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function extractReceiptFieldsGemini(
  apiKey: string,
  base64: string,
  mimeType: string,
  categoryHints: string[],
): Promise<ReceiptExtraction> {
  // A Gemini não lê GIF; os restantes formatos são os mesmos.
  const supported = [...SUPPORTED_IMAGE_TYPES, "application/pdf"].filter(
    (type) => type !== "image/gif",
  );
  if (!supported.includes(mimeType)) {
    throw new Error("Tipo de ficheiro não suportado.");
  }

  const response = await fetch(
    `${GEMINI_API}/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "content-type": "application/json",
      },
      signal: AbortSignal.timeout(60_000),
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: mimeType, data: base64 } },
              {
                text:
                  "Extrai os dados desta fatura ou recibo de despesa." +
                  (categoryHints.length > 0
                    ? ` Categorias já usadas neste negócio: ${categoryHints.join(", ")}.`
                    : ""),
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              amount: {
                type: "NUMBER",
                nullable: true,
                description:
                  "Valor total pago, em euros. null se não for legível.",
              },
              category: {
                type: "STRING",
                nullable: true,
                description:
                  "Categoria curta da despesa, em português. Reutiliza uma das categorias existentes se fizer sentido, senão sugere uma nova curta.",
              },
              date: {
                type: "STRING",
                nullable: true,
                description:
                  "Data da despesa no formato YYYY-MM-DD. null se não for legível.",
              },
              description: {
                type: "STRING",
                nullable: true,
                description:
                  "Descrição curta (fornecedor e/ou itens principais), até ~60 caracteres.",
              },
            },
            required: ["amount", "category", "date", "description"],
          },
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini respondeu ${response.status}.`);
  }

  const json = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return { amount: null, category: null, date: null, description: null };
  }

  const input = JSON.parse(text) as Record<string, unknown>;
  return {
    amount: typeof input.amount === "number" ? input.amount : null,
    category: typeof input.category === "string" ? input.category : null,
    date: typeof input.date === "string" ? input.date : null,
    description:
      typeof input.description === "string" ? input.description : null,
  };
}

// ---------- Escolha do fornecedor ----------

export async function getGeminiApiKey(): Promise<string | null> {
  return (
    (await readIntegrationSecret(GEMINI_API_KEY)) ??
    process.env.GEMINI_API_KEY ??
    null
  );
}

export type ReceiptExtractor = {
  provider: AiProvider;
  extract: (
    base64: string,
    mimeType: string,
    categoryHints: string[],
  ) => Promise<ReceiptExtraction>;
};

// Devolve o extrator do fornecedor escolhido em Integrações; se não houver
// escolha (ou o escolhido já não tem chave), usa o primeiro configurado.
export async function getReceiptExtractor(): Promise<ReceiptExtractor | null> {
  const admin = createAdminClient();
  const { data: settings } = admin
    ? await admin
        .from("integration_settings")
        .select("ai_provider")
        .eq("id", true)
        .maybeSingle()
    : { data: null };

  const preferred = (settings?.ai_provider as AiProvider | null) ?? null;

  const anthropic = await createAnthropicClient();
  const geminiKey = await getGeminiApiKey();

  const anthropicExtractor: ReceiptExtractor | null = anthropic
    ? {
        provider: "anthropic",
        extract: (base64, mimeType, hints) =>
          extractReceiptFields(anthropic, base64, mimeType, hints),
      }
    : null;
  const geminiExtractor: ReceiptExtractor | null = geminiKey
    ? {
        provider: "gemini",
        extract: (base64, mimeType, hints) =>
          extractReceiptFieldsGemini(geminiKey, base64, mimeType, hints),
      }
    : null;

  if (preferred === "gemini" && geminiExtractor) return geminiExtractor;
  if (preferred === "anthropic" && anthropicExtractor) {
    return anthropicExtractor;
  }
  return anthropicExtractor ?? geminiExtractor;
}
