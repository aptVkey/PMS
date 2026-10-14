"use client";

import { useActionState, useEffect } from "react";
import { X } from "lucide-react";
import { saveTemplate, type FormState } from "./actions";
import type { EmailTemplate } from "@/lib/email-marketing";
import { TEMPLATE_VARIABLE_KEYS } from "@/lib/email-marketing";

const initialState: FormState = undefined;

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
const labelClasses = "text-body font-semibold text-ink";

export function TemplateFormModal({
  template,
  onClose,
}: {
  template?: EmailTemplate;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    saveTemplate,
    initialState,
  );

  useEffect(() => {
    if (state && "success" in state) onClose();
  }, [state, onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg bg-canvas shadow-popover">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-[18px] font-bold text-ink">
            {template ? "Editar modelo" : "Novo modelo"}
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
          action={formAction}
          className="flex flex-col gap-4 overflow-y-auto px-6 py-5"
        >
          {template && <input type="hidden" name="id" value={template.id} />}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className={labelClasses}>
              Nome interno
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={template?.name}
              placeholder="Ex: Boas-vindas à reserva"
              className={inputClasses}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="subject" className={labelClasses}>
              Assunto
            </label>
            <input
              id="subject"
              name="subject"
              type="text"
              required
              defaultValue={template?.subject}
              placeholder="Ex: A tua reserva em {{property_name}} está confirmada"
              className={inputClasses}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="bodyHtml" className={labelClasses}>
              Corpo do email
            </label>
            <textarea
              id="bodyHtml"
              name="bodyHtml"
              rows={10}
              required
              defaultValue={template?.body_html}
              placeholder="Olá {{guest_name}}, ..."
              className={`${inputClasses} min-h-0 py-2 font-mono text-[13px]`}
            />
            <p className="text-[12px] text-ink-subdued">
              Variáveis disponíveis:{" "}
              {TEMPLATE_VARIABLE_KEYS.map((key) => `{{${key}}}`).join(", ")}.
              Podes usar HTML simples (ex: &lt;b&gt;, &lt;br&gt;).
            </p>
          </div>

          {state && "error" in state && (
            <p aria-live="polite" className="text-body text-error">
              {state.error}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-border pt-4">
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
