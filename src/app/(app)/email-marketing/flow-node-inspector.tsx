"use client";

import { useState, useTransition } from "react";
import { Trash2, X } from "lucide-react";
import type { Property } from "@/lib/property";
import { BOOKING_STATUSES } from "@/lib/bookings";
import {
  BOOKING_STATUS_NAMES,
  DURATION_UNIT_LABELS,
  DURATION_UNITS,
  OFFSET_REFERENCE_LABELS,
  OFFSET_REFERENCES,
  TRIGGER_TYPE_HINTS,
  TRIGGER_TYPE_LABELS,
  TRIGGER_TYPES,
  describeTrigger,
  formatMinutes,
  splitMinutes,
  toMinutes,
  type DurationUnit,
  type EmailFlowStep,
  type EmailList,
  type EmailTemplate,
  type OffsetReference,
  type TriggerType,
} from "@/lib/email-marketing";
import { ToggleSwitch } from "@/components/toggle-switch";
import {
  clearStepTrigger,
  deleteFlowStep,
  saveEmailNode,
  saveTriggerNode,
  setFlowStepActive,
} from "./actions";
import { ConfirmDeleteModal } from "./confirm-delete-modal";

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
const labelClasses = "text-[13px] font-semibold text-ink";
// Igual a inputClasses mas sem a largura total — para campos lado a lado.
const inlineInputClasses = inputClasses.replace("w-full ", "");

function DurationFields({
  amount,
  unit,
  onAmount,
  onUnit,
  idPrefix,
}: {
  amount: string;
  unit: DurationUnit;
  onAmount: (value: string) => void;
  onUnit: (value: DurationUnit) => void;
  idPrefix: string;
}) {
  return (
    <div className="flex gap-2">
      <input
        id={`${idPrefix}-amount`}
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        value={amount}
        onChange={(e) => onAmount(e.target.value)}
        aria-label="Quantidade"
        className={`${inlineInputClasses} w-20 shrink-0`}
      />
      <select
        id={`${idPrefix}-unit`}
        value={unit}
        onChange={(e) => onUnit(e.target.value as DurationUnit)}
        aria-label="Unidade"
        className={`${inlineInputClasses} min-w-0 flex-1`}
      >
        {DURATION_UNITS.map((u) => (
          <option key={u} value={u}>
            {DURATION_UNIT_LABELS[u]}
          </option>
        ))}
      </select>
    </div>
  );
}

function parseAmount(raw: string): number {
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function InspectorShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto rounded-lg border border-border bg-canvas p-4 shadow-card lg:w-80">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-body font-bold text-ink">{title}</p>
          <p className="text-[12px] text-ink-subdued">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar painel"
          className="rounded-md p-1 text-ink-subdued hover:bg-surface-1"
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>
      {children}
    </aside>
  );
}

function Feedback({ error, saved }: { error: string | null; saved: boolean }) {
  return (
    <>
      {error && (
        <p aria-live="polite" className="text-body text-error">
          {error}
        </p>
      )}
      {saved && !error && (
        <p aria-live="polite" className="text-body font-semibold text-success">
          Guardado.
        </p>
      )}
    </>
  );
}

// ---------- Gatilho (raiz do ramo) ----------

