"use client";

import { Plus, X } from "lucide-react";
import { BED_TYPES, BED_TYPE_LABELS, type BedroomConfig } from "@/lib/rooms";

const selectClasses =
  "min-h-9 rounded-md border border-border bg-canvas px-2 text-body text-ink focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
const numberClasses = `${selectClasses} w-20`;

export function BedroomsEditor({
  value,
  onChange,
}: {
  value: BedroomConfig[];
  onChange: (value: BedroomConfig[]) => void;
}) {
  function setCount(count: number) {
    const next = [...value];
    while (next.length < count) {
      next.push({ beds: [{ type: BED_TYPES[0], count: 1 }] });
    }
    while (next.length > count) {
      next.pop();
    }
    onChange(next);
  }

  function updateBedRow(
    bedroomIndex: number,
    bedIndex: number,
    row: Partial<{ type: (typeof BED_TYPES)[number]; count: number }>,
  ) {
    const next = value.map((bedroom, bIdx) => {
      if (bIdx !== bedroomIndex) return bedroom;
      return {
        beds: bedroom.beds.map((bed, i) =>
          i === bedIndex ? { ...bed, ...row } : bed,
        ),
      };
    });
    onChange(next);
  }

  function addBedRow(bedroomIndex: number) {
    const next = value.map((bedroom, bIdx) =>
      bIdx === bedroomIndex
        ? { beds: [...bedroom.beds, { type: BED_TYPES[0], count: 1 }] }
        : bedroom,
    );
    onChange(next);
  }

  function removeBedRow(bedroomIndex: number, bedIndex: number) {
    const next = value.map((bedroom, bIdx) => {
      if (bIdx !== bedroomIndex) return bedroom;
      if (bedroom.beds.length <= 1) return bedroom;
      return { beds: bedroom.beds.filter((_, i) => i !== bedIndex) };
    });
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-body font-semibold text-ink">
          Número de quartos
        </span>
        <input
          type="number"
          min={1}
          value={value.length}
          onChange={(e) => setCount(Math.max(1, Number(e.target.value)))}
          className={numberClasses}
        />
      </div>

      <div className="flex flex-col gap-4">
        {value.map((bedroom, bedroomIndex) => (
          <div
            key={bedroomIndex}
            className="rounded-md border border-border p-3"
          >
            <p className="mb-2 text-body font-semibold text-ink">
              Quarto {bedroomIndex + 1}
            </p>
            <div className="flex flex-col gap-2">
              {bedroom.beds.map((bed, bedIndex) => (
                <div key={bedIndex} className="flex items-center gap-2">
                  <select
                    value={bed.type}
                    onChange={(e) =>
                      updateBedRow(bedroomIndex, bedIndex, {
                        type: e.target.value as (typeof BED_TYPES)[number],
                      })
                    }
                    className={`${selectClasses} flex-1`}
                  >
                    {BED_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {BED_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={bed.count}
                    onChange={(e) =>
                      updateBedRow(bedroomIndex, bedIndex, {
                        count: Math.max(1, Number(e.target.value)),
                      })
                    }
                    className={numberClasses}
                  />
                  {bedroom.beds.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBedRow(bedroomIndex, bedIndex)}
                      aria-label="Remover cama"
                      className="rounded-md p-1.5 text-ink-subdued hover:bg-surface-1"
                    >
                      <X className="h-4 w-4" strokeWidth={2} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addBedRow(bedroomIndex)}
                className="flex w-fit items-center gap-1 text-body font-semibold text-action hover:text-action-hover"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                Adicionar cama
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
