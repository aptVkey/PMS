"use client";

import { useState, useTransition, type FormEvent } from "react";
import { X } from "lucide-react";
import { createProperty } from "./actions";

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
const labelClasses = "text-body font-semibold text-ink";

export function PropertyWizardStep1Modal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (
    propertyId: string,
    name: string,
    isMultiUnidade: boolean,
  ) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isMultiUnidade, setIsMultiUnidade] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("O nome é obrigatório.");
      return;
    }
    startTransition(async () => {
      const result = await createProperty(
        name.trim(),
        isMultiUnidade,
        description.trim() || undefined,
      );
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onCreated(result.propertyId, name.trim(), isMultiUnidade);
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-canvas shadow-popover ui-form-modal">
        <div className="ui-form-header flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-[18px] font-bold text-ink">Novo alojamento</h2>
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
          <div className="flex flex-col gap-1.5">
            <label htmlFor="propertyName" className={labelClasses}>
              Nome do alojamento
            </label>
            <input
              id="propertyName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Vale de Carros by Umbral"
              autoFocus
              className={inputClasses}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="propertyDescription" className={labelClasses}>
              Descrição{" "}
              <span className="font-normal text-ink-subdued">(opcional)</span>
            </label>
            <textarea
              id="propertyDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Apresenta o alojamento: localização, ambiente, o que o torna especial..."
              className={`${inputClasses} min-h-0 py-2`}
            />
            <p className="text-[12px] text-ink-subdued">
              Aparece na página pública do alojamento. Podes editar mais tarde.
            </p>
          </div>

          <label className="flex items-start gap-2.5 text-body text-ink">
            <input
              type="checkbox"
              checked={isMultiUnidade}
              onChange={(e) => setIsMultiUnidade(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border text-action focus:ring-action"
            />
            <span>
              <span className="font-semibold">
                Este alojamento tem várias unidades (multi unidade)
              </span>
              <br />
              <span className="text-[12px] text-ink-subdued">
                Marca esta opção se este alojamento é um prédio ou complexo com
                várias tipologias e vários quartos/apartamentos. Se for uma
                única unidade, deixa por marcar.
              </span>
            </span>
          </label>

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
              {isPending ? "A continuar..." : "Continuar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
