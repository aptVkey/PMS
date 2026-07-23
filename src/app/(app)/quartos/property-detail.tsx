"use client";

import { useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { PROPERTY_TYPE_LABELS, type Property } from "@/lib/property";
import type { Room } from "@/lib/rooms";
import type { RoomTypology } from "@/lib/room-typologies";
import { PropertyNameForm } from "./property-name-form";
import { RoomsGridView } from "./rooms-grid-view";
import { TypologiesView } from "./typologies-view";
import { ConfirmDeletePropertyModal } from "./confirm-delete-property-modal";

export function PropertyDetail({
  property,
  typologies,
  rooms,
  onBack,
}: {
  property: Property;
  typologies: RoomTypology[];
  rooms: Room[];
  onBack: () => void;
}) {
  const [name, setName] = useState(property.name);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-1.5 text-body font-semibold text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        Voltar aos alojamentos
      </button>

      <div>
        <PropertyNameForm
          propertyId={property.id}
          name={name}
          onSaved={setName}
        />
        <p className="mt-1 max-w-xl text-body text-ink-muted">
          {PROPERTY_TYPE_LABELS[property.property_type]}
        </p>
      </div>

      {property.property_type === "multi_unidade" ? (
        <TypologiesView
          propertyId={property.id}
          typologies={typologies}
          rooms={rooms}
        />
      ) : (
        <RoomsGridView
          propertyId={property.id}
          propertyName={name}
          rooms={rooms}
        />
      )}

      <div className="border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setDeleteModalOpen(true)}
          className="flex items-center gap-1.5 text-body font-semibold text-error hover:underline"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} />
          Eliminar este alojamento
        </button>
      </div>

      {deleteModalOpen && (
        <ConfirmDeletePropertyModal
          property={{ ...property, name }}
          onClose={() => setDeleteModalOpen(false)}
          onDeleted={onBack}
        />
      )}
    </div>
  );
}
