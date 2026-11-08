"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  Mail,
  Pencil,
  Phone,
  Plus,
  Trash2,
  UserCheck,
  UserPlus,
} from "lucide-react";
import {
  LEAD_SOURCES,
  LEAD_SOURCE_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_STYLES,
  type CrmLead,
  type LeadSource,
  type LeadStatus,
} from "@/lib/crm";
import type { StaffOption } from "./hospedes-client";
import {
  convertLeadToGuest,
  deleteLead,
  saveLead,
  setLeadStatus,
} from "./crm-actions";
import {
  Modal,
  inputClasses,
  labelClasses,
  primaryButton,
  secondaryButton,
} from "./crm-ui";

function ageLabel(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  return `há ${days} dias`;
}

const COLUMN_MIN_WIDTH = 260;

export function LeadsTab({
  leads,
  staff,
  onOpenGuest,
}: {
  leads: CrmLead[];
  staff: StaffOption[];
  onOpenGuest: (guestId: string) => void;
}) {
  const [editing, setEditing] = useState<CrmLead | "new" | null>(null);
  const [dragOver, setDragOver] = useState<LeadStatus | null>(null);
  const [dragError, setDragError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Ao largar um cartão, a coluna muda logo; se o servidor recusar, volta.
  const [optimisticLeads, moveOptimistic] = useOptimistic(
    leads,
    (state, move: { id: string; status: LeadStatus }) =>
      state.map((l) => (l.id === move.id ? { ...l, status: move.status } : l)),
  );

  function drop(status: LeadStatus, leadId: string) {
    setDragOver(null);
    setDragError(null);
    const lead = optimisticLeads.find((l) => l.id === leadId);
    if (!lead || lead.status === status) return;

    startTransition(async () => {
      moveOptimistic({ id: leadId, status });
      const result = await setLeadStatus(leadId, status);
      if ("error" in result) setDragError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-body text-ink-muted">
          Arrasta os cartões entre colunas para mudar o estado. As mensagens do
          formulário do website entram aqui como «Novo».
        </p>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className={primaryButton}
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Novo lead
        </button>
      </div>

      {dragError && (
        <p aria-live="polite" className="text-body text-error">
          {dragError}
        </p>
      )}

      {/* Layout em estilo direto: o quadro não pode depender da cache de CSS
          do servidor de desenvolvimento (já apareceu empilhado por isso). */}
      <div
        style={{
          display: "flex",
          gap: 16,
          overflowX: "auto",
          alignItems: "flex-start",
          paddingBottom: 8,
        }}
      >
        {LEAD_STATUSES.map((status) => {
          const items = optimisticLeads.filter((l) => l.status === status);
          const isOver = dragOver === status;
          return (
            <section
              key={status}
              aria-label={LEAD_STATUS_LABELS[status]}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                if (dragOver !== status) setDragOver(status);
              }}
              onDragLeave={(event) => {
                // Só limpa ao sair da coluna (não ao passar por cartões dentro).
                if (
                  !event.currentTarget.contains(event.relatedTarget as Node)
                ) {
                  setDragOver((current) =>
                    current === status ? null : current,
                  );
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                const id = event.dataTransfer.getData("text/lead-id");
                if (id) drop(status, id);
              }}
              style={{
                flex: `1 1 ${COLUMN_MIN_WIDTH}px`,
                minWidth: COLUMN_MIN_WIDTH,
                minHeight: 320,
              }}
              className={`flex flex-col gap-3 rounded-lg p-3 transition-colors duration-fast ease-standard ${
                isOver
                  ? "bg-surface-2 outline-2 outline-dashed outline-action"
                  : "bg-surface-1"
              }`}
            >
              <h2 className="flex items-center justify-between text-[12px] font-bold uppercase tracking-wide text-ink-muted">
                {LEAD_STATUS_LABELS[status]}
                <span
                  className={`rounded-pill px-2 py-0.5 text-[11px] ${LEAD_STATUS_STYLES[status]}`}
                >
                  {items.length}
                </span>
              </h2>
              {items.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-1 py-6 text-center text-[12px] text-ink-subdued">
                  {isOver ? "Larga aqui" : "Sem leads"}
                </p>
              ) : (
                items.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onEdit={() => setEditing(lead)}
                    onOpenGuest={onOpenGuest}
                  />
                ))
              )}
            </section>
          );
        })}
      </div>

      {editing && (
        <LeadModal
          lead={editing === "new" ? undefined : editing}
          staff={staff}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function LeadCard({
  lead,
  onEdit,
  onOpenGuest,
}: {
  lead: CrmLead;
  onEdit: () => void;
  onOpenGuest: (guestId: string) => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(task: () => Promise<{ error: string } | { success: true }>) {
    setError(null);
    startTransition(async () => {
      const result = await task();
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <article
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/lead-id", lead.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      className="flex cursor-grab flex-col gap-2 rounded-lg border border-border bg-canvas p-3 shadow-card active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 truncate text-body font-bold text-ink">
          {lead.name}
        </h3>
        <button
          type="button"
          onClick={onEdit}
          aria-label="Editar lead"
          className="rounded p-1 text-ink-subdued hover:bg-surface-1"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>

      <p className="text-[11px] text-ink-subdued">
        {LEAD_SOURCE_LABELS[lead.source]} · {ageLabel(lead.created_at)}
        {lead.assignee?.name ? ` · ${lead.assignee.name}` : ""}
      </p>

      <div className="flex flex-col gap-0.5 text-[12px] text-ink-muted">
        {lead.email && (
          <a
            href={`mailto:${lead.email}`}
            className="flex items-center gap-1.5 truncate hover:text-action"
          >
            <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            {lead.email}
          </a>
        )}
        {lead.phone && (
          <a
            href={`tel:${lead.phone}`}
            className="flex items-center gap-1.5 hover:text-action"
          >
            <Phone className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            {lead.phone}
          </a>
        )}
      </div>

      {lead.message && (
        <p className="line-clamp-3 whitespace-pre-wrap rounded bg-surface-1 px-2 py-1.5 text-[12px] text-ink-muted">
          {lead.message}
        </p>
      )}

      <select
        value={lead.status}
        disabled={isPending}
        onChange={(e) => run(() => setLeadStatus(lead.id, e.target.value))}
        aria-label="Estado do lead"
        className={`min-h-9 rounded-md border-0 px-2 text-[12px] font-semibold focus:outline-none focus:ring-2 focus:ring-action ${LEAD_STATUS_STYLES[lead.status]}`}
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>
            {LEAD_STATUS_LABELS[s]}
          </option>
        ))}
      </select>

      <div className="flex flex-wrap items-center gap-1.5">
        {lead.guest_id ? (
          <button
            type="button"
            onClick={() => onOpenGuest(lead.guest_id as string)}
            className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[12px] font-semibold text-success hover:bg-surface-1"
          >
            <UserCheck className="h-3.5 w-3.5" strokeWidth={2} />
            Ver ficha
          </button>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => convertLeadToGuest(lead.id))}
            title="Cria (ou liga) um hóspede com os dados deste lead"
            className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[12px] font-semibold text-ink hover:bg-surface-1 disabled:opacity-60"
          >
            <UserPlus className="h-3.5 w-3.5" strokeWidth={2} />
            Converter em hóspede
          </button>
        )}

        {confirmingDelete ? (
          <span className="ml-auto flex items-center gap-1">
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => deleteLead(lead.id))}
              className="rounded-md bg-error px-2 py-1 text-[12px] font-semibold text-white"
            >
              Apagar
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="rounded-md border border-border px-2 py-1 text-[12px] font-semibold text-ink"
            >
              Não
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            aria-label="Eliminar lead"
            className="ml-auto rounded p-1.5 text-ink-subdued hover:bg-error/10 hover:text-error"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        )}
      </div>
      {error && <p className="text-[12px] text-error">{error}</p>}
    </article>
  );
}

