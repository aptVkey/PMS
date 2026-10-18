"use client";

import { useActionState, useEffect } from "react";
import { History, X } from "lucide-react";
import { saveGuest, type GuestFormState } from "./actions";
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, type Guest } from "@/lib/guests";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_STYLES,
  type Booking,
} from "@/lib/bookings";

const initialState: GuestFormState = undefined;

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
const labelClasses = "text-body font-semibold text-ink";

export function GuestFormModal({
  guest,
  bookings = [],
  onClose,
}: {
  guest?: Guest;
  bookings?: Booking[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveGuest, initialState);

  useEffect(() => {
    if (state && "success" in state) {
      onClose();
    }
  }, [state, onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-canvas shadow-popover ui-form-modal">
        <div className="ui-form-header flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-[18px] font-bold text-ink">
            {guest ? "Editar hóspede" : "Adicionar hóspede"}
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
          {guest && <input type="hidden" name="id" value={guest.id} />}

          <h3 className="ui-form-section-title">Dados pessoais</h3>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className={labelClasses}>
              Nome
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={guest?.name}
              placeholder="Nome completo"
              className={inputClasses}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className={labelClasses}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                defaultValue={guest?.email ?? ""}
                placeholder="hospede@email.com"
                className={inputClasses}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className={labelClasses}>
                Contacto telefónico
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={guest?.phone ?? ""}
                placeholder="+351 900 000 000"
                className={inputClasses}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="birthday" className={labelClasses}>
                Data de aniversário
              </label>
              <input
                id="birthday"
                name="birthday"
                type="date"
                defaultValue={guest?.birthday ?? ""}
                className={inputClasses}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nationality" className={labelClasses}>
                Nacionalidade
              </label>
              <input
                id="nationality"
                name="nationality"
                type="text"
                defaultValue={guest?.nationality ?? ""}
                placeholder="Ex: Portuguesa"
                className={inputClasses}
              />
            </div>
          </div>

          <h3 className="ui-form-section-title">Identificação</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="documentType" className={labelClasses}>
                Tipo de documento
              </label>
              <select
                id="documentType"
                name="documentType"
                defaultValue={guest?.document_type ?? ""}
                className={inputClasses}
              >
                <option value="">Selecionar...</option>
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {DOCUMENT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="documentNumber" className={labelClasses}>
                Número de documento
              </label>
              <input
                id="documentNumber"
                name="documentNumber"
                type="text"
                defaultValue={guest?.document_number ?? ""}
                placeholder="Ex: 12345678"
                className={inputClasses}
              />
            </div>
          </div>

          <h3 className="ui-form-section-title">Notas</h3>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="notes" className={labelClasses}>
              Notas
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={guest?.notes ?? ""}
              placeholder="Preferências, alergias, pedidos especiais..."
              className={`${inputClasses} min-h-0 py-2`}
            />
          </div>

          {guest && (
            <div className="rounded-md border border-border bg-surface-1 p-4">
              <p className="text-body font-semibold text-ink">
                Estatísticas de estadias
              </p>
              <p className="mt-1 text-[12px] text-ink-subdued">
                Calculadas automaticamente a partir das reservas.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <p className="text-[12px] text-ink-subdued">Visitas</p>
                  <p className="text-body font-bold text-ink">
                    {guest.visit_count}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-ink-subdued">Última estadia</p>
                  <p className="text-body font-bold text-ink">
                    {guest.last_stay_at
                      ? new Date(guest.last_stay_at).toLocaleDateString("pt-PT")
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-ink-subdued">Valor médio</p>
                  <p className="text-body font-bold text-ink">
                    {guest.avg_spent > 0
                      ? `${guest.avg_spent.toFixed(2)} €`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-ink-subdued">Total gasto</p>
                  <p className="text-body font-bold text-ink">
                    {guest.total_spent > 0
                      ? `${guest.total_spent.toFixed(2)} €`
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {guest && (
            <div className="rounded-md border border-border p-4">
              <p className="text-body font-semibold text-ink">
                Histórico de reservas
              </p>
              {bookings.length === 0 ? (
                <div className="mt-3 flex flex-col items-center gap-2 py-6 text-center">
                  <History
                    className="h-6 w-6 text-ink-subdued"
                    strokeWidth={1.5}
                  />
                  <p className="text-body text-ink-subdued">
                    Ainda não há reservas registadas para este hóspede.
                  </p>
                </div>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {bookings.map((booking) => (
                    <li
                      key={booking.id}
                      className="flex items-center justify-between border-b border-border pb-2 text-body last:border-0"
                    >
                      <div>
                        <span className="font-semibold text-ink">
                          {booking.room?.name ?? "—"}
                        </span>{" "}
                        <span className="text-ink-muted">
                          ·{" "}
                          {new Date(booking.check_in).toLocaleDateString(
                            "pt-PT",
                          )}{" "}
                          →{" "}
                          {new Date(booking.check_out).toLocaleDateString(
                            "pt-PT",
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-ink-muted">
                          {booking.total_amount.toFixed(2)} €
                        </span>
                        <span
                          className={`rounded-pill px-2 py-0.5 text-[12px] font-semibold ${BOOKING_STATUS_STYLES[booking.status]}`}
                        >
                          {BOOKING_STATUS_LABELS[booking.status]}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {state && "error" in state && (
            <p aria-live="polite" className="text-body text-error">
              {state.error}
            </p>
          )}

          <div className="ui-form-footer flex justify-end gap-3 border-t border-border pt-4">
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
                : guest
                  ? "Guardar alterações"
                  : "Guardar hóspede"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
