"use client";

import { useState } from "react";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import type { Room } from "@/lib/rooms";
import type { RoomTypology } from "@/lib/room-typologies";
import { PhotoGallery } from "./photo-gallery";
import { RoomCard } from "./room-card";
import { RoomFormModal } from "./room-form-modal";
import { TypologyFormModal } from "./typology-form-modal";
import { ConfirmDeleteTypologyModal } from "./confirm-delete-typology-modal";

export function TypologyDetail({
  propertyId,
  typology,
  typologies,
  rooms,
  onBack,
}: {
  propertyId: string;
  typology: RoomTypology;
  typologies: RoomTypology[];
  rooms: Room[];
  onBack: () => void;
}) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [roomModalOpen, setRoomModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-1.5 text-body font-semibold text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        Voltar às tipologias
      </button>

      <div className="overflow-hidden rounded-lg border border-border bg-canvas shadow-card">
        <PhotoGallery photos={typology.photos} alt={typology.name} />

        <div className="flex items-start justify-between gap-3 p-5">
          <div>
            <h2 className="text-[18px] font-bold text-ink">{typology.name}</h2>
            {typology.description && (
              <p className="mt-1 text-body text-ink-muted">
                {typology.description}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setEditModalOpen(true)}
              aria-label="Editar tipologia"
              className="flex h-9 w-9 items-center justify-center rounded-md text-ink-subdued transition-colors duration-fast ease-standard hover:bg-surface-1 hover:text-ink"
            >
              <Pencil className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              aria-label="Eliminar tipologia"
              className="flex h-9 w-9 items-center justify-center rounded-md text-ink-subdued transition-colors duration-fast ease-standard hover:bg-error/10 hover:text-error"
            >
              <Trash2 className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-body font-bold text-ink">
          Quartos desta tipologia
        </h3>
        <button
          type="button"
          onClick={() => setRoomModalOpen(true)}
          className="flex min-h-11 items-center gap-2 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Adicionar quarto
        </button>
      </div>

      {rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-canvas py-16 text-center">
          <p className="text-body font-semibold text-ink">
            Ainda não tens quartos nesta tipologia
          </p>
          <p className="max-w-sm text-body text-ink-subdued">
            Adiciona o primeiro quarto desta tipologia.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} typologies={typologies} />
          ))}
        </div>
      )}

      {roomModalOpen && (
        <RoomFormModal
          propertyId={propertyId}
          typologies={typologies}
          defaultTypologyId={typology.id}
          onClose={() => setRoomModalOpen(false)}
        />
      )}
      {editModalOpen && (
        <TypologyFormModal
          typology={typology}
          propertyId={propertyId}
          onClose={() => setEditModalOpen(false)}
        />
      )}
      {deleteModalOpen && (
        <ConfirmDeleteTypologyModal
          typology={typology}
          roomCount={rooms.length}
          onClose={() => setDeleteModalOpen(false)}
        />
      )}
    </div>
  );
}
