"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import {
  MAINTENANCE_STATUSES,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_STATUS_STYLES,
  MAINTENANCE_PRIORITY_LABELS,
  MAINTENANCE_PRIORITY_STYLES,
  type MaintenanceIssue,
} from "@/lib/maintenance";
import type { StaffMember } from "@/lib/staff";
import {
  setMaintenanceIssueStatus,
  setMaintenanceIssueAssignee,
} from "./maintenance-actions";
import { MaintenanceIssueFormModal } from "./maintenance-issue-form-modal";
import { MaintenanceIssueTimer } from "./maintenance-issue-timer";

export function MaintenanceIssueRow({
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

  function handleStatusChange(status: string) {
    setError(null);
    startTransition(async () => {
      const result = await setMaintenanceIssueStatus(issue.id, status);
      if ("error" in result) setError(result.error);
    });
  }

  function handleAssigneeChange(staffId: string) {
    setError(null);
    startTransition(async () => {
      const result = await setMaintenanceIssueAssignee(issue.id, staffId || null);
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <>
      <tr className="border-b border-border last:border-0">
        <td className="whitespace-nowrap px-4 py-3 text-body text-ink-muted">
          {issue.room?.name ?? issue.location_label ?? "—"}
        </td>
        <td className="max-w-[240px] px-4 py-3">
          <p className="text-body font-semibold text-ink">{issue.title}</p>
          {issue.description && (
            <p className="line-clamp-2 text-[12px] text-ink-subdued">
              {issue.description}
            </p>
          )}
        </td>
        <td className="whitespace-nowrap px-4 py-3">
          <span
            className={`rounded-pill px-3 py-1 text-[12px] font-semibold ${MAINTENANCE_PRIORITY_STYLES[issue.priority]}`}
          >
            {MAINTENANCE_PRIORITY_LABELS[issue.priority]}
          </span>
        </td>
        <td className="px-4 py-3">
          {canEditStatus ? (
            <select
              value={issue.status}
              disabled={isPending}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`min-h-9 rounded-md border-0 px-3 text-[12px] font-semibold focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${MAINTENANCE_STATUS_STYLES[issue.status]}`}
            >
              {MAINTENANCE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {MAINTENANCE_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          ) : (
            <span
              className={`rounded-pill px-3 py-1 text-[12px] font-semibold ${MAINTENANCE_STATUS_STYLES[issue.status]}`}
            >
              {MAINTENANCE_STATUS_LABELS[issue.status]}
            </span>
          )}
          {error && <p className="mt-1 text-[12px] text-error">{error}</p>}
        </td>
        <td className="whitespace-nowrap px-4 py-3">
          {canManage ? (
            <select
              value={issue.assigned_to ?? ""}
              disabled={isPending}
              onChange={(e) => handleAssigneeChange(e.target.value)}
              className="min-h-9 rounded-md border border-border bg-canvas px-2 text-body text-ink focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2"
            >
              <option value="">Não atribuído</option>
              {assignableStaff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-body text-ink-muted">
              {issue.assignee?.name ?? "Não atribuído"}
            </span>
          )}
        </td>
        {isAdmin && (
          <td className="whitespace-nowrap px-4 py-3">
            <MaintenanceIssueTimer
              status={issue.status}
              startedAt={issue.started_at}
              completedAt={issue.completed_at}
              hourlyRate={issue.assignee?.hourly_rate ?? null}
            />
          </td>
        )}
        <td className="whitespace-nowrap px-4 py-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Editar ocorrência"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink transition-colors duration-fast ease-standard hover:bg-surface-1"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </td>
      </tr>

      {editing && (
        <MaintenanceIssueFormModal
          issue={issue}
          rooms={rooms}
          canDelete={canManage}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}
