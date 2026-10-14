"use client";

import { useState } from "react";
import { Building2, Plus } from "lucide-react";
import type { Room } from "@/lib/rooms";
import type { RoomTypology } from "@/lib/room-typologies";
import { RoomCard } from "./room-card";
import { TypologyCard } from "./typology-card";
import { TypologyFormModal } from "./typology-form-modal";
import { TypologyDetail } from "./typology-detail";

export function TypologiesView({
  propertyId,
  typologies,
  rooms,
}: {
  propertyId: string;
  typologies: RoomTypology[];
  rooms: Room[];
}) {
  const [selectedTypologyId, setSelectedTypologyId] = useState<string | null>(
    null,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTypology, setEditingTypology] = useState<
    RoomTypology | undefined
  >(undefined);

  const selectedTypology =
    typologies.find((t) => t.id === selectedTypologyId) ?? null;

  if (selectedTypology) {
    return (
      <TypologyDetail
        propertyId={propertyId}
        typology={selectedTypology}
        typologies={typologies}
        rooms={rooms.filter((r) => r.typology_id === selectedTypology.id)}
        onBack={() => setSelectedTypologyId(null)}
      />
    );
  }

  const unassignedRooms = rooms.filter((r) => !r.typology_id);

  function openCreateModal() {
    setEditingTypology(undefined);
    setModalOpen(true);
  }

  function openEditModal(typology: RoomTypology) {
    setEditingTypology(typology);
    setModalOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-body text-ink-muted">
          Organiza os teus alojamentos por tipologia (ex: T1, T2, Suite).
        </p>
        <button
          type="button"
          onClick={openCreateModal}
          className="flex min-h-11 items-center gap-2 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Nova tipologia
        </button>
      </div>

      {typologies.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-canvas py-16 text-center">
          <Building2 className="h-8 w-8 text-ink-subdued" strokeWidth={1.5} />
          <p className="text-body font-semibold text-ink">
            Ainda não tens tipologias
          </p>
          <p className="max-w-sm text-body text-ink-subdued">
            Cria a primeira tipologia (ex: &ldquo;T2 Vista Mar&rdquo;) para
            começares a agrupar os teus quartos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {typologies.map((typology) => (
            <TypologyCard
              key={typology.id}
              typology={typology}
              roomCount={
                rooms.filter((r) => r.typology_id === typology.id).length
              }
              onOpen={() => setSelectedTypologyId(typology.id)}
              onEdit={() => openEditModal(typology)}
            />
          ))}
        </div>
      )}

      {unassignedRooms.length > 0 && (
        <div className="flex flex-col gap-4 border-t border-border pt-6">
          <div>
            <h3 className="text-body font-bold text-ink">
              Quartos sem tipologia
            </h3>
            <p className="text-[12px] text-ink-subdued">
              Edita cada quarto para lhe atribuíres uma tipologia.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {unassignedRooms.map((room) => (
              <RoomCard key={room.id} room={room} typologies={typologies} />
            ))}
          </div>
        </div>
      )}

      {modalOpen && (
        <TypologyFormModal
          typology={editingTypology}
          propertyId={propertyId}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
