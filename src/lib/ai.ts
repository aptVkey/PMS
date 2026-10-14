import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { readIntegrationSecret } from "@/lib/integrations";

export const ANTHROPIC_API_KEY = "anthropic_api_key";

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
