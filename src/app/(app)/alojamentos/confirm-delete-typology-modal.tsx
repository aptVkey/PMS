"use client";

import { useState, useTransition } from "react";
import { deleteTypology } from "./actions";
import type { RoomTypology } from "@/lib/room-typologies";

export function ConfirmDeleteTypologyModal({
  typology,
  roomCount,
  onClose,
}: {
  typology: RoomTypology;
  roomCount: number;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTypology(typology.id, typology.photos);
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
        <h2 className="text-[18px] font-bold text-ink">Eliminar tipologia</h2>
        <p className="mt-2 text-body text-ink-muted">
          Tens a certeza que queres eliminar &ldquo;{typology.name}&rdquo;? Esta
          ação não pode ser desfeita.
        </p>
        {roomCount > 0 && (
          <p className="mt-2 text-body text-ink-muted">
            {roomCount} {roomCount === 1 ? "quarto" : "quartos"} desta tipologia{" "}
            {roomCount === 1 ? "fica" : "ficam"} sem tipologia atribuída, mas
            não {roomCount === 1 ? "é eliminado" : "são eliminados"}.
          </p>
        )}

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
