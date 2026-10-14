"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { ArrowDownCircle, ArrowUpCircle, Trash2, X } from "lucide-react";
import { deleteMovement, getItemMovements, recordMovement } from "./actions";
import {
  movementStats,
  type InventoryItem,
  type InventoryMovement,
} from "@/lib/inventory";

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
const labelClasses = "text-body font-semibold text-ink";

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-surface-1 px-3 py-2">
      <p className="text-[12px] text-ink-subdued">{label}</p>
      <p className="text-body font-bold text-ink">{value}</p>
    </div>
  );
}

export function StockModal({
  item,
  onClose,
}: {
  item: InventoryItem;
  onClose: () => void;
}) {
  const [movements, setMovements] = useState<InventoryMovement[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(
    recordMovement,
    undefined,
  );
  const [isBusy, startBusyTransition] = useTransition();

  function loadMovements() {
    startBusyTransition(async () => {
      const result = await getItemMovements(item.id);
      if ("error" in result) {
        setLoadError(result.error);
        return;
      }
      setLoadError(null);
      setMovements(result.movements);
    });
  }

  useEffect(() => {
    loadMovements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  useEffect(() => {
    if (state && "success" in state) {
      loadMovements();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function handleDeleteMovement(movementId: string) {
    startBusyTransition(async () => {
      const result = await deleteMovement(movementId);
      if (!("error" in result)) loadMovements();
    });
  }

  const { totalPurchased, totalUsed } = movementStats(movements ?? []);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg bg-canvas shadow-popover">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-[18px] font-bold text-ink">Movimentar stock</h2>
            <p className="text-body text-ink-muted">{item.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-ink-subdued hover:bg-surface-1"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-3 gap-3">
            <StatBox label="Atual" value={`${item.quantity} ${item.unit}`} />
            <StatBox
              label="Comprado (total)"
              value={`${totalPurchased} ${item.unit}`}
            />
            <StatBox
              label="Usado (total)"
              value={`${totalUsed} ${item.unit}`}
            />
          </div>

          <form action={formAction} className="flex flex-col gap-3">
            <input type="hidden" name="itemId" value={item.id} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="quantity" className={labelClasses}>
                  Quantidade
                </label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min={0}
                  step="any"
                  required
                  className={inputClasses}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="note" className={labelClasses}>
                  Nota (opcional)
                </label>
                <input
                  id="note"
                  name="note"
                  type="text"
                  placeholder="Ex: Fatura #123"
                  className={inputClasses}
                />
              </div>
            </div>

            {state && "error" in state && (
              <p aria-live="polite" className="text-body text-error">
                {state.error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                name="type"
                value="entrada"
                disabled={pending}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-success px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ArrowUpCircle className="h-4 w-4" strokeWidth={2} />
                Registar compra
              </button>
              <button
                type="submit"
                name="type"
                value="saida"
                disabled={pending}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-error px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ArrowDownCircle className="h-4 w-4" strokeWidth={2} />
                Registar consumo
              </button>
            </div>
          </form>

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <p className="text-body font-semibold text-ink">Histórico</p>
            {loadError && <p className="text-body text-error">{loadError}</p>}
            {movements === null ? (
              <p className="text-body text-ink-subdued">A carregar...</p>
            ) : movements.length === 0 ? (
              <p className="text-body text-ink-subdued">
                Ainda não há movimentos registados.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {movements.map((movement) => (
                  <li
                    key={movement.id}
                    className="flex items-center justify-between gap-3 border-b border-border pb-2 text-body last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      {movement.type === "entrada" ? (
                        <ArrowUpCircle
                          className="h-4 w-4 shrink-0 text-success"
                          strokeWidth={2}
                        />
                      ) : (
                        <ArrowDownCircle
                          className="h-4 w-4 shrink-0 text-error"
                          strokeWidth={2}
                        />
                      )}
                      <div>
                        <p className="font-semibold text-ink">
                          {movement.type === "entrada" ? "+" : "-"}
                          {movement.quantity} {item.unit}
                          {movement.note && (
                            <span className="font-normal text-ink-muted">
                              {" "}
                              · {movement.note}
                            </span>
                          )}
                        </p>
                        <p className="text-[12px] text-ink-subdued">
                          {new Date(movement.created_at).toLocaleString(
                            "pt-PT",
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteMovement(movement.id)}
                      disabled={isBusy}
                      aria-label="Eliminar movimento"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-error transition-colors duration-fast ease-standard hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
