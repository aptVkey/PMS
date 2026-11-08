"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { Plus, Wrench } from "lucide-react";
import {
  MAINTENANCE_STATUSES,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_STATUS_STYLES,
  type MaintenanceIssue,
  type MaintenanceStatus,
} from "@/lib/maintenance";
import type { StaffMember, PermissionKey } from "@/lib/staff";
import { setMaintenanceIssueStatus } from "./maintenance-actions";
import { MaintenanceKanbanCard } from "./maintenance-kanban-card";
import { MaintenanceIssueFormModal } from "./maintenance-issue-form-modal";

const STATUS_DOT: Record<MaintenanceStatus, string> = {
  reportado: "bg-highlight",
  em_curso: "bg-action",
  resolvido: "bg-success",
};

const PRIORITY_RANK: Record<string, number> = { alta: 0, media: 1, baixa: 2 };
const COLUMN_MIN_WIDTH = 280;
// A coluna "Resolvido" só mostra as mais recentes, senão cresce sem fim.
const RESOLVED_LIMIT = 8;

export function ManutencaoSection({
  issues,
  rooms,
  staff,
  currentUserId,
  permissions,
}: {
  issues: MaintenanceIssue[];
  rooms: { id: string; name: string }[];
  staff: StaffMember[];
  currentUserId: string;
  permissions: PermissionKey[];
}) {
  const isAdmin = permissions.includes("equipas");
  const canManageAnyIssue = isAdmin || permissions.includes("manutencao");
  const [showAllResolved, setShowAllResolved] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [dragOver, setDragOver] = useState<MaintenanceStatus | null>(null);
  const [dragError, setDragError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Ao largar um cartão a coluna muda logo; se o servidor recusar, volta.
  const [optimisticIssues, moveOptimistic] = useOptimistic(
    issues,
    (state, move: { id: string; status: MaintenanceStatus }) =>
      state.map((i) => (i.id === move.id ? { ...i, status: move.status } : i)),
  );

  const canEdit = (issue: MaintenanceIssue) =>
    canManageAnyIssue || issue.assigned_to === currentUserId;

  const columns = useMemo(() => {
    const scoped = optimisticIssues.filter(
      (i) => !onlyMine || i.assigned_to === currentUserId,
    );
    return MAINTENANCE_STATUSES.map((status) => {
      const all = scoped
        .filter((i) => i.status === status)
        .sort((a, b) =>
          status === "resolvido"
            ? (b.completed_at ?? b.updated_at).localeCompare(
                a.completed_at ?? a.updated_at,
              )
            : PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
              a.created_at.localeCompare(b.created_at),
        );
      const visible =
        status === "resolvido" && !showAllResolved
          ? all.slice(0, RESOLVED_LIMIT)
          : all;
      return { status, all, visible };
    });
  }, [optimisticIssues, onlyMine, currentUserId, showAllResolved]);

  function drop(status: MaintenanceStatus, issueId: string) {
    setDragOver(null);
    setDragError(null);
    const issue = optimisticIssues.find((i) => i.id === issueId);
    if (!issue || issue.status === status) return;
    if (!canEdit(issue)) {
      setDragError("Não tens permissão para mudar o estado desta ocorrência.");
      return;
    }

    startTransition(async () => {
      moveOptimistic({ id: issueId, status });
      const result = await setMaintenanceIssueStatus(issueId, status);
      if ("error" in result) setDragError(result.error);
    });
  }

  const totalOpen = optimisticIssues.filter(
    (i) => i.status !== "resolvido",
  ).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-body text-ink-muted">
            {totalOpen} em aberto · arrasta os cartões para mudar o estado
          </p>
          <label className="flex items-center gap-2 text-body text-ink">
            <input
              type="checkbox"
              checked={onlyMine}
              onChange={(e) => setOnlyMine(e.target.checked)}
              className="h-4 w-4 rounded border-border text-action focus:ring-action"
            />
            Só as minhas
          </label>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={rooms.length === 0}
          className="flex min-h-11 items-center gap-2 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Adicionar ocorrência
        </button>
      </div>

      {dragError && (
        <p aria-live="polite" className="text-body text-error">
          {dragError}
        </p>
      )}

      {/* Layout em estilo direto: o quadro não pode depender da cache de CSS
          do servidor de desenvolvimento. */}
      <div
        style={{
          display: "flex",
          gap: 16,
          overflowX: "auto",
          alignItems: "flex-start",
          paddingBottom: 8,
        }}
      >
        {columns.map(({ status, all, visible }) => {
          const isOver = dragOver === status;
          return (
            <section
              key={status}
              aria-label={MAINTENANCE_STATUS_LABELS[status]}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                if (dragOver !== status) setDragOver(status);
              }}
              onDragLeave={(event) => {
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
                const id = event.dataTransfer.getData("text/issue-id");
                if (id) drop(status, id);
              }}
              style={{
                flex: `1 1 ${COLUMN_MIN_WIDTH}px`,
                minWidth: COLUMN_MIN_WIDTH,
                minHeight: 360,
              }}
              className={`flex flex-col gap-3 rounded-xl p-3 transition-colors duration-fast ease-standard ${
                isOver
                  ? "bg-surface-2 outline-2 outline-dashed outline-action"
                  : "bg-surface-1"
              }`}
            >
              <h2 className="flex items-center justify-between px-1 text-[12px] font-bold uppercase tracking-wide text-ink-muted">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[status]}`}
                  />
                  {MAINTENANCE_STATUS_LABELS[status]}
                </span>
                <span
                  className={`rounded-pill px-2 py-0.5 text-[11px] ${MAINTENANCE_STATUS_STYLES[status]}`}
                >
                  {all.length}
                </span>
              </h2>

              {visible.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border px-2 py-8 text-center text-[12px] text-ink-subdued">
                  {status === "reportado" && (
                    <Wrench className="h-5 w-5" strokeWidth={1.5} />
                  )}
                  {isOver
                    ? "Larga aqui"
                    : status === "reportado"
                      ? "Sem ocorrências por tratar"
                      : "Vazio"}
                </div>
              ) : (
                visible.map((issue) => (
                  <MaintenanceKanbanCard
                    key={issue.id}
                    issue={issue}
                    rooms={rooms}
                    staff={staff}
                    canEditStatus={canEdit(issue)}
                    canManage={canManageAnyIssue}
                    isAdmin={isAdmin}
                  />
                ))
              )}

              {status === "resolvido" && all.length > RESOLVED_LIMIT && (
                <button
                  type="button"
                  onClick={() => setShowAllResolved((v) => !v)}
                  className="rounded-md border border-border bg-canvas px-3 py-2 text-[12px] font-semibold text-ink-muted hover:bg-surface-2"
                >
                  {showAllResolved
                    ? "Mostrar só as mais recentes"
                    : `Ver todas (${all.length})`}
                </button>
              )}
            </section>
          );
        })}
      </div>

      {modalOpen && (
        <MaintenanceIssueFormModal
          rooms={rooms}
          staff={staff}
          canDelete={false}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
