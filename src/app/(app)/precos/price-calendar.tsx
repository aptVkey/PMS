"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Room } from "@/lib/rooms";
import {
  resolveNightlyRate,
  type RoomDailyPrice,
  type RoomRatePeriod,
} from "@/lib/pricing";
import { formatISO, MONTH_ABBREV, todayISO, WEEKDAY_LABELS } from "@/lib/date-utils";
import { DailyPriceModal } from "./daily-price-modal";

type DayCell = { date: string; day: number } | null;

function buildMonthGrid(year: number, month: number): DayCell[] {
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: DayCell[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: formatISO(year, month - 1, day), day });
  }
  return cells;
}

export function PriceCalendar({
  room,
  periods,
  dailyPrices,
}: {
  room: Room;
  periods: RoomRatePeriod[];
  dailyPrices: RoomDailyPrice[];
}) {
  const today = todayISO();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [editingDate, setEditingDate] = useState<string | null>(null);

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("pt-PT", {
        style: "currency",
        currency: room.currency,
        maximumFractionDigits: 0,
      }),
    [room.currency],
  );

  function shiftMonth(direction: 1 | -1) {
    let nextMonth = month + direction;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    } else if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }
    setMonth(nextMonth);
    setYear(nextYear);
  }

  const editingOverride = editingDate
    ? (dailyPrices.find((d) => d.date === editingDate) ?? null)
    : null;
  const editingEffectiveRate = editingDate
    ? resolveNightlyRate(editingDate, room.base_price, periods, dailyPrices)
    : 0;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-canvas p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-body font-bold text-ink">Calendário de preços</p>
          <p className="text-[12px] text-ink-subdued">
            Clica num dia para definir um preço específico só para esse dia.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Mês anterior"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-ink hover:bg-surface-1"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>
          <p className="min-w-[140px] text-center text-body font-semibold text-ink">
            {MONTH_ABBREV[month - 1]} {year}
          </p>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Mês seguinte"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-ink hover:bg-surface-1"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={i}
            className="py-1 text-center text-[11px] font-semibold uppercase text-ink-subdued"
          >
            {label}
          </div>
        ))}

        {cells.map((cell, i) => {
          if (!cell) return <div key={`blank-${i}`} />;
          const isOverridden = dailyPrices.some((d) => d.date === cell.date);
          const rate = resolveNightlyRate(
            cell.date,
            room.base_price,
            periods,
            dailyPrices,
          );
          const isPast = cell.date < today;
          const isToday = cell.date === today;

          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => setEditingDate(cell.date)}
              className={`flex min-h-[60px] flex-col items-center justify-center gap-0.5 rounded-md border px-1 py-1.5 text-center transition-colors duration-fast ease-standard hover:bg-surface-1 ${
                isOverridden
                  ? "border-primary bg-surface-2"
                  : "border-border bg-canvas"
              } ${isPast ? "opacity-50" : ""}`}
            >
              <span
                className={`text-[12px] ${isToday ? "font-bold text-primary" : "text-ink-muted"}`}
              >
                {cell.day}
              </span>
              <span className="text-[11px] font-semibold text-ink">
                {currencyFormatter.format(rate)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-[12px] text-ink-subdued">
        <span className="h-2.5 w-2.5 rounded-sm border border-primary bg-surface-2" />
        Preço específico definido para o dia
      </div>

      {editingDate && (
        <DailyPriceModal
          roomId={room.id}
          currency={room.currency}
          date={editingDate}
          override={editingOverride}
          effectiveRate={editingEffectiveRate}
          onClose={() => setEditingDate(null)}
        />
      )}
    </div>
  );
}
