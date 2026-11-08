"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  CircleCheck,
  Clock3,
  ClipboardList,
  Info,
} from "lucide-react";
import type { CleaningProgress, CleaningTask } from "@/lib/cleaning";
import type { StaffMember, PermissionKey } from "@/lib/staff";
import { addDaysISO, formatFullDateLabel, todayISO } from "@/lib/date-utils";
import { CleaningTaskRow } from "./cleaning-task-row";
import { CleaningTaskFormModal } from "./cleaning-task-form-modal";

export function LimpezaSection({
  tasks,
  progress,
  rooms,
  staff,
  currentUserId,
  permissions,
}: {
  tasks: CleaningTask[];
  progress: Record<string, CleaningProgress>;
  rooms: { id: string; name: string }[];
  staff: StaffMember[];
  currentUserId: string;
  permissions: PermissionKey[];
}) {
  const isAdmin = permissions.includes("equipas");
  const canManageAnyTask = isAdmin || permissions.includes("gerir_limpeza");
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  const staffNames = useMemo(
    () => Object.fromEntries(staff.map((member) => [member.id, member.name])),
    [staff],
  );

  // Tempo real: quando a equipa faz tick ou muda o estado de uma tarefa,
  // a lista (progresso e estados) atualiza-se sozinha.
  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 400);
    };

    const channel = supabase
      .channel("cleaning-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cleaning_task_items" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cleaning_tasks" },
        scheduleRefresh,
      )
      .subscribe();

    const refreshVisible = () => {
      if (document.visibilityState === "visible") scheduleRefresh();
    };
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    const fallback = setInterval(refreshVisible, 15000);
    return () => {
      clearInterval(fallback);
      window.removeEventListener("focus", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [router]);

  const dayTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.task_date === date)
        .sort((a, b) => (a.room?.name ?? "").localeCompare(b.room?.name ?? "")),
    [tasks, date],
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex max-w-full flex-wrap items-center gap-2">
          <div className="flex min-w-0 items-center gap-1 rounded-lg border border-border bg-canvas p-1">
            <button
              type="button"
              onClick={() => setDate((d) => addDaysISO(d, -1))}
              aria-label="Dia anterior"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-1"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </button>
            <p className="min-w-0 px-2 text-center text-[12px] font-medium text-ink sm:min-w-[190px] sm:text-body">
              {formatFullDateLabel(date)}
            </p>
            <button
              type="button"
              onClick={() => setDate((d) => addDaysISO(d, 1))}
              aria-label="Dia seguinte"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-1"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setDate(today)}
            className="min-h-11 rounded-md border border-border bg-canvas px-3 text-[12px] font-medium text-ink hover:bg-surface-1"
          >
            Hoje
          </button>
        </div>

        {canManageAnyTask && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            disabled={rooms.length === 0}
            className="flex min-h-11 items-center gap-2 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Adicionar tarefa
          </button>
        )}
      </div>

      <div
        className="grid grid-cols-3 gap-2 sm:gap-4"
        aria-label="Resumo das limpezas do dia"
      >
        {[
          {
            status: "pendente",
            label: "Por limpar",
            icon: ClipboardList,
            color: "bg-highlight/15 text-highlight-ink",
            dot: "bg-highlight",
          },
          {
            status: "em_curso",
            label: "Em limpeza",
            icon: Clock3,
            color: "bg-surface-2 text-primary",
            dot: "bg-action",
          },
          {
            status: "concluida",
            label: "Limpo",
            icon: CircleCheck,
            color: "bg-success/10 text-success",
            dot: "bg-success",
          },
        ].map(({ status, label, icon: Icon, color, dot }) => (
          <div
            key={status}
            className="flex items-center justify-between gap-2 rounded-lg border border-border bg-canvas p-3 shadow-card sm:p-5"
          >
            <div>
              <p className="flex items-center gap-1.5 text-[11px] text-ink-muted sm:text-[12px]">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-pill ${dot}`} />
                {label}
              </p>
              <p className="ui-stat mt-3 text-[26px] font-semibold leading-none text-ink">
                {dayTasks.filter((task) => task.status === status).length}
              </p>
            </div>
            <span
              className={`hidden h-10 w-10 items-center justify-center rounded-lg sm:flex ${color}`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.7} />
            </span>
          </div>
        ))}
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
        <section className="rounded-xl border border-border bg-surface-1/60 p-4">
          <div className="mb-4 flex items-center justify-between gap-3 px-1">
            <div>
              <h2 className="text-body font-semibold text-ink">
                Plano de limpezas
              </h2>
              <p className="mt-1 text-[12px] text-ink-subdued">
                Atribui, acompanha e conclui as tarefas do dia.
              </p>
            </div>
            <span className="shrink-0 rounded-md bg-canvas px-2.5 py-1 text-[11px] font-medium text-ink-muted">
              {dayTasks.length} {dayTasks.length === 1 ? "tarefa" : "tarefas"}
            </span>
          </div>
          {/* Grelha em estilo direto: não depende da cache de CSS do servidor
              de desenvolvimento. */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 16,
              alignItems: "start",
            }}
          >
            {dayTasks.map((task) => (
              <CleaningTaskRow
                key={task.id}
                task={task}
                progress={progress[task.id] ?? null}
                staffNames={staffNames}
                rooms={rooms}
                staff={staff}
                canEditStatus={
                  canManageAnyTask || task.assigned_to === currentUserId
                }
                canManage={canManageAnyTask}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </section>
      )}

      <p className="flex items-start gap-2 text-[12px] leading-relaxed text-ink-subdued">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Os checkouts criam tarefas automaticamente. Ao concluir o último item da
        checklist, o relógio para e o alojamento fica limpo.
      </p>

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