function LeadModal({
  lead,
  staff,
  onClose,
}: {
  lead?: CrmLead;
  staff: StaffOption[];
  onClose: () => void;
}) {
  const [name, setName] = useState(lead?.name ?? "");
  const [email, setEmail] = useState(lead?.email ?? "");
  const [phone, setPhone] = useState(lead?.phone ?? "");
  const [source, setSource] = useState<LeadSource>(lead?.source ?? "manual");
  const [status, setStatus] = useState<LeadStatus>(lead?.status ?? "novo");
  const [assignedTo, setAssignedTo] = useState(lead?.assigned_to ?? "");
  const [message, setMessage] = useState(lead?.message ?? "");
  const [notes, setNotes] = useState(lead?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await saveLead({
        id: lead?.id,
        name,
        email,
        phone,
        message,
        notes,
        source,
        status,
        assignedTo: assignedTo || null,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <Modal title={lead ? "Editar lead" : "Novo lead"} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lead-name" className={labelClasses}>
            Nome
          </label>
          <input
            id="lead-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClasses}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lead-email" className={labelClasses}>
              Email
            </label>
            <input
              id="lead-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClasses}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lead-phone" className={labelClasses}>
              Telefone
            </label>
            <input
              id="lead-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClasses}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lead-source" className={labelClasses}>
              Origem
            </label>
            <select
              id="lead-source"
              value={source}
              onChange={(e) => setSource(e.target.value as LeadSource)}
              className={inputClasses}
            >
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {LEAD_SOURCE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lead-status" className={labelClasses}>
              Estado
            </label>
            <select
              id="lead-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as LeadStatus)}
              className={inputClasses}
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {LEAD_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lead-assignee" className={labelClasses}>
            Responsável
          </label>
          <select
            id="lead-assignee"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className={inputClasses}
          >
            <option value="">Sem responsável</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lead-message" className={labelClasses}>
            Pedido / mensagem
          </label>
          <textarea
            id="lead-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className={`${inputClasses} min-h-0 py-2`}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lead-notes" className={labelClasses}>
            Notas internas
          </label>
          <textarea
            id="lead-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={`${inputClasses} min-h-0 py-2`}
          />
        </div>
        {error && <p className="text-body text-error">{error}</p>}
        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={isPending || !name.trim()}
            className={primaryButton}
          >
            {isPending ? "A guardar..." : "Guardar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
