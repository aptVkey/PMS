"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, MapPin, Pencil } from "lucide-react";
import {
  MAINTENANCE_PRIORITY_LABELS,
  MAINTENANCE_STATUSES,
  MAINTENANCE_STATUS_LABELS,
  type MaintenanceIssue,
  type MaintenancePriority,
} from "@/lib/maintenance";
import type { StaffMember } from "@/lib/staff";
import {
  setMaintenanceIssueAssignee,
  setMaintenanceIssueStatus,
} from "./maintenance-actions";
import { MaintenanceIssueFormModal } from "./maintenance-issue-form-modal";
import { MaintenanceIssueTimer } from "./maintenance-issue-timer";
import { ModalPortal } from "@/components/modal-portal";

const PRIORITY_STYLES: Record<
  MaintenancePriority,
  { badge: string; dot: string }
> = {
  alta: { badge: "bg-error/10 text-error", dot: "bg-error" },
  media: { badge: "bg-highlight/25 text-highlight-ink", dot: "bg-highlight" },
  baixa: { badge: "bg-surface-2 text-ink-muted", dot: "bg-ink-subdued" },
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function MaintenanceKanbanCard({
  issue,
  rooms,
  staff,
  canEditStatus,
  canManage,
  isAdmin,
}: {
  issue: MaintenanceIssue;
  rooms: { id: string; name: string }[];
  staff: StaffMember[];
  canEditStatus: boolean;
  canManage: boolean;
  isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const assignableStaff = staff.filter(
    (member) => member.active && member.permissions.includes("manutencao"),
  );
  const priority = PRIORITY_STYLES[issue.priority];
  const resolved = issue.status === "resolvido";

  function run(task: () => Promise<{ error: string } | { success: true }>) {
    setError(null);
    startTransition(async () => {
      const result = await task();
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <>
      <article
        draggable={canEditStatus}
        onDragStart={(event) => {
          event.dataTransfer.setData("text/issue-id", issue.id);
          event.dataTransfer.effectAllowed = "move";
        }}
        className={`flex flex-col gap-3 rounded-xl border border-border bg-canvas p-4 shadow-card transition-shadow duration-base ease-standard hover:shadow-elevated ${
          canEditStatus ? "cursor-grab active:cursor-grabbing" : ""
        } ${isPending ? "opacity-70" : ""} ${resolved ? "bg-canvas/70" : ""}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${priority.badge}`}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${priority.dot}`}
            />
            {MAINTENANCE_PRIORITY_LABELS[issue.priority]}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Editar ocorrência"
            className="rounded-md p-1.5 text-ink-subdued transition-colors duration-fast ease-standard hover:bg-surface-1 hover:text-ink"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="flex items-start gap-1.5 text-[15px] font-bold leading-snug text-ink">
            {resolved && (
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-success"
                strokeWidth={2.25}
              />
            )}
            {issue.title}
          </h3>
          {issue.description && (
            <p className="line-clamp-2 text-[13px] leading-snug text-ink-muted">
              {issue.description}
            </p>
          )}
        </div>

        <p className="inline-flex w-fit max-w-full items-center gap-1.5 rounded-pill bg-surface-1 px-2.5 py-1 text-[12px] font-medium text-ink-muted">
          <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span className="truncate">
            {issue.room?.name ?? issue.location_label ?? "—"}
          </span>
        </p>

        <div className="flex items-center gap-2.5 border-t border-border pt-3">
          <span
            aria-hidden="true"
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
              issue.assignee
                ? "bg-primary text-on-primary"
                : "border border-dashed border-border text-ink-subdued"
            }`}
          >
            {issue.assignee ? initials(issue.assignee.name) : "?"}
          </span>

          {canManage ? (
            <select
              value={issue.assigned_to ?? ""}
              disabled={isPending}
              onChange={(e) =>
                run(() =>
                  setMaintenanceIssueAssignee(issue.id, e.target.value || null),
                )
              }
              aria-label="Atribuir a"
              className="min-h-8 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 text-[13px] font-medium text-ink hover:border-border focus:border-action focus:outline-none focus:ring-2 focus:ring-action"
            >
              <option value="">Por atribuir</option>
              {assignableStaff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
              {issue.assignee?.name ?? "Por atribuir"}
            </span>
          )}
        </div>

        {isAdmin && (
          <div className="rounded-lg bg-surface-1 px-3 py-2">
            <MaintenanceIssueTimer
              status={issue.status}
              startedAt={issue.started_at}
              completedAt={issue.completed_at}
              hourlyRate={issue.assignee?.hourly_rate ?? null}
              totalCost={issue.total_cost}
              hasAssignee={Boolean(issue.assigned_to)}
            />
          </div>
        )}

        {/* Alternativa ao arrastar (telemóvel / teclado). */}
        {canEditStatus && (
          <label className="flex items-center justify-between gap-2 text-[11px] text-ink-subdued">
            Mover para
            <select
              value={issue.status}
              disabled={isPending}
              onChange={(e) =>
                run(() => setMaintenanceIssueStatus(issue.id, e.target.value))
              }
              aria-label="Estado da ocorrência"
              className="min-h-8 rounded-md border border-border bg-canvas px-2 text-[12px] font-semibold text-ink-muted focus:border-action focus:outline-none focus:ring-2 focus:ring-action"
            >
              {MAINTENANCE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {MAINTENANCE_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
        )}

        {error && <p className="text-[12px] text-error">{error}</p>}
      </article>

      <ModalPortal>
        {editing && (
          <MaintenanceIssueFormModal
            issue={issue}
            rooms={rooms}
            staff={staff}
            canDelete={canManage}
            onClose={() => setEditing(false)}
          />
        )}
      </ModalPortal>
    </>
  );
}
