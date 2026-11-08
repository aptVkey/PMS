"use server";

import { z } from "zod";
import { getSessionPermissions } from "@/lib/permissions";
import { runAssistant } from "@/lib/assistant/chat";

const MessagesSchema = z
  .array(
    z.object({
      role: z.enum(["user", "assistant"]),
      text: z.string().min(1).max(2000),
    }),
  )
  .min(1)
  .max(20);

// Limite simples por utilizador (em memória): protege a quota da Gemini de
// loops e cliques repetidos. Em vários servidores cada um tem o seu contador.
const recent = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 15;

function rateLimited(userId: string): boolean {
  const now = Date.now();
  const hits = (recent.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) {
    recent.set(userId, hits);
    return true;
  }
  recent.set(userId, [...hits, now]);
  return false;
}

export async function askAssistant(
  messages: { role: "user" | "assistant"; text: string }[],
): Promise<{ answer: string } | { error: string }> {
  const { userId, permissions } = await getSessionPermissions();
  if (!userId) {
    return { error: "Sessão inválida. Inicia sessão novamente." };
  }

  const parsed = MessagesSchema.safeParse(messages);
  if (!parsed.success || parsed.data[parsed.data.length - 1].role !== "user") {
    return { error: "Mensagem inválida." };
  }

  if (rateLimited(userId)) {
    return { error: "Demasiados pedidos seguidos. Aguarda um minuto." };
  }

  return runAssistant(parsed.data, permissions);
}