export function TriggerForm({ step }: { step: EmailFlowStep }) {
  const initialDuration = splitMinutes(step.offset_minutes);
  const [triggerType, setTriggerType] = useState<TriggerType>(
    step.trigger_type ?? "booking_created",
  );
  const [reference, setReference] = useState<OffsetReference>(
    step.offset_reference ?? "check_in",
  );
  const [status, setStatus] = useState(step.trigger_param ?? "confirmada");
  const [direction, setDirection] = useState<"before" | "after">(
    step.offset_minutes < 0 ? "before" : "after",
  );
  const [amount, setAmount] = useState(String(initialDuration.amount));
  const [unit, setUnit] = useState<DurationUnit>(initialDuration.unit);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const hasDelay = triggerType !== "cleaning_ready_on_checkin";
  const canBeBefore = triggerType === "date_offset";
  const signed =
    toMinutes(parseAmount(amount), unit) *
    (canBeBefore && direction === "before" ? -1 : 1);

  const preview = describeTrigger({
    trigger_type: triggerType,
    offset_reference: triggerType === "date_offset" ? reference : null,
    offset_minutes: hasDelay ? signed : 0,
    trigger_param: triggerType === "booking_status" ? status : null,
  });

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveTriggerNode({
        stepId: step.id,
        triggerType,
        offsetReference: triggerType === "date_offset" ? reference : null,
        triggerParam: triggerType === "booking_status" ? status : null,
        offsetMinutes: hasDelay ? signed : 0,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="trigger-type" className={labelClasses}>
          Quando
        </label>
        <select
          id="trigger-type"
          value={triggerType}
          onChange={(e) => {
            const next = e.target.value as TriggerType;
            setTriggerType(next);
            // "Antes" só existe para check-in/checkout.
            if (next !== "date_offset") setDirection("after");
            setSaved(false);
          }}
          className={inputClasses}
        >
          {TRIGGER_TYPES.map((t) => (
            <option key={t} value={t}>
              {TRIGGER_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <p className="text-[12px] text-ink-subdued">
          {TRIGGER_TYPE_HINTS[triggerType]}
        </p>
      </div>

      {triggerType === "booking_status" && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="trigger-status" className={labelClasses}>
            Estado da reserva
          </label>
          <select
            id="trigger-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setSaved(false);
            }}
            className={inputClasses}
          >
            {BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {BOOKING_STATUS_NAMES[s] ?? s}
              </option>
            ))}
          </select>
        </div>
      )}

      {triggerType === "date_offset" && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="trigger-reference" className={labelClasses}>
            Relativo a
          </label>
          <select
            id="trigger-reference"
            value={reference}
            onChange={(e) => {
              setReference(e.target.value as OffsetReference);
              setSaved(false);
            }}
            className={inputClasses}
          >
            {OFFSET_REFERENCES.map((r) => (
              <option key={r} value={r}>
                {OFFSET_REFERENCE_LABELS[r]}
              </option>
            ))}
          </select>
          <p className="text-[12px] text-ink-subdued">
            Usa a hora de check-in/checkout definida em cada alojamento
            (Alojamentos → Detalhes).
          </p>
        </div>
      )}

      {hasDelay && (
        <div className="flex flex-col gap-1.5">
          <span className={labelClasses}>
            {canBeBefore ? "Quanto tempo" : "Aguardar (0 = imediatamente)"}
          </span>
          {canBeBefore && (
            <select
              value={direction}
              onChange={(e) => {
                setDirection(e.target.value as "before" | "after");
                setSaved(false);
              }}
              aria-label="Antes ou depois"
              className={inputClasses}
            >
              <option value="before">Antes</option>
              <option value="after">Depois</option>
            </select>
          )}
          <DurationFields
            idPrefix="trigger-delay"
            amount={amount}
            unit={unit}
            onAmount={(v) => {
              setAmount(v);
              setSaved(false);
            }}
            onUnit={(v) => {
              setUnit(v);
              setSaved(false);
            }}
          />
        </div>
      )}

      <div className="rounded-md bg-surface-1 px-3 py-2 text-[13px] text-ink">
        <span className="text-ink-subdued">Resumo: </span>
        {preview}
      </div>

      <Feedback error={error} saved={saved} />

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="min-h-11 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "A guardar..." : "Guardar gatilho"}
      </button>
    </>
  );
}

export function TriggerInspector({
  step,
  onClose,
}: {
  step: EmailFlowStep;
  onClose: () => void;
}) {
  return (
    <InspectorShell
      title="Gatilho"
      subtitle="O que faz este ramo começar"
      onClose={onClose}
    >
      <TriggerForm step={step} />
    </InspectorShell>
  );
}

// ---------- Email (nó) ----------

