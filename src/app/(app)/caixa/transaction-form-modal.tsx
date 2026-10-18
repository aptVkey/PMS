"use client";

import { useActionState, useEffect, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
  Paperclip,
  Sparkles,
  X,
} from "lucide-react";
import { extractReceiptData, saveTransaction } from "./actions";
import type { TransactionFormState } from "./actions";
import { uploadReceipt, ReceiptUploadError } from "./upload-receipt";
import {
  CASH_COST_TYPE_LABELS,
  type CashCostType,
  type CashTransaction,
  type CashTransactionType,
} from "@/lib/cash";
import { todayISO } from "@/lib/date-utils";

const initialState: TransactionFormState = undefined;

const ACCEPTED_TYPES =
  "image/jpeg,image/png,image/gif,image/webp,application/pdf";

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
const labelClasses = "text-body font-semibold text-ink";

type ReceiptStatus = "idle" | "uploading" | "analyzing" | "done" | "error";

export function TransactionFormModal({
  transaction,
  receiptUrl,
  onClose,
}: {
  transaction?: CashTransaction;
  receiptUrl?: string | null;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    saveTransaction,
    initialState,
  );
  const [type, setType] = useState<CashTransactionType>(
    transaction?.type ?? "entrada",
  );
  const [amount, setAmount] = useState(String(transaction?.amount ?? ""));
  const [transactionDate, setTransactionDate] = useState(
    transaction?.transaction_date ?? todayISO(),
  );
  const [category, setCategory] = useState(transaction?.category ?? "");
  const [costType, setCostType] = useState<CashCostType>(
    transaction?.cost_type ?? "opex",
  );
  const [description, setDescription] = useState(
    transaction?.description ?? "",
  );

  const [receiptPath, setReceiptPath] = useState<string | null>(
    transaction?.receipt_path ?? null,
  );
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const [receiptStatus, setReceiptStatus] = useState<ReceiptStatus>("idle");
  const [receiptError, setReceiptError] = useState<string | null>(null);

  useEffect(() => {
    if (state && "success" in state) {
      onClose();
    }
  }, [state, onClose]);

  async function handleFileSelected(file: File | null) {
    if (!file) return;
    setReceiptFileName(file.name);
    setReceiptError(null);
    setReceiptStatus("uploading");

    let path: string;
    try {
      path = await uploadReceipt(file);
    } catch (err) {
      setReceiptStatus("error");
      setReceiptError(
        err instanceof ReceiptUploadError
          ? err.message
          : "Não foi possível enviar o ficheiro.",
      );
      return;
    }

    setReceiptPath(path);
    setReceiptStatus("analyzing");

    const result = await extractReceiptData(path, file.type);
    if ("error" in result) {
      // O ficheiro já ficou anexado — só a deteção automática falhou, o
      // utilizador continua a poder preencher os campos à mão.
      setReceiptStatus("error");
      setReceiptError(result.error);
      return;
    }

    if (result.amount !== null) setAmount(String(result.amount));
    if (result.date !== null) setTransactionDate(result.date);
    if (result.category !== null) setCategory(result.category);
    if (result.description !== null) setDescription(result.description);
    setReceiptStatus("done");
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg bg-canvas shadow-popover ui-form-modal">
        <div className="ui-form-header flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-[18px] font-bold text-ink">
            {transaction ? "Editar movimento" : "Adicionar movimento"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-ink-subdued hover:bg-surface-1"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <form
          action={formAction}
          className="ui-form-scroll flex flex-col gap-5 overflow-y-auto px-6 py-5"
        >
          {transaction && (
            <input type="hidden" name="id" value={transaction.id} />
          )}
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="receiptPath" value={receiptPath ?? ""} />
          {type === "saida" && (
            <input type="hidden" name="costType" value={costType} />
          )}

          <div className="flex flex-col gap-1.5">
            <span className={labelClasses}>Fatura ou recibo</span>
            <label
              htmlFor="receiptFile"
              className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-surface-1 px-3 py-3 text-body text-ink-muted transition-colors duration-fast ease-standard hover:bg-surface-2"
            >
              {receiptStatus === "uploading" ||
              receiptStatus === "analyzing" ? (
                <Loader2
                  className="h-4 w-4 shrink-0 animate-spin text-action"
                  strokeWidth={2}
                />
              ) : (
                <Paperclip
                  className="h-4 w-4 shrink-0 text-ink-subdued"
                  strokeWidth={2}
                />
              )}
              <span className="truncate">
                {receiptStatus === "uploading"
                  ? "A enviar..."
                  : receiptStatus === "analyzing"
                    ? "A ler dados com IA..."
                    : (receiptFileName ??
                      (receiptUrl
                        ? "Substituir fatura anexada"
                        : "Anexar foto, PDF ou fatura"))}
              </span>
            </label>
            <input
              id="receiptFile"
              type="file"
              accept={ACCEPTED_TYPES}
              className="hidden"
              onChange={(e) => {
                handleFileSelected(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
            {receiptStatus === "done" && (
              <p className="flex items-center gap-1.5 text-[12px] text-success">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
                Dados preenchidos automaticamente — confirma antes de guardar.
              </p>
            )}
            {receiptError && (
              <p className="text-[12px] text-error">{receiptError}</p>
            )}
            {receiptUrl && receiptStatus === "idle" && (
              <a
                href={receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] font-semibold text-action hover:underline"
              >
                Ver fatura atual
              </a>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className={labelClasses}>Tipo</span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setType("entrada")}
                className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border text-body font-semibold transition-colors duration-fast ease-standard ${
                  type === "entrada"
                    ? "border-success bg-success/10 text-success"
                    : "border-border text-ink-muted hover:bg-surface-1"
                }`}
              >
                <ArrowUpCircle className="h-4 w-4" strokeWidth={2} />
                Entrada
              </button>
              <button
                type="button"
                onClick={() => setType("saida")}
                className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border text-body font-semibold transition-colors duration-fast ease-standard ${
                  type === "saida"
                    ? "border-error bg-error/10 text-error"
                    : "border-border text-ink-muted hover:bg-surface-1"
                }`}
              >
                <ArrowDownCircle className="h-4 w-4" strokeWidth={2} />
                Saída
              </button>
            </div>
          </div>

          {type === "saida" && (
            <div className="flex flex-col gap-1.5">
              <span className={labelClasses}>Tipo de custo</span>
              <div className="flex gap-3">
                {(
                  Object.entries(CASH_COST_TYPE_LABELS) as [
                    CashCostType,
                    string,
                  ][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCostType(value)}
                    className={`flex min-h-11 flex-1 items-center justify-center rounded-md border text-body font-semibold transition-colors duration-fast ease-standard ${
                      costType === value
                        ? "border-action bg-action/10 text-action"
                        : "border-border text-ink-muted hover:bg-surface-1"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-[12px] text-ink-subdued">
                Custo direto: ligado a uma estadia (limpeza, lavandaria,
                amenities, comissões). Operacional: o resto (salários
                administrativos, marketing, impostos...). Usado para calcular a
                Margem Bruta.
              </p>
            </div>
          )}

          <h3 className="ui-form-section-title">Detalhes do movimento</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="amount" className={labelClasses}>
                Valor (€)
              </label>
              <input
                id="amount"
                name="amount"
                type="number"
                min={0}
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex: 150.00"
                className={inputClasses}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="transactionDate" className={labelClasses}>
                Data
              </label>
              <input
                id="transactionDate"
                name="transactionDate"
                type="date"
                required
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className={inputClasses}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="category" className={labelClasses}>
              Categoria
            </label>
            <input
              id="category"
              name="category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ex: Reservas, Fornecedores, Salários..."
              className={inputClasses}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className={labelClasses}>
              Descrição
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Observações sobre este movimento..."
              className={`${inputClasses} min-h-0 py-2`}
            />
          </div>

          {state && "error" in state && (
            <p aria-live="polite" className="text-body text-error">
              {state.error}
            </p>
          )}

          <div className="ui-form-footer flex justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-md border border-border bg-canvas px-4 text-body font-semibold text-ink transition-colors duration-fast ease-standard hover:bg-surface-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                pending ||
                receiptStatus === "uploading" ||
                receiptStatus === "analyzing"
              }
              className="min-h-11 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending
                ? "A guardar..."
                : transaction
                  ? "Guardar alterações"
                  : "Guardar movimento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
