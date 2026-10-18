"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
  createMaintenanceIssue,
  updateMaintenanceIssueDetails,
  deleteMaintenanceIssue,
  type MaintenanceIssueFormState,
} from "./maintenance-actions";
import {
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_PRIORITY_LABELS,
  type MaintenanceIssue,
} from "@/lib/maintenance";

const initialState: MaintenanceIssueFormState = undefined;

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
const labelClasses = "text-body font-semibold text-ink";

export function MaintenanceIssueFormModal({
  issue,
  rooms,
  canDelete,
  onClose,
}: {
  issue?: MaintenanceIssue;
  rooms: { id: string; name: string }[];
  canDelete: boolean;
  onClose: () => void;
}) {
  const action = issue ? updateMaintenanceIssueDetails : createMaintenanceIssue;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [locationType, setLocationType] = useState<"room" | "common">(
    issue?.room_id || !issue ? "room" : "common",
  );

  useEffect(() => {
    if (state && "success" in state) {
      onClose();
    }
  }, [state, onClose]);

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg bg-canvas shadow-popover ui-form-modal">
        <div className="ui-form-header flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-[18px] font-bold text-ink">
            {issue ? "Editar ocorrência" : "Adicionar ocorrência"}
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
          className="ui-form-scroll flex flex-col gap-5 overflow-y-auto px-6 py-5"
        >
          {issue && <input type="hidden" name="id" value={issue.id} />}

          <div className="flex flex-col gap-1.5">
            <p className={labelClasses}>Localização</p>
            <div className="ui-segmented flex rounded-md border border-border p-0.5 sm:w-fit">
              <button
                type="button"
                onClick={() => setLocationType("room")}
                className={`flex-1 rounded px-3 py-1.5 text-body font-semibold transition-colors duration-fast ease-standard sm:flex-none ${
                  locationType === "room"
                    ? "bg-surface-2 text-primary"
                    : "text-ink-muted hover:bg-surface-1"
                }`}
              >
                Quarto
              </button>
              <button
                type="button"
                onClick={() => setLocationType("common")}
                className={`flex-1 rounded px-3 py-1.5 text-body font-semibold transition-colors duration-fast ease-standard sm:flex-none ${
                  locationType === "common"
                    ? "bg-surface-2 text-primary"
                    : "text-ink-muted hover:bg-surface-1"
                }`}
              >
                Zona comum
              </button>
            </div>

            {locationType === "room" ? (
              <select
                name="roomId"
                required
                defaultValue={issue?.room_id ?? rooms[0]?.id ?? ""}
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
                name="locationLabel"
                type="text"
                required
                defaultValue={issue?.location_label ?? ""}
                placeholder="Ex: Piscina, Receção, Parque de estacionamento..."
                className={inputClasses}
              />
            )}
          </div>

          <h3 className="ui-form-section-title">Detalhes da ocorrência</h3>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="title" className={labelClasses}>
              Título
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              defaultValue={issue?.title ?? ""}
              placeholder="Ex: Ar condicionado avariado"
              className={inputClasses}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className={labelClasses}>
              Descrição
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={issue?.description ?? ""}
              placeholder="Detalhes adicionais sobre o problema..."
              className={`${inputClasses} min-h-0 py-2`}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="priority" className={labelClasses}>
              Prioridade
            </label>
            <select
              id="priority"
              name="priority"
              defaultValue={issue?.priority ?? "media"}
              className={inputClasses}
            >
              {MAINTENANCE_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {MAINTENANCE_PRIORITY_LABELS[priority]}
                </option>
              ))}
            </select>
          </div>

          {state && "error" in state && (
            <p aria-live="polite" className="text-body text-error">
              {state.error}
            </p>
          )}

          <div className="ui-form-footer flex items-center justify-between gap-3 border-t border-border pt-4">
            {issue && canDelete ? (
              <button
                type="button"
                onClick={() => {
                  deleteMaintenanceIssue(issue.id).then((result) => {
                    if (!("error" in result)) onClose();
                  });
                }}
                className="text-body font-semibold text-error hover:opacity-80"
              >
                Remover ocorrência
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
                {pending
                  ? "A guardar..."
                  : issue
                    ? "Guardar alterações"
                    : "Criar ocorrência"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
