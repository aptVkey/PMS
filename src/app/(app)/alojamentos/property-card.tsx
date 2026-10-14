"use client";

import Image from "next/image";
import { Building2, ExternalLink } from "lucide-react";
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
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-canvas shadow-card">
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 flex-col items-start gap-3 p-5 text-left transition-colors duration-fast ease-standard hover:bg-surface-1"
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
        <div>
          <p className="text-body font-bold text-ink">{property.name}</p>
          <p className="text-[12px] text-ink-subdued">
            {PROPERTY_TYPE_LABELS[property.property_type]} · {unitCount}{" "}
            {unitCount === 1 ? "unidade" : "unidades"}
          </p>
        </div>
      </button>

      <a
        href={`/p/${property.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-11 items-center justify-center gap-2 border-t border-border text-body font-semibold text-action transition-colors duration-fast ease-standard hover:bg-surface-1"
      >
        <ExternalLink className="h-4 w-4" strokeWidth={2} />
        Ver página pública
      </a>
    </div>
  );
}
