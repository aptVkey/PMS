"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { Guest } from "@/lib/guests";
import { autoTagLabels, type CrmTag, type GuestStats } from "@/lib/crm";
import type { GuestBooking } from "./page";
import { GuestFormModal } from "./guest-form-modal";
import { ConfirmDeleteModal } from "./confirm-delete-modal";
import { ModalPortal } from "@/components/modal-portal";
import { AutoChip, TagChip, formatMoney } from "./crm-ui";

const dateLabel = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-PT") : "—";

export function GuestRow({
  guest,
  bookings,
  stats,
  tags,
  onOpen,
}: {
  guest: Guest;
  bookings: GuestBooking[];
  stats: GuestStats;
  tags: CrmTag[];
  onOpen: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const autoLabels = autoTagLabels(stats);

  return (
    <>
      <tr className="border-b border-border last:border-0 hover:bg-surface-1/60">
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={onOpen}
            title="Abrir ficha do hóspede"
            className="text-left text-body font-semibold text-action hover:underline"
          >
            {guest.name}
          </button>
          {guest.nationality && (
            <p className="text-[12px] text-ink-subdued">{guest.nationality}</p>
          )}
          {(tags.length > 0 || autoLabels.length > 0) && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {tags.map((tag) => (
                <TagChip key={tag.id} tag={tag} />
              ))}
              {autoLabels.map((label) => (
                <AutoChip key={label} label={label} />
              ))}
            </div>
          )}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-body text-ink-muted">
          {guest.email && <p>{guest.email}</p>}
          {guest.phone && <p>{guest.phone}</p>}
          {!guest.email && !guest.phone && <span>—</span>}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-center text-body text-ink-muted">
          {stats.stays}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-body text-ink-muted">
          {dateLabel(stats.lastStay)}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-body text-ink-muted">
          {dateLabel(stats.nextStay)}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-body text-ink-muted">
          {stats.value > 0 ? formatMoney(stats.value) : "—"}
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

      <ModalPortal>
        {editing && (
          <GuestFormModal
            guest={guest}
            bookings={bookings}
            onClose={() => setEditing(false)}
          />
        )}
        {deleting && (
          <ConfirmDeleteModal
            guest={guest}
            onClose={() => setDeleting(false)}
          />
        )}
      </ModalPortal>
    </>
  );
}
