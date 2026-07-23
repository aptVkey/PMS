"use client";

import { useState } from "react";
import { Plus, BedDouble } from "lucide-react";
import type { Room } from "@/lib/rooms";
import { RoomCard } from "./room-card";
import { RoomFormModal } from "./room-form-modal";

export function RoomsGridView({
  propertyId,
  propertyName,
  rooms,
}: {
  propertyId: string;
  propertyName: string;
  rooms: Room[];
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-body text-ink-muted">
          Gere o teu alojamento, tipo e disponibilidade.
        </p>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex min-h-11 items-center gap-2 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Adicionar alojamento
        </button>
      </div>

      {rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-canvas py-16 text-center">
          <BedDouble
            className="h-8 w-8 text-ink-subdued"
            strokeWidth={1.5}
          />
          <p className="text-body font-semibold text-ink">
            Ainda não tens alojamentos
          </p>
          <p className="max-w-sm text-body text-ink-subdued">
            Adiciona o primeiro alojamento para começares a preparar o teu
            inventário.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} entityLabel="alojamento" />
          ))}
        </div>
      )}

      {modalOpen && (
        <RoomFormModal
          propertyId={propertyId}
          defaultName={propertyName}
          entityLabel="alojamento"
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
