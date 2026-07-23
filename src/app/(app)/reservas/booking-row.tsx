"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_STYLES,
  formatBookingCode,
  type Booking,
} from "@/lib/bookings";
import type { Room } from "@/lib/rooms";
import type { Guest } from "@/lib/guests";
import type { RoomDailyPrice, RoomRatePeriod } from "@/lib/pricing";
import { BookingFormModal } from "./booking-form-modal";
import { ConfirmDeleteModal } from "./confirm-delete-modal";

export function BookingRow({
  booking,
  rooms,
  guests,
  ratePeriods,
  dailyPrices,
}: {
  booking: Booking;
  rooms: Room[];
  guests: Guest[];
  ratePeriods: RoomRatePeriod[];
  dailyPrices: RoomDailyPrice[];
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const totalPaid = (booking.payments ?? []).reduce(
    (sum, p) => sum + p.amount,
    0,
  );

  const totalGuests =
    booking.num_adults + booking.num_children + booking.num_infants;
  const guestBreakdown = [
    booking.num_adults > 0 &&
      `${booking.num_adults} ${booking.num_adults === 1 ? "adulto" : "adultos"}`,
    booking.num_children > 0 &&
      `${booking.num_children} ${booking.num_children === 1 ? "criança" : "crianças"}`,
    booking.num_infants > 0 &&
      `${booking.num_infants} ${booking.num_infants === 1 ? "bebé" : "bebés"}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <tr className="border-b border-border last:border-0">
        <td className="whitespace-nowrap px-4 py-3 text-body font-semibold text-ink-muted">
          {formatBookingCode(booking.booking_number)}
        </td>
        <td className="whitespace-nowrap px-4 py-3">
          <p className="text-body font-semibold text-ink">
            {booking.guest?.name ?? "—"}
          </p>
          {booking.channel && (
            <p className="text-[12px] text-ink-subdued">{booking.channel}</p>
          )}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-body text-ink-muted">
          {booking.room?.name ?? "—"}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-body text-ink-muted">
          {new Date(booking.check_in).toLocaleDateString("pt-PT")} →{" "}
          {new Date(booking.check_out).toLocaleDateString("pt-PT")}
        </td>
        <td className="whitespace-nowrap px-4 py-3">
          <p className="text-body text-ink">
            {totalGuests} {totalGuests === 1 ? "pessoa" : "pessoas"}
          </p>
          {(booking.num_children > 0 || booking.num_infants > 0) && (
            <p className="text-[12px] text-ink-subdued">{guestBreakdown}</p>
          )}
        </td>
        <td className="whitespace-nowrap px-4 py-3">
          <span
            className={`rounded-pill px-3 py-1 text-[12px] font-semibold ${BOOKING_STATUS_STYLES[booking.status]}`}
          >
            {BOOKING_STATUS_LABELS[booking.status]}
          </span>
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-body text-ink-muted">
          {totalPaid.toFixed(2)} € / {booking.total_amount.toFixed(2)} €
        </td>
        <td className="whitespace-nowrap px-4 py-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Editar reserva"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink transition-colors duration-fast ease-standard hover:bg-surface-1"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => setDeleting(true)}
              aria-label="Eliminar reserva"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-error transition-colors duration-fast ease-standard hover:bg-error/10"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        </td>
      </tr>

      {editing && (
        <BookingFormModal
          booking={booking}
          rooms={rooms}
          guests={guests}
          ratePeriods={ratePeriods}
          dailyPrices={dailyPrices}
          onClose={() => setEditing(false)}
        />
      )}
      {deleting && (
        <ConfirmDeleteModal
          booking={booking}
          onClose={() => setDeleting(false)}
        />
      )}
    </>
  );
}
