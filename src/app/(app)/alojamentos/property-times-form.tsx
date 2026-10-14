"use client";

import { useState, useTransition } from "react";
import { Clock, Pencil } from "lucide-react";
import { updateProperty } from "./actions";

const inputClasses =
  "min-h-9 rounded-md border border-border bg-canvas px-2 text-body text-ink focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";

// Postgres devolve "15:00:00"; os inputs type=time usam "15:00".
const toHourMinute = (value: string) => value.slice(0, 5);

export function PropertyTimesForm({
  propertyId,
  checkInTime,
  checkOutTime,
  onSaved,
}: {
  propertyId: string;
  checkInTime: string;
  checkOutTime: string;
  onSaved: (times: { checkIn: string; checkOut: string }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [checkIn, setCheckIn] = useState(toHourMinute(checkInTime));
  const [checkOut, setCheckOut] = useState(toHourMinute(checkOutTime));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateProperty(propertyId, {
        checkInTime: checkIn,
        checkOutTime: checkOut,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setError(null);
      onSaved({ checkIn, checkOut });
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="Usadas pelos gatilhos de email relativos ao check-in/checkout"
        className="group flex items-center gap-2 text-left text-body text-ink-muted"
      >
        <Clock className="h-4 w-4 shrink-0" strokeWidth={2} />
        <span>
          Check-in às {toHourMinute(checkInTime)} · Check-out às{" "}
          {toHourMinute(checkOutTime)}
        </span>
        <Pencil
          className="h-3.5 w-3.5 shrink-0 text-ink-subdued opacity-0 transition-opacity duration-fast ease-standard group-hover:opacity-100"
          strokeWidth={2}
        />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-body text-ink-muted">
          Check-in
          <input
            type="time"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            required
            className={inputClasses}
          />
        </label>
        <label className="flex items-center gap-2 text-body text-ink-muted">
          Check-out
          <input
            type="time"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            required
            className={inputClasses}
          />
        </label>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !checkIn || !checkOut}
          className="min-h-9 rounded-md bg-action px-3 text-[13px] font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "A guardar..." : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setCheckIn(toHourMinute(checkInTime));
            setCheckOut(toHourMinute(checkOutTime));
            setError(null);
            setEditing(false);
          }}
          disabled={isPending}
          className="min-h-9 rounded-md border border-border bg-canvas px-3 text-[13px] font-semibold text-ink transition-colors duration-fast ease-standard hover:bg-surface-1 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
      {error && (
        <p aria-live="polite" className="text-[12px] text-error">
          {error}
        </p>
      )}
    </div>
  );
}
