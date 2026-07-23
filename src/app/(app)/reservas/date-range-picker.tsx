"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDaysISO,
  diffDaysISO,
  formatDateLabel,
  formatRangeLabel,
  getMonthGrid,
  MONTH_NAMES,
  todayISO,
  WEEKDAY_LABELS,
} from "./date-utils";

export type DateRange = { start: string | null; end: string | null };

function CalendarPanel({
  value,
  maxRangeDays,
  allowClear,
  align,
  onSelect,
  onClear,
}: {
  value: DateRange;
  maxRangeDays?: number;
  allowClear: boolean;
  align: "left" | "right";
  onSelect: (range: { start: string; end: string }) => void;
  onClear: () => void;
}) {
  const anchor = value.start ?? todayISO();
  const [anchorYear, anchorMonth] = anchor.split("-").map(Number);
  const [viewYear, setViewYear] = useState(anchorYear);
  const [viewMonth, setViewMonth] = useState(anchorMonth - 1);
  const [pendingStart, setPendingStart] = useState<string | null>(null);

  function goToMonth(offset: number) {
    const d = new Date(viewYear, viewMonth + offset, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function handleDayClick(date: string) {
    if (!pendingStart) {
      setPendingStart(date);
      return;
    }
    let start = pendingStart;
    let end = date;
    if (end < start) {
      [start, end] = [end, start];
    }
    if (maxRangeDays && diffDaysISO(start, end) > maxRangeDays - 1) {
      end = addDaysISO(start, maxRangeDays - 1);
    }
    onSelect({ start, end });
  }

  const displayStart = pendingStart ?? value.start;
  const displayEnd = pendingStart ? null : value.end;
  const cells = getMonthGrid(viewYear, viewMonth);
  const today = todayISO();

  return (
    <div
      className={`absolute top-full z-50 mt-2 w-72 rounded-lg border border-border bg-canvas p-3 shadow-popover ${
        align === "right" ? "right-0" : "left-0"
      }`}
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => goToMonth(-1)}
          aria-label="Mês anterior"
          className="flex h-7 w-7 items-center justify-center rounded-md text-ink hover:bg-surface-1"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </button>
        <p className="text-body font-semibold text-ink">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </p>
        <button
          type="button"
          onClick={() => goToMonth(1)}
          aria-label="Mês seguinte"
          className="flex h-7 w-7 items-center justify-center rounded-md text-ink hover:bg-surface-1"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-y-1 text-center text-[11px] text-ink-subdued">
        {WEEKDAY_LABELS.map((w, i) => (
          <div key={i}>{w}</div>
        ))}
        {cells.map((cell, i) => {
          if (!cell) return <div key={`blank-${i}`} />;
          const inRange =
            displayStart &&
            displayEnd &&
            cell.date >= displayStart &&
            cell.date <= displayEnd;
          const isEdge = cell.date === displayStart || cell.date === displayEnd;
          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => handleDayClick(cell.date)}
              className={`flex h-8 w-8 items-center justify-center rounded-md text-body transition-colors duration-fast ease-standard ${
                isEdge
                  ? "bg-action font-semibold text-on-primary"
                  : inRange
                    ? "bg-surface-2 text-primary"
                    : cell.date === today
                      ? "font-semibold text-primary"
                      : "text-ink hover:bg-surface-1"
              }`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
        <p className="text-[12px] text-ink-subdued">
          {pendingStart ? "Escolhe a data de fim" : "Escolhe a data de início"}
        </p>
        {allowClear && (value.start || pendingStart) && (
          <button
            type="button"
            onClick={onClear}
            className="text-[12px] font-semibold text-action hover:text-action-hover"
          >
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}

export function DateRangePicker({
  value,
  onChange,
  maxRangeDays,
  allowClear = true,
  align = "left",
  placeholder = "Selecionar datas",
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
  maxRangeDays?: number;
  allowClear?: boolean;
  align?: "left" | "right";
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const label =
    value.start && value.end
      ? formatRangeLabel(value.start, value.end)
      : value.start
        ? `A partir de ${formatDateLabel(value.start)}`
        : placeholder;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 items-center gap-2 rounded-md border border-border bg-canvas px-3 text-body text-ink hover:bg-surface-1"
      >
        <Calendar className="h-4 w-4 text-ink-subdued" strokeWidth={2} />
        {label}
      </button>

      {open && (
        <CalendarPanel
          value={value}
          maxRangeDays={maxRangeDays}
          allowClear={allowClear}
          align={align}
          onSelect={(range) => {
            onChange(range);
            setOpen(false);
          }}
          onClear={() => {
            onChange({ start: null, end: null });
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
