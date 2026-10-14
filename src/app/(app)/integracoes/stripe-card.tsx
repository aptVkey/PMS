"use client";

import { useActionState, useState, useTransition } from "react";
import { CheckCircle2, Copy, CreditCard, Link2Off } from "lucide-react";
import {
  disconnectStripe,
  saveStripeSettings,
  type IntegrationsFormState,
} from "./actions";

const initialState: IntegrationsFormState = undefined;

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 font-mono text-[13px] text-ink placeholder:font-sans placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
const labelClasses = "text-body font-semibold text-ink";

export function StripeCard({
  secretHint,
  webhookSet,
  accountLabel,
  appUrl,
  webhookUrl,
}: {
  secretHint: string | null;
  webhookSet: boolean;
  accountLabel: string | null;
  appUrl: string;
  webhookUrl: string;
}) {
  const [state, formAction, pending] = useActionState(
    saveStripeSettings,
    initialState,
  );
  const [copied, setCopied] = useState(false);
  const [disconnecting, startDisconnect] = useTransition();

  const connected = Boolean(secretHint);

  function copyWebhookUrl() {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-border bg-canvas p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-2 text-primary">
            <CreditCard className="h-5 w-5" strokeWidth={2} />
          </div>
          <div>
            <p className="text-body font-bold text-ink">Stripe</p>
            <p className="text-[12px] text-ink-subdued">
              Pagamentos por cartão nas reservas diretas da página pública.
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
            Conta: <strong className="text-ink">{accountLabel ?? "—"}</strong>
          </span>
          <span className="text-ink-muted">
            Chave secreta:{" "}
            <span className="font-mono text-ink">{secretHint}</span>
          </span>
          <span className="text-ink-muted">
            Webhook:{" "}
            {webhookSet ? (
              <strong className="text-success">configurado</strong>
            ) : (
              <strong className="text-error">por configurar</strong>
            )}
          </span>
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="secretKey" className={labelClasses}>
            Chave secreta
          </label>
          <input
            id="secretKey"
            name="secretKey"
            type="password"
            autoComplete="off"
            placeholder={
              connected ? "Preenche só para substituir" : "sk_live_..."
            }
            className={inputClasses}
          />
          <p className="text-[12px] text-ink-subdued">
            Em Stripe → Developers → API keys. É guardada cifrada e nunca mais é
            mostrada.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="webhookSecret" className={labelClasses}>
            Segredo do webhook
          </label>
          <input
            id="webhookSecret"
            name="webhookSecret"
            type="password"
            autoComplete="off"
            placeholder={
              webhookSet ? "Preenche só para substituir" : "whsec_..."
            }
            className={inputClasses}
          />
          <p className="text-[12px] text-ink-subdued">
            Sem isto os pagamentos são cobrados mas as reservas não passam a
            confirmadas sozinhas.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="appUrl" className={labelClasses}>
            URL público da aplicação
          </label>
          <input
            id="appUrl"
            name="appUrl"
            type="url"
            defaultValue={appUrl}
            placeholder="https://reservas.oteudominio.pt"
            className={inputClasses}
          />
          <p className="text-[12px] text-ink-subdued">
            Para onde a Stripe devolve o hóspede depois de pagar.
          </p>
        </div>

        <div className="flex flex-col gap-1.5 rounded-md border border-border bg-surface-1 p-3">
          <span className="text-[12px] font-semibold text-ink">
            Endereço do webhook
          </span>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-ink-muted">
              {webhookUrl}
            </code>
            <button
              type="button"
              onClick={copyWebhookUrl}
              className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border border-border bg-canvas px-3 text-[12px] font-semibold text-ink hover:bg-surface-1"
            >
              <Copy className="h-3.5 w-3.5" strokeWidth={2} />
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
          <span className="text-[12px] text-ink-subdued">
            Cola isto na Stripe, em Developers → Webhooks, a ouvir o evento{" "}
            <code className="font-mono">checkout.session.completed</code>.
          </span>
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
                startDisconnect(async () => void disconnectStripe())
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
