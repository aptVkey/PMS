"use client";

import Image from "next/image";
import { Building2, ChevronRight, ExternalLink } from "lucide-react";
import { PROPERTY_TYPE_LABELS, type Property } from "@/lib/property";

export function PropertyCard({
  property,
  unitCount,
  coverPhotoUrl,
  onOpen,
}: {
  property: Property;
  unitCount: number;
  coverPhotoUrl: string | null;
  onOpen: () => void;
}) {
  return (
    // O cartão deixou de ser um <button> único: um link dentro de um botão é
    // HTML inválido. A zona de cima abre a gestão, o rodapé abre a página
    // pública.
    <div className="group flex flex-col overflow-hidden rounded-lg border border-border bg-canvas shadow-card transition-colors hover:border-action/40">
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 items-center gap-4 p-5 text-left transition-colors duration-fast ease-standard hover:bg-surface-1/50"
      >
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-2 text-primary">
          {coverPhotoUrl ? (
            <Image
              src={coverPhotoUrl}
              alt=""
              fill
              sizes="56px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Building2 className="h-5 w-5" strokeWidth={2} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-semibold tracking-tight text-ink">
            {property.name}
          </p>
          <p className="mt-1 text-[12px] text-ink-subdued">
            {PROPERTY_TYPE_LABELS[property.property_type]} · {unitCount}{" "}
            {unitCount === 1 ? "unidade" : "unidades"}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-subdued/60 transition-transform group-hover:translate-x-0.5" />
      </button>

      <a
        href={`/p/${property.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-11 items-center gap-2 border-t border-border bg-surface-1/30 px-5 text-[12px] font-medium text-action transition-colors duration-fast ease-standard hover:bg-surface-2"
      >
        <ExternalLink className="h-4 w-4" strokeWidth={2} />
        Ver página pública
      </a>
    </div>
  );
}
