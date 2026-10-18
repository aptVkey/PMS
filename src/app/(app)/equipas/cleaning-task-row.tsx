"use client";

import { useState, useTransition } from "react";
import { BedDouble, ClipboardCheck, Pencil, Play, Loader2 } from "lucide-react";
import {
  CLEANING_STATUS_LABELS,
  CLEANING_STATUS_STYLES,
  CLEANING_SOURCE_LABELS,
  type CleaningProgress,
  type CleaningTask,
} from "@/lib/cleaning";
import type { StaffMember } from "@/lib/staff";
import {
  startCleaningTask,
  setCleaningTaskAssignee,
} from "./cleaning-actions";
import { CleaningTaskFormModal } from "./cleaning-task-form-modal";
import { CleaningTaskTimer } from "./cleaning-task-timer";
import { CleaningChecklistModal } from "./cleaning-checklist-modal";
import { ModalPortal } from "@/components/modal-portal";

export function CleaningTaskRow({
  task,
  progress,
  staffNames,
  rooms,
  staff,
  canEditStatus,
  canManage,
  isAdmin,
}: {
  task: CleaningTask;
  progress: CleaningProgress | null;
  staffNames: Record<string, string>;
  rooms: { id: string; name: string }[];
  staff: StaffMember[];
  canEditStatus: boolean;
  canManage: boolean;
  isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const assignableStaff = staff.filter(
    (member) => member.active && member.permissions.some(p => ["limpeza", "gerir_limpeza", "equipas"].includes(p)),
  );

  function handleStart() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await startCleaningTask(task.id);
        if ("error" in result) setError(result.error);
        else setChecklistOpen(true);
      } catch {
        setError("Não foi possível confirmar o início. Verifica a ligação e tenta novamente.");
      }
    });
  }

  function handleAssigneeChange(staffId: string) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await setCleaningTaskAssignee(task.id, staffId || null);
        if ("error" in result) setError(result.error);
      } catch {
        setError("Não foi possível guardar a atribuição. Verifica a ligação e tenta novamente.");
      }
    });
  }

  return (
    <>
      <tr className="grid grid-cols-2 gap-x-3 border-b border-border p-4 last:border-0 lg:table-row lg:p-0">
        <td className="col-span-2 min-w-0 py-3 lg:px-4">
          <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-1 text-primary"><BedDouble className="h-4 w-4" strokeWidth={1.6} /></span>
          <div>
          <button
            type="button"
            onClick={() => setChecklistOpen(true)}
            title="Abrir a checklist desta limpeza"
            className="text-left text-body font-semibold text-ink hover:text-action"
          >
            {task.room?.name ?? "—"}
          </button>
          {task.booking?.guest?.name && (
            <p className="text-[12px] text-ink-subdued">
              {task.booking.guest.name}
            </p>
          )}
          </div>
          <span className="ml-auto rounded-md bg-surface-2 px-2 py-1 text-[10px] font-medium text-primary lg:hidden">{CLEANING_SOURCE_LABELS[task.source]}</span>
          </div>
        </td>
        <td className="hidden min-w-0 px-4 py-3 lg:table-cell">
          <span className="rounded-pill bg-surface-2 px-3 py-1 text-[12px] font-semibold text-ink-muted">
            {CLEANING_SOURCE_LABELS[task.source]}
          </span>
        </td>
        <td className="col-span-2 py-3 lg:px-4">
          <span className={`inline-block rounded-pill px-3 py-1 text-[12px] font-semibold ${CLEANING_STATUS_STYLES[task.status]}`}>
            {CLEANING_STATUS_LABELS[task.status]}
          </span>
          {canEditStatus && task.status === "pendente" && (
            <button type="button" onClick={handleStart} disabled={isPending || !task.assigned_to}
              className="mt-2 flex min-h-11 items-center justify-center gap-2 rounded-md bg-action px-3 text-body font-semibold text-on-primary disabled:opacity-50">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isPending ? "A iniciar…" : "Iniciar limpeza"}
            </button>
          )}
          {task.status === "pendente" && !task.assigned_to && <p className="mt-1 text-[12px] text-ink-subdued">Aguarda atribuição</p>}
          {error && <p role="alert" className="mt-1 text-[12px] text-error">{error}</p>}
        </td>
        <td className="min-w-0 py-3 lg:px-4">
          <p className="mb-2 text-[11px] text-ink-subdued lg:hidden">Checklist</p>
          <button
            type="button"
            onClick={() => setChecklistOpen(true)}
            aria-label="Abrir checklist da limpeza"
            className="flex min-h-9 items-center gap-2 rounded-md border border-border px-2.5 text-[12px] font-semibold text-ink transition-colors duration-fast ease-standard hover:bg-surface-1"
          >
            <ClipboardCheck className="h-4 w-4" strokeWidth={2} />
            {progress ? `${progress.done}/${progress.total}` : "Abrir"}
            {progress && progress.total > 0 && (
              <span className="h-1.5 w-12 overflow-hidden rounded-pill bg-surface-2">
                <span
                  className="block h-full rounded-pill bg-success"
                  style={{
                    width: `${Math.round((progress.done / progress.total) * 100)}%`,
                  }}
                />
              </span>
            )}
          </button>
        </td>
        <td className="min-w-0 py-3 lg:px-4">
          <p className="mb-2 text-[11px] text-ink-subdued lg:hidden">Responsável</p>
          {canManage && task.status === "pendente" ? (
            <select
              aria-label={`Atribuir limpeza de ${task.room?.name ?? "quarto"}`}
              value={task.assigned_to ?? ""}
              disabled={isPending}
              onChange={(e) => handleAssigneeChange(e.target.value)}
              className="min-h-11 max-w-full rounded-md border border-border bg-canvas px-2 text-body text-ink focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2"
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
        <td className="hidden max-w-[220px] px-4 py-3 text-body text-ink-muted lg:table-cell">
          <span className="line-clamp-2">{task.notes || "—"}</span>
        </td>
        <td className="min-w-0 py-3 lg:px-4">
            <p className="mb-1 text-[12px] text-ink-subdued lg:hidden">{isAdmin ? "Tempo / custo" : "Tempo"}</p>
            <CleaningTaskTimer
              status={task.status}
              startedAt={task.started_at}
              completedAt={task.completed_at}
              hourlyRate={isAdmin ? task.result?.hourly_rate ?? task.assignee?.hourly_rate ?? null : null}
              finalCost={isAdmin ? task.result?.total_cost : null}
            />
        </td>
        <td className="flex min-w-0 items-end justify-end py-3 lg:table-cell lg:px-4">
          {canManage && task.status === "pendente" && <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Editar tarefa"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink transition-colors duration-fast ease-standard hover:bg-surface-1"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
          </button>}
        </td>
      </tr>

      <ModalPortal>
        {checklistOpen && (
          <CleaningChecklistModal
            task={task}
            staffNames={staffNames}
            canTick={canEditStatus}
            isAdmin={isAdmin}
            onClose={() => setChecklistOpen(false)}
          />
        )}
        {editing && (
          <CleaningTaskFormModal
            task={task}
            rooms={rooms}
            onClose={() => setEditing(false)}
          />
        )}
      </ModalPortal>
    </>
  );
}
