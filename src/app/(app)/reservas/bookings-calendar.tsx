"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BOOKING_STATUS_LABELS, type Booking, type BookingStatus } from "@/lib/bookings";
import type { Room } from "@/lib/rooms";
import type { Guest } from "@/lib/guests";
import type { RoomDailyPrice, RoomRatePeriod } from "@/lib/pricing";
import {
  addDaysISO,
  diffDaysISO,
  formatRangeLabel,
  getDaysWindow,
  todayISO,
  WEEKDAY_LABELS,
} from "./date-utils";
import { BookingFormModal } from "./booking-form-modal";
import { DateRangePicker } from "./date-range-picker";

const DEFAULT_WINDOW_DAYS = 30;
const MAX_WINDOW_DAYS = 90;
const ROOM_COL_WIDTH = 168;
const MIN_DAY_WIDTH = 30;
const MIN_HALF_DAY_WIDTH = MIN_DAY_WIDTH / 2;
const ROW_HEIGHT = 52;

const BAR_STYLES: Record<BookingStatus, string> = {
  pendente: "bg-highlight text-highlight-ink",
  confirmada: "bg-action text-on-primary",
  em_curso: "bg-primary text-on-primary",
  concluida: "bg-success text-on-primary",
  cancelada: "bg-ink-subdued text-on-primary line-through opacity-60",
};

type PendingCreate = { roomId: string; checkIn: string; checkOut: string };

