"use client";

import { useActionState, useTransition } from "react";
import { CheckCircle2, Link2Off, MessageCircle } from "lucide-react";
import {
  disconnectWhatsApp,
  saveWhatsAppSettings,
  type IntegrationsFormState,
} from "./actions";

const initialState: IntegrationsFormState = undefined;

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 font-mono text-[13px] text-ink placeholder:font-sans placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
const labelClasses = "text-body font-semibold text-ink";

export function WhatsAppCard({
  tokenHint,
  phoneNumberId,
  businessAccountId,
  verifiedName,
}: {
  tokenHint: string | null;
  phoneNumberId: string | null;
  businessAccountId: string | null;
  verifiedName: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    saveWhatsAppSettings,
    initialState,
  );
  const [disconnecting, startDisconnect] = useTransition();

  const connected = Boolean(tokenHint);

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-border bg-canvas p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-2 text-primary">
            <MessageCircle className="h-5 w-5" strokeWidth={2} />
          </div>
          <div>
            <p className="text-body font-bold text-ink">WhatsApp (Cloud API)</p>
            <p className="text-[12px] text-ink-subdued">
              Permite ao sistema enviar mensagens de WhatsApp aos hóspedes.
            </p>
          </div>
        </div>

        {connected ? (
          <span className="flex items-center gap-1.5 rounded-pill bg-success/10 px-3 py-1 text-[12px] font-semibold text-success">
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
            Ligado
          </span>
        ) : (
          <span className="rounded-pill bg-surface-1 px-3 py-1 text-[12px] font-semibold text-ink-subdued">
            Não configurado
          </span>
        )}
      </div>

      {connected && (
        <div className="flex flex-col gap-1 rounded-md bg-surface-1 px-4 py-3 text-[12px]">
          <span className="text-ink-muted">
            Nome verificado:{" "}
            <strong className="text-ink">{verifiedName ?? "—"}</strong>
          </span>
          <span className="text-ink-muted">
            Token: <span className="font-mono text-ink">{tokenHint}</span>
          </span>
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="whatsappAccessToken" className={labelClasses}>
            Token de acesso
          </label>
          <input
            id="whatsappAccessToken"
            name="accessToken"
            type="password"
            autoComplete="off"
            placeholder={connected ? "Preenche só para substituir" : "EAAG..."}
            className={inputClasses}
          />
          <p className="text-[12px] text-ink-subdued">
            Em developers.facebook.com → a tua app → WhatsApp → API Setup. Usa
            um token permanente (System User), não o temporário de teste. É
            guardado cifrado e nunca mais é mostrado.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="whatsappPhoneNumberId" className={labelClasses}>
            Phone Number ID
          </label>
          <input
            id="whatsappPhoneNumberId"
            name="phoneNumberId"
            type="text"
            autoComplete="off"
            required
            defaultValue={phoneNumberId ?? ""}
            placeholder="Ex: 109876543210987"
            className={inputClasses}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="whatsappBusinessAccountId" className={labelClasses}>
            WhatsApp Business Account ID — opcional
          </label>
          <input
            id="whatsappBusinessAccountId"
            name="businessAccountId"
            type="text"
            autoComplete="off"
            defaultValue={businessAccountId ?? ""}
            placeholder="Ex: 123456789012345"
            className={inputClasses}
          />
          <p className="text-[12px] text-ink-subdued">
            Só necessário para geres modelos (templates) aprovados no futuro.
          </p>
        </div>

        {state && "error" in state && (
          <p aria-live="polite" className="text-body text-error">
            {state.error}
          </p>
        )}
        {state && "success" in state && (
          <p
            aria-live="polite"
            className="text-body font-semibold text-success"
          >
            {state.message}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3">
          {connected && (
            <button
              type="button"
              disabled={disconnecting}
              onClick={() =>
                startDisconnect(async () => void disconnectWhatsApp())
              }
              className="flex min-h-11 items-center gap-2 rounded-md border border-border bg-canvas px-4 text-body font-semibold text-error transition-colors duration-fast ease-standard hover:bg-error/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Link2Off className="h-4 w-4" strokeWidth={2} />
              {disconnecting ? "A desligar..." : "Desligar"}
            </button>
          )}
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "A validar..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
