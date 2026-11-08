"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import type { Guest } from "@/lib/guests";
import type { CrmTask } from "@/lib/crm";
import { formatDateLabel } from "@/lib/date-utils";
import type { StaffOption } from "./hospedes-client";
import { deleteTask, saveTask, setTaskDone } from "./crm-actions";
import { inputClasses, labelClasses, primaryButton } from "./crm-ui";

type Scope = "minhas" | "todas";

export function TasksTab({
  tasks,
  guests,
  staff,
  currentUserId,
  today,
  onOpenGuest,
}: {
  tasks: CrmTask[];
  guests: Guest[];
  staff: StaffOption[];
  currentUserId: string;
  today: string;
  onOpenGuest: (guestId: string) => void;
}) {
  const [scope, setScope] = useState<Scope>("todas");
  const [showDone, setShowDone] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [guestId, setGuestId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visible = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (scope === "todas" || t.assigned_to === currentUserId) &&
          (showDone || !t.done),
      ),
    [tasks, scope, showDone, currentUserId],
  );

  const groups = useMemo(() => {
    const open = visible.filter((t) => !t.done);
    return [
      {
        key: "atrasadas",
        label: "Atrasadas",
        tone: "text-error",
        items: open.filter((t) => t.due_date && t.due_date < today),
      },
      {
        key: "hoje",
        label: "Hoje",
        tone: "text-ink",
        items: open.filter((t) => t.due_date === today),
      },
      {
        key: "proximas",
        label: "Próximas",
        tone: "text-ink",
        items: open.filter((t) => t.due_date && t.due_date > today),
      },
      {
        key: "sem-data",
        label: "Sem data",
        tone: "text-ink-muted",
        items: open.filter((t) => !t.due_date),
      },
      {
        key: "concluidas",
        label: "Concluídas",
        tone: "text-ink-subdued",
        items: visible.filter((t) => t.done),
      },
    ].filter((g) => g.items.length > 0);
  }, [visible, today]);

  function add() {
    setError(null);
    startTransition(async () => {
      const result = await saveTask({
        title,
        dueDate: dueDate || null,
        guestId: guestId || null,
        assignedTo: assignedTo || null,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setTitle("");
      setDueDate("");
      setGuestId("");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-lg border border-border bg-canvas p-5 shadow-card">
        <label htmlFor="task-title" className={labelClasses}>
          Nova tarefa
        </label>
        <div className="flex flex-col gap-2 lg:flex-row">
          <input
            id="task-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Enviar proposta ao grupo de Londres"
            maxLength={200}
            className={`${inputClasses} lg:flex-[2]`}
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            aria-label="Data limite"
            className={`${inputClasses} lg:w-44`}
          />
          <select
            value={guestId}
            onChange={(e) => setGuestId(e.target.value)}
            aria-label="Hóspede"
            className={`${inputClasses} lg:flex-1`}
          >
            <option value="">Sem hóspede</option>
            {guests.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            aria-label="Responsável"
            className={`${inputClasses} lg:flex-1`}
          >
            <option value="">Sem responsável</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={add}
            disabled={isPending || !title.trim()}
            className={primaryButton}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Adicionar
          </button>
        </div>
        {error && <p className="text-body text-error">{error}</p>}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-md border border-border bg-canvas p-0.5">
          {(["todas", "minhas"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={`rounded px-3 py-1.5 text-body font-semibold ${
                scope === s
                  ? "bg-surface-2 text-primary"
                  : "text-ink-muted hover:bg-surface-1"
              }`}
            >
              {s === "todas" ? "Todas" : "As minhas"}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-body text-ink-muted">
          <input
            type="checkbox"
            checked={showDone}
            onChange={(e) => setShowDone(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-action)]"
          />
          Mostrar concluídas
        </label>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-canvas p-10 text-center text-body text-ink-subdued">
          Sem tarefas {scope === "minhas" ? "atribuídas a ti" : "em aberto"}.
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.key} className="flex flex-col gap-2">
            <h2
              className={`text-[13px] font-bold uppercase tracking-wide ${group.tone}`}
            >
              {group.label} ({group.items.length})
            </h2>
            <ul className="flex flex-col gap-2">
              {group.items.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-canvas px-4 py-3 shadow-card"
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={task.done}
                    aria-label={task.title}
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await setTaskDone(task.id, !task.done);
                      })
                    }
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
                      task.done
                        ? "border-success bg-success text-white"
                        : "border-ink-subdued/50"
                    }`}
                  >
                    {task.done && <Check className="h-4 w-4" strokeWidth={3} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-body font-semibold ${
                        task.done ? "text-ink-subdued line-through" : "text-ink"
                      }`}
                    >
                      {task.title}
                    </p>
                    <p className="text-[12px] text-ink-subdued">
                      {task.due_date
                        ? formatDateLabel(task.due_date)
                        : "Sem data"}
                      {task.assignee?.name ? ` · ${task.assignee.name}` : ""}
                      {task.lead?.name ? ` · Lead: ${task.lead.name}` : ""}
                      {task.guest_id && task.guest?.name && (
                        <>
                          {" · "}
                          <button
                            type="button"
                            onClick={() => onOpenGuest(task.guest_id as string)}
                            className="font-semibold text-action hover:underline"
                          >
                            {task.guest.name}
                          </button>
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(async () => {
                        await deleteTask(task.id);
                      })
                    }
                    aria-label="Remover tarefa"
                    className="rounded p-1.5 text-ink-subdued hover:bg-error/10 hover:text-error"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