export function BookingsCalendar({
  bookings,
  rooms,
  guests,
  ratePeriods,
  dailyPrices,
}: {
  bookings: Booking[];
  rooms: Room[];
  guests: Guest[];
  ratePeriods: RoomRatePeriod[];
  dailyPrices: RoomDailyPrice[];
}) {
  const today = todayISO();
  const [rangeStart, setRangeStart] = useState(today);
  const [rangeEnd, setRangeEnd] = useState(
    addDaysISO(today, DEFAULT_WINDOW_DAYS - 1),
  );
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [pendingCreate, setPendingCreate] = useState<PendingCreate | null>(
    null,
  );

  const windowDays = diffDaysISO(rangeStart, rangeEnd) + 1;
  const days = useMemo(
    () => getDaysWindow(rangeStart, windowDays),
    [rangeStart, windowDays],
  );

  function shiftWindow(direction: 1 | -1) {
    const offset = windowDays * direction;
    setRangeStart((prev) => addDaysISO(prev, offset));
    setRangeEnd((prev) => addDaysISO(prev, offset));
  }

  function goToToday() {
    setRangeStart(today);
    setRangeEnd(addDaysISO(today, DEFAULT_WINDOW_DAYS - 1));
  }

  const firstDate = days[0]?.date;
  const lastDate = days[days.length - 1]?.date;

  // Each day is split into 2 grid sub-columns (morning/afternoon) so a
  // booking's bar can start at the middle of its check-in day (arrival is
  // in the afternoon) and end at the middle of its check-out day (departure
  // is in the morning). This makes same-day turnovers visible: the outgoing
  // bar ends and the incoming bar begins at the same halfway point instead
  // of the check-out day looking like a plain, ambiguous empty/occupied day.
  function barRangeFor(booking: Booking) {
    if (!firstDate || !lastDate) return null;
    if (booking.check_out <= firstDate || booking.check_in > lastDate) {
      return null;
    }

    let startLine: number;
    if (booking.check_in < firstDate) {
      startLine = 1;
    } else {
      const startIdx = days.findIndex((d) => d.date === booking.check_in);
      if (startIdx === -1) return null;
      startLine = 2 * startIdx + 2;
    }

    let endLine: number;
    if (booking.check_out > lastDate) {
      endLine = days.length * 2 + 1;
    } else {
      const endIdx = days.findIndex((d) => d.date === booking.check_out);
      if (endIdx === -1) return null;
      endLine = 2 * endIdx + 2;
    }

    if (endLine <= startLine) return null;
    return { startLine, endLine };
  }

  const gridTemplateColumns = `repeat(${days.length * 2}, minmax(${MIN_HALF_DAY_WIDTH}px, 1fr))`;

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-canvas py-16 text-center">
        <p className="text-body font-semibold text-ink">
          Ainda não tens quartos
        </p>
        <p className="max-w-sm text-body text-ink-subdued">
          Adiciona quartos em Alojamentos para veres o calendário.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => shiftWindow(-1)}
            aria-label="Período anterior"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-ink hover:bg-surface-1"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>
          <p className="min-w-[180px] text-center text-body font-semibold text-ink">
            {formatRangeLabel(rangeStart, rangeEnd)}
          </p>
          <button
            type="button"
            onClick={() => shiftWindow(1)}
            aria-label="Período seguinte"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-ink hover:bg-surface-1"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={goToToday}
            className="min-h-9 rounded-md border border-border px-3 text-body font-semibold text-ink hover:bg-surface-1"
          >
            Hoje
          </button>

          <span className="mx-1 h-6 w-px bg-border" />

          <DateRangePicker
            value={{ start: rangeStart, end: rangeEnd }}
            onChange={({ start, end }) => {
              if (!start || !end) return;
              setRangeStart(start);
              setRangeEnd(end);
            }}
            maxRangeDays={MAX_WINDOW_DAYS}
            allowClear={false}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[12px] text-ink-muted">
          {(Object.keys(BOOKING_STATUS_LABELS) as BookingStatus[]).map(
            (status) => (
              <span key={status} className="flex items-center gap-1.5">
                <span
                  className={`h-2.5 w-2.5 rounded-sm ${BAR_STYLES[status].split(" ")[0]}`}
                />
                {BOOKING_STATUS_LABELS[status]}
              </span>
            ),
          )}
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rotate-45 rounded-[2px] bg-highlight" />
            Checkout + Check-in
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-canvas shadow-card">
        <div className="min-w-full">
          <div className="flex border-b border-border bg-surface-1">
            <div
              style={{ width: ROOM_COL_WIDTH }}
              className="shrink-0 px-3 py-2 text-[12px] font-semibold uppercase tracking-wide text-ink-subdued"
            >
              Quarto
            </div>
            <div
              className="grid flex-1"
              style={{ gridTemplateColumns }}
            >
              {days.map((d) => (
                <div
                  key={d.date}
                  className={`col-span-2 border-l border-border py-2 text-center text-[11px] ${
                    d.date === today
                      ? "bg-surface-2 font-bold text-primary"
                      : d.isWeekend
                        ? "bg-surface-1 text-ink-subdued"
                        : "text-ink-subdued"
                  }`}
                >
                  <div>{WEEKDAY_LABELS[d.weekday]}</div>
                  <div>{d.day}</div>
                </div>
              ))}
            </div>
          </div>

          {rooms.map((room) => {
            const roomBookings = bookings.filter(
              (b) => b.room_id === room.id && b.status !== "cancelada",
            );
            const checkoutDates = new Set(
              roomBookings.map((b) => b.check_out),
            );
            const turnoverDates = roomBookings
              .map((b) => b.check_in)
              .filter(
                (date, i, arr) =>
                  checkoutDates.has(date) && arr.indexOf(date) === i,
              );

            return (
              <div
                key={room.id}
                className="flex border-b border-border last:border-0"
                style={{ height: ROW_HEIGHT }}
              >
                <div
                  style={{ width: ROOM_COL_WIDTH }}
                  className="sticky left-0 z-10 flex shrink-0 items-center border-r border-border bg-canvas px-3 text-body font-semibold text-ink"
                >
                  <span className="truncate">{room.name}</span>
                </div>
                <div
                  className="relative grid h-full flex-1"
                  style={{ gridTemplateColumns }}
                >
                  {days.map((d) => (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() =>
                        setPendingCreate({
                          roomId: room.id,
                          checkIn: d.date,
                          checkOut: addDaysISO(d.date, 1),
                        })
                      }
                      aria-label={`Adicionar reserva em ${room.name} a ${d.date}`}
                      className={`col-span-2 h-full border-l border-border transition-colors duration-fast ease-standard hover:bg-surface-1 ${
                        d.date === today ? "bg-surface-2" : ""
                      }`}
                    />
                  ))}

                  {roomBookings.map((booking) => {
                    const range = barRangeFor(booking);
                    if (!range) return null;
                    return (
                      <button
                        key={booking.id}
                        type="button"
                        onClick={() => setEditingBooking(booking)}
                        style={{
                          gridColumn: `${range.startLine} / ${range.endLine}`,
                          gridRow: 1,
                        }}
                        className={`relative z-[1] my-1.5 mx-0.5 overflow-hidden truncate rounded-md px-2 text-left text-[12px] font-semibold shadow-card ${BAR_STYLES[booking.status]}`}
                        title={`${booking.guest?.name ?? ""} · ${BOOKING_STATUS_LABELS[booking.status]}`}
                      >
                        {booking.guest?.name ?? "—"}
                      </button>
                    );
                  })}

                  {turnoverDates.map((date) => {
                    const idx = days.findIndex((d) => d.date === date);
                    if (idx === -1) return null;
                    return (
                      <div
                        key={`turnover-${date}`}
                        style={{
                          gridColumn: `${2 * idx + 1} / ${2 * idx + 3}`,
                          gridRow: 1,
                        }}
                        className="pointer-events-none relative z-[2] flex items-center justify-center"
                        title="Checkout e check-in no mesmo dia"
                      >
                        <span className="h-3.5 w-3.5 rotate-45 rounded-[3px] border-2 border-canvas bg-highlight shadow-card" />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {editingBooking && (
        <BookingFormModal
          booking={editingBooking}
          rooms={rooms}
          guests={guests}
          ratePeriods={ratePeriods}
          dailyPrices={dailyPrices}
          onClose={() => setEditingBooking(null)}
        />
      )}
      {pendingCreate && (
        <BookingFormModal
          rooms={rooms}
          guests={guests}
          ratePeriods={ratePeriods}
          dailyPrices={dailyPrices}
          prefill={pendingCreate}
          onClose={() => setPendingCreate(null)}
        />
      )}
    </div>
  );
}
