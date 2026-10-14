"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  BOOKING_STATUS_LABELS,
  type Booking,
  type BookingStatus,
} from "@/lib/bookings";
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

  // Todas as linhas (cabeçalho + cada quarto) vivem na MESMA grelha CSS, com
  // uma única definição de colunas. Antes cada linha tinha a sua própria
  // grelha independente — visualmente pareciam iguais, mas nada garantia que
  // o browser resolvesse exatamente os mesmos limites de coluna em cada uma,
  // e a linha do cabeçalho desalinhava da coluna fixa "Quarto" ao fazer
  // scroll horizontal (só as linhas de baixo tinham sticky left). Com uma
  // grelha só, o alinhamento entre cabeçalho e linhas é garantido pela
  // própria estrutura, não por coincidência.
  //
  // Coluna 1 = nome do quarto (sticky). Colunas 2..(1+dias*2) = meios-dias,
  // 2 por dia (para a barra da reserva poder começar a meio do dia de
  // check-in e acabar a meio do dia de check-out, tornando visível uma
  // troca no mesmo dia).
  function barRangeFor(booking: Booking) {
    if (!firstDate || !lastDate) return null;
    if (booking.check_out <= firstDate || booking.check_in > lastDate) {
      return null;
    }

    let startLine: number;
    if (booking.check_in < firstDate) {
      startLine = 2;
    } else {
      const startIdx = days.findIndex((d) => d.date === booking.check_in);
      if (startIdx === -1) return null;
      startLine = 2 * startIdx + 3;
    }

    let endLine: number;
    if (booking.check_out > lastDate) {
      endLine = days.length * 2 + 2;
    } else {
      const endIdx = days.findIndex((d) => d.date === booking.check_out);
      if (endIdx === -1) return null;
      endLine = 2 * endIdx + 3;
    }

    if (endLine <= startLine) return null;
    return { startLine, endLine };
  }

  const gridTemplateColumns = `${ROOM_COL_WIDTH}px repeat(${days.length * 2}, minmax(${MIN_HALF_DAY_WIDTH}px, 1fr))`;

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
        <div className="grid min-w-full" style={{ gridTemplateColumns }}>
          {/* Cabeçalho */}
          <div
            style={{ gridColumn: 1, gridRow: 1 }}
            className="sticky left-0 z-20 flex shrink-0 items-center border-b border-border bg-surface-1 px-3 py-2 text-[12px] font-semibold uppercase tracking-wide text-ink-subdued"
          >
            Quarto
          </div>
          {days.map((d, i) => (
            <div
              key={d.date}
              style={{ gridColumn: `${2 * i + 2} / ${2 * i + 4}`, gridRow: 1 }}
              className={`border-b border-l border-border py-2 text-center text-[11px] ${
                d.date === today
                  ? "bg-surface-2 font-bold text-primary"
                  : "bg-surface-1 text-ink-subdued"
              }`}
            >
              <div>{WEEKDAY_LABELS[d.weekday]}</div>
              <div>{d.day}</div>
            </div>
          ))}

          {/* Linhas de cada quarto */}
          {rooms.map((room, roomIdx) => {
            const roomRow = roomIdx + 2;
            const roomBookings = bookings.filter(
              (b) => b.room_id === room.id && b.status !== "cancelada",
            );
            const checkoutDates = new Set(roomBookings.map((b) => b.check_out));
            const turnoverDates = roomBookings
              .map((b) => b.check_in)
              .filter(
                (date, i, arr) =>
                  checkoutDates.has(date) && arr.indexOf(date) === i,
              );
            const isLastRoom = roomIdx === rooms.length - 1;

            return (
              <div key={room.id} style={{ display: "contents" }}>
                <div
                  style={{
                    gridColumn: 1,
                    gridRow: roomRow,
                    height: ROW_HEIGHT,
                  }}
                  className={`sticky left-0 z-10 flex shrink-0 items-center border-r bg-canvas px-3 text-body font-semibold text-ink ${
                    isLastRoom ? "" : "border-b"
                  } border-border`}
                >
                  <span className="truncate">{room.name}</span>
                </div>

                {days.map((d, i) => (
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
                    style={{
                      gridColumn: `${2 * i + 2} / ${2 * i + 4}`,
                      gridRow: roomRow,
                      height: ROW_HEIGHT,
                    }}
                    className={`border-l transition-colors duration-fast ease-standard hover:bg-surface-1 ${
                      isLastRoom ? "" : "border-b"
                    } border-border ${d.date === today ? "bg-surface-2" : ""}`}
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
                        gridRow: roomRow,
                      }}
                      className={`relative z-[1] my-1.5 mx-0.5 self-center overflow-hidden truncate rounded-md px-2 py-1.5 text-left text-[12px] font-semibold shadow-card ${BAR_STYLES[booking.status]}`}
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
                        gridColumn: `${2 * idx + 2} / ${2 * idx + 4}`,
                        gridRow: roomRow,
                      }}
                      className="pointer-events-none relative z-[2] flex items-center justify-center"
                      title="Checkout e check-in no mesmo dia"
                    >
                      <span className="h-3.5 w-3.5 rotate-45 rounded-[3px] border-2 border-canvas bg-highlight shadow-card" />
                    </div>
                  );
                })}
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
