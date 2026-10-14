"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Copy,
  Pencil,
  Play,
  Plus,
  Radio,
  Trash2,
  XCircle,
} from "lucide-react";
import type { Room } from "@/lib/rooms";
import type { IcalFeedRow } from "@/lib/ical";
import { deleteIcalFeed, syncFeedNow, toggleIcalFeedActive } from "./actions";
import { FeedFormModal } from "./feed-form-modal";
import { ConfirmDeleteFeedModal } from "./confirm-delete-feed-modal";
import { ToggleSwitch } from "@/components/toggle-switch";

function ExportBox({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-canvas px-3 py-2">
      <span className="shrink-0 text-[12px] font-semibold text-ink-subdued">
        Exportar
      </span>
      <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-ink-muted">
        {url}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label="Copiar link de exportação"
        title="Copiar link de exportação — mostra só datas ocupadas, nunca dados do hóspede"
        className="flex min-h-8 shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface-1 px-2.5 text-[12px] font-semibold text-ink hover:bg-surface-2"
      >
        <Copy className="h-3.5 w-3.5" strokeWidth={2} />
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

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
  onEdit,
  onDelete,
}: {
  propertyId: string;
  feed: IcalFeedRow;
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
    <div className="flex flex-col gap-2 rounded-md border border-border bg-canvas p-3">
      <div className="flex flex-wrap items-center gap-3">
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
  onAddFeed,
  onEditFeed,
  onDeleteFeed,
}: {
  propertyId: string;
  room: Room;
  feeds: IcalFeedRow[];
  appUrl: string;
  onAddFeed: () => void;
  onEditFeed: (feed: IcalFeedRow) => void;
  onDeleteFeed: (feed: IcalFeedRow) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md bg-surface-1 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body font-semibold text-ink">{room.name}</p>
        <button
          type="button"
          onClick={onAddFeed}
          className="flex min-h-9 items-center gap-1.5 rounded-md bg-action px-3 text-[13px] font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          Adicionar feed
        </button>
      </div>

      {feeds.length > 0 && (
        <div className="flex flex-col gap-3">
          {feeds.map((feed) => (
            <FeedRow
              key={feed.id}
              propertyId={propertyId}
              feed={feed}
              onEdit={() => onEditFeed(feed)}
              onDelete={() => onDeleteFeed(feed)}
            />
          ))}
        </div>
      )}

      <ExportBox url={`${appUrl}/api/ical/export/${room.id}`} />
    </div>
  );
}

export function CanaisClient({
  propertyId,
  rooms,
  feeds,
  appUrl,
}: {
  propertyId: string;
  rooms: Room[];
  feeds: IcalFeedRow[];
  appUrl: string;
}) {
  const [addingFeedRoom, setAddingFeedRoom] = useState<Room | null>(null);
  const [editingFeed, setEditingFeed] = useState<{
    room: Room;
    feed: IcalFeedRow;
  } | null>(null);
  const [deletingFeed, setDeletingFeed] = useState<IcalFeedRow | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-body text-ink-muted">
        Importa a disponibilidade da Booking.com/Airbnb para o calendário deste
        alojamento e exporta o calendário para eles não deixarem outra pessoa
        reservar um quarto já ocupado. Sincroniza de hora a hora.
      </p>

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
              onAddFeed={() => setAddingFeedRoom(room)}
              onEditFeed={(feed) => setEditingFeed({ room, feed })}
              onDeleteFeed={(feed) => setDeletingFeed(feed)}
            />
          ))}
        </div>
      )}

      {addingFeedRoom && (
        <FeedFormModal
          propertyId={propertyId}
          room={addingFeedRoom}
          onClose={() => setAddingFeedRoom(null)}
        />
      )}
      {editingFeed && (
        <FeedFormModal
          propertyId={propertyId}
          room={editingFeed.room}
          feed={editingFeed.feed}
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
