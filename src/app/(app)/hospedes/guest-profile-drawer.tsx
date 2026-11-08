"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  CalendarDays,
  Check,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  DOCUMENT_TYPE_LABELS,
  type DocumentType,
  type Guest,
} from "@/lib/guests";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_STYLES,
  formatBookingCode,
} from "@/lib/bookings";
import {
  INTERACTION_LABELS,
  INTERACTION_TYPES,
  TAG_COLORS,
  TAG_COLOR_LABELS,
  autoTagLabels,
  type CrmInteraction,
  type CrmTag,
  type CrmTask,
  type GuestStats,
  type InteractionType,
  type TagColor,
} from "@/lib/crm";
import { diffDaysISO, formatDateLabel } from "@/lib/date-utils";
import type { GuestBooking } from "./page";
import type { StaffOption } from "./hospedes-client";
import { GuestFormModal } from "./guest-form-modal";
import {
  addInteraction,
  createTag,
  deleteInteraction,
  deleteTask,
  saveTask,
  setGuestTag,
  setTaskDone,
} from "./crm-actions";
import {
  AutoChip,
  TagChip,
  formatMoney,
  inputClasses,
  labelClasses,
  primaryButton,
} from "./crm-ui";

type DrawerTab = "resumo" | "estadias" | "interacoes" | "tarefas";

const TABS: { key: DrawerTab; label: string }[] = [
  { key: "resumo", label: "Resumo" },
  { key: "estadias", label: "Estadias" },
  { key: "interacoes", label: "Interações" },
  { key: "tarefas", label: "Tarefas" },
];

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface-1 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-subdued">
        {label}
      </p>
      <p className="mt-0.5 text-[16px] font-bold text-ink">{value}</p>
    </div>
  );
}

