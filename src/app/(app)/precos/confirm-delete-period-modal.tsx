"use client";

import { useState, useTransition } from "react";
import { deleteRatePeriod } from "./actions";
import type { RoomRatePeriod } from "@/lib/pricing";

export function ConfirmDeletePeriodModal({
  period,
  onClose,
}: {
  period: RoomRatePeriod;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteRatePeriod(period.id);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-canvas p-6 shadow-popover">
        <h2 className="text-[18px] font-bold text-ink">Eliminar período</h2>
        <p className="mt-2 text-body text-ink-muted">
          Tens a certeza que queres eliminar &ldquo;{period.label}&rdquo;?
          Esta ação não pode ser desfeita.
        </p>

        {error && (
          <p aria-live="polite" className="mt-2 text-body text-error">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="min-h-11 rounded-md border border-border bg-canvas px-4 text-body font-semibold text-ink transition-colors duration-fast ease-standard hover:bg-surface-1 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="min-h-11 rounded-md bg-error px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "A eliminar..." : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}
