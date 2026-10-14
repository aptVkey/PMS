"use client";

import { useActionState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Link2Off,
  ShieldCheck,
} from "lucide-react";
import { disconnectSiba, saveSibaSettings, type FormState } from "./actions";

const initialState: FormState = undefined;

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 font-mono text-[13px] text-ink placeholder:font-sans placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
const labelClasses = "text-body font-semibold text-ink";

export function SibaCard({
  propertyId,
  nif,
  estabelecimento,
  chaveHint,
}: {
  propertyId: string;
  nif: string | null;
  estabelecimento: string | null;
  chaveHint: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    saveSibaSettings,
    initialState,
  );
  const [disconnecting, startDisconnect] = useTransition();

  const connected = Boolean(chaveHint);

  return (
    <div className="flex max-w-2xl flex-col gap-5 rounded-lg border border-border bg-canvas p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-2 text-primary">
            <ShieldCheck className="h-5 w-5" strokeWidth={2} />
          </div>
          <div>
            <p className="text-body font-bold text-ink">
              SIBA (Boletins de Alojamento)
            </p>
            <p className="text-[12px] text-ink-subdued">
              Comunicação obrigatória de hóspedes estrangeiros à UCFE/SEF.
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

      <div className="flex gap-2 rounded-md bg-highlight/10 p-3 text-[12px] text-ink-muted">
        <AlertTriangle
          className="h-4 w-4 shrink-0 text-highlight-ink"
          strokeWidth={2}
        />
        <p>
          A inscrição desta unidade e a escolha do modo &ldquo;Web
          Service&rdquo; só se fazem no{" "}
          <a
            href="https://siba.ssi.gov.pt"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-action hover:underline"
          >
            portal siba.ssi.gov.pt
          </a>
          . Depois de validada, a UCFE envia por email um ofício com os três
          valores abaixo.{" "}
          <strong className="text-ink">
            Tem de ter escolhido &ldquo;Web Service&rdquo; como modo de envio
          </strong>
          — se escolheste Upload de Ficheiro ou Página no Portal, esta
          integração não funciona e a mudança só se pede por email a{" "}
          <a
            href="mailto:siba@ssi.gov.pt"
            className="font-semibold text-action hover:underline"
          >
            siba@ssi.gov.pt
          </a>
          .
        </p>
      </div>

      {connected && (
        <div className="flex flex-col gap-1 rounded-md bg-surface-1 px-4 py-3 text-[12px]">
          <span className="text-ink-muted">
            NIF: <span className="font-mono text-ink">{nif}</span>
          </span>
          <span className="text-ink-muted">
            Estabelecimento:{" "}
            <span className="font-mono text-ink">{estabelecimento}</span>
          </span>
          <span className="text-ink-muted">
            Chave: <span className="font-mono text-ink">{chaveHint}</span>
          </span>
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="propertyId" value={propertyId} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="sibaNif" className={labelClasses}>
            NIF da unidade hoteleira
          </label>
          <input
            id="sibaNif"
            name="nif"
            type="text"
            autoComplete="off"
            required
            defaultValue={nif ?? ""}
            placeholder="Ex: 123456789"
            className={inputClasses}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="sibaEstabelecimento" className={labelClasses}>
            Número de estabelecimento
          </label>
          <input
            id="sibaEstabelecimento"
            name="estabelecimento"
            type="text"
            autoComplete="off"
            required
            defaultValue={estabelecimento ?? ""}
            placeholder="Ex: 0"
            className={inputClasses}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="sibaChave" className={labelClasses}>
            Chave de ativação
          </label>
          <input
            id="sibaChave"
            name="chaveAcesso"
            type="password"
            autoComplete="off"
            placeholder={connected ? "Preenche só para substituir" : "..."}
            className={inputClasses}
          />
          <p className="text-[12px] text-ink-subdued">
            Vem no ofício &ldquo;Envio de chave de ativação&rdquo; enviado pela
            UCFE. É guardada cifrada e nunca mais é mostrada.
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
                startDisconnect(async () => void disconnectSiba(propertyId))
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
