"use client";

import { useActionState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { subscribeNewsletter, type SiteFormState } from "./actions";

const initialState: SiteFormState = undefined;

export function NewsletterForm() {
  const [state, formAction, pending] = useActionState(
    subscribeNewsletter,
    initialState,
  );

  if (state && "success" in state) {
    return (
      <p
        aria-live="polite"
        className="flex items-center gap-2 text-body font-semibold text-white"
      >
        <CheckCircle2 className="h-5 w-5 text-white" strokeWidth={2} />
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {/* Campo-armadilha para bots; escondido de pessoas e leitores de ecrã. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">
          Email
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="O teu email"
          className="min-h-12 w-full rounded-pill border border-white/20 bg-white/10 px-5 text-body text-white placeholder:text-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/60"
        />
        <button
          type="submit"
          disabled={pending}
          className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-pill bg-white px-6 text-body font-semibold text-ink transition-colors duration-base ease-standard hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "A subscrever..." : "Subscrever"}
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
      {state && "error" in state && (
        <p aria-live="polite" className="text-[13px] text-white">
          {state.error}
        </p>
      )}
    </form>
  );
}
