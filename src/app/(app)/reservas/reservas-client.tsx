"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarCheck,
  CalendarDays,
  List,
  Plus,
  Search,
} from "lucide-react";
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  formatBookingCode,
  type Booking,
} from "@/lib/bookings";
import type { Room } from "@/lib/rooms";
import type { Guest } from "@/lib/guests";
import type { RoomDailyPrice, RoomRatePeriod } from "@/lib/pricing";
import { todayISO } from "@/lib/date-utils";
import { BookingRow } from "./booking-row";
import { BookingFormModal } from "./booking-form-modal";
import { BookingsCalendar } from "./bookings-calendar";
import { DateRangePicker, type DateRange } from "./date-range-picker";

const selectClasses =
  "min-h-11 rounded-md border border-border bg-canvas px-3 text-body text-ink focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";

type View = "lista" | "calendario";

export function ReservasClient({
  bookings,
  rooms,
  guests,
  ratePeriods,
  dailyPrices,
  initialView = "calendario",
  lockView = false,
  hideHeader = false,
}: {
  bookings: Booking[];
  rooms: Room[];
  guests: Guest[];
  ratePeriods: RoomRatePeriod[];
  dailyPrices: RoomDailyPrice[];
  initialView?: View;
  lockView?: boolean;
  hideHeader?: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({
    start: null,
    end: null,
  });
  const [view, setView] = useState<View>(initialView);
  // "asc" = próximas primeiro (a partir de hoje); "desc" é o inverso. Não é
  // uma ordenação cronológica cega, senão com 3 anos de histórico importado
  // a lista abria sempre numa reserva de 2023 em vez do que interessa agora.
  const [checkInSort, setCheckInSort] = useState<"asc" | "desc">("asc");

  const filteredBookings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = bookings.filter((booking) => {
      const matchesQuery =
        normalizedQuery === "" ||
        booking.guest?.name.toLowerCase().includes(normalizedQuery) ||
        booking.room?.name.toLowerCase().includes(normalizedQuery) ||
        formatBookingCode(booking.booking_number)
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesStatus =
        statusFilter === "" || booking.status === statusFilter;

      const matchesDate =
        (!dateRange.start || booking.check_in >= dateRange.start) &&
        (!dateRange.end || booking.check_in <= dateRange.end);

      return matchesQuery && matchesStatus && matchesDate;
    });

    const today = todayISO();

    return [...filtered].sort((a, b) => {
      const aFuture = a.check_in >= today;
      const bFuture = b.check_in >= today;
      // Futuras sempre antes de passadas; dentro de cada grupo, futuras da
      // mais próxima para a mais distante e passadas da mais recente para a
      // mais antiga — em ambos os casos, o que está mais perto de hoje
      // aparece primeiro.
      let cmp: number;
      if (aFuture !== bFuture) {
        cmp = aFuture ? -1 : 1;
      } else if (aFuture) {
        cmp = a.check_in.localeCompare(b.check_in);
      } else {
        cmp = b.check_in.localeCompare(a.check_in);
      }
      return checkInSort === "asc" ? cmp : -cmp;
    });
  }, [bookings, query, statusFilter, dateRange, checkInSort]);

  const hasFilters =
    query !== "" ||
    statusFilter !== "" ||
    dateRange.start !== null ||
    dateRange.end !== null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {hideHeader ? (
          <div />
        ) : (
          <div>
            <h1 className="text-[24px] font-bold text-ink">
              Reservas e pagamentos
            </h1>
            <p className="mt-1 text-body text-ink-muted">
              Gere reservas, cobranças e o estado dos pagamentos.
            </p>
          </div>
        )}
        <div className="flex items-center gap-3">
          {!lockView && (
            <div className="flex rounded-md border border-border p-0.5">
              <button
                type="button"
                onClick={() => setView("calendario")}
                className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-body font-semibold transition-colors duration-fast ease-standard ${
                  view === "calendario"
                    ? "bg-surface-2 text-primary"
                    : "text-ink-muted hover:bg-surface-1"
                }`}
              >
                <CalendarDays className="h-4 w-4" strokeWidth={2} />
                Calendário
              </button>
              <button
                type="button"
                onClick={() => setView("lista")}
                className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-body font-semibold transition-colors duration-fast ease-standard ${
                  view === "lista"
                    ? "bg-surface-2 text-primary"
                    : "text-ink-muted hover:bg-surface-1"
                }`}
              >
                <List className="h-4 w-4" strokeWidth={2} />
                Lista
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex min-h-11 items-center gap-2 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Adicionar reserva
          </button>
        </div>
      </div>

      {view === "calendario" ? (
        <BookingsCalendar
          bookings={bookings}
          rooms={rooms}
          guests={guests}
          ratePeriods={ratePeriods}
          dailyPrices={dailyPrices}
        />
      ) : (
        <>
          {bookings.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subdued"
                  strokeWidth={2}
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Pesquisar por hóspede, quarto ou ID..."
                  className={`${selectClasses} w-full pl-9`}
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={selectClasses}
              >
                <option value="">Todos os estados</option>
                {BOOKING_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {BOOKING_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                align="right"
                placeholder="Filtrar por datas"
              />
            </div>
          )}

          {bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-canvas py-16 text-center">
              <CalendarCheck
                className="h-8 w-8 text-ink-subdued"
                strokeWidth={1.5}
              />
              <p className="text-body font-semibold text-ink">
                Ainda não tens reservas
              </p>
              <p className="max-w-sm text-body text-ink-subdued">
                Adiciona a primeira reserva para começares a gerir o teu
                calendário e pagamentos.
              </p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-canvas py-16 text-center">
              <Search className="h-8 w-8 text-ink-subdued" strokeWidth={1.5} />
              <p className="text-body font-semibold text-ink">
                Nenhuma reserva encontrada
              </p>
              <p className="max-w-sm text-body text-ink-subdued">
                {hasFilters
                  ? "Tenta ajustar a pesquisa ou os filtros."
                  : "Adiciona reservas para as veres aqui."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-canvas shadow-card">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border bg-surface-1 text-[12px] font-semibold uppercase tracking-wide text-ink-subdued">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Hóspede</th>
                    <th className="px-4 py-3">Quarto</th>
                    <th className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          setCheckInSort((prev) =>
                            prev === "asc" ? "desc" : "asc",
                          )
                        }
                        className="flex items-center gap-1 text-[12px] font-semibold uppercase tracking-wide text-ink-subdued hover:text-ink"
                      >
                        Datas (check-in)
                        {checkInSort === "asc" ? (
                          <ArrowUp className="h-3 w-3" strokeWidth={2.5} />
                        ) : (
                          <ArrowDown className="h-3 w-3" strokeWidth={2.5} />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3">Pessoas</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Pago / Total</th>
                    <th className="px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => (
                    <BookingRow
                      key={booking.id}
                      booking={booking}
                      rooms={rooms}
                      guests={guests}
                      ratePeriods={ratePeriods}
                      dailyPrices={dailyPrices}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <BookingFormModal
          rooms={rooms}
          guests={guests}
          ratePeriods={ratePeriods}
          dailyPrices={dailyPrices}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
