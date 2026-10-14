"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDaysISO, formatISO, todayISO } from "@/lib/date-utils";

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const MONTH_ABBREV_DOT = [
  "jan.",
  "fev.",
  "mar.",
  "abr.",
  "mai.",
  "jun.",
  "jul.",
  "ago.",
  "set.",
  "out.",
  "nov.",
  "dez.",
];

// Começa à segunda-feira, como nos sites de reserva — difere do resto da app
// (que começa ao domingo), porque esta grelha é só para visitantes externos.
const WEEKDAY_LABELS = ["S", "T", "Q", "Q", "S", "S", "D"];

type DayCell = { date: string; day: number } | null;

function buildMonthGrid(year: number, month: number): DayCell[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const leading = (firstWeekday + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: DayCell[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: formatISO(year, month, d), day: d });
  }
  return cells;
}

function formatShort(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} de ${MONTH_ABBREV_DOT[m - 1]} de ${y}`;
}

// Todas as noites entre start (inclusive) e end (exclusive) livres? A noite
// de checkout não conta — é aí que entra o próximo hóspede.
function hasOccupiedNightBetween(
  start: string,
  end: string,
  occupied: Set<string>,
): boolean {
  let cursor = start;
  while (cursor < end) {
    if (occupied.has(cursor)) return true;
    cursor = addDaysISO(cursor, 1);
  }
  return false;
}

export function BookingDatePicker({
  checkIn,
  checkOut,
  onChange,
  occupiedDates,
}: {
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
  occupiedDates: Set<string>;
}) {
  const today = todayISO();
  const [open, setOpen] = useState(false);
  const [activeField, setActiveField] = useState<"checkIn" | "checkOut">(
    "checkIn",
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const anchor = checkIn || today;
  const [anchorYear, anchorMonth] = anchor.split("-").map(Number);
  const [viewYear, setViewYear] = useState(anchorYear);
  const [viewMonth, setViewMonth] = useState(anchorMonth - 1);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  // Um dia pode estar indisponível por ser passado, por já estar reservado,
  // ou — só enquanto se escolhe a partida — por haver uma noite reservada
  // algures entre a chegada já escolhida e este dia.
  function dayState(date: string): { disabled: boolean; strike: boolean } {
    const past = date < today;
    const occupied = occupiedDates.has(date);
    const crossesOccupiedNight =
      Boolean(checkIn) &&
      !checkOut &&
      date > checkIn &&
      hasOccupiedNightBetween(checkIn, date, occupiedDates);

    return {
      disabled: past || occupied || crossesOccupiedNight,
      strike: occupied || crossesOccupiedNight,
    };
  }

  function handleDayClick(date: string) {
    if (dayState(date).disabled) return;

    if (!checkIn || (checkIn && checkOut)) {
      onChange(date, "");
      setActiveField("checkOut");
      return;
    }

    if (date <= checkIn) {
      onChange(date, "");
      return;
    }

    onChange(checkIn, date);
    setActiveField("checkIn");
  }

  function renderMonth(year: number, month: number, hideOnMobile: boolean) {
    const cells = buildMonthGrid(year, month);
    return (
      <div className={hideOnMobile ? "hidden md:block" : undefined}>
        <p className="mb-2 text-center text-body font-semibold text-ink">
          {MONTH_NAMES[month]}, {year}
        </p>
        <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] text-ink-subdued">
          {WEEKDAY_LABELS.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
          {cells.map((cell, i) => {
            if (!cell) return <div key={`blank-${i}`} />;

            const isStart = cell.date === checkIn;
            const isEnd = cell.date === checkOut;
            const inRange =
              Boolean(checkIn) &&
              Boolean(checkOut) &&
              cell.date > checkIn &&
              cell.date < checkOut;
            const { disabled, strike } = dayState(cell.date);

            if (disabled) {
              return (
                <span
                  key={cell.date}
                  className={`flex h-9 w-9 items-center justify-center text-body ${
                    strike
                      ? "text-ink-subdued/60 line-through"
                      : "text-ink-subdued/40"
                  }`}
                >
                  {cell.day}
                </span>
              );
            }

            return (
              <button
                key={cell.date}
                type="button"
                onClick={() => handleDayClick(cell.date)}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-body transition-colors duration-fast ease-standard ${
                  isStart || isEnd
                    ? "bg-ink font-semibold text-canvas"
                    : inRange
                      ? "bg-surface-1 text-ink"
                      : "text-ink hover:bg-surface-1"
                }`}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const nextMonthDate = new Date(viewYear, viewMonth + 1, 1);

  return (
    <div ref={containerRef} className="relative">
      <div className="grid grid-cols-2 divide-x divide-border">
        <button
          type="button"
          onClick={() => {
            setActiveField("checkIn");
            setOpen(true);
          }}
          className={`flex flex-col gap-0.5 px-3 py-2 text-left transition-colors duration-fast ease-standard ${
            open && activeField === "checkIn" ? "bg-surface-1" : ""
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wide text-ink">
            Chegada
          </span>
          <span
            className={`text-body ${checkIn ? "text-ink" : "text-ink-subdued"}`}
          >
            {checkIn ? formatShort(checkIn) : "Adicionar data"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveField("checkOut");
            setOpen(true);
          }}
          className={`flex flex-col gap-0.5 px-3 py-2 text-left transition-colors duration-fast ease-standard ${
            open && activeField === "checkOut" ? "bg-surface-1" : ""
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wide text-ink">
            Partida
          </span>
          <span
            className={`text-body ${checkOut ? "text-ink" : "text-ink-subdued"}`}
          >
            {checkOut ? formatShort(checkOut) : "Adicionar data"}
          </span>
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[92vw] max-w-[640px] rounded-lg border border-border bg-canvas p-4 shadow-popover md:w-[640px]">
          <p className="mb-3 text-[13px] font-semibold text-ink-muted">
            {checkIn && checkOut
              ? `${formatLong(checkIn)} — ${formatLong(checkOut)}`
              : checkIn
                ? "Escolhe a data de partida"
                : "Escolhe a data de chegada"}
          </p>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Mês anterior"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink hover:bg-surface-1"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Mês seguinte"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink hover:bg-surface-1"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          <div className="mt-1 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
            {renderMonth(viewYear, viewMonth, false)}
            {renderMonth(
              nextMonthDate.getFullYear(),
              nextMonthDate.getMonth(),
              true,
            )}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <button
              type="button"
              onClick={() => onChange("", "")}
              className="text-[13px] font-semibold text-ink underline hover:text-ink-muted"
            >
              Limpar datas
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-9 rounded-md bg-ink px-4 text-[13px] font-semibold text-canvas hover:opacity-90"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
