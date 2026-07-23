"use client";

import type { BathroomConfig } from "@/lib/rooms";

const selectClasses =
  "min-h-9 rounded-md border border-border bg-canvas px-2 text-body text-ink focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
const numberClasses = `${selectClasses} w-20`;

export function BathroomsEditor({
  value,
  bedroomCount,
  onChange,
}: {
  value: BathroomConfig[];
  bedroomCount: number;
  onChange: (value: BathroomConfig[]) => void;
}) {
  function setCount(count: number) {
    const next = [...value];
    while (next.length < count) {
      next.push({ ensuiteBedroomIndex: null });
    }
    while (next.length > count) {
      next.pop();
    }
    onChange(next);
  }

  function updateEnsuite(index: number, ensuiteBedroomIndex: number | null) {
    onChange(
      value.map((bathroom, i) =>
        i === index ? { ensuiteBedroomIndex } : bathroom,
      ),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-body font-semibold text-ink">
          Número de casas de banho
        </span>
        <input
          type="number"
          min={1}
          value={value.length}
          onChange={(e) => setCount(Math.max(1, Number(e.target.value)))}
          className={numberClasses}
        />
      </div>

      {value.length > 1 && (
        <div className="flex flex-col gap-2">
          {value.map((bathroom, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-36 shrink-0 text-body text-ink-muted">
                Casa de banho {index + 1}
              </span>
              <select
                value={bathroom.ensuiteBedroomIndex ?? ""}
                onChange={(e) =>
                  updateEnsuite(
                    index,
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
                className={`${selectClasses} flex-1`}
              >
                <option value="">Comum (fora dos quartos)</option>
                {Array.from({ length: bedroomCount }).map((_, bedroomIdx) => (
                  <option key={bedroomIdx} value={bedroomIdx}>
                    Está no Quarto {bedroomIdx + 1}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
