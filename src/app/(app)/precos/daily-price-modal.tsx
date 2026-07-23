"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { deleteDailyPrice, saveDailyPrice, type PricingFormState } from "./actions";
import type { RoomDailyPrice } from "@/lib/pricing";
import { formatFullDateLabel } from "@/lib/date-utils";

const initialState: PricingFormState = undefined;

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
const labelClasses = "text-body font-semibold text-ink";

export function DailyPriceModal({
  roomId,
  currency,
  date,
  override,
  effectiveRate,
  onClose,
}: {
  roomId: string;
  currency: string;
  date: string;
  override: RoomDailyPrice | null;
  effectiveRate: number;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    saveDailyPrice,
    initialState,
  );
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (state && "success" in state) {
      onClose();
    }
  }, [state, onClose]);

  function handleRemoveOverride() {
    startDeleteTransition(async () => {
      const result = await deleteDailyPrice(roomId, date);
      if ("error" in result) {
        setDeleteError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-canvas p-6 shadow-popover">
        <h2 className="text-[18px] font-bold text-ink">
          {formatFullDateLabel(date)}
        </h2>
        <p className="mt-1 text-body text-ink-muted">
          {override
            ? "Este dia tem um preço específico definido."
            : `Preço atual (base ou sazonal): ${effectiveRate} ${currency}`}
        </p>

        <form action={formAction} className="mt-5 flex flex-col gap-4">
          <input type="hidden" name="roomId" value={roomId} />
          <input type="hidden" name="date" value={date} />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="nightlyRate" className={labelClasses}>
              Preço para este dia ({currency})
            </label>
            <input
              id="nightlyRate"
              name="nightlyRate"
              type="number"
              min={0}
              step="0.01"
              defaultValue={override?.nightly_rate ?? effectiveRate}
              className={inputClasses}
            />
          </div>

          {state && "error" in state && (
            <p aria-live="polite" className="text-body text-error">
              {state.error}
            </p>
          )}
          {deleteError && (
            <p aria-live="polite" className="text-body text-error">
              {deleteError}
            </p>
          )}

          <div className="mt-1 flex items-center justify-between gap-3">
            {override ? (
              <button
                type="button"
                onClick={handleRemoveOverride}
                disabled={isDeleting || pending}
                className="text-body font-semibold text-error hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? "A remover..." : "Remover preço específico"}
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={pending || isDeleting}
                className="min-h-11 rounded-md border border-border bg-canvas px-4 text-body font-semibold text-ink transition-colors duration-fast ease-standard hover:bg-surface-1 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending || isDeleting}
                className="min-h-11 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? "A guardar..." : "Guardar"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
