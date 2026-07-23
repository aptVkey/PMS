"use client";

import { Building2, Pencil } from "lucide-react";
import type { RoomTypology } from "@/lib/room-typologies";

export function TypologyCard({
  typology,
  roomCount,
  onOpen,
  onEdit,
}: {
  typology: RoomTypology;
  roomCount: number;
  onOpen: () => void;
  onEdit: () => void;
}) {
  const cover = typology.photos[0];

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-canvas shadow-card">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="relative h-40 w-full bg-surface-1">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL
            <img
              src={cover}
              alt={typology.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Building2 className="h-8 w-8 text-ink-subdued" strokeWidth={1.5} />
            </div>
          )}
        </div>
        <div className="p-4">
          <p className="text-body font-bold text-ink">{typology.name}</p>
          <p className="text-[12px] text-ink-subdued">
            {roomCount} {roomCount === 1 ? "quarto" : "quartos"}
          </p>
        </div>
      </button>
      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={onEdit}
          className="flex min-h-9 w-full items-center justify-center gap-1.5 rounded-md text-body font-semibold text-ink transition-colors duration-fast ease-standard hover:bg-surface-1"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
          Editar tipologia
        </button>
      </div>
    </div>
  );
}
