"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { ChevronLeft, ChevronRight, Moon, X } from "lucide-react";
import type { Room } from "@/lib/rooms";
import {
  resolveMinStay,
  resolveNightlyRate,
  type RoomDailyPrice,
  type RoomRatePeriod,
} from "@/lib/pricing";
import {
  formatISO,
  MONTH_ABBREV,
  todayISO,
  WEEKDAY_LABELS,
} from "@/lib/date-utils";
import { saveBulkDailyPrices, type BulkDailyInput } from "./actions";

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

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";

// "" = não mexer no campo; "clear" = remover a exceção; número = novo valor.
function parseField(raw: string): number | null | undefined {
  if (raw === "") return undefined;
  if (raw === "clear") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
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

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [rateInput, setRateInput] = useState("");
  const [minStayInput, setMinStayInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  // Sem preço base, sem períodos e sem preços de dia, todas as células dariam
  // 0 € — o que parece um preço e não é. Mostramos "—" e explicamos porquê.
  const hasAnyPrice =
    room.base_price > 0 || periods.length > 0 || dailyPrices.length > 0;

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("pt-PT", {
        style: "currency",
        currency: room.currency,
        maximumFractionDigits: 0,
      }),
    [room.currency],
  );

  // O arrasto pode acabar fora da grelha, por isso o fim ouve-se na janela.
  useEffect(() => {
    if (!isDragging) return;
    const stop = () => setIsDragging(false);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [isDragging]);

  const datesBetween = useCallback(
    (a: string, b: string) => {
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      return cells
        .filter((c): c is { date: string; day: number } => c !== null)
        .filter((c) => c.date >= lo && c.date <= hi)
        .map((c) => c.date);
    },
    [cells],
  );

  function startSelection(date: string, additive: boolean) {
    setAnchor(date);
    setIsDragging(true);
    setFeedback(null);
    setSelected((prev) => {
      if (!additive) return new Set([date]);
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  function extendSelection(date: string) {
    if (!isDragging || !anchor) return;
    setSelected(new Set(datesBetween(anchor, date)));
  }

  function clearSelection() {
    setSelected(new Set());
    setAnchor(null);
    setRateInput("");
    setMinStayInput("");
    setFeedback(null);
  }

  function selectWholeMonth() {
    const all = cells
      .filter((c): c is { date: string; day: number } => c !== null)
      .map((c) => c.date);
    setSelected(new Set(all));
    setAnchor(all[0] ?? null);
    setFeedback(null);
  }

  function apply(values: BulkDailyInput) {
    const dates = Array.from(selected).sort();
    if (dates.length === 0) return;

    startTransition(async () => {
      const result = await saveBulkDailyPrices(room.id, dates, values);
      if ("error" in result) {
        setFeedback(result.error);
        return;
      }
      clearSelection();
    });
  }

  function handleApply() {
    apply({
      nightlyRate: parseField(rateInput),
      minStayNights: parseField(minStayInput),
    });
  }

  function handleClearOverrides() {
    apply({ nightlyRate: null, minStayNights: null });
  }

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
    clearSelection();
  }

  const selectedCount = selected.size;
  const canApply =
    parseField(rateInput) !== undefined ||
    parseField(minStayInput) !== undefined;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-canvas p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-body font-bold text-ink">Calendário de preços</p>
          <p className="text-[12px] text-ink-subdued">
            Clica e arrasta para selecionar vários dias. Ctrl/Cmd + clique
            adiciona ou tira dias soltos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={selectWholeMonth}
            className="min-h-9 rounded-md border border-border px-3 text-[12px] font-semibold text-ink transition-colors duration-fast ease-standard hover:bg-surface-1"
          >
            Mês inteiro
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Mês anterior"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-ink hover:bg-surface-1"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>
          <p className="min-w-[110px] text-center text-body font-semibold text-ink">
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

      {!hasAnyPrice && (
        <p className="rounded-md border border-border bg-surface-1 px-4 py-3 text-[12px] text-ink-muted">
          Ainda não definiste o preço base deste quarto — por isso os dias
          aparecem sem tarifa. Define-o acima e o calendário passa a mostrar o
          preço de cada noite.
        </p>
      )}

      {selectedCount > 0 && (
        <div className="flex flex-col gap-4 rounded-md border border-action bg-surface-2 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-body font-bold text-ink">
              {selectedCount} {selectedCount === 1 ? "dia" : "dias"}{" "}
              {selectedCount === 1 ? "selecionado" : "selecionados"}
            </p>
            <button
              type="button"
              onClick={clearSelection}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-muted hover:text-ink"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
              Cancelar seleção
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="bulkRate"
                className="text-[12px] font-semibold text-ink"
              >
                Preço por noite ({room.currency})
              </label>
              <input
                id="bulkRate"
                type="text"
                inputMode="decimal"
                value={rateInput === "clear" ? "" : rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                placeholder="Deixa vazio para não alterar"
                className={inputClasses}
              />
              <button
                type="button"
                onClick={() =>
                  setRateInput((prev) => (prev === "clear" ? "" : "clear"))
                }
                className={`w-fit text-[12px] font-semibold ${rateInput === "clear" ? "text-error" : "text-ink-muted hover:text-ink"}`}
              >
                {rateInput === "clear"
                  ? "✓ Vai repor o preço herdado"
                  : "Repor preço herdado"}
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="bulkMinStay"
                className="text-[12px] font-semibold text-ink"
              >
                Estadia mínima (noites)
              </label>
              <input
                id="bulkMinStay"
                type="text"
                inputMode="numeric"
                value={minStayInput === "clear" ? "" : minStayInput}
                onChange={(e) => setMinStayInput(e.target.value)}
                placeholder="Deixa vazio para não alterar"
                className={inputClasses}
              />
              <button
                type="button"
                onClick={() =>
                  setMinStayInput((prev) => (prev === "clear" ? "" : "clear"))
                }
                className={`w-fit text-[12px] font-semibold ${minStayInput === "clear" ? "text-error" : "text-ink-muted hover:text-ink"}`}
              >
                {minStayInput === "clear"
                  ? "✓ Vai repor a estadia herdada"
                  : "Repor estadia herdada"}
              </button>
            </div>
          </div>

          {feedback && (
            <p aria-live="polite" className="text-body text-error">
              {feedback}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClearOverrides}
              disabled={isPending}
              className="min-h-11 rounded-md border border-border bg-canvas px-4 text-body font-semibold text-ink transition-colors duration-fast ease-standard hover:bg-surface-1 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Limpar exceções
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={isPending || !canApply}
              className="min-h-11 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending
                ? "A aplicar..."
                : `Aplicar a ${selectedCount} ${selectedCount === 1 ? "dia" : "dias"}`}
            </button>
          </div>
        </div>
      )}

      <div className="grid select-none grid-cols-7 gap-1.5">
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

          const override = dailyPrices.find((d) => d.date === cell.date);
          const rate = resolveNightlyRate(
            cell.date,
            room.base_price,
            periods,
            dailyPrices,
          );
          const minStay = resolveMinStay(
            cell.date,
            room.min_stay_nights,
            periods,
            dailyPrices,
          );
          const isPast = cell.date < today;
          const isToday = cell.date === today;
          const isSelected = selected.has(cell.date);

          return (
            <button
              key={cell.date}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                startSelection(cell.date, e.ctrlKey || e.metaKey);
              }}
              onPointerEnter={() => extendSelection(cell.date)}
              onClick={(e) => {
                // Ativação por teclado (detail 0) não passa por pointerdown.
                if (e.detail === 0) startSelection(cell.date, true);
              }}
              aria-pressed={isSelected}
              className={`flex min-h-[64px] touch-none flex-col items-center justify-center gap-0.5 rounded-md border px-1 py-1.5 text-center transition-colors duration-fast ease-standard ${
                isSelected
                  ? "border-action bg-action/10"
                  : override
                    ? "border-primary bg-surface-2 hover:border-action"
                    : "border-border bg-canvas hover:border-action hover:bg-surface-1"
              } ${isToday ? "ring-2 ring-action ring-offset-1" : ""} ${
                isPast ? "opacity-45" : ""
              }`}
            >
              <span
                className={`text-[12px] ${isToday ? "font-bold text-primary" : "text-ink-muted"}`}
              >
                {cell.day}
              </span>
              <span
                className={`text-[11px] font-semibold ${rate > 0 ? "text-ink" : "text-ink-subdued"}`}
              >
                {rate > 0 ? currencyFormatter.format(rate) : "—"}
              </span>
              {minStay != null && (
                <span className="flex items-center gap-0.5 text-[10px] text-ink-subdued">
                  <Moon className="h-2.5 w-2.5" strokeWidth={2} />
                  {minStay}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-ink-subdued">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm border border-primary bg-surface-2" />
          Exceção definida para o dia
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm ring-2 ring-action ring-offset-1" />
          Hoje
        </span>
        <span className="flex items-center gap-2">
          <Moon className="h-3 w-3" strokeWidth={2} />
          Estadia mínima em noites
        </span>
      </div>
    </div>
  );
}
