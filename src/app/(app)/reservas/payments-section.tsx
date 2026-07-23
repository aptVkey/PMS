"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { addPayment, deletePayment, type PaymentFormState } from "./actions";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type Booking,
} from "@/lib/bookings";

const inputClasses =
  "min-h-10 w-full rounded-md border border-border bg-canvas px-3 text-body text-ink focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";

const initialState: PaymentFormState = undefined;

function DeletePaymentButton({ paymentId }: { paymentId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await deletePayment(paymentId);
        })
      }
      aria-label="Eliminar pagamento"
      className="flex h-7 w-7 items-center justify-center rounded-md text-ink-subdued transition-colors duration-fast ease-standard hover:bg-error/10 hover:text-error disabled:opacity-60"
    >
      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
    </button>
  );
}

export function PaymentsSection({ booking }: { booking: Booking }) {
  const [state, formAction, pending] = useActionState(
    addPayment,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  const payments = booking.payments ?? [];
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = booking.total_amount - totalPaid;

  return (
    <div className="rounded-md border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="text-body font-semibold text-ink">Pagamentos</p>
        <div className="text-right text-[12px] text-ink-subdued">
          <p>
            Pago:{" "}
            <span className="font-semibold text-ink">
              {totalPaid.toFixed(2)} €
            </span>{" "}
            / {booking.total_amount.toFixed(2)} €
          </p>
          {remaining > 0 ? (
            <p className="text-error">Falta: {remaining.toFixed(2)} €</p>
          ) : (
            <p className="text-success">Totalmente pago</p>
          )}
        </div>
      </div>

      {payments.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {payments.map((payment) => (
            <li
              key={payment.id}
              className="flex items-center justify-between border-b border-border pb-2 text-body last:border-0"
            >
              <div>
                <span className="font-semibold text-ink">
                  {payment.amount.toFixed(2)} €
                </span>{" "}
                <span className="text-ink-muted">
                  · {PAYMENT_METHOD_LABELS[payment.method]} ·{" "}
                  {new Date(payment.paid_at).toLocaleDateString("pt-PT")}
                </span>
              </div>
              <DeletePaymentButton paymentId={payment.id} />
            </li>
          ))}
        </ul>
      )}

      <form
        ref={formRef}
        action={formAction}
        className="mt-3 flex flex-wrap items-end gap-2"
      >
        <input type="hidden" name="bookingId" value={booking.id} />
        <div className="flex flex-col gap-1">
          <label htmlFor="amount" className="text-[12px] text-ink-subdued">
            Valor (€)
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            min={0}
            step="0.01"
            required
            className={`${inputClasses} w-24`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="method" className="text-[12px] text-ink-subdued">
            Método
          </label>
          <select id="method" name="method" className={inputClasses}>
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {PAYMENT_METHOD_LABELS[method]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="paidAt" className="text-[12px] text-ink-subdued">
            Data
          </label>
          <input
            id="paidAt"
            name="paidAt"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className={inputClasses}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="min-h-10 rounded-md bg-action px-3 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "A adicionar..." : "Adicionar"}
        </button>
      </form>

      {state && "error" in state && (
        <p aria-live="polite" className="mt-2 text-body text-error">
          {state.error}
        </p>
      )}
    </div>
  );
}
