"use client";

import { useMemo, useState, useTransition } from "react";
import { TrendingDown, TrendingUp, Wand2 } from "lucide-react";
import type { Room } from "@/lib/rooms";
import type { Booking } from "@/lib/bookings";
import { applyMonthlySuggestion } from "./actions";
import { calculateMonthOccupancy, suggestPriceAdjustment } from "@/lib/pricing";
import { MONTH_ABBREV } from "@/lib/date-utils";

const MONTHS_AHEAD = 6;

function buildUpcomingMonths(count: number): { year: number; month: number }[] {
  const now = new Date();
  const result: { year: number; month: number }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    result.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return result;
}

function MonthSuggestionCard({
  room,
  year,
  month,
  bookings,
}: {
  room: Room;
  year: number;
  month: number;
  bookings: Pick<Booking, "room_id" | "check_in" | "check_out" | "status">[];
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<
    { error: string } | { success: true; updated: number } | null
  >(null);

  const occupancy = useMemo(
    () => calculateMonthOccupancy(bookings, room.id, year, month),
    [bookings, room.id, year, month],
  );
  const { adjustmentPercent, level } = suggestPriceAdjustment(occupancy);
  const occupancyPercent = Math.round(occupancy * 100);

  function handleApply() {
    startTransition(async () => {
      const res = await applyMonthlySuggestion(room.id, year, month);
      setResult(res);
    });
  }

  const levelStyles: Record<typeof level, string> = {
    alta: "bg-success/10 text-success",
    baixa: "bg-error/10 text-error",
    normal: "bg-surface-1 text-ink-subdued",
  };

  const levelLabel: Record<typeof level, string> = {
    alta: "Ocupação alta",
    baixa: "Ocupação baixa",
    normal: "Ocupação normal",
  };

  return (
    <div className="flex flex-col gap-2.5 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-body font-semibold text-ink">
          {MONTH_ABBREV[month - 1]} {year}
        </p>
        <span
          className={`rounded-pill px-2 py-0.5 text-[11px] font-semibold ${levelStyles[level]}`}
        >
          {occupancyPercent}%
        </span>
      </div>
      <p className="text-[12px] text-ink-subdued">{levelLabel[level]}</p>

      {adjustmentPercent !== 0 ? (
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span
            className={`flex items-center gap-1 text-[12px] font-semibold ${adjustmentPercent > 0 ? "text-success" : "text-error"}`}
          >
            {adjustmentPercent > 0 ? (
              <TrendingUp className="h-3.5 w-3.5" strokeWidth={2} />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" strokeWidth={2} />
            )}
            {adjustmentPercent > 0 ? "+" : ""}
            {Math.round(adjustmentPercent * 100)}%
          </span>
          <button
            type="button"
            onClick={handleApply}
            disabled={isPending}
            className="flex min-h-8 items-center gap-1 rounded-md border border-border bg-canvas px-2.5 text-[12px] font-semibold text-ink transition-colors duration-fast ease-standard hover:bg-surface-1 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Wand2 className="h-3 w-3" strokeWidth={2} />
            {isPending ? "A aplicar..." : "Aplicar"}
          </button>
        </div>
      ) : (
        <p className="mt-auto pt-1 text-[12px] text-ink-subdued">
          Manter preço atual
        </p>
      )}

      {result && (
        <p
          aria-live="polite"
          className={`text-[11px] ${"error" in result ? "text-error" : "text-success"}`}
        >
          {"error" in result
            ? result.error
            : `Atualizado em ${result.updated} ${result.updated === 1 ? "dia" : "dias"}.`}
        </p>
      )}
    </div>
  );
}

export function PriceSuggestions({
  room,
  bookings,
}: {
  room: Room;
  bookings: Pick<Booking, "room_id" | "check_in" | "check_out" | "status">[];
}) {
  const months = useMemo(() => buildUpcomingMonths(MONTHS_AHEAD), []);

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-border bg-canvas p-5 shadow-card">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-primary">
          <Wand2 className="h-4 w-4" strokeWidth={2} />
        </div>
        <div>
          <p className="text-body font-bold text-ink">Sugestões de preço</p>
          <p className="text-[12px] text-ink-subdued">
            Com base na ocupação de cada mês. Ocupação acima de{" "}
            {Math.round(0.7 * 100)}% sugere subir o preço, abaixo de{" "}
            {Math.round(0.3 * 100)}% sugere descer. Nunca aplica sem
            confirmares.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {months.map(({ year, month }) => (
          <MonthSuggestionCard
            key={`${year}-${month}`}
            room={room}
            year={year}
            month={month}
            bookings={bookings}
          />
        ))}
      </div>
    </div>
  );
}
