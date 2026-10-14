"use client";

import { useActionState, useTransition } from "react";
import { CheckCircle2, Link2Off, Wallet } from "lucide-react";
import {
  disconnectPaybyrd,
  savePaybyrdSettings,
  type IntegrationsFormState,
} from "./actions";

const initialState: IntegrationsFormState = undefined;

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 font-mono text-[13px] text-ink placeholder:font-sans placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
const labelClasses = "text-body font-semibold text-ink";

export function PaybyrdCard({
  keyHint,
  webhookSet,
}: {
  keyHint: string | null;
  webhookSet: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    savePaybyrdSettings,
    initialState,
  );
  const [disconnecting, startDisconnect] = useTransition();

  const connected = Boolean(keyHint);

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-border bg-canvas p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-2 text-primary">
            <Wallet className="h-5 w-5" strokeWidth={2} />
          </div>
          <div>
            <p className="text-body font-bold text-ink">Paybyrd</p>
            <p className="text-[12px] text-ink-subdued">
              Alternativa à Stripe para cobrar reservas diretas por cartão.
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
            Chave: <span className="font-mono text-ink">{keyHint}</span>
          </span>
          <span className="text-ink-muted">
            Webhook:{" "}
            {webhookSet ? (
              <strong className="text-success">
                registado automaticamente
              </strong>
            ) : (
              <strong className="text-error">
                por registar — guarda a chave outra vez para tentar
              </strong>
            )}
          </span>
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="paybyrdApiKey" className={labelClasses}>
            Chave de API da Paybyrd
          </label>
          <input
            id="paybyrdApiKey"
            name="apiKey"
            type="password"
            autoComplete="off"
            placeholder={connected ? "Preenche só para substituir" : "sk-..."}
            className={inputClasses}
          />
          <p className="text-[12px] text-ink-subdued">
            Em backoffice.paybyrd.com → Developer Keys. É guardada cifrada e
            nunca mais é mostrada.
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
                startDisconnect(async () => void disconnectPaybyrd())
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
