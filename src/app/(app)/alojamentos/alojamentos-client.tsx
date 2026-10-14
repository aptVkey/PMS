"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Building2,
  ChevronRight,
  ExternalLink,
  LayoutGrid,
  List,
  Plus,
} from "lucide-react";
import { PROPERTY_TYPE_LABELS, type Property } from "@/lib/property";
import type { Room } from "@/lib/rooms";
import { PropertyWizardStep1Modal } from "./property-wizard-step1-modal";
import { PropertyWizardStep2Modal } from "./property-wizard-step2-modal";
import { PropertyCard } from "./property-card";
import { RoomFormModal } from "./room-form-modal";

type ViewMode = "card" | "lista";

export function AlojamentosClient({
  properties,
  rooms,
}: {
  properties: Property[];
  rooms: Room[];
}) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("card");
  const [step1Open, setStep1Open] = useState(false);
  const [step2Info, setStep2Info] = useState<{ propertyId: string } | null>(
    null,
  );
  const [singleUnitInfo, setSingleUnitInfo] = useState<{
    propertyId: string;
    name: string;
  } | null>(null);

  function openProperty(propertyId: string) {
    router.push(`/alojamentos/${propertyId}`);
  }

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
    openProperty(propertyId);
  }

  function unitCountFor(propertyId: string) {
    return rooms.filter((r) => r.property_id === propertyId).length;
  }

  // Só serve para se distinguirem os cartões de relance — usa a foto de
  // capa do primeiro quarto do alojamento (é o único, na maioria dos casos,
  // já que quase todos os alojamentos são de unidade singular).
  function coverPhotoFor(propertyId: string): string | null {
    return rooms.find((r) => r.property_id === propertyId)?.photos[0] ?? null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-ink">Alojamentos</h1>
          <p className="mt-1 text-body text-ink-muted">
            Gere os teus alojamentos e as suas unidades.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {properties.length > 0 && (
            <div
              role="tablist"
              aria-label="Modo de visualização"
              className="flex items-center rounded-md border border-border bg-canvas p-0.5"
            >
              <ViewToggleButton
                active={view === "card"}
                label="Cartões"
                onClick={() => setView("card")}
              >
                <LayoutGrid className="h-4 w-4" strokeWidth={2} />
              </ViewToggleButton>
              <ViewToggleButton
                active={view === "lista"}
                label="Lista"
                onClick={() => setView("lista")}
              >
                <List className="h-4 w-4" strokeWidth={2} />
              </ViewToggleButton>
            </div>
          )}

          <a
            href="/site"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center gap-2 rounded-md border border-border bg-canvas px-4 text-body font-semibold text-ink transition-colors duration-fast ease-standard hover:bg-surface-1"
          >
            <ExternalLink className="h-4 w-4" strokeWidth={2} />
            Ver website
          </a>

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
      ) : view === "card" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              unitCount={unitCountFor(property.id)}
              coverPhotoUrl={coverPhotoFor(property.id)}
              onOpen={() => openProperty(property.id)}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-canvas shadow-card">
          {properties.map((property, index) => {
            const count = unitCountFor(property.id);
            const coverPhotoUrl = coverPhotoFor(property.id);
            return (
              <button
                key={property.id}
                type="button"
                onClick={() => openProperty(property.id)}
                className={`flex w-full items-center gap-4 px-5 py-4 text-left transition-colors duration-fast ease-standard hover:bg-surface-1 ${
                  index > 0 ? "border-t border-border" : ""
                }`}
              >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-surface-2 text-primary">
                  {coverPhotoUrl ? (
                    <Image
                      src={coverPhotoUrl}
                      alt=""
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Building2 className="h-5 w-5" strokeWidth={2} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-bold text-ink">
                    {property.name}
                  </p>
                  <p className="text-[12px] text-ink-subdued">
                    {PROPERTY_TYPE_LABELS[property.property_type]} · {count}{" "}
                    {count === 1 ? "unidade" : "unidades"}
                  </p>
                </div>
                <ChevronRight
                  className="h-5 w-5 shrink-0 text-ink-subdued"
                  strokeWidth={2}
                />
              </button>
            );
          })}
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

function ViewToggleButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-label={label}
      onClick={onClick}
      className={`flex min-h-9 items-center gap-1.5 rounded-[6px] px-3 text-[13px] font-semibold transition-colors duration-fast ease-standard ${
        active ? "bg-surface-2 text-primary" : "text-ink-muted hover:text-ink"
      }`}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
