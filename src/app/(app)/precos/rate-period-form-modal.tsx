"use client";

import { useActionState, useEffect, useState } from "react";
import { saveRatePeriod, type PricingFormState } from "./actions";
import type { RoomRatePeriod } from "@/lib/pricing";

const initialState: PricingFormState = undefined;

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
const labelClasses = "text-body font-semibold text-ink";

export function RatePeriodFormModal({
  roomId,
  currency,
  period,
  onClose,
}: {
  roomId: string;
  currency: string;
  period?: RoomRatePeriod;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    saveRatePeriod,
    initialState,
  );

  const [sundayRate, setSundayRate] = useState(
    period?.sunday_rate?.toString() ?? "",
  );
  const [weekdayRate, setWeekdayRate] = useState(
    period?.weekday_rate?.toString() ?? "",
  );
  const [weekendRate, setWeekendRate] = useState(
    period?.weekend_rate?.toString() ?? "",
  );

  useEffect(() => {
    if (state && "success" in state) {
      onClose();
    }
  }, [state, onClose]);

  function applySameRateToAll() {
    setSundayRate(weekdayRate);
    setWeekendRate(weekdayRate);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-md flex-col rounded-lg bg-canvas shadow-popover ui-form-modal">
        <div className="ui-form-header border-b border-border px-6 py-4">
        <h2 className="text-[18px] font-bold text-ink">
          {period ? "Editar período" : "Novo período sazonal"}
        </h2>
        <p className="mt-1 text-body text-ink-muted">
          Define uma tarifa diferente da base para um intervalo de datas.
        </p>
        </div>

        <form action={formAction} className="ui-form-scroll flex flex-col gap-4 overflow-y-auto px-6 py-5">
          <input type="hidden" name="roomId" value={roomId} />
          {period && <input type="hidden" name="id" value={period.id} />}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="label" className={labelClasses}>
              Nome do período
            </label>
            <input
              id="label"
              name="label"
              type="text"
              defaultValue={period?.label ?? ""}
              placeholder="Ex: Época alta de verão"
              className={inputClasses}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="startDate" className={labelClasses}>
                Data de início
              </label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={period?.start_date ?? ""}
                className={inputClasses}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="endDate" className={labelClasses}>
                Data de fim
              </label>
              <input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={period?.end_date ?? ""}
                className={inputClasses}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className={labelClasses}>Preço por noite ({currency})</p>
            <button
              type="button"
              onClick={applySameRateToAll}
              className="text-[12px] font-semibold text-action hover:underline"
            >
              Usar o mesmo preço todos os dias
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="sundayRate"
                className="text-[12px] text-ink-subdued"
              >
                Domingo
              </label>
              <input
                id="sundayRate"
                name="sundayRate"
                type="number"
                min={0}
                step="0.01"
                value={sundayRate}
                onChange={(e) => setSundayRate(e.target.value)}
                placeholder="Ex: 250"
                className={inputClasses}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="weekdayRate"
                className="text-[12px] text-ink-subdued"
              >
                Segunda a Quinta
              </label>
              <input
                id="weekdayRate"
                name="weekdayRate"
                type="number"
                min={0}
                step="0.01"
                value={weekdayRate}
                onChange={(e) => setWeekdayRate(e.target.value)}
                placeholder="Ex: 200"
                className={inputClasses}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="weekendRate"
                className="text-[12px] text-ink-subdued"
              >
                Sexta e Sábado
              </label>
              <input
                id="weekendRate"
                name="weekendRate"
                type="number"
                min={0}
                step="0.01"
                value={weekendRate}
                onChange={(e) => setWeekendRate(e.target.value)}
                placeholder="Ex: 280"
                className={inputClasses}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="minStayNights" className={labelClasses}>
              Estadia mínima (noites)
            </label>
            <input
              id="minStayNights"
              name="minStayNights"
              type="number"
              min={1}
              max={365}
              defaultValue={period?.min_stay_nights ?? ""}
              placeholder="Opcional"
              className={inputClasses}
            />
          </div>

          {state && "error" in state && (
            <p aria-live="polite" className="text-body text-error">
              {state.error}
            </p>
          )}

          <div className="ui-form-footer mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="min-h-11 rounded-md border border-border bg-canvas px-4 text-body font-semibold text-ink transition-colors duration-fast ease-standard hover:bg-surface-1 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="min-h-11 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "A guardar..." : "Guardar período"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
