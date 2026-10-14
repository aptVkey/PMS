"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import type { IcalFeedRow } from "@/lib/ical";

export function ConfirmDeleteFeedModal({
  feed,
  onDelete,
  onClose,
}: {
  feed: IcalFeedRow;
  onDelete: () => Promise<{ error: string } | { success: true }>;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRemove() {
    startTransition(async () => {
      const result = await onDelete();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-canvas p-6 shadow-popover">
        <h2 className="text-[18px] font-bold text-ink">Remover feed</h2>
        <p className="mt-2 text-body text-ink-muted">
          Tens a certeza que queres remover o feed &ldquo;{feed.channel}
          &rdquo;? As reservas já importadas por ele mantêm-se, mas deixam de
          ser atualizadas ou canceladas automaticamente.
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
            onClick={handleRemove}
            disabled={isPending}
            className="min-h-11 rounded-md bg-error px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "A remover..." : "Remover"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
