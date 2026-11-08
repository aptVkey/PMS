"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { CASH_COST_TYPES, CASH_TRANSACTION_TYPES } from "@/lib/cash";
import { getReceiptExtractor } from "@/lib/ai";

const TransactionSchema = z.object({
  type: z.enum(CASH_TRANSACTION_TYPES, { error: "Tipo inválido." }),
  amount: z.coerce
    .number({ error: "Valor inválido." })
    .positive({ error: "O valor tem de ser maior que zero." }),
  category: z.string().optional(),
  description: z.string().optional(),
  transactionDate: z.string().min(1, { error: "A data é obrigatória." }),
  receiptPath: z.string().optional(),
  costType: z.enum(CASH_COST_TYPES).optional(),
});

export type TransactionFormState =
  { error: string } | { success: true } | undefined;

export async function saveTransaction(
  _prevState: TransactionFormState,
  formData: FormData,
): Promise<TransactionFormState> {
  const denied = await requirePermission("caixa");
  if (denied) return denied;

  const parsed = TransactionSchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    category: formData.get("category") || undefined,
    description: formData.get("description") || undefined,
    transactionDate: formData.get("transactionDate"),
    receiptPath: formData.get("receiptPath") || undefined,
    costType: formData.get("costType") || undefined,
  });

  if (!parsed.success) {
    return { error: "Verifica os campos assinalados e tenta novamente." };
  }

  const supabase = await createClient();

  const payload = {
    type: parsed.data.type,
    amount: parsed.data.amount,
    category: parsed.data.category || null,
    description: parsed.data.description || null,
    transaction_date: parsed.data.transactionDate,
    receipt_path: parsed.data.receiptPath || null,
    // Só faz sentido classificar COGS/OPEX numa saída — uma entrada nunca
    // deve ficar com isto preenchido, nem que o formulário o tenha enviado.
    cost_type:
      parsed.data.type === "saida" ? (parsed.data.costType ?? "opex") : null,
  };

  const id = formData.get("id");
  const { error } = id
    ? await supabase
        .from("cash_transactions")
        .update(payload)
        .eq("id", String(id))
    : await supabase.from("cash_transactions").insert(payload);

  if (error) {
    return {
      error: "Não foi possível guardar o movimento. Tenta novamente.",
    };
  }

  revalidatePath("/caixa");
  return { success: true };
}

export async function deleteTransaction(
  transactionId: string,
): Promise<{ error: string } | { success: true }> {
  const denied = await requirePermission("caixa");
  if (denied) return denied;

  const supabase = await createClient();

  const { data: transaction } = await supabase
    .from("cash_transactions")
    .select("receipt_path")
    .eq("id", transactionId)
    .maybeSingle();

  const { error } = await supabase
    .from("cash_transactions")
    .delete()
    .eq("id", transactionId);

  if (error) {
    return {
      error: "Não foi possível eliminar o movimento. Tenta novamente.",
    };
  }

  if (transaction?.receipt_path) {
    await supabase.storage
      .from("cash-receipts")
      .remove([transaction.receipt_path]);
  }

  revalidatePath("/caixa");
  return { success: true };
}

export type ReceiptExtractionResult =
  | { error: string }
  | {
      success: true;
      amount: number | null;
      category: string | null;
      date: string | null;
      description: string | null;
    };

export async function extractReceiptData(
  path: string,
  mimeType: string,
): Promise<ReceiptExtractionResult> {
  const denied = await requirePermission("caixa");
  if (denied) return denied;

  const extractor = await getReceiptExtractor();
  if (!extractor) {
    return {
      error:
        "A deteção por IA não está configurada. Liga a Anthropic ou a Gemini em Integrações.",
    };
  }

  const supabase = await createClient();

  const { data: blob, error: downloadError } = await supabase.storage
    .from("cash-receipts")
    .download(path);

  if (downloadError || !blob) {
    return { error: "Não foi possível ler o ficheiro enviado." };
  }

  const { data: existing } = await supabase
    .from("cash_transactions")
    .select("category")
    .not("category", "is", null);

  const categoryHints = Array.from(
    new Set((existing ?? []).map((row) => row.category as string)),
  );

  try {
    const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
    const extraction = await extractor.extract(base64, mimeType, categoryHints);
    return { success: true, ...extraction };
  } catch {
    return { error: "Não foi possível analisar o ficheiro. Tenta novamente." };
  }
}
