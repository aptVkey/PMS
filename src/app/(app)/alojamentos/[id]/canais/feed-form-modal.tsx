"use client";

import { useActionState, useEffect } from "react";
import { X } from "lucide-react";
import { saveIcalFeed, type FormState } from "./actions";
import type { IcalFeedRow } from "@/lib/ical";
import { CHANNEL_SUGGESTIONS } from "@/lib/bookings";
import type { Room } from "@/lib/rooms";

// "Direto" não faz sentido para um feed externo — é sempre um canal de OTA.
const ICAL_CHANNEL_SUGGESTIONS = CHANNEL_SUGGESTIONS.filter(
  (channel) => channel !== "Direto",
);

const initialState: FormState = undefined;

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
const labelClasses = "text-body font-semibold text-ink";

export function FeedFormModal({
  propertyId,
  room,
  feed,
  onClose,
}: {
  propertyId: string;
  room: Room;
  feed?: IcalFeedRow;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    saveIcalFeed,
    initialState,
  );

  useEffect(() => {
    if (state && "success" in state) onClose();
  }, [state, onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-md flex-col rounded-lg bg-canvas shadow-popover ui-form-modal">
        <div className="ui-form-header flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-[18px] font-bold text-ink">
            {feed ? "Editar feed" : "Novo feed de importação"}
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

        <form action={formAction} className="ui-form-scroll flex flex-col gap-4 overflow-y-auto px-6 py-5">
          {feed && <input type="hidden" name="id" value={feed.id} />}
          <input type="hidden" name="propertyId" value={propertyId} />
          <input type="hidden" name="roomId" value={room.id} />

          <p className="text-body text-ink-muted">
            Quarto: <strong className="text-ink">{room.name}</strong>
          </p>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="channel" className={labelClasses}>
              Canal
            </label>
            <input
              id="channel"
              name="channel"
              type="text"
              list="channel-presets"
              required
              defaultValue={feed?.channel ?? ""}
              placeholder="Ex: Booking.com"
              className={inputClasses}
            />
            <datalist id="channel-presets">
              {ICAL_CHANNEL_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="feedUrl" className={labelClasses}>
              URL do feed iCal
            </label>
            <input
              id="feedUrl"
              name="feedUrl"
              type="url"
              required
              defaultValue={feed?.feed_url ?? ""}
              placeholder="https://admin.booking.com/hotel/hoteladmin/ical.html?..."
              className={inputClasses}
            />
            <p className="text-[12px] text-ink-subdued">
              Na Booking.com: Extranet → Tarifas e disponibilidade → Calendário
              de sincronização → Exportar calendário. No Airbnb: Calendário →
              Disponibilidade → Exportar calendário.
            </p>
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
              disabled={pending}
              className="min-h-11 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "A guardar..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
