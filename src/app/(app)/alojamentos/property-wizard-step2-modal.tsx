"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { createTypologiesWithUnits } from "./actions";

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
const labelClasses = "text-body font-semibold text-ink";

type TypologyRow = { id: number; name: string; unitNumbers: string };

let rowIdCounter = 0;

function newRow(): TypologyRow {
  rowIdCounter += 1;
  return { id: rowIdCounter, name: "", unitNumbers: "" };
}

export function PropertyWizardStep2Modal({
  propertyId,
  onClose,
  onFinished,
}: {
  propertyId: string;
  onClose: () => void;
  onFinished: () => void;
}) {
  const [rows, setRows] = useState<TypologyRow[]>([newRow()]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function addRow() {
    setRows((prev) => [...prev, newRow()]);
  }

  function removeRow(id: number) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function updateRow(id: number, patch: Partial<TypologyRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const entries = rows.map((row) => ({
      name: row.name,
      unitNumbers: row.unitNumbers
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean),
    }));

    const invalid = entries.find(
      (entry) =>
        entry.name.trim().length === 0 || entry.unitNumbers.length === 0,
    );
    if (invalid) {
      setError(
        "Preenche o nome e pelo menos um número de unidade para cada tipologia.",
      );
      return;
    }

    startTransition(async () => {
      const result = await createTypologiesWithUnits(propertyId, entries);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onFinished();
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-canvas shadow-popover ui-form-modal">
        <div className="ui-form-header flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-[18px] font-bold text-ink">
            Tipologias e unidades
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-ink-subdued hover:bg-surface-1"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="ui-form-scroll flex flex-col gap-5 overflow-y-auto px-6 py-5"
        >
          <p className="text-body text-ink-muted">
            Indica as tipologias deste alojamento (ex: T1, T2, Suite) e os
            números ou nomes dos quartos/apartamentos de cada uma.
          </p>

          <div className="flex flex-col gap-4">
            {rows.map((row, index) => {
              const unitCount = row.unitNumbers
                .split(",")
                .map((n) => n.trim())
                .filter(Boolean).length;

              return (
                <div
                  key={row.id}
                  className="flex flex-col gap-3 rounded-md border border-border p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-subdued">
                      Tipologia {index + 1}
                    </span>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        aria-label="Remover tipologia"
                        className="text-ink-subdued hover:text-error"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2} />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className={labelClasses}>Nome da tipologia</label>
                    <input
                      value={row.name}
                      onChange={(e) =>
                        updateRow(row.id, { name: e.target.value })
                      }
                      placeholder="Ex: T2 Vista Mar"
                      className={inputClasses}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className={labelClasses}>
                      Números dos quartos/apartamentos
                    </label>
                    <input
                      value={row.unitNumbers}
                      onChange={(e) =>
                        updateRow(row.id, { unitNumbers: e.target.value })
                      }
                      placeholder="Ex: 101, 102, 103"
                      className={inputClasses}
                    />
                    <p className="text-[12px] text-ink-subdued">
                      Separa os números por vírgulas. {unitCount}{" "}
                      {unitCount === 1
                        ? "unidade indicada"
                        : "unidades indicadas"}
                      .
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addRow}
            className="flex w-fit items-center gap-1.5 text-body font-semibold text-action hover:underline"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Adicionar outra tipologia
          </button>

          {error && (
            <p aria-live="polite" className="text-body text-error">
              {error}
            </p>
          )}

          <div className="ui-form-footer flex justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="min-h-11 rounded-md border border-border bg-canvas px-4 text-body font-semibold text-ink transition-colors duration-fast ease-standard hover:bg-surface-1 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="min-h-11 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "A criar..." : "Criar tipologias e unidades"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
