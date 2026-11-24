"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Pencil,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";
import type { Room } from "@/lib/rooms";
import type { IcalConflictRow, IcalFeedRow } from "@/lib/ical";
import { formatDateLabel } from "@/lib/date-utils";
import {
  deleteIcalFeed,
  dismissIcalConflict,
  syncFeedNow,
  syncPropertyFeeds,
  toggleIcalFeedActive,
} from "./actions";
import { FeedFormModal } from "./feed-form-modal";
import { ConfirmDeleteFeedModal } from "./confirm-delete-feed-modal";
import { ToggleSwitch } from "@/components/toggle-switch";
import {
  CHANNELS,
  OTHER_CHANNEL,
  channelFromName,
  type AnyChannelDef,
} from "@/lib/channels";
import { ChannelBadge, ExportBox } from "./channel-ui";

function FeedStatusBadge({ feed }: { feed: IcalFeedRow }) {
  if (feed.last_sync_status === "success") {
    return (
      <span className="flex items-center gap-1 rounded-pill bg-success/10 px-2.5 py-1 text-[12px] font-semibold text-success">
        <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
        Sincronizado
      </span>
    );
  }
  if (feed.last_sync_status === "error") {
    return (
      <span className="flex items-center gap-1 rounded-pill bg-error/10 px-2.5 py-1 text-[12px] font-semibold text-error">
        <XCircle className="h-3.5 w-3.5" strokeWidth={2} />
        Falhou
      </span>
    );
  }
  return (
    <span className="rounded-pill bg-surface-1 px-2.5 py-1 text-[12px] font-semibold text-ink-subdued">
      Por sincronizar
    </span>
  );
}

