"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCircle2, Loader2, Play, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  CLEANING_STATUS_LABELS,
  CLEANING_STATUS_STYLES,
  groupItemsByZone,
  type CleaningTask,
  type CleaningTaskItem,
  type CleaningTaskState,
} from "@/lib/cleaning";
import { formatDateLabel } from "@/lib/date-utils";
import { setCleaningItemChecked, startCleaningTask } from "./cleaning-actions";
import { CleaningTaskTimer } from "./cleaning-task-timer";

export function CleaningChecklistModal({
  task,
  staffNames,
  canTick,
  isAdmin,
  onClose,
}: {
  task: CleaningTask;
  staffNames: Record<string, string>;
  canTick: boolean;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const [items, setItems] = useState<CleaningTaskItem[] | null>(null);
  const [currentTask, setCurrentTask] = useState<CleaningTaskState>(task);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const revision = useRef(0);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout>;
    async function refresh() {
      if (inFlight.current) return;
      const version = revision.current;
      const [checklist, state] = await Promise.all([
        supabase
          .from("cleaning_task_items")
          .select("*")
          .eq("task_id", task.id)
          .order("position"),
        supabase
          .from("cleaning_tasks")
          .select("id, status, assigned_to, started_at, completed_at")
          .eq("id", task.id)
          .maybeSingle(),
      ]);
      if (cancelled || inFlight.current || version !== revision.current) return;
      if (checklist.error || state.error || !state.data) {
        setError(
          "Não foi possível atualizar a limpeza. Verifica a ligação; os dados já confirmados continuam guardados.",
        );
        return;
      }
      setItems(checklist.data as CleaningTaskItem[]);
      setCurrentTask(state.data as CleaningTaskState);
      setError(null);
    }
    function scheduleRefresh() {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => void refresh(), 300);
    }
    void refresh();
    const channel = supabase
      .channel(`cleaning-checklist-${task.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cleaning_task_items",
          filter: `task_id=eq.${task.id}`,
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "cleaning_tasks",
          filter: `id=eq.${task.id}`,
        },
        scheduleRefresh,
      )
      .subscribe();
    const visibleRefresh = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const poll = setInterval(visibleRefresh, 10000);
    window.addEventListener("focus", visibleRefresh);
    document.addEventListener("visibilitychange", visibleRefresh);
    return () => {
      cancelled = true;
      clearTimeout(refreshTimer);
      clearInterval(poll);
      window.removeEventListener("focus", visibleRefresh);
      document.removeEventListener("visibilitychange", visibleRefresh);
      void supabase.removeChannel(channel);
    };
  }, [task.id]);

  async function mutate(item?: CleaningTaskItem) {
    if (!canTick || inFlight.current) return;
    inFlight.current = true;
    revision.current += 1;
    setBusy(true);
    setError(null);
    try {
      const result = item
        ? await setCleaningItemChecked(task.id, item.id, !item.checked)
        : await startCleaningTask(task.id);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setCurrentTask(result.task);
      if (result.item) {
        const savedItem = result.item;
        setItems(
          (previous) =>
            previous?.map((i) => (i.id === savedItem.id ? savedItem : i)) ??
            null,
        );
      }
    } catch {
      setError(
        "Não foi possível confirmar a gravação. Verifica a ligação e volta a tentar; não serão duplicados registos.",
      );
    } finally {
      inFlight.current = false;
      revision.current += 1;
      setBusy(false);
    }
  }

  const zones = useMemo(() => groupItemsByZone(items ?? []), [items]);
  const total = items?.length ?? 0;
  const done = items?.filter((i) => i.checked).length ?? 0;
  const percent = total ? Math.round((done / total) * 100) : 0;
  const completed = currentTask.status === "concluida";
  const running = currentTask.status === "em_curso";

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      aria-labelledby="cleaning-dialog-title"
      className="fixed inset-0 m-auto max-h-[94svh] w-[calc(100%_-_1rem)] max-w-lg overflow-hidden rounded-xl border-0 bg-canvas p-0 text-ink shadow-popover backdrop:bg-black/40"
    >
      <div className="flex max-h-[94svh] flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id="cleaning-dialog-title" className="text-[18px] font-bold">
              Limpeza · {task.room?.name ?? "Quarto"}
            </h2>
            <p className="mt-1 text-[12px] text-ink-subdued">
              {formatDateLabel(task.task_date)} ·{" "}
              {staffNames[currentTask.assigned_to ?? ""] ?? "Sem responsável"}
            </p>
            <span
              className={`mt-2 inline-block rounded-pill px-3 py-1 text-[12px] font-semibold ${CLEANING_STATUS_STYLES[currentTask.status]}`}
            >
              {CLEANING_STATUS_LABELS[currentTask.status]}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar checklist"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-surface-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div className="flex-1">
            <p className="text-body font-semibold">
              {done} de {total} tarefas concluídas
            </p>
            <div
              role="progressbar"
              aria-label="Progresso da limpeza"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-2 h-2 overflow-hidden rounded-pill bg-surface-2"
            >
              <div
                className="h-full bg-success transition-[width]"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
          <CleaningTaskTimer
            status={currentTask.status}
            startedAt={currentTask.started_at}
            completedAt={currentTask.completed_at}
            hourlyRate={
              isAdmin
                ? (task.result?.hourly_rate ??
                  task.assignee?.hourly_rate ??
                  null)
                : null
            }
            finalCost={isAdmin ? task.result?.total_cost : null}
          />
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {completed && (
            <div
              role="status"
              className="mb-4 rounded-md bg-success/10 p-4 text-success"
            >
              <p className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="h-5 w-5" />
                Limpeza concluída!
              </p>
              <p className="mt-1 text-body">
                O relógio parou e os resultados ficaram guardados. O alojamento
                está marcado como Limpo.
              </p>
            </div>
          )}
          {items === null ? (
            <p className="flex items-center gap-2 text-body">
              <Loader2 className="h-4 w-4 animate-spin" />A carregar checklist…
            </p>
          ) : total === 0 ? (
            <p className="text-body text-ink-muted">
              Esta limpeza não tem checklist. Pede à chefia para configurar as
              tarefas antes de começar.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              {zones.map((zone) => (
                <section key={zone.zone}>
                  <h3 className="mb-2 flex justify-between gap-2 text-body font-bold">
                    <span>{zone.zone}</span>
                    <span>
                      {zone.done}/{zone.items.length}
                    </span>
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {zone.items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={item.checked}
                          disabled={!canTick || !running || busy}
                          onClick={() => void mutate(item)}
                          className={`flex min-h-12 w-full items-center gap-3 rounded-md border px-3 py-2 text-left disabled:cursor-default ${item.checked ? "border-success/40 bg-success/5" : "border-border bg-canvas"}`}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 ${item.checked ? "border-success bg-success text-white" : "border-ink-subdued/50"}`}
                          >
                            {item.checked && <Check className="h-4 w-4" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-body font-semibold">
                              {item.label}
                            </span>
                            {item.checked && item.checked_at && (
                              <span className="block text-[12px] text-ink-subdued">
                                {staffNames[item.checked_by ?? ""] ?? "Equipa"}{" "}
                                ·{" "}
                                {new Date(item.checked_at).toLocaleTimeString(
                                  "pt-PT",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  },
                                )}
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
          {isAdmin && completed && (
            <div className="mt-5 border-t border-border pt-4 text-body text-ink-muted">
              <p>
                Início:{" "}
                {currentTask.started_at
                  ? new Date(currentTask.started_at).toLocaleString("pt-PT")
                  : "—"}
              </p>
              <p>
                Fim:{" "}
                {currentTask.completed_at
                  ? new Date(currentTask.completed_at).toLocaleString("pt-PT")
                  : "—"}
              </p>
              {task.result && (
                <p>
                  Valor registado: {Number(task.result.hourly_rate).toFixed(2)}{" "}
                  €/hora · Responsável: {task.result.staff_name}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 border-t border-border px-5 py-4">
          {error && (
            <p role="alert" className="text-body text-error">
              {error}
            </p>
          )}
          {busy && (
            <p role="status" className="flex items-center gap-2 text-body">
              <Loader2 className="h-4 w-4 animate-spin" />A guardar…
            </p>
          )}
          {!canTick && (
            <p className="text-body text-ink-subdued">
              Acompanhas aqui o progresso da equipa.
            </p>
          )}
          {canTick && currentTask.status === "pendente" && (
            <button
              type="button"
              disabled={busy || !total || !currentTask.assigned_to}
              onClick={() => void mutate()}
              className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-action px-4 text-body font-bold text-on-primary disabled:opacity-50"
            >
              <Play className="h-5 w-5" />
              Iniciar limpeza
            </button>
          )}
          {canTick && running && (
            <p className="text-body text-ink-muted">
              O relógio continua a contar mesmo com a aplicação fechada. O
              último item conclui a limpeza automaticamente.
            </p>
          )}
          {completed && (
            <p
              role="status"
              className="text-center text-body font-bold text-success"
            >
              Limpeza concluída · Relógio parado
            </p>
          )}
          {completed && (
            <button
              type="button"
              onClick={onClose}
              className="min-h-12 rounded-md bg-success px-4 text-body font-bold text-white"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
