"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Sparkles } from "lucide-react";
import type { CleaningTask } from "@/lib/cleaning";
import type { StaffMember, PermissionKey } from "@/lib/staff";
import { addDaysISO, formatFullDateLabel, todayISO } from "@/lib/date-utils";
import { CleaningTaskRow } from "./cleaning-task-row";
import { CleaningTaskFormModal } from "./cleaning-task-form-modal";

export function LimpezaSection({
  tasks,
  rooms,
  staff,
  currentUserId,
  permissions,
}: {
  tasks: CleaningTask[];
  rooms: { id: string; name: string }[];
  staff: StaffMember[];
  currentUserId: string;
  permissions: PermissionKey[];
}) {
  const isAdmin = permissions.includes("equipas");
  const canManageAnyTask = isAdmin || permissions.includes("limpeza");
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [modalOpen, setModalOpen] = useState(false);

  const dayTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.task_date === date)
        .sort((a, b) => (a.room?.name ?? "").localeCompare(b.room?.name ?? "")),
    [tasks, date],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDate((d) => addDaysISO(d, -1))}
            aria-label="Dia anterior"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-ink hover:bg-surface-1"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>
          <p className="min-w-[220px] text-center text-body font-semibold text-ink">
            {formatFullDateLabel(date)}
          </p>
          <button
            type="button"
            onClick={() => setDate((d) => addDaysISO(d, 1))}
            aria-label="Dia seguinte"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-ink hover:bg-surface-1"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => setDate(today)}
            className="min-h-9 rounded-md border border-border px-3 text-body font-semibold text-ink hover:bg-surface-1"
          >
            Hoje
          </button>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={rooms.length === 0}
          className="flex min-h-11 items-center gap-2 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Adicionar tarefa
        </button>
      </div>

      {dayTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-canvas py-16 text-center">
          <Sparkles className="h-8 w-8 text-ink-subdued" strokeWidth={1.5} />
          <p className="text-body font-semibold text-ink">
            Sem tarefas de limpeza neste dia
          </p>
          <p className="max-w-sm text-body text-ink-subdued">
            Os checkouts do dia aparecem aqui automaticamente. Também podes
            adicionar tarefas extra à mão.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-canvas shadow-card">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-surface-1 text-[12px] font-semibold uppercase tracking-wide text-ink-subdued">
                <th className="px-4 py-3">Quarto</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Atribuído a</th>
                <th className="px-4 py-3">Notas</th>
                {isAdmin && <th className="px-4 py-3">Tempo / Custo</th>}
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {dayTasks.map((task) => (
                <CleaningTaskRow
                  key={task.id}
                  task={task}
                  rooms={rooms}
                  staff={staff}
                  canEditStatus={
                    canManageAnyTask || task.assigned_to === currentUserId
                  }
                  canManage={canManageAnyTask}
                  isAdmin={isAdmin}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <CleaningTaskFormModal
          rooms={rooms}
          defaultDate={date}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
