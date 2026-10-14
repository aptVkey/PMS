export const CASH_TRANSACTION_TYPES = ["entrada", "saida"] as const;
export type CashTransactionType = (typeof CASH_TRANSACTION_TYPES)[number];

export const CASH_TRANSACTION_TYPE_LABELS: Record<CashTransactionType, string> =
  {
    entrada: "Entrada",
    saida: "Saída",
  };

export const CASH_TRANSACTION_TYPE_STYLES: Record<CashTransactionType, string> =
  {
    entrada: "bg-success/10 text-success",
    saida: "bg-error/10 text-error",
  };

// Só se aplica a saídas — distingue custo direto de uma estadia (COGS) de
// despesa operacional do negócio (OPEX), para a Margem Bruta ser um número
// real. Ver migração cash_transaction_cost_type.
export const CASH_COST_TYPES = ["cogs", "opex"] as const;
export type CashCostType = (typeof CASH_COST_TYPES)[number];

export const CASH_COST_TYPE_LABELS: Record<CashCostType, string> = {
  cogs: "Custo direto (COGS)",
  opex: "Despesa operacional",
};

export type CashTransaction = {
  id: string;
  type: CashTransactionType;
  amount: number;
  category: string | null;
  description: string | null;
  transaction_date: string;
  cost_type: CashCostType | null;
  receipt_path: string | null;
  // Preenchido automaticamente quando o movimento veio de uma reserva
  // concluída (ver trigger sync_booking_cash_transaction) — null nos
  // movimentos manuais.
  booking_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
