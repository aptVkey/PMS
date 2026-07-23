"use client";

import { useActionState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
  createCleaningTask,
  updateCleaningTaskDetails,
  deleteCleaningTask,
  type CleaningTaskFormState,
} from "./cleaning-actions";
import type { CleaningTask } from "@/lib/cleaning";

const initialState: CleaningTaskFormState = undefined;

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
const labelClasses = "text-body font-semibold text-ink";

export function CleaningTaskFormModal({
  task,
  rooms,
  defaultDate,
  onClose,
}: {
  task?: CleaningTask;
  rooms: { id: string; name: string }[];
  defaultDate?: string;
  onClose: () => void;
}) {
  const action = task ? updateCleaningTaskDetails : createCleaningTask;
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state && "success" in state) {
      onClose();
    }
  }, [state, onClose]);

  const isManual = !task || task.source === "manual";

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-lg bg-canvas shadow-popover">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-[18px] font-bold text-ink">
            {task ? "Editar tarefa de limpeza" : "Adicionar tarefa de limpeza"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-ink-subdued hover:bg-surface-1"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <form
          action={formAction}
          className="flex flex-col gap-5 overflow-y-auto px-6 py-5"
        >
          {task && <input type="hidden" name="id" value={task.id} />}

          {!isManual && (
            <p className="rounded-md bg-surface-1 px-3 py-2 text-[12px] text-ink-subdued">
              Esta tarefa está associada a uma reserva. O quarto e a data
              seguem o checkout da reserva.
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="roomId" className={labelClasses}>
              Quarto
            </label>
            {isManual ? (
              <select
                id="roomId"
                name="roomId"
                required
                defaultValue={task?.room_id ?? rooms[0]?.id ?? ""}
                className={inputClasses}
              >
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                disabled
                value={task?.room?.name ?? ""}
                className={`${inputClasses} cursor-not-allowed opacity-60`}
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="taskDate" className={labelClasses}>
              Data
            </label>
            {isManual ? (
              <input
                id="taskDate"
                name="taskDate"
                type="date"
                required
                defaultValue={task?.task_date ?? defaultDate}
                className={inputClasses}
              />
            ) : (
              <input
                type="text"
                disabled
                value={task?.task_date ?? ""}
                className={`${inputClasses} cursor-not-allowed opacity-60`}
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="notes" className={labelClasses}>
              Notas
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={task?.notes ?? ""}
              placeholder="Ex: Limpeza profunda, trocar colchão, verificar minibar..."
              className={`${inputClasses} min-h-0 py-2`}
            />
          </div>

          {state && "error" in state && (
            <p aria-live="polite" className="text-body text-error">
              {state.error}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            {task && isManual ? (
              <button
                type="button"
                onClick={() => {
                  deleteCleaningTask(task.id).then((result) => {
                    if (!("error" in result)) onClose();
                  });
                }}
                className="text-body font-semibold text-error hover:opacity-80"
              >
                Remover tarefa
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 rounded-md border border-border bg-canvas px-4 text-body font-semibold text-ink transition-colors duration-fast ease-standard hover:bg-surface-1"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="min-h-11 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? "A guardar..." : task ? "Guardar alterações" : "Criar tarefa"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
