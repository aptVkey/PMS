"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { BedDouble, Clock, DoorOpen, ShieldCheck } from "lucide-react";
import { saveRules, type RulesFormState } from "./actions";
import { toTimeInputValue, type RoomRules } from "@/lib/rules";

const initialState: RulesFormState = undefined;

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
const labelClasses = "text-body font-semibold text-ink";
const sectionClasses =
  "flex flex-col gap-5 rounded-lg border border-border bg-canvas p-5 shadow-card";

function SavedIndicator() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timeout);
  }, []);

  if (!visible) return null;
  return (
    <p aria-live="polite" className="text-body font-semibold text-success">
      Alterações guardadas
    </p>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Clock;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-primary">
        <Icon className="h-4 w-4" strokeWidth={2} />
      </div>
      <div>
        <p className="text-body font-bold text-ink">{title}</p>
        <p className="text-[12px] text-ink-subdued">{description}</p>
      </div>
    </div>
  );
}

function RulesForm({
  roomId,
  rules,
}: {
  roomId: string;
  rules: RoomRules | null;
}) {
  const [state, formAction, pending] = useActionState(saveRules, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="roomId" value={roomId} />

      <div className={sectionClasses}>
        <SectionHeader
          icon={Clock}
          title="Check-in e check-out"
          description="Horários aplicados às reservas deste quarto."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="checkInFrom" className={labelClasses}>
              Check-in a partir das
            </label>
            <input
              id="checkInFrom"
              name="checkInFrom"
              type="time"
              defaultValue={toTimeInputValue(rules?.check_in_from ?? null)}
              className={inputClasses}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="checkInUntil" className={labelClasses}>
              Check-in até às
            </label>
            <input
              id="checkInUntil"
              name="checkInUntil"
              type="time"
              defaultValue={toTimeInputValue(rules?.check_in_until ?? null)}
              placeholder="Opcional"
              className={inputClasses}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="checkOutUntil" className={labelClasses}>
              Check-out até às
            </label>
            <input
              id="checkOutUntil"
              name="checkOutUntil"
              type="time"
              defaultValue={toTimeInputValue(rules?.check_out_until ?? null)}
              className={inputClasses}
            />
          </div>
        </div>
      </div>

      <div className={sectionClasses}>
        <SectionHeader
          icon={DoorOpen}
          title="Regras da casa"
          description="O que os hóspedes podem e não podem fazer neste quarto."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2.5 text-body text-ink">
            <input
              type="checkbox"
              name="smokingAllowed"
              defaultChecked={rules?.smoking_allowed ?? false}
              className="h-4 w-4 rounded border-border text-action focus:ring-action"
            />
            Permitido fumar
          </label>
          <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2.5 text-body text-ink">
            <input
              type="checkbox"
              name="petsAllowed"
              defaultChecked={rules?.pets_allowed ?? false}
              className="h-4 w-4 rounded border-border text-action focus:ring-action"
            />
            Animais permitidos
          </label>
          <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2.5 text-body text-ink">
            <input
              type="checkbox"
              name="partiesAllowed"
              defaultChecked={rules?.parties_allowed ?? false}
              className="h-4 w-4 rounded border-border text-action focus:ring-action"
            />
            Festas ou eventos permitidos
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="quietHoursFrom" className={labelClasses}>
              Silêncio a partir das
            </label>
            <input
              id="quietHoursFrom"
              name="quietHoursFrom"
              type="time"
              defaultValue={toTimeInputValue(rules?.quiet_hours_from ?? null)}
              placeholder="Opcional"
              className={inputClasses}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="quietHoursUntil" className={labelClasses}>
              Silêncio até às
            </label>
            <input
              id="quietHoursUntil"
              name="quietHoursUntil"
              type="time"
              defaultValue={toTimeInputValue(rules?.quiet_hours_until ?? null)}
              placeholder="Opcional"
              className={inputClasses}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="minAge" className={labelClasses}>
              Idade mínima para reservar
            </label>
            <input
              id="minAge"
              name="minAge"
              type="number"
              min={0}
              max={120}
              defaultValue={rules?.min_age ?? ""}
              placeholder="Opcional"
              className={inputClasses}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="houseRulesNotes" className={labelClasses}>
            Notas adicionais
          </label>
          <textarea
            id="houseRulesNotes"
            name="houseRulesNotes"
            rows={3}
            defaultValue={rules?.house_rules_notes ?? ""}
            placeholder="Ex: Não são permitidas visitas externas, retirar o lixo antes do check-out..."
            className={`${inputClasses} min-h-0 py-2`}
          />
        </div>
      </div>

      <div className={sectionClasses}>
        <SectionHeader
          icon={ShieldCheck}
          title="Política de cancelamento"
          description="Aplicada às reservas feitas para este quarto."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cancellationFreeUntilDays" className={labelClasses}>
              Cancelamento gratuito até (dias antes do check-in)
            </label>
            <input
              id="cancellationFreeUntilDays"
              name="cancellationFreeUntilDays"
              type="number"
              min={0}
              max={365}
              defaultValue={rules?.cancellation_free_until_days ?? ""}
              placeholder="Ex: 3"
              className={inputClasses}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cancellationRefundPercent" className={labelClasses}>
              Reembolso após o prazo (%)
            </label>
            <input
              id="cancellationRefundPercent"
              name="cancellationRefundPercent"
              type="number"
              min={0}
              max={100}
              defaultValue={rules?.cancellation_refund_percent ?? ""}
              placeholder="Ex: 50"
              className={inputClasses}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cancellationNotes" className={labelClasses}>
            Notas adicionais
          </label>
          <textarea
            id="cancellationNotes"
            name="cancellationNotes"
            rows={3}
            defaultValue={rules?.cancellation_notes ?? ""}
            placeholder="Ex: Sem reembolso em caso de no-show..."
            className={`${inputClasses} min-h-0 py-2`}
          />
        </div>
      </div>

      {state && "error" in state && (
        <p aria-live="polite" className="text-body text-error">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        {!pending && state && "success" in state && <SavedIndicator />}
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "A guardar..." : "Guardar alterações"}
        </button>
      </div>
    </form>
  );
}

export function RegrasClient({
  rooms,
  rules,
}: {
  rooms: { id: string; name: string }[];
  rules: RoomRules[];
}) {
  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.id ?? "");

  const selectedRoomRules = useMemo(
    () => rules.find((r) => r.room_id === selectedRoomId) ?? null,
    [rules, selectedRoomId],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[24px] font-bold text-ink">Regras locais</h1>
        <p className="mt-1 text-body text-ink-muted">
          Define políticas de check-in/check-out, cancelamento e regras da
          casa para cada quarto.
        </p>
      </div>

      {rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-canvas py-16 text-center">
          <BedDouble className="h-8 w-8 text-ink-subdued" strokeWidth={1.5} />
          <p className="text-body font-semibold text-ink">
            Ainda não tens quartos
          </p>
          <p className="max-w-sm text-body text-ink-subdued">
            Adiciona quartos em Alojamentos para definires as regras
            de cada um.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5 sm:w-fit">
            <label htmlFor="roomSelect" className={labelClasses}>
              Quarto
            </label>
            <select
              id="roomSelect"
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className={`${inputClasses} sm:min-w-[260px]`}
            >
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>

          <RulesForm
            key={selectedRoomId}
            roomId={selectedRoomId}
            rules={selectedRoomRules}
          />
        </>
      )}
    </div>
  );
}
