"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { Property } from "@/lib/property";
import type { Room } from "@/lib/rooms";
import type { RoomTypology } from "@/lib/room-typologies";
import { PropertyWizardStep1Modal } from "./property-wizard-step1-modal";
import { PropertyWizardStep2Modal } from "./property-wizard-step2-modal";
import { PropertyCard } from "./property-card";
import { PropertyDetail } from "./property-detail";
import { RoomFormModal } from "./room-form-modal";

export function AlojamentosClient({
  properties,
  typologies,
  rooms,
}: {
  properties: Property[];
  typologies: RoomTypology[];
  rooms: Room[];
}) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<
    string | null
  >(null);
  const [step1Open, setStep1Open] = useState(false);
  const [step2Info, setStep2Info] = useState<{ propertyId: string } | null>(
    null,
  );
  const [singleUnitInfo, setSingleUnitInfo] = useState<{
    propertyId: string;
    name: string;
  } | null>(null);

  const selectedProperty =
    properties.find((p) => p.id === selectedPropertyId) ?? null;

  function handleStep1Created(
    propertyId: string,
    name: string,
    isMultiUnidade: boolean,
  ) {
    setStep1Open(false);
    if (isMultiUnidade) {
      setStep2Info({ propertyId });
    } else {
      setSingleUnitInfo({ propertyId, name });
    }
  }

  function finishWizard(propertyId: string) {
    setStep2Info(null);
    setSingleUnitInfo(null);
    setSelectedPropertyId(propertyId);
  }

  if (selectedProperty) {
    return (
      <PropertyDetail
        property={selectedProperty}
        typologies={typologies.filter(
          (t) => t.property_id === selectedProperty.id,
        )}
        rooms={rooms.filter((r) => r.property_id === selectedProperty.id)}
        onBack={() => setSelectedPropertyId(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-ink">Alojamento</h1>
          <p className="mt-1 text-body text-ink-muted">
            Gere os teus alojamentos e as suas unidades.
          </p>
        </div>

        {properties.length > 0 && (
          <button
            type="button"
            onClick={() => setStep1Open(true)}
            className="flex min-h-11 items-center gap-2 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Adicionar alojamento
          </button>
        )}
      </div>

      {properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-canvas py-24">
          <button
            type="button"
            onClick={() => setStep1Open(true)}
            className="flex min-h-12 items-center gap-2 rounded-md bg-action px-6 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
            Adicionar alojamento
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              unitCount={
                rooms.filter((r) => r.property_id === property.id).length
              }
              onOpen={() => setSelectedPropertyId(property.id)}
            />
          ))}
        </div>
      )}

      {step1Open && (
        <PropertyWizardStep1Modal
          onClose={() => setStep1Open(false)}
          onCreated={handleStep1Created}
        />
      )}
      {step2Info && (
        <PropertyWizardStep2Modal
          propertyId={step2Info.propertyId}
          onClose={() => setStep2Info(null)}
          onFinished={() => finishWizard(step2Info.propertyId)}
        />
      )}
      {singleUnitInfo && (
        <RoomFormModal
          propertyId={singleUnitInfo.propertyId}
          defaultName={singleUnitInfo.name}
          entityLabel="alojamento"
          onClose={() => finishWizard(singleUnitInfo.propertyId)}
        />
      )}
    </div>
  );
}