function FeedRow({
  propertyId,
  feed,
  appUrl,
  onEdit,
  onDelete,
}: {
  propertyId: string;
  feed: IcalFeedRow;
  appUrl: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  function handleSyncNow() {
    setSyncMessage(null);
    setSyncError(null);
    startTransition(async () => {
      const result = await syncFeedNow(feed.id, propertyId);
      if ("error" in result) {
        setSyncError(result.error);
        return;
      }
      if (!result.result.success) {
        setSyncError(result.result.error);
        return;
      }
      const { created, updated, cancelled, conflicts } = result.result;
      setSyncMessage(
        `${created} nova(s), ${updated} atualizada(s), ${cancelled} cancelada(s)${
          conflicts > 0 ? `, ${conflicts} conflito(s)` : ""
        }.`,
      );
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-success/30 bg-canvas p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-3">
        <ChannelBadge channel={feed.channel} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-ink">
            {feed.channel}
          </p>
          <p className="truncate text-[12px] text-ink-subdued">
            {feed.feed_url}
          </p>
        </div>

        <FeedStatusBadge feed={feed} />

        <ToggleSwitch
          label={`Feed ${feed.channel}`}
          checked={feed.is_active}
          onChange={() =>
            startTransition(async () => {
              await toggleIcalFeedActive(feed.id, !feed.is_active, propertyId);
            })
          }
        />
        <button
          type="button"
          onClick={onEdit}
          aria-label="Editar feed"
          className="rounded-md p-2 text-ink-subdued hover:bg-surface-1"
        >
          <Pencil className="h-4 w-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Remover feed"
          className="rounded-md p-2 text-ink-subdued hover:bg-error/10 hover:text-error"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-ink-subdued">
          {feed.last_synced_at
            ? `Última sincronização: ${new Date(feed.last_synced_at).toLocaleString("pt-PT")}`
            : "Ainda não sincronizado."}
          {feed.last_sync_error ? ` — ${feed.last_sync_error}` : ""}
        </p>
        <button
          type="button"
          disabled={isPending}
          onClick={handleSyncNow}
          className="flex min-h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-[12px] font-semibold text-ink-muted transition-colors duration-fast ease-standard hover:bg-surface-1 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Play className="h-3.5 w-3.5" strokeWidth={2} />
          {isPending ? "A sincronizar..." : "Sincronizar agora"}
        </button>
      </div>

      <ExportBox
        url={`${appUrl}/api/ical/export/${feed.room_id}?for=${feed.id}`}
        label={`Para ${feed.channel}`}
        hint="Link a colar neste canal: exclui as reservas que vieram dele próprio"
      />

      {syncMessage && (
        <p className="text-[12px] font-semibold text-success">{syncMessage}</p>
      )}
      {syncError && <p className="text-[12px] text-error">{syncError}</p>}
    </div>
  );
}

function RoomRow({
  propertyId,
  room,
  feeds,
  appUrl,
  onConnect,
  onEditFeed,
  onDeleteFeed,
}: {
  propertyId: string;
  room: Room;
  feeds: IcalFeedRow[];
  appUrl: string;
  onConnect: (channel: AnyChannelDef) => void;
  onEditFeed: (feed: IcalFeedRow) => void;
  onDeleteFeed: (feed: IcalFeedRow) => void;
}) {
  // Canais principais ainda por ligar nesta unidade.
  const connectedKeys = new Set(
    feeds.map((f) => channelFromName(f.channel).key),
  );
  const pending = CHANNELS.filter((c) => !connectedKeys.has(c.key));

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-canvas p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-bold text-ink">{room.name}</h2>
          <p className="text-[12px] text-ink-subdued">
            {feeds.length === 0
              ? "Nenhum canal ligado"
              : `${feeds.length} canal(is) ligado(s)`}
          </p>
        </div>
      </div>

      {feeds.length > 0 && (
        <div className="flex flex-col gap-3">
          {feeds.map((feed) => (
            <FeedRow
              key={feed.id}
              propertyId={propertyId}
              feed={feed}
              appUrl={appUrl}
              onEdit={() => onEditFeed(feed)}
              onDelete={() => onDeleteFeed(feed)}
            />
          ))}
        </div>
      )}

      {/* Layout em estilo direto: não depende da cache de CSS do servidor de
          desenvolvimento. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {[...pending, OTHER_CHANNEL].map((channel) => (
          <button
            key={channel.key}
            type="button"
            onClick={() => onConnect(channel)}
            className="group flex items-center gap-3 rounded-xl border border-dashed border-border bg-surface-1/50 p-3 text-left transition-colors duration-fast ease-standard hover:border-action hover:bg-surface-2"
          >
            <ChannelBadge
              channel={channel.key === "outro" ? "outro" : channel.name}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-body font-bold text-ink">
                {channel.key === "outro" ? "Outro canal" : channel.name}
              </span>
              <span className="block text-[12px] text-ink-subdued">
                {channel.key === "outro" ? "Expedia, Holidu..." : "Por ligar"}
              </span>
            </span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-action text-on-primary transition-transform duration-fast ease-standard group-hover:scale-110">
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            </span>
          </button>
        ))}
      </div>

      <details className="group rounded-lg bg-surface-1 px-3 py-2">
        <summary className="cursor-pointer text-[12px] font-semibold text-ink-muted">
          Link com todas as reservas deste quarto
        </summary>
        <div className="mt-2 flex flex-col gap-1.5">
          <ExportBox
            url={`${appUrl}/api/ical/export/${room.id}`}
            label="Todas"
            hint="Inclui todas as reservas deste quarto"
          />
          <p className="text-[12px] text-ink-subdued">
            Usa os links «Para cada canal» acima sempre que possível: evitam que
            um canal receba de volta as suas próprias reservas.
          </p>
        </div>
      </details>
    </section>
  );
}

function ConflictsPanel({
  conflicts,
  propertyId,
}: {
  conflicts: IcalConflictRow[];
  propertyId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (conflicts.length === 0) return null;

  return (
    <section
      role="alert"
      className="flex flex-col gap-3 rounded-lg border border-error/30 bg-error/5 p-4"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle
          className="mt-0.5 h-5 w-5 shrink-0 text-error"
          strokeWidth={2}
        />
        <div>
          <h2 className="text-body font-bold text-error">
            {conflicts.length} reserva(s) externa(s) não entraram no calendário
          </h2>
          <p className="text-[12px] text-ink-muted">
            Sobrepõem-se a outra reserva do mesmo quarto — pode haver
            overbooking. Cancela uma das duas na plataforma respetiva e a
            seguinte sincronização limpa este aviso.
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {conflicts.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-md bg-canvas p-3"
          >
            <div className="min-w-0 text-body">
              <p className="font-semibold text-ink">
                {c.feed?.channel ?? "Canal"} · {c.room?.name} ·{" "}
                {formatDateLabel(c.check_in)} → {formatDateLabel(c.check_out)}
              </p>
              <p className="text-[12px] text-ink-muted">
                {c.blocking
                  ? `Colide com RES-${String(c.blocking.booking_number).padStart(4, "0")}${
                      c.blocking.guest?.name
                        ? ` (${c.blocking.guest.name})`
                        : ""
                    }${c.blocking.channel ? ` · ${c.blocking.channel}` : ""}, ${formatDateLabel(
                      c.blocking.check_in,
                    )} → ${formatDateLabel(c.blocking.check_out)}.`
                  : "Colide com uma reserva do PMS."}
              </p>
              {c.same_dates && (
                <p className="mt-0.5 text-[12px] text-ink-subdued">
                  Mesmas datas: pode ser só o eco do teu próprio calendário. Se
                  for, marca como visto.
                </p>
              )}
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const result = await dismissIcalConflict(c.id, propertyId);
                  if ("error" in result) setError(result.error);
                });
              }}
              className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border border-border px-3 text-[12px] font-semibold text-ink-muted hover:bg-surface-1 disabled:opacity-60"
            >
              <Eye className="h-3.5 w-3.5" strokeWidth={2} />
              Marcar como visto
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="text-body text-error">{error}</p>}
    </section>
  );
}

function SyncAllButton({ propertyId }: { propertyId: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const result = await syncPropertyFeeds(propertyId);
            if ("error" in result) {
              setMessage({ ok: false, text: result.error });
              return;
            }
            setMessage({
              ok: result.failed === 0,
              text:
                result.synced + result.failed === 0
                  ? "Ainda não há feeds ativos."
                  : `${result.synced} feed(s) lidos: ${result.created} nova(s), ${result.updated} atualizada(s), ${result.cancelled} cancelada(s)${
                      result.conflicts > 0
                        ? `, ${result.conflicts} conflito(s)`
                        : ""
                    }${result.failed > 0 ? ` · ${result.failed} com erro` : ""}.`,
            });
          });
        }}
        className="flex min-h-10 items-center gap-2 rounded-md border border-border bg-canvas px-4 text-body font-semibold text-ink transition-colors duration-fast ease-standard hover:bg-surface-1 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw
          className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`}
          strokeWidth={2}
        />
        {isPending ? "A sincronizar..." : "Sincronizar tudo"}
      </button>
      {message && (
        <p
          aria-live="polite"
          className={`max-w-sm text-right text-[12px] ${message.ok ? "font-semibold text-success" : "text-error"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

export function CanaisClient({
  propertyId,
  rooms,
  feeds,
  conflicts,
  appUrl,
}: {
  propertyId: string;
  rooms: Room[];
  feeds: IcalFeedRow[];
  conflicts: IcalConflictRow[];
  appUrl: string;
}) {
  const [adding, setAdding] = useState<{
    room: Room;
    channel: AnyChannelDef;
  } | null>(null);
  const [editingFeed, setEditingFeed] = useState<{
    room: Room;
    feed: IcalFeedRow;
  } | null>(null);
  const [deletingFeed, setDeletingFeed] = useState<IcalFeedRow | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-3xl text-body text-ink-muted">
          Importa as reservas da Booking.com, Airbnb ou VRBO para o calendário
          deste alojamento e exporta as ocupadas para os outros canais não
          venderem essas noites. O PMS lê os feeds de 15 em 15 minutos; o atraso
          do lado de cada plataforma (a ler o teu calendário) depende delas e
          pode ser maior. O iCal só leva datas, nunca preços.
        </p>
        <SyncAllButton propertyId={propertyId} />
      </div>

      <ConflictsPanel conflicts={conflicts} propertyId={propertyId} />

      {rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-canvas py-16 text-center">
          <Radio className="h-8 w-8 text-ink-subdued" strokeWidth={1.5} />
          <p className="text-body font-semibold text-ink">
            Sem quartos neste alojamento
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rooms.map((room) => (
            <RoomRow
              key={room.id}
              propertyId={propertyId}
              room={room}
              feeds={feeds.filter((f) => f.room_id === room.id)}
              appUrl={appUrl}
              onConnect={(channel) => setAdding({ room, channel })}
              onEditFeed={(feed) => setEditingFeed({ room, feed })}
              onDeleteFeed={(feed) => setDeletingFeed(feed)}
            />
          ))}
        </div>
      )}

      {adding && (
        <FeedFormModal
          propertyId={propertyId}
          room={adding.room}
          channel={adding.channel}
          appUrl={appUrl}
          onClose={() => setAdding(null)}
        />
      )}
      {editingFeed && (
        <FeedFormModal
          propertyId={propertyId}
          room={editingFeed.room}
          feed={editingFeed.feed}
          appUrl={appUrl}
          onClose={() => setEditingFeed(null)}
        />
      )}
      {deletingFeed && (
        <ConfirmDeleteFeedModal
          feed={deletingFeed}
          onClose={() => setDeletingFeed(null)}
          onDelete={() => deleteIcalFeed(deletingFeed.id, propertyId)}
        />
      )}
    </div>
  );
}
