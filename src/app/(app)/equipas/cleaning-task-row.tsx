"use client";

import { useState, useTransition } from "react";
import {
  BedDouble,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Loader2,
  Pencil,
  Play,
  StickyNote,
} from "lucide-react";
import {
  CLEANING_STATUS_LABELS,
  CLEANING_STATUS_STYLES,
  CLEANING_SOURCE_LABELS,
  type CleaningProgress,
  type CleaningStatus,
  type CleaningTask,
} from "@/lib/cleaning";
import type { StaffMember } from "@/lib/staff";
import { startCleaningTask, setCleaningTaskAssignee } from "./cleaning-actions";
import { CleaningTaskFormModal } from "./cleaning-task-form-modal";
import { CleaningTaskTimer } from "./cleaning-task-timer";
import { CleaningChecklistModal } from "./cleaning-checklist-modal";
import { ModalPortal } from "@/components/modal-portal";

const STATUS_DOT: Record<CleaningStatus, string> = {
  pendente: "bg-highlight",
  em_curso: "bg-action",
  concluida: "bg-success",
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

// Cada limpeza é um cartão: quarto e estado no topo, checklist em destaque,
// responsável, tempo/custo e a ação principal em baixo.
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
    (member) =>
      member.active &&
      member.permissions.some((p) =>
        ["limpeza", "gerir_limpeza", "equipas"].includes(p),
      ),
  );

  const percent =
    progress && progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0;
  const finished = task.status === "concluida";

  function handleStart() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await startCleaningTask(task.id);
        if ("error" in result) setError(result.error);
        else setChecklistOpen(true);
      } catch {
        setError(
          "Não foi possível confirmar o início. Verifica a ligação e tenta novamente.",
        );
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
        setError(
          "Não foi possível guardar a atribuição. Verifica a ligação e tenta novamente.",
        );
      }
    });
  }

  return (
    <>
      <article
        className={`flex flex-col gap-4 rounded-xl border border-border bg-canvas p-4 shadow-card transition-shadow duration-base ease-standard hover:shadow-elevated ${
          finished ? "bg-canvas/70" : ""
        }`}
      >
        <header className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-1 text-primary">
            <BedDouble className="h-5 w-5" strokeWidth={1.6} />
          </span>
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setChecklistOpen(true)}
              title="Abrir a checklist desta limpeza"
              className="block max-w-full truncate text-left text-[16px] font-bold leading-tight text-ink hover:text-action"
            >
              {task.room?.name ?? "—"}
            </button>
            <p className="mt-0.5 truncate text-[12px] text-ink-subdued">
              {CLEANING_SOURCE_LABELS[task.source]}
              {task.booking?.guest?.name
                ? ` · saída de ${task.booking.guest.name}`
                : ""}
            </p>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] font-bold ${CLEANING_STATUS_STYLES[task.status]}`}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[task.status]}`}
            />
            {CLEANING_STATUS_LABELS[task.status]}
          </span>
        </header>

        {task.notes && (
          <p className="flex items-start gap-2 rounded-lg bg-surface-1 px-3 py-2 text-[13px] leading-snug text-ink-muted">
            <StickyNote
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-subdued"
              strokeWidth={2}
            />
            <span className="line-clamp-2">{task.notes}</span>
          </p>
        )}

        <button
          type="button"
          onClick={() => setChecklistOpen(true)}
          aria-label="Abrir checklist da limpeza"
          className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2.5 text-left transition-colors duration-fast ease-standard hover:bg-surface-1"
        >
          <span className="flex items-center justify-between gap-2 text-[13px] font-semibold text-ink">
            <span className="flex items-center gap-2">
              <ClipboardCheck
                className="h-4 w-4 text-ink-subdued"
                strokeWidth={2}
              />
              Checklist
            </span>
            <span className="flex items-center gap-1 text-ink-muted">
              {progress ? `${progress.done}/${progress.total} itens` : "Abrir"}
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </span>
          </span>
          {progress && progress.total > 0 && (
            <span
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2 overflow-hidden rounded-pill bg-surface-2"
            >
              <span
                className="block h-full rounded-pill bg-success transition-[width] duration-base ease-standard"
                style={{ width: `${percent}%` }}
              />
            </span>
          )}
        </button>

        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
              task.assignee
                ? "bg-primary text-on-primary"
                : "border border-dashed border-border text-ink-subdued"
            }`}
          >
            {task.assignee ? initials(task.assignee.name) : "?"}
          </span>
          {canManage && task.status === "pendente" ? (
            <select
              aria-label={`Atribuir limpeza de ${task.room?.name ?? "quarto"}`}
              value={task.assigned_to ?? ""}
              disabled={isPending}
              onChange={(e) => handleAssigneeChange(e.target.value)}
              className="min-h-9 min-w-0 flex-1 rounded-md border border-border bg-canvas px-2 text-[13px] font-medium text-ink focus:border-action focus:outline-none focus:ring-2 focus:ring-action"
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
              {task.assignee?.name ?? "Por atribuir"}
            </span>
          )}
        </div>

        {task.started_at && (
          <div className="rounded-lg bg-surface-1 px-3 py-2">
            <CleaningTaskTimer
              status={task.status}
              startedAt={task.started_at}
              completedAt={task.completed_at}
              hourlyRate={
                isAdmin
                  ? (task.result?.hourly_rate ??
                    task.assignee?.hourly_rate ??
                    null)
                  : null
              }
              finalCost={isAdmin ? task.result?.total_cost : null}
              showCost={isAdmin}
            />
          </div>
        )}

        <footer className="mt-auto flex flex-col gap-2">
          {canEditStatus && task.status === "pendente" && (
            <>
              <button
                type="button"
                onClick={handleStart}
                disabled={isPending || !task.assigned_to}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-action px-3 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {isPending ? "A iniciar…" : "Iniciar limpeza"}
              </button>
              {!task.assigned_to && (
                <p className="text-center text-[12px] text-ink-subdued">
                  Atribui um responsável para poder iniciar.
                </p>
              )}
            </>
          )}

          {task.status === "em_curso" && (
            <button
              type="button"
              onClick={() => setChecklistOpen(true)}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-action px-3 text-body font-semibold text-action transition-colors duration-fast ease-standard hover:bg-action/5"
            >
              <ClipboardCheck className="h-4 w-4" strokeWidth={2} />
              Continuar checklist
            </button>
          )}

          {finished && (
            <p className="flex items-center justify-center gap-1.5 text-[13px] font-semibold text-success">
              <CheckCircle2 className="h-4 w-4" strokeWidth={2.25} />
              Limpeza concluída
            </p>
          )}

          {canManage && task.status === "pendente" && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex items-center justify-center gap-1.5 self-center rounded-md px-2 py-1 text-[12px] font-semibold text-ink-subdued transition-colors duration-fast ease-standard hover:bg-surface-1 hover:text-ink"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
              Editar tarefa
            </button>
          )}

          {error && (
            <p role="alert" className="text-[12px] text-error">
              {error}
            </p>
          )}
        </footer>
      </article>

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
