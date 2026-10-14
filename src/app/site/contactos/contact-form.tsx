"use client";

import { useActionState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { sendContactMessage, type SiteFormState } from "../actions";

const initialState: SiteFormState = undefined;

const inputClasses =
  "min-h-12 w-full rounded-xl border border-border bg-canvas px-4 text-[15px] text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
const labelClasses = "text-body font-semibold text-ink";

export function ContactForm() {
  const [state, formAction, pending] = useActionState(
    sendContactMessage,
    initialState,
  );

  if (state && "success" in state) {
    return (
      <div
        aria-live="polite"
        className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-canvas p-12 text-center"
      >
        <CheckCircle2 className="h-12 w-12 text-success" strokeWidth={1.75} />
        <p className="font-serif text-[26px] text-ink">Mensagem enviada</p>
        <p className="text-body text-ink-muted">{state.message}</p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5 rounded-2xl border border-border bg-canvas p-6 sm:p-10"
    >
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-name" className={labelClasses}>
            Nome
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            className={inputClasses}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-email" className={labelClasses}>
            Email
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputClasses}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-phone" className={labelClasses}>
          Telefone{" "}
          <span className="font-normal text-ink-subdued">(opcional)</span>
        </label>
        <input
          id="contact-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          className={inputClasses}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-message" className={labelClasses}>
          Mensagem
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={6}
          placeholder="Datas, número de hóspedes, dúvidas..."
          className={`${inputClasses} min-h-0 py-3`}
        />
      </div>

      {state && "error" in state && (
        <p aria-live="polite" className="text-body text-error">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex min-h-12 items-center justify-center gap-2 rounded-pill bg-ink px-8 text-[15px] font-medium text-white transition-colors duration-base ease-standard hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
      >
        <Send className="h-4 w-4" strokeWidth={2.25} />
        {pending ? "A enviar..." : "Enviar mensagem"}
      </button>
    </form>
  );
}
