"use client";

import { useState } from "react";
import { Link2, Paperclip, Pencil, Trash2 } from "lucide-react";
import {
  CASH_TRANSACTION_TYPE_LABELS,
  CASH_TRANSACTION_TYPE_STYLES,
  type CashTransaction,
} from "@/lib/cash";
import { formatCurrency } from "@/lib/reporting";
import { TransactionFormModal } from "./transaction-form-modal";
import { ConfirmDeleteModal } from "./confirm-delete-modal";
import { ModalPortal } from "@/components/modal-portal";

export function TransactionRow({
  transaction,
  receiptUrl,
}: {
  transaction: CashTransaction;
  receiptUrl: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <>
      <tr className="border-b border-border last:border-0">
        <td className="whitespace-nowrap px-4 py-3 text-body text-ink-muted">
          {new Date(transaction.transaction_date).toLocaleDateString("pt-PT")}
        </td>
        <td className="whitespace-nowrap px-4 py-3">
          <span
            className={`rounded-pill px-2 py-0.5 text-[12px] font-semibold ${CASH_TRANSACTION_TYPE_STYLES[transaction.type]}`}
          >
            {CASH_TRANSACTION_TYPE_LABELS[transaction.type]}
          </span>
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-body text-ink-muted">
          {transaction.category ?? "—"}
        </td>
        <td className="px-4 py-3 text-body text-ink-muted">
          <div className="flex items-center gap-2">
            <span>{transaction.description ?? "—"}</span>
            {transaction.booking_id && (
              <span
                title="Gerado automaticamente pela reserva ao concluir o checkout"
                className="text-ink-subdued"
              >
                <Link2 className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
            )}
            {receiptUrl && (
              <a
                href={receiptUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Ver fatura anexada"
                title="Ver fatura anexada"
                className="text-ink-subdued hover:text-ink"
              >
                <Paperclip className="h-3.5 w-3.5" strokeWidth={2} />
              </a>
            )}
          </div>
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-right">
          <span
            className={`text-body font-semibold ${transaction.type === "entrada" ? "text-success" : "text-error"}`}
          >
            {transaction.type === "entrada" ? "+" : "-"}
            {formatCurrency(transaction.amount)}
          </span>
        </td>
        <td className="whitespace-nowrap px-4 py-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Editar movimento"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink transition-colors duration-fast ease-standard hover:bg-surface-1"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => setDeleting(true)}
              aria-label="Eliminar movimento"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-error transition-colors duration-fast ease-standard hover:bg-error/10"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        </td>
      </tr>

      <ModalPortal>
        {editing && (
          <TransactionFormModal
            transaction={transaction}
            receiptUrl={receiptUrl}
            onClose={() => setEditing(false)}
          />
        )}
        {deleting && (
          <ConfirmDeleteModal
            transaction={transaction}
            onClose={() => setDeleting(false)}
          />
        )}
      </ModalPortal>
    </>
  );
}
