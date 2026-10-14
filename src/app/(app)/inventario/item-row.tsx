"use client";

import { useState } from "react";
import { AlertTriangle, ArrowUpDown, Pencil, Trash2 } from "lucide-react";
import { isLowStock, type InventoryItem } from "@/lib/inventory";
import { ItemFormModal } from "./item-form-modal";
import { ConfirmDeleteModal } from "./confirm-delete-modal";
import { StockModal } from "./stock-modal";
import { ModalPortal } from "@/components/modal-portal";

export function ItemRow({ item }: { item: InventoryItem }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [movingStock, setMovingStock] = useState(false);
  const lowStock = isLowStock(item);

  return (
    <>
      <tr className="border-b border-border last:border-0">
        <td className="whitespace-nowrap px-4 py-3">
          <p className="text-body font-semibold text-ink">{item.name}</p>
          {item.sku && (
            <p className="text-[12px] text-ink-subdued">SKU: {item.sku}</p>
          )}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-body text-ink-muted">
          {item.category ?? "—"}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-right">
          <span
            className={`text-body font-semibold ${lowStock ? "text-error" : "text-ink"}`}
          >
            {item.quantity} {item.unit}
          </span>
          {lowStock && (
            <span
              title={`Stock mínimo: ${item.min_quantity} ${item.unit}`}
              className="ml-1.5 inline-flex align-middle text-error"
            >
              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
          )}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-body text-ink-muted">
          {item.unit_cost !== null ? `${item.unit_cost.toFixed(2)} €` : "—"}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-body text-ink-muted">
          {item.supplier ?? "—"}
        </td>
        <td className="whitespace-nowrap px-4 py-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMovingStock(true)}
              aria-label="Movimentar stock"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink transition-colors duration-fast ease-standard hover:bg-surface-1"
            >
              <ArrowUpDown className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Editar produto"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink transition-colors duration-fast ease-standard hover:bg-surface-1"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => setDeleting(true)}
              aria-label="Eliminar produto"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-error transition-colors duration-fast ease-standard hover:bg-error/10"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        </td>
      </tr>

      <ModalPortal>
        {movingStock && (
          <StockModal item={item} onClose={() => setMovingStock(false)} />
        )}
        {editing && (
          <ItemFormModal item={item} onClose={() => setEditing(false)} />
        )}
        {deleting && (
          <ConfirmDeleteModal item={item} onClose={() => setDeleting(false)} />
        )}
      </ModalPortal>
    </>
  );
}
