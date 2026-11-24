import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";
import type { CashTransaction } from "@/lib/cash";
import { CaixaClient } from "./caixa-client";

export default async function CaixaPage() {
  const supabase = await createClient();

  const { data: transactions } = await fetchAll((from, to) =>
    supabase
      .from("cash_transactions")
      .select("*")
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to),
  );

  const list = (transactions as CashTransaction[]) ?? [];

  const receiptPaths = list
    .map((t) => t.receipt_path)
    .filter((path): path is string => !!path);

  const receiptUrls: Record<string, string> = {};
  if (receiptPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("cash-receipts")
      .createSignedUrls(receiptPaths, 3600);
    for (const entry of signed ?? []) {
      if (entry.signedUrl && entry.path)
        receiptUrls[entry.path] = entry.signedUrl;
    }
  }

  return <CaixaClient transactions={list} receiptUrls={receiptUrls} />;
}
