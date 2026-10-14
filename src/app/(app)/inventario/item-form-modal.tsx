"use client";

import { useActionState, useEffect } from "react";
import { X } from "lucide-react";
import { saveItem, type ItemFormState } from "./actions";
import type { InventoryItem } from "@/lib/inventory";

const initialState: ItemFormState = undefined;

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
const labelClasses = "text-body font-semibold text-ink";

export function ItemFormModal({
  item,
  onClose,
}: {
  item?: InventoryItem;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveItem, initialState);

  useEffect(() => {
    if (state && "success" in state) {
      onClose();
    }
  }, [state, onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg bg-canvas shadow-popover">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-[18px] font-bold text-ink">
            {item ? "Editar produto" : "Adicionar produto"}
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
          className="flex flex-col gap-5 overflow-y-auto px-6 py-5"
        >
          {item && <input type="hidden" name="id" value={item.id} />}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className={labelClasses}>
              Nome do produto
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={item?.name}
              placeholder="Ex: Toalhas de banho"
              className={inputClasses}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="sku" className={labelClasses}>
                SKU / referência
              </label>
              <input
                id="sku"
                name="sku"
                type="text"
                defaultValue={item?.sku ?? ""}
                placeholder="Ex: TWL-001"
                className={inputClasses}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="category" className={labelClasses}>
                Categoria
              </label>
              <input
                id="category"
                name="category"
                type="text"
                defaultValue={item?.category ?? ""}
                placeholder="Ex: Roupa de cama"
                className={inputClasses}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {item ? (
              <div className="flex flex-col gap-1.5">
                <span className={labelClasses}>Stock atual</span>
                <p className="flex min-h-11 items-center rounded-md border border-border bg-surface-1 px-3 text-body text-ink-muted">
                  {item.quantity} {item.unit}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="quantity" className={labelClasses}>
                  Quantidade inicial
                </label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min={0}
                  step="any"
                  defaultValue={0}
                  className={inputClasses}
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="unit" className={labelClasses}>
                Unidade
              </label>
              <input
                id="unit"
                name="unit"
                type="text"
                required
                defaultValue={item?.unit ?? "un"}
                placeholder="Ex: un, kg, L"
                className={inputClasses}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="minQuantity" className={labelClasses}>
                Stock mínimo
              </label>
              <input
                id="minQuantity"
                name="minQuantity"
                type="number"
                min={0}
                step="any"
                required
                defaultValue={item?.min_quantity ?? 0}
                className={inputClasses}
              />
            </div>
          </div>
          {item && (
            <p className="-mt-3 text-[12px] text-ink-subdued">
              Para ajustar o stock, usa &ldquo;Movimentar stock&rdquo; na
              listagem — regista compras e consumos, para o histórico se manter
              correto.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="unitCost" className={labelClasses}>
                Custo unitário (€)
              </label>
              <input
                id="unitCost"
                name="unitCost"
                type="number"
                min={0}
                step="0.01"
                defaultValue={item?.unit_cost ?? ""}
                placeholder="Ex: 4.50"
                className={inputClasses}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="supplier" className={labelClasses}>
                Fornecedor
              </label>
              <input
                id="supplier"
                name="supplier"
                type="text"
                defaultValue={item?.supplier ?? ""}
                placeholder="Ex: Fornecedor Lda"
                className={inputClasses}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="notes" className={labelClasses}>
              Notas
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={item?.notes ?? ""}
              placeholder="Observações sobre este produto..."
              className={`${inputClasses} min-h-0 py-2`}
            />
          </div>

          {state && "error" in state && (
            <p aria-live="polite" className="text-body text-error">
              {state.error}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-md border border-border bg-canvas px-4 text-body font-semibold text-ink transition-colors duration-fast ease-standard hover:bg-surface-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="min-h-11 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending
                ? "A guardar..."
                : item
                  ? "Guardar alterações"
                  : "Guardar produto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
