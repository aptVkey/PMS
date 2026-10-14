"use client";

import { useActionState, useEffect, useState } from "react";
import { X } from "lucide-react";
import { saveList, type FormState } from "./actions";
import {
  LIST_KIND_LABELS,
  LIST_KINDS,
  type EmailList,
  type ListKind,
} from "@/lib/email-marketing";
import type { Property } from "@/lib/property";

const initialState: FormState = undefined;

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
const labelClasses = "text-body font-semibold text-ink";

export function ListFormModal({
  list,
  properties,
  onClose,
}: {
  list?: EmailList;
  properties: Property[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveList, initialState);
  const [kind, setKind] = useState<ListKind>(list?.kind ?? "manual");

  useEffect(() => {
    if (state && "success" in state) onClose();
  }, [state, onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg bg-canvas shadow-popover">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-[18px] font-bold text-ink">
            {list ? "Editar lista" : "Nova lista"}
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
          className="flex flex-col gap-4 overflow-y-auto px-6 py-5"
        >
          {list && <input type="hidden" name="id" value={list.id} />}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className={labelClasses}>
              Nome
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={list?.name}
              placeholder="Ex: Hóspedes VIP"
              className={inputClasses}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className={labelClasses}>
              Descrição — opcional
            </label>
            <input
              id="description"
              name="description"
              type="text"
              defaultValue={list?.description ?? ""}
              className={inputClasses}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className={labelClasses}>Tipo de lista</span>
            <div className="flex gap-3">
              {LIST_KINDS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setKind(value)}
                  className={`flex min-h-11 flex-1 items-center justify-center rounded-md border text-body font-semibold transition-colors duration-fast ease-standard ${
                    kind === value
                      ? "border-action bg-action/10 text-action"
                      : "border-border text-ink-muted hover:bg-surface-1"
                  }`}
                >
                  {LIST_KIND_LABELS[value]}
                </button>
              ))}
            </div>
            <input type="hidden" name="kind" value={kind} />
            <p className="text-[12px] text-ink-subdued">
              {kind === "manual"
                ? "Adicionas hóspedes um a um, depois de criares a lista."
                : "Os membros são calculados automaticamente pelo filtro abaixo."}
            </p>
          </div>

          {kind === "dynamic" && (
            <div className="flex flex-col gap-4 rounded-md bg-surface-1 p-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="nationality" className={labelClasses}>
                  Nacionalidade — opcional
                </label>
                <input
                  id="nationality"
                  name="nationality"
                  type="text"
                  defaultValue={list?.filter?.nationality ?? ""}
                  placeholder="Ex: Portugal"
                  className={inputClasses}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="propertyId" className={labelClasses}>
                  Alojamento — opcional
                </label>
                <select
                  id="propertyId"
                  name="propertyId"
                  defaultValue={list?.filter?.property_id ?? ""}
                  className={inputClasses}
                >
                  <option value="">Qualquer alojamento</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="minVisitCount" className={labelClasses}>
                  Nº mínimo de estadias — opcional
                </label>
                <input
                  id="minVisitCount"
                  name="minVisitCount"
                  type="number"
                  min={0}
                  defaultValue={list?.filter?.min_visit_count ?? ""}
                  placeholder="Ex: 2"
                  className={inputClasses}
                />
              </div>
            </div>
          )}

          {state && "error" in state && (
            <p aria-live="polite" className="text-body text-error">
              {state.error}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-border pt-4">
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
              {pending ? "A guardar..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
