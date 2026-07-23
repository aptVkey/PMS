"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import {
  CLEANING_STATUSES,
  CLEANING_STATUS_LABELS,
  CLEANING_STATUS_STYLES,
  CLEANING_SOURCE_LABELS,
  type CleaningTask,
} from "@/lib/cleaning";
import type { StaffMember } from "@/lib/staff";
import { setCleaningTaskStatus, setCleaningTaskAssignee } from "./cleaning-actions";
import { CleaningTaskFormModal } from "./cleaning-task-form-modal";
import { CleaningTaskTimer } from "./cleaning-task-timer";

export function CleaningTaskRow({
  task,
  rooms,
  staff,
  canEditStatus,
  canManage,
  isAdmin,
}: {
  task: CleaningTask;
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
    (member) => member.active && member.permissions.includes("limpeza"),
  );

  function handleStatusChange(status: string) {
    setError(null);
    startTransition(async () => {
      const result = await setCleaningTaskStatus(task.id, status);
      if ("error" in result) setError(result.error);
    });
  }

  function handleAssigneeChange(staffId: string) {
    setError(null);
    startTransition(async () => {
      const result = await setCleaningTaskAssignee(task.id, staffId || null);
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <>
      <tr className="border-b border-border last:border-0">
        <td className="whitespace-nowrap px-4 py-3">
          <p className="text-body font-semibold text-ink">
            {task.room?.name ?? "—"}
          </p>
          {task.booking?.guest?.name && (
            <p className="text-[12px] text-ink-subdued">
              {task.booking.guest.name}
            </p>
          )}
        </td>
        <td className="whitespace-nowrap px-4 py-3">
          <span className="rounded-pill bg-surface-2 px-3 py-1 text-[12px] font-semibold text-ink-muted">
            {CLEANING_SOURCE_LABELS[task.source]}
          </span>
        </td>
        <td className="px-4 py-3">
          {canEditStatus ? (
            <select
              value={task.status}
              disabled={isPending}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`min-h-9 rounded-md border-0 px-3 text-[12px] font-semibold focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${CLEANING_STATUS_STYLES[task.status]}`}
            >
              {CLEANING_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {CLEANING_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          ) : (
            <span
              className={`rounded-pill px-3 py-1 text-[12px] font-semibold ${CLEANING_STATUS_STYLES[task.status]}`}
            >
              {CLEANING_STATUS_LABELS[task.status]}
            </span>
          )}
          {error && <p className="mt-1 text-[12px] text-error">{error}</p>}
        </td>
        <td className="whitespace-nowrap px-4 py-3">
          {canManage ? (
            <select
              value={task.assigned_to ?? ""}
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
              {task.assignee?.name ?? "Não atribuído"}
            </span>
          )}
        </td>
        <td className="max-w-[220px] px-4 py-3 text-body text-ink-muted">
          <span className="line-clamp-2">{task.notes || "—"}</span>
        </td>
        {isAdmin && (
          <td className="whitespace-nowrap px-4 py-3">
            <CleaningTaskTimer
              status={task.status}
              startedAt={task.started_at}
              completedAt={task.completed_at}
              hourlyRate={task.assignee?.hourly_rate ?? null}
            />
          </td>
        )}
        <td className="whitespace-nowrap px-4 py-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Editar tarefa"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink transition-colors duration-fast ease-standard hover:bg-surface-1"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </td>
      </tr>

      {editing && (
        <CleaningTaskFormModal
          task={task}
          rooms={rooms}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}