export function EmailInspector({
  step,
  descendantCount,
  parentLabel,
  templates,
  lists,
  properties,
  onClose,
}: {
  step: EmailFlowStep;
  descendantCount: number;
  // Descrição do passo anterior (só existe se o passo não for uma raiz).
  parentLabel: string | null;
  templates: EmailTemplate[];
  lists: EmailList[];
  properties: Property[];
  onClose: () => void;
}) {
  const initialDelay = splitMinutes(step.offset_minutes);
  const [templateId, setTemplateId] = useState(step.template_id ?? "");
  const [listId, setListId] = useState(step.list_id ?? "");
  const [propertyId, setPropertyId] = useState(step.property_id ?? "");
  const [amount, setAmount] = useState(String(initialDelay.amount));
  const [unit, setUnit] = useState<DurationUnit>(initialDelay.unit);
  // Passo seguinte: espera depois do email anterior, ou tem gatilho próprio.
  const [timing, setTiming] = useState<"after" | "own">(
    step.trigger_type ? "own" : "after",
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [, startToggle] = useTransition();

  const isChild = step.parent_step_id !== null;
  const delayMinutes = toMinutes(parseAmount(amount), unit);

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      // Voltou a "depois do email anterior": limpa o gatilho próprio.
      if (isChild && timing === "after" && step.trigger_type) {
        const cleared = await clearStepTrigger(step.id, delayMinutes);
        if ("error" in cleared) {
          setError(cleared.error);
          return;
        }
      }
      const result = await saveEmailNode({
        stepId: step.id,
        templateId: templateId || null,
        listId: listId || null,
        propertyId: propertyId || null,
        delayMinutes: isChild && timing === "after" ? delayMinutes : undefined,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <InspectorShell
      title="Email"
      subtitle={
        isChild && parentLabel
          ? `Enviado depois de «${parentLabel}»`
          : "Primeiro email do ramo"
      }
      onClose={onClose}
    >
      <div className="flex items-center justify-between gap-3 rounded-md bg-surface-1 px-3 py-2">
        <span className="text-[13px] font-semibold text-ink">
          Estado da etapa
        </span>
        <ToggleSwitch
          label="Etapa ativa"
          checked={step.is_active}
          onChange={() =>
            startToggle(async () => {
              await setFlowStepActive(step.id, !step.is_active);
            })
          }
        />
      </div>
      {!step.is_active && descendantCount > 0 && (
        <p className="text-[12px] text-ink-subdued">
          Os {descendantCount} passo(s) seguintes também deixam de enviar
          enquanto esta etapa estiver desativada.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="node-template" className={labelClasses}>
          Modelo de email
        </label>
        <select
          id="node-template"
          value={templateId}
          onChange={(e) => {
            setTemplateId(e.target.value);
            setSaved(false);
          }}
          className={inputClasses}
        >
          <option value="">— Escolher modelo —</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {!templateId && (
          <p className="text-[12px] text-ink-subdued">
            Sem modelo, este passo não envia nada.
          </p>
        )}
      </div>

      {isChild && (
        <div className="flex flex-col gap-3 rounded-md border border-border p-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="node-timing" className={labelClasses}>
              Quando enviar
            </label>
            <select
              id="node-timing"
              value={timing}
              onChange={(e) => {
                setTiming(e.target.value as "after" | "own");
                setSaved(false);
              }}
              className={inputClasses}
            >
              <option value="after">Depois do email anterior</option>
              <option value="own">Num momento próprio (gatilho)</option>
            </select>
          </div>

          {timing === "after" ? (
            <div className="flex flex-col gap-1.5">
              <span className={labelClasses}>Aguardar</span>
              <DurationFields
                idPrefix="node-delay"
                amount={amount}
                unit={unit}
                onAmount={(v) => {
                  setAmount(v);
                  setSaved(false);
                }}
                onUnit={(v) => {
                  setUnit(v);
                  setSaved(false);
                }}
              />
              <p className="text-[12px] text-ink-subdued">
                {delayMinutes === 0
                  ? "Sem espera: sai logo a seguir."
                  : `Espera ${formatMinutes(delayMinutes)} depois do gatilho do ramo.`}
              </p>
            </div>
          ) : (
            <>
              <p className="text-[12px] text-ink-subdued">
                Ex.: «1 dia antes do check-in» ou «2 horas depois do checkout».
                Só envia enquanto os passos anteriores estiverem ativos.
              </p>
              <TriggerForm key={`${step.id}-trigger`} step={step} />
            </>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="node-property" className={labelClasses}>
          Alojamento
        </label>
        <select
          id="node-property"
          value={propertyId}
          onChange={(e) => {
            setPropertyId(e.target.value);
            setSaved(false);
          }}
          className={inputClasses}
        >
          <option value="">Todos os alojamentos</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="node-list" className={labelClasses}>
          Lista de destinatários
        </label>
        <select
          id="node-list"
          value={listId}
          onChange={(e) => {
            setListId(e.target.value);
            setSaved(false);
          }}
          className={inputClasses}
        >
          <option value="">Todos os hóspedes</option>
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      <Feedback error={error} saved={saved} />

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="min-h-11 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "A guardar..." : "Guardar email"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-canvas px-4 text-body font-semibold text-error transition-colors duration-fast ease-standard hover:bg-error/5"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} />
          Remover passo
        </button>
      </div>

      {confirmingDelete && (
        <ConfirmDeleteModal
          title="Remover passo"
          message={
            descendantCount > 0
              ? `Isto remove este passo e os ${descendantCount} passo(s) que vêm a seguir. Os envios já feitos ficam no histórico.`
              : "Isto remove este passo. Os envios já feitos ficam no histórico."
          }
          onConfirm={() => deleteFlowStep(step.id)}
          onClose={() => setConfirmingDelete(false)}
        />
      )}
    </InspectorShell>
  );
}
