"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { DOCUMENT_TYPE_LABELS, type DocumentType, type Guest } from "@/lib/guests";
import type { Booking } from "@/lib/bookings";
import { GuestFormModal } from "./guest-form-modal";
import { ConfirmDeleteModal } from "./confirm-delete-modal";

export function GuestRow({
  guest,
  bookings,
}: {
  guest: Guest;
  bookings: Booking[];
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <>
      <tr className="border-b border-border last:border-0">
        <td className="whitespace-nowrap px-4 py-3">
          <p className="text-body font-semibold text-ink">{guest.name}</p>
          {guest.nationality && (
            <p className="text-[12px] text-ink-subdued">
              {guest.nationality}
            </p>
          )}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-body text-ink-muted">
          {guest.email && <p>{guest.email}</p>}
          {guest.phone && <p>{guest.phone}</p>}
          {!guest.email && !guest.phone && <span>—</span>}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-body text-ink-muted">
          {guest.document_type
            ? DOCUMENT_TYPE_LABELS[guest.document_type as DocumentType]
            : "—"}
          {guest.document_number && (
            <span className="text-ink-subdued"> · {guest.document_number}</span>
          )}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-center text-body text-ink-muted">
          {guest.visit_count}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-body text-ink-muted">
          {guest.last_stay_at
            ? new Date(guest.last_stay_at).toLocaleDateString("pt-PT")
            : "—"}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-body text-ink-muted">
          {guest.total_spent > 0 ? `${guest.total_spent.toFixed(2)} €` : "—"}
        </td>
        <td className="whitespace-nowrap px-4 py-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Editar hóspede"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink transition-colors duration-fast ease-standard hover:bg-surface-1"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => setDeleting(true)}
              aria-label="Eliminar hóspede"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-error transition-colors duration-fast ease-standard hover:bg-error/10"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        </td>
      </tr>

      {editing && (
        <GuestFormModal
          guest={guest}
          bookings={bookings}
          onClose={() => setEditing(false)}
        />
      )}
      {deleting && (
        <ConfirmDeleteModal guest={guest} onClose={() => setDeleting(false)} />
      )}
    </>
  );
}
