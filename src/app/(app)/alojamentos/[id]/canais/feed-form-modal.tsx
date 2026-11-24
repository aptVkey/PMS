"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { saveIcalFeed, type FormState } from "./actions";
import type { IcalFeedRow } from "@/lib/ical";
import type { Room } from "@/lib/rooms";
import {
  OTHER_CHANNEL,
  channelFromName,
  type AnyChannelDef,
} from "@/lib/channels";
import { ChannelBadge, ExportBox, StepList } from "./channel-ui";

const initialState: FormState = undefined;

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
const labelClasses = "text-body font-semibold text-ink";

// Assistente de ligação a um canal em dois passos:
//  1. colar o link de calendário do canal (importar reservas);
//  2. colar o link do PMS no canal (bloquear as datas ocupadas).
export function FeedFormModal({
  propertyId,
  room,
  channel,
  feed,
  appUrl,
  onClose,
}: {
  propertyId: string;
  room: Room;
  // Canal escolhido nos cartões (novo feed). Ao editar vem do próprio feed.
  channel?: AnyChannelDef;
  feed?: IcalFeedRow;
  appUrl: string;
  onClose: () => void;
}) {
  const def: AnyChannelDef = feed
    ? channelFromName(feed.channel)
    : (channel ?? OTHER_CHANNEL);
  const isOther = def.key === OTHER_CHANNEL.key;

  const [state, formAction, pending] = useActionState(
    saveIcalFeed,
    initialState,
  );
  const [url, setUrl] = useState(feed?.feed_url ?? "");
  const [customName, setCustomName] = useState(
    isOther && feed ? feed.channel : "",
  );

  const savedFeedId =
    state && "success" in state && state.feedId ? state.feedId : null;
  // Ao editar fecha logo; ao criar passa ao passo 2 (link para o canal).
  const justCreated = Boolean(savedFeedId && !feed);

  useEffect(() => {
    if (state && "success" in state && feed) onClose();
  }, [state, feed, onClose]);

  const channelName = isOther ? customName.trim() : def.name;
  // Aviso suave: colaram o link de outro canal.
  const looksWrong =
    !isOther && url.trim() !== "" && !def.host.test(url.trim());

  const exportFeedId = feed?.id ?? savedFeedId;
  const exportUrl = exportFeedId
    ? `${appUrl}/api/ical/export/${room.id}?for=${exportFeedId}`
    : null;
  const displayName = channelName || "o canal";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[92svh] w-full max-w-xl flex-col rounded-xl bg-canvas shadow-popover">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <ChannelBadge channel={isOther ? "outro" : def.name} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[18px] font-bold text-ink">
              {feed ? "Editar" : "Ligar"} {isOther ? "canal" : def.name}
            </h2>
            <p className="truncate text-[12px] text-ink-subdued">
              Unidade: {room.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-ink-subdued hover:bg-surface-1"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto px-6 py-5">
          {justCreated ? (
            <div className="flex items-center gap-2 rounded-lg bg-success/10 px-4 py-3 text-body font-semibold text-success">
              <CheckCircle2 className="h-5 w-5 shrink-0" strokeWidth={2} />
              Passo 1 feito: o PMS vai ler as reservas do canal ({displayName})
              de 15 em 15 minutos.
            </div>
          ) : (
            <form action={formAction} className="flex flex-col gap-5">
              {feed && <input type="hidden" name="id" value={feed.id} />}
              <input type="hidden" name="propertyId" value={propertyId} />
              <input type="hidden" name="roomId" value={room.id} />
              {!isOther && (
                <input type="hidden" name="channel" value={def.name} />
              )}

              <section className="flex flex-col gap-3">
                <h3 className="text-[13px] font-bold uppercase tracking-wide text-ink">
                  Passo 1 · Importar as reservas
                </h3>
                <StepList steps={def.importSteps} />
              </section>

              {isOther && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="channel" className={labelClasses}>
                    Nome do canal
                  </label>
                  <input
                    id="channel"
                    name="channel"
                    type="text"
                    required
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Ex.: Expedia, Holidu..."
                    className={inputClasses}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="feedUrl" className={labelClasses}>
                  Link do calendário (iCal)
                </label>
                <input
                  id="feedUrl"
                  name="feedUrl"
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className={inputClasses}
                />
                {looksWrong && (
                  <p className="flex items-start gap-1.5 text-[12px] text-highlight-ink">
                    <AlertTriangle
                      className="mt-0.5 h-3.5 w-3.5 shrink-0"
                      strokeWidth={2}
                    />
                    <span className="rounded bg-highlight/25 px-1.5 py-0.5">
                      Este link não parece ser do canal {def.name}. Confirma que
                      copiaste o link certo.
                    </span>
                  </p>
                )}
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
                  disabled={pending || !channelName}
                  className="min-h-11 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending
                    ? "A guardar..."
                    : feed
                      ? "Guardar"
                      : "Guardar e continuar"}
                </button>
              </div>
            </form>
          )}

          {(justCreated || (feed && exportUrl)) && exportUrl && (
            <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface-1 p-4">
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-ink">
                {justCreated ? "Passo 2" : "Link para o canal"} · Bloquear as
                datas ocupadas ({displayName})
              </h3>
              <StepList steps={def.exportSteps} />
              <ExportBox
                url={exportUrl}
                label={`Para ${displayName}`}
                hint="Exclui as reservas que vieram deste canal, para não lhe devolver as suas próprias reservas"
              />
              <p className="text-[12px] text-ink-subdued">
                O link só tem datas ocupadas, nunca dados dos hóspedes. Os nomes
                dos menus mudam de vez em quando; se não os encontrares, procura
                por «sincronizar calendário» ou «iCal».
              </p>
              {justCreated && (
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-11 self-end rounded-md bg-action px-5 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover"
                >
                  Concluir
                </button>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
