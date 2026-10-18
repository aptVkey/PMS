"use client";

import { useActionState, useEffect } from "react";
import { X } from "lucide-react";
import { saveFlow, type FormState } from "./actions";
import type { EmailFlow } from "@/lib/email-marketing";

const initialState: FormState = undefined;

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
const labelClasses = "text-body font-semibold text-ink";

export function FlowFormModal({
  flow,
  onClose,
}: {
  flow?: EmailFlow;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveFlow, initialState);

  useEffect(() => {
    if (state && "success" in state) onClose();
  }, [state, onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-md flex-col rounded-lg bg-canvas shadow-popover ui-form-modal">
        <div className="ui-form-header flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-[18px] font-bold text-ink">
            {flow ? "Editar fluxo" : "Novo fluxo"}
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

        <form action={formAction} className="ui-form-scroll flex flex-col gap-4 overflow-y-auto px-6 py-5">
          {flow && <input type="hidden" name="id" value={flow.id} />}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className={labelClasses}>
              Nome
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={flow?.name}
              placeholder="Ex: Sequência de check-in"
              className={inputClasses}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className={labelClasses}>
              Descrição — opcional
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={flow?.description ?? ""}
              className={`${inputClasses} min-h-0 py-2`}
            />
          </div>

          {state && "error" in state && (
            <p aria-live="polite" className="text-body text-error">
              {state.error}
            </p>
          )}

          <div className="ui-form-footer flex justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-md border border-border bg-canvas px-4 text-body font-semibold text-ink transition-colors duration-fast ease-standard hover:bg-surface-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="min-h-11 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "A guardar..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
