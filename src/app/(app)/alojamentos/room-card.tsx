"use client";

import { useState } from "react";
import { BedDouble, Users, Bath, Pencil, Trash2 } from "lucide-react";
import { ROOM_TYPE_LABELS, type Room } from "@/lib/rooms";
import type { RoomTypology } from "@/lib/room-typologies";
import { RoomFormModal } from "./room-form-modal";
import { ConfirmDeleteModal } from "./confirm-delete-modal";

export function RoomCard({
  room,
  typologies,
  entityLabel = "quarto",
}: {
  room: Room;
  typologies?: RoomTypology[];
  entityLabel?: "quarto" | "alojamento";
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const typologyPhoto = typologies?.find((t) => t.id === room.typology_id)
    ?.photos[0];
  const cover = room.photos[0] ?? typologyPhoto;
  const totalGuests = room.capacity_adults + room.capacity_children;
  const totalBeds = room.bedrooms.reduce(
    (sum, bedroom) =>
      sum + bedroom.beds.reduce((bedSum, bed) => bedSum + bed.count, 0),
    0,
  );

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-canvas shadow-card">
      <div className="relative h-40 w-full bg-surface-1">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL
          <img
            src={cover}
            alt={room.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BedDouble className="h-8 w-8 text-ink-subdued" strokeWidth={1.5} />
          </div>
        )}
        <span
          className={`absolute right-3 top-3 rounded-pill px-3 py-1 text-[12px] font-semibold ${
            room.is_published
              ? "bg-surface-2 text-primary"
              : "bg-highlight text-highlight-ink"
          }`}
        >
          {room.is_published ? "Publicado" : "Rascunho"}
        </span>
        {!room.photos[0] && typologyPhoto && (
          <span className="absolute left-3 top-3 rounded-pill bg-canvas/90 px-3 py-1 text-[12px] font-semibold text-ink-muted">
            Foto da tipologia
          </span>
        )}
      </div>

      <div className="p-5">
        <p className="text-[17px] font-semibold tracking-tight text-ink">{room.name}</p>
        <p className="text-[12px] text-ink-subdued">
          {ROOM_TYPE_LABELS[room.type]}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-[12px] text-ink-muted">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" strokeWidth={2} />
            {totalGuests}
            {room.capacity_infants > 0 && ` +${room.capacity_infants} bebé(s)`}
          </span>
          <span className="flex items-center gap-1">
            <BedDouble className="h-3.5 w-3.5" strokeWidth={2} />
            {totalBeds}
          </span>
          <span className="flex items-center gap-1">
            <Bath className="h-3.5 w-3.5" strokeWidth={2} />
            {room.bathrooms.length}
          </span>
        </div>

        <p className="mt-5 text-[20px] font-semibold tracking-tight text-ink">
          {room.base_price > 0 ? (
            <>
              {new Intl.NumberFormat("pt-PT", {
                style: "currency",
                currency: room.currency,
              }).format(room.base_price)}
              <span className="text-[12px] font-normal text-ink-subdued"> / noite</span>
            </>
          ) : (
            <span className="font-normal text-ink-subdued">
              Preço por definir
            </span>
          )}
        </p>

        <div className="mt-4 flex gap-2 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-border text-body font-semibold text-ink transition-colors duration-fast ease-standard hover:bg-surface-1"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
            Editar
          </button>
          <button
            type="button"
            onClick={() => setDeleting(true)}
            className="flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-border text-body font-semibold text-error transition-colors duration-fast ease-standard hover:bg-error/10"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            Eliminar
          </button>
        </div>
      </div>

      {editing && (
        <RoomFormModal
          room={room}
          propertyId={room.property_id}
          typologies={typologies}
          entityLabel={entityLabel}
          onClose={() => setEditing(false)}
        />
      )}
      {deleting && (
        <ConfirmDeleteModal
          room={room}
          entityLabel={entityLabel}
          onClose={() => setDeleting(false)}
        />
      )}
    </div>
  );
}
