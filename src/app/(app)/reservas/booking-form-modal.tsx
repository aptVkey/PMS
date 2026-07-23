"use client";

import { useActionState, useEffect, useState } from "react";
import { X } from "lucide-react";
import { saveBooking, type BookingFormState } from "./actions";
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  CHANNEL_SUGGESTIONS,
  formatBookingCode,
  type Booking,
} from "@/lib/bookings";
import type { Room } from "@/lib/rooms";
import type { Guest } from "@/lib/guests";
import {
  calculateStayTotal,
  resolveMinStay,
  type RoomDailyPrice,
  type RoomRatePeriod,
} from "@/lib/pricing";
import { PaymentsSection } from "./payments-section";

const initialState: BookingFormState = undefined;

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
const labelClasses = "text-body font-semibold text-ink";

function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export function BookingFormModal({
  booking,
  rooms,
  guests,
  ratePeriods,
  dailyPrices,
  prefill,
  onClose,
}: {
  booking?: Booking;
  rooms: Room[];
  guests: Guest[];
  ratePeriods: RoomRatePeriod[];
  dailyPrices: RoomDailyPrice[];
  prefill?: { roomId?: string; checkIn?: string; checkOut?: string };
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    saveBooking,
    initialState,
  );

  const [roomId, setRoomId] = useState(
    booking?.room_id ?? prefill?.roomId ?? rooms[0]?.id ?? "",
  );
  const [checkIn, setCheckIn] = useState(
    booking?.check_in ?? prefill?.checkIn ?? "",
  );
  const [checkOut, setCheckOut] = useState(
    booking?.check_out ?? prefill?.checkOut ?? "",
  );
  const [manualTotal, setManualTotal] = useState<number | null>(
    booking ? booking.total_amount : null,
  );

  useEffect(() => {
    if (state && "success" in state) {
      onClose();
    }
  }, [state, onClose]);

  const nights = nightsBetween(checkIn, checkOut);
  const room = rooms.find((r) => r.id === roomId);
  const roomRatePeriods = ratePeriods.filter((p) => p.room_id === roomId);
  const roomDailyPrices = dailyPrices.filter((d) => d.room_id === roomId);

  const suggestedTotal =
    room && nights > 0
      ? calculateStayTotal(
          checkIn,
          checkOut,
          room.base_price,
          roomRatePeriods,
          roomDailyPrices,
        )
      : 0;

  const totalAmount = manualTotal ?? suggestedTotal;

  const applicableMinStay = room
    ? resolveMinStay(checkIn, room.min_stay_nights, roomRatePeriods)
    : null;
  const belowMinStay =
    applicableMinStay != null && nights > 0 && nights < applicableMinStay;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-canvas shadow-popover">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-[18px] font-bold text-ink">
            {booking
              ? `Editar reserva · ${formatBookingCode(booking.booking_number)}`
              : "Adicionar reserva"}
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

        <div className="flex flex-col gap-5 overflow-y-auto px-6 py-5">
        <form
          id="booking-form"
          action={formAction}
          className="flex flex-col gap-5"
        >
          {booking && <input type="hidden" name="id" value={booking.id} />}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="guestId" className={labelClasses}>
                Hóspede
              </label>
              {guests.length === 0 ? (
                <p className="text-body text-ink-subdued">
                  Ainda não tens hóspedes. Adiciona um em Hóspedes / CRM
                  primeiro.
                </p>
              ) : (
                <select
                  id="guestId"
                  name="guestId"
                  required
                  defaultValue={booking?.guest_id ?? ""}
                  className={inputClasses}
                >
                  <option value="" disabled>
                    Selecionar...
                  </option>
                  {guests.map((guest) => (
                    <option key={guest.id} value={guest.id}>
                      {guest.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="roomId" className={labelClasses}>
                Quarto
              </label>
              {rooms.length === 0 ? (
                <p className="text-body text-ink-subdued">
                  Ainda não tens quartos. Adiciona um em Alojamentos
                  primeiro.
                </p>
              ) : (
                <select
                  id="roomId"
                  name="roomId"
                  required
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className={inputClasses}
                >
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="checkIn" className={labelClasses}>
                Check-in
              </label>
              <input
                id="checkIn"
                name="checkIn"
                type="date"
                required
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className={inputClasses}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="checkOut" className={labelClasses}>
                Check-out
              </label>
              <input
                id="checkOut"
                name="checkOut"
                type="date"
                required
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className={inputClasses}
              />
              {nights > 0 && (
                <p
                  className={`text-[12px] ${belowMinStay ? "font-semibold text-primary" : "text-ink-subdued"}`}
                >
                  {nights} {nights === 1 ? "noite" : "noites"}
                  {belowMinStay
                    ? ` · Estadia mínima de ${applicableMinStay} noites`
                    : ""}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="numAdults" className="text-[12px] text-ink-subdued">
                Adultos
              </label>
              <input
                id="numAdults"
                name="numAdults"
                type="number"
                min={1}
                required
                defaultValue={booking?.num_adults ?? 1}
                className={inputClasses}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="numChildren" className="text-[12px] text-ink-subdued">
                Crianças
              </label>
              <input
                id="numChildren"
                name="numChildren"
                type="number"
                min={0}
                required
                defaultValue={booking?.num_children ?? 0}
                className={inputClasses}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="numInfants" className="text-[12px] text-ink-subdued">
                Bebés
              </label>
              <input
                id="numInfants"
                name="numInfants"
                type="number"
                min={0}
                required
                defaultValue={booking?.num_infants ?? 0}
                className={inputClasses}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="status" className={labelClasses}>
                Estado
              </label>
              <select
                id="status"
                name="status"
                defaultValue={booking?.status ?? "pendente"}
                className={inputClasses}
              >
                {BOOKING_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {BOOKING_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="totalAmount" className={labelClasses}>
                Valor total (€)
              </label>
              <input
                id="totalAmount"
                name="totalAmount"
                type="number"
                min={0}
                step="0.01"
                required
                value={totalAmount}
                onChange={(e) => setManualTotal(Number(e.target.value))}
                className={inputClasses}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="channel" className={labelClasses}>
              Canal / Origem
            </label>
            <input
              id="channel"
              name="channel"
              type="text"
              list="channel-suggestions"
              defaultValue={booking?.channel ?? ""}
              placeholder="Ex: Direto, Booking.com..."
              className={inputClasses}
            />
            <datalist id="channel-suggestions">
              {CHANNEL_SUGGESTIONS.map((channel) => (
                <option key={channel} value={channel} />
              ))}
            </datalist>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="notes" className={labelClasses}>
              Notas
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={booking?.notes ?? ""}
              placeholder="Pedidos especiais, informações adicionais..."
              className={`${inputClasses} min-h-0 py-2`}
            />
          </div>

          {state && "error" in state && (
            <p aria-live="polite" className="text-body text-error">
              {state.error}
            </p>
          )}
        </form>

        {booking && <PaymentsSection booking={booking} />}

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-md border border-border bg-canvas px-4 text-body font-semibold text-ink transition-colors duration-fast ease-standard hover:bg-surface-1"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="booking-form"
            disabled={pending || rooms.length === 0 || guests.length === 0}
            className="min-h-11 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending
              ? "A guardar..."
              : booking
                ? "Guardar alterações"
                : "Guardar reserva"}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
