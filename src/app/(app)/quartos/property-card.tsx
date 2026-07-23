"use client";

import { Building2 } from "lucide-react";
import { PROPERTY_TYPE_LABELS, type Property } from "@/lib/property";

export function PropertyCard({
  property,
  unitCount,
  onOpen,
}: {
  property: Property;
  unitCount: number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col items-start gap-3 rounded-lg border border-border bg-canvas p-5 text-left shadow-card transition-colors duration-fast ease-standard hover:bg-surface-1"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-surface-2 text-primary">
        <Building2 className="h-5 w-5" strokeWidth={2} />
      </div>
      <div>
        <p className="text-body font-bold text-ink">{property.name}</p>
        <p className="text-[12px] text-ink-subdued">
          {PROPERTY_TYPE_LABELS[property.property_type]} · {unitCount}{" "}
          {unitCount === 1 ? "unidade" : "unidades"}
        </p>
      </div>
    </button>
  );
}