export function GuestProfileDrawer({
  guest,
  bookings,
  stats,
  tags,
  guestTagIds,
  autoTags,
  tasks,
  staff,
  today,
  onClose,
}: {
  guest: Guest;
  bookings: GuestBooking[];
  stats: GuestStats;
  tags: CrmTag[];
  guestTagIds: string[];
  // Etiquetas calculadas por regras (só leitura).
  autoTags: CrmTag[];
  tasks: CrmTask[];
  staff: StaffOption[];
  today: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<DrawerTab>("resumo");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !editing) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, editing]);

  const assigned = tags.filter((t) => guestTagIds.includes(t.id));
  const autoLabels = autoTagLabels(stats);
  const openTasks = tasks.filter((t) => !t.done).length;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40">
      <button
        type="button"
        aria-label="Fechar ficha"
        onClick={onClose}
        className="hidden flex-1 cursor-default sm:block"
      />
      <aside
        role="dialog"
        aria-label={`Ficha de ${guest.name}`}
        className="flex h-full w-full flex-col bg-canvas shadow-popover sm:max-w-xl"
      >
        <header className="flex flex-col gap-3 border-b border-border px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-[20px] font-bold text-ink">
                {guest.name}
              </h2>
              <p className="text-[12px] text-ink-subdued">
                {[
                  guest.nationality,
                  `Cliente desde ${formatDateLabel(guest.created_at.slice(0, 10))}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="Editar dados do hóspede"
                title="Editar dados"
                className="rounded-md p-2 text-ink-subdued hover:bg-surface-1"
              >
                <Pencil className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="rounded-md p-2 text-ink-subdued hover:bg-surface-1"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1 text-body text-ink-muted">
            {guest.email && (
              <a
                href={`mailto:${guest.email}`}
                className="flex items-center gap-1.5 hover:text-action"
              >
                <Mail className="h-4 w-4" strokeWidth={2} />
                {guest.email}
              </a>
            )}
            {guest.phone && (
              <a
                href={`tel:${guest.phone}`}
                className="flex items-center gap-1.5 hover:text-action"
              >
                <Phone className="h-4 w-4" strokeWidth={2} />
                {guest.phone}
              </a>
            )}
            {!guest.email && !guest.phone && <span>Sem contactos.</span>}
          </div>

          <TagEditor
            guestId={guest.id}
            tags={tags}
            assigned={assigned}
            autoTags={autoTags}
            autoLabels={autoLabels}
            onError={setError}
          />
          {error && <p className="text-[12px] text-error">{error}</p>}
        </header>

        <nav
          aria-label="Secções da ficha"
          className="flex gap-1 border-b border-border px-3"
        >
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-current={tab === key ? "page" : undefined}
              className={`-mb-px border-b-2 px-3 py-2.5 text-body font-semibold transition-colors duration-fast ease-standard ${
                tab === key
                  ? "border-action text-action"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {label}
              {key === "estadias" && ` (${stats.stays})`}
              {key === "tarefas" && openTasks > 0 && ` (${openTasks})`}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {tab === "resumo" && <SummaryTab guest={guest} stats={stats} />}
          {tab === "estadias" && <StaysTab bookings={bookings} />}
          {tab === "interacoes" && <InteractionsTab guestId={guest.id} />}
          {tab === "tarefas" && (
            <GuestTasksTab
              guestId={guest.id}
              tasks={tasks}
              staff={staff}
              today={today}
            />
          )}
        </div>
      </aside>

      {editing && (
        <GuestFormModal
          guest={guest}
          bookings={bookings}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

// ---------- Etiquetas ----------

function TagEditor({
  guestId,
  tags,
  assigned,
  autoTags,
  autoLabels,
  onError,
}: {
  guestId: string;
  tags: CrmTag[];
  assigned: CrmTag[];
  autoTags: CrmTag[];
  autoLabels: string[];
  onError: (message: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<TagColor>("blue");
  const [isPending, startTransition] = useTransition();

  const available = tags.filter((t) => !assigned.some((a) => a.id === t.id));

  function toggle(tagId: string, on: boolean) {
    onError(null);
    startTransition(async () => {
      const result = await setGuestTag(guestId, tagId, on);
      if ("error" in result) onError(result.error);
    });
  }

  function createAndAssign() {
    const name = newName.trim();
    if (!name) return;
    onError(null);
    startTransition(async () => {
      const created = await createTag(name, newColor);
      if ("error" in created) {
        onError(created.error);
        return;
      }
      const result = await setGuestTag(guestId, created.id, true);
      if ("error" in result) onError(result.error);
      setNewName("");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {assigned.map((tag) => (
          <TagChip
            key={tag.id}
            tag={tag}
            onRemove={() => toggle(tag.id, false)}
          />
        ))}
        {autoTags.map((tag) => (
          <TagChip key={tag.id} tag={tag} />
        ))}
        {autoLabels.map((label) => (
          <AutoChip key={label} label={label} />
        ))}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded-pill border border-border px-2.5 py-0.5 text-[12px] font-semibold text-ink-muted hover:bg-surface-1"
        >
          <Tag className="h-3 w-3" strokeWidth={2.5} />
          Etiqueta
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-3 rounded-md border border-border bg-surface-1 p-3">
          {available.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {available.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => toggle(tag.id, true)}
                  className="rounded-pill opacity-80 hover:opacity-100 disabled:opacity-50"
                >
                  <TagChip tag={tag} />
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nova etiqueta (ex.: VIP)"
              maxLength={40}
              aria-label="Nome da nova etiqueta"
              className={`${inputClasses} min-h-9 flex-1`}
            />
            <select
              value={newColor}
              onChange={(e) => setNewColor(e.target.value as TagColor)}
              aria-label="Cor"
              className={`${inputClasses} min-h-9 w-32`}
            >
              {TAG_COLORS.map((c) => (
                <option key={c} value={c}>
                  {TAG_COLOR_LABELS[c]}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={isPending || !newName.trim()}
              onClick={createAndAssign}
              className={`${primaryButton} min-h-9`}
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Criar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Resumo ----------

function SummaryTab({ guest, stats }: { guest: Guest; stats: GuestStats }) {
  const channels = Object.entries(stats.channels).sort((a, b) => b[1] - a[1]);
  const dateOrDash = (iso: string | null) => (iso ? formatDateLabel(iso) : "—");

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Estadias" value={String(stats.stays)} />
        <Stat label="Noites" value={String(stats.nights)} />
        <Stat label="Valor em reservas" value={formatMoney(stats.value)} />
        <Stat
          label="Ticket médio"
          value={stats.stays > 0 ? formatMoney(stats.value / stats.stays) : "—"}
        />
        <Stat label="Primeira estadia" value={dateOrDash(stats.firstStay)} />
        <Stat label="Última saída" value={dateOrDash(stats.lastStay)} />
        <Stat label="Próxima entrada" value={dateOrDash(stats.nextStay)} />
      </div>

      {channels.length > 0 && (
        <section>
          <h3 className="text-[13px] font-bold uppercase tracking-wide text-ink">
            Canais
          </h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {channels.map(([channel, count]) => (
              <li
                key={channel}
                className="rounded-pill bg-surface-1 px-3 py-1 text-[12px] font-semibold text-ink-muted"
              >
                {channel} · {count}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-ink">
          Dados
        </h3>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-body">
          <dt className="text-ink-subdued">Nacionalidade</dt>
          <dd className="text-ink">{guest.nationality ?? "—"}</dd>
          <dt className="text-ink-subdued">Aniversário</dt>
          <dd className="text-ink">
            {guest.birthday ? formatDateLabel(guest.birthday) : "—"}
          </dd>
          <dt className="text-ink-subdued">Documento</dt>
          <dd className="text-ink">
            {guest.document_type
              ? DOCUMENT_TYPE_LABELS[guest.document_type as DocumentType]
              : "—"}
            {guest.document_number ? ` · ${guest.document_number}` : ""}
          </dd>
        </dl>
      </section>

      {guest.notes && (
        <section>
          <h3 className="text-[13px] font-bold uppercase tracking-wide text-ink">
            Notas do hóspede
          </h3>
          <p className="mt-2 whitespace-pre-wrap rounded-md bg-surface-1 p-3 text-body text-ink-muted">
            {guest.notes}
          </p>
        </section>
      )}
    </div>
  );
}

// ---------- Estadias ----------

function StaysTab({ bookings }: { bookings: GuestBooking[] }) {
  if (bookings.length === 0) {
    return (
      <p className="text-body text-ink-subdued">
        Este hóspede ainda não tem reservas.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {bookings.map((b) => (
        <li
          key={b.id}
          className="flex flex-col gap-1.5 rounded-lg border border-border p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-body font-bold text-ink">
                {b.room?.property?.name ?? b.room?.name ?? "Alojamento"}
                {b.room?.property?.name && b.room.name !== b.room.property.name
                  ? ` · ${b.room.name}`
                  : ""}
              </p>
              <p className="flex items-center gap-1.5 text-[12px] text-ink-subdued">
                <CalendarDays className="h-3.5 w-3.5" strokeWidth={2} />
                {formatDateLabel(b.check_in)} → {formatDateLabel(b.check_out)} ·{" "}
                {diffDaysISO(b.check_in, b.check_out)} noites
              </p>
            </div>
            <span
              className={`shrink-0 rounded-pill px-2.5 py-0.5 text-[12px] font-semibold ${BOOKING_STATUS_STYLES[b.status]}`}
            >
              {BOOKING_STATUS_LABELS[b.status]}
            </span>
          </div>
          <p className="text-[12px] text-ink-muted">
            {formatBookingCode(b.booking_number)}
            {b.channel ? ` · ${b.channel}` : ""} · {formatMoney(b.total_amount)}
          </p>
        </li>
      ))}
    </ul>
  );
}

// ---------- Interações ----------

function InteractionsTab({ guestId }: { guestId: string }) {
  const [items, setItems] = useState<CrmInteraction[] | null>(null);
  const [reload, setReload] = useState(0);
  const [type, setType] = useState<InteractionType>("nota");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("crm_interactions")
      .select("*, author:staff(name)")
      .eq("guest_id", guestId)
      .order("created_at", { ascending: false })
      .then(({ data, error: loadError }) => {
        if (cancelled) return;
        if (loadError) {
          setError("Não foi possível carregar as interações.");
          return;
        }
        setItems((data as unknown as CrmInteraction[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [guestId, reload]);

  const refresh = useCallback(() => setReload((n) => n + 1), []);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await addInteraction(guestId, type, body);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setBody("");
      refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteInteraction(id);
      if ("error" in result) setError(result.error);
      else refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
        <div className="flex gap-2">
          <label htmlFor="interaction-type" className="sr-only">
            Tipo
          </label>
          <select
            id="interaction-type"
            value={type}
            onChange={(e) => setType(e.target.value as InteractionType)}
            className={`${inputClasses} min-h-10 w-40`}
          >
            {INTERACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {INTERACTION_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <label htmlFor="interaction-body" className="sr-only">
          Descrição
        </label>
        <textarea
          id="interaction-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder="O que foi falado ou combinado?"
          className={`${inputClasses} min-h-0 py-2`}
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={isPending || !body.trim()}
            className={primaryButton}
          >
            Registar
          </button>
        </div>
      </div>

      {error && <p className="text-body text-error">{error}</p>}

      {items === null && error ? null : items === null ? (
        <p className="flex items-center gap-2 text-body text-ink-subdued">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />A
          carregar...
        </p>
      ) : items.length === 0 ? (
        <p className="text-body text-ink-subdued">Ainda sem interações.</p>
      ) : (
        <ol className="flex flex-col gap-3 border-l-2 border-border pl-4">
          {items.map((item) => (
            <li key={item.id} className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-[22px] top-1.5 h-2.5 w-2.5 rounded-full bg-action"
              />
              <div className="flex items-start justify-between gap-2">
                <p className="text-[12px] text-ink-subdued">
                  <span className="font-semibold text-ink">
                    {INTERACTION_LABELS[item.type]}
                  </span>{" "}
                  · {new Date(item.created_at).toLocaleString("pt-PT")}
                  {item.author?.name ? ` · ${item.author.name}` : ""}
                </p>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  disabled={isPending}
                  aria-label="Remover interação"
                  className="rounded p-1 text-ink-subdued hover:bg-error/10 hover:text-error"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-body text-ink">
                {item.body}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ---------- Tarefas do hóspede ----------

function GuestTasksTab({
  guestId,
  tasks,
  staff,
  today,
}: {
  guestId: string;
  tasks: CrmTask[];
  staff: StaffOption[];
  today: string;
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function add() {
    setError(null);
    startTransition(async () => {
      const result = await saveTask({
        title,
        dueDate: dueDate || null,
        guestId,
        assignedTo: assignedTo || null,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setTitle("");
      setDueDate("");
    });
  }

  const sorted = [...tasks].sort(
    (a, b) =>
      Number(a.done) - Number(b.done) ||
      (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
        <label htmlFor="guest-task-title" className={labelClasses}>
          Nova tarefa
        </label>
        <input
          id="guest-task-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: Ligar a pedir feedback"
          maxLength={200}
          className={inputClasses}
        />
        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            aria-label="Data limite"
            className={`${inputClasses} min-h-10 w-44`}
          />
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            aria-label="Responsável"
            className={`${inputClasses} min-h-10 flex-1`}
          >
            <option value="">Sem responsável</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={add}
            disabled={isPending || !title.trim()}
            className={primaryButton}
          >
            Adicionar
          </button>
        </div>
        {error && <p className="text-body text-error">{error}</p>}
      </div>

      {sorted.length === 0 ? (
        <p className="text-body text-ink-subdued">
          Sem tarefas para este hóspede.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((task) => {
            const overdue =
              !task.done && task.due_date && task.due_date < today;
            return (
              <li
                key={task.id}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={task.done}
                  aria-label={task.title}
                  onClick={() =>
                    startTransition(async () => {
                      await setTaskDone(task.id, !task.done);
                    })
                  }
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
                    task.done
                      ? "border-success bg-success text-white"
                      : "border-ink-subdued/50"
                  }`}
                >
                  {task.done && <Check className="h-4 w-4" strokeWidth={3} />}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-body font-semibold ${
                      task.done ? "text-ink-subdued line-through" : "text-ink"
                    }`}
                  >
                    {task.title}
                  </p>
                  <p
                    className={`text-[12px] ${overdue ? "font-semibold text-error" : "text-ink-subdued"}`}
                  >
                    {task.due_date
                      ? formatDateLabel(task.due_date)
                      : "Sem data"}
                    {task.assignee?.name ? ` · ${task.assignee.name}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    startTransition(async () => {
                      await deleteTask(task.id);
                    })
                  }
                  aria-label="Remover tarefa"
                  className="rounded p-1 text-ink-subdued hover:bg-error/10 hover:text-error"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={2} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
