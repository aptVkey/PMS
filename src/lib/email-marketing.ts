export const TRIGGER_TYPES = [
  "booking_created",
  "booking_status",
  "date_offset",
  "cleaning_completed",
  "cleaning_ready_on_checkin",
] as const;

export type TriggerType = (typeof TRIGGER_TYPES)[number];

export const TRIGGER_TYPE_LABELS: Record<TriggerType, string> = {
  booking_created: "Reserva criada",
  booking_status: "Estado da reserva muda",
  date_offset: "Antes/depois do check-in ou checkout",
  cleaning_completed: "Limpeza concluída",
  cleaning_ready_on_checkin: "Quarto limpo no dia do check-in",
};

export const TRIGGER_TYPE_HINTS: Record<TriggerType, string> = {
  booking_created: "Dispara quando uma nova reserva é criada.",
  booking_status:
    "Dispara quando uma reserva passa para um estado (ex.: confirmada, cancelada).",
  date_offset:
    "Dispara X minutos, horas ou dias antes ou depois da hora de check-in ou checkout.",
  cleaning_completed:
    "Dispara quando uma limpeza é concluída, para a próxima reserva desse quarto (nos próximos 7 dias).",
  cleaning_ready_on_checkin:
    "Dispara no dia do check-in, quando a limpeza mais recente do quarto está concluída.",
};

export const OFFSET_REFERENCES = ["check_in", "check_out"] as const;
export type OffsetReference = (typeof OFFSET_REFERENCES)[number];

export const OFFSET_REFERENCE_LABELS: Record<OffsetReference, string> = {
  check_in: "check-in",
  check_out: "checkout",
};

export const LIST_KINDS = ["manual", "dynamic", "segment"] as const;
export type ListKind = (typeof LIST_KINDS)[number];

export const LIST_KIND_LABELS: Record<ListKind, string> = {
  manual: "Manual",
  dynamic: "Dinâmica (por filtro)",
  segment: "Segmento do CRM",
};

export const SEND_STATUSES = ["sent", "failed", "skipped"] as const;
export type SendStatus = (typeof SEND_STATUSES)[number];

export const SEND_STATUS_LABELS: Record<SendStatus, string> = {
  sent: "Enviado",
  failed: "Falhou",
  skipped: "Ignorado (sem email)",
};

export type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  created_at: string;
  updated_at: string;
};

export type ListFilter = {
  nationality?: string | null;
  property_id?: string | null;
  min_visit_count?: number | null;
};

export type EmailList = {
  id: string;
  name: string;
  description: string | null;
  kind: ListKind;
  filter: ListFilter | null;
  // Só nas listas do tipo "segment": os membros vêm deste segmento do CRM.
  segment_id: string | null;
  created_at: string;
  updated_at: string;
};

export type EmailFlow = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  activated_at: string;
  created_at: string;
  updated_at: string;
};

export type EmailFlowStep = {
  id: string;
  flow_id: string;
  position: number;
  template_id: string | null;
  // Só os passos "raiz" (parent_step_id nulo) têm gatilho próprio; os
  // seguintes herdam o gatilho da raiz e só acrescentam um atraso.
  trigger_type: TriggerType | null;
  offset_reference: OffsetReference | null;
  // Obsoleto — usar offset_minutes. Mantido só por compatibilidade.
  offset_days: number | null;
  // Atraso em minutos. Na raiz pode ser negativo (antes do check-in/out);
  // nos passos seguintes é o tempo a aguardar após o passo anterior.
  offset_minutes: number;
  trigger_param: string | null;
  parent_step_id: string | null;
  pos_x: number | null;
  pos_y: number | null;
  list_id: string | null;
  property_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type EmailSend = {
  id: string;
  flow_step_id: string;
  booking_id: string;
  guest_id: string;
  email_to: string | null;
  subject: string | null;
  status: SendStatus;
  resend_id: string | null;
  error: string | null;
  created_at: string;
};

// Forma devolvida pela query do Histórico, com as relações já incluídas.
export type EmailSendRow = EmailSend & {
  guest: { name: string; email: string | null } | null;
  booking: { booking_number: number } | null;
  step: {
    trigger_type: TriggerType | null;
    flow: { name: string } | null;
  } | null;
};

// ---------- Duração ----------

export const DURATION_UNITS = ["minutes", "hours", "days"] as const;
export type DurationUnit = (typeof DURATION_UNITS)[number];

export const DURATION_UNIT_LABELS: Record<DurationUnit, string> = {
  minutes: "minutos",
  hours: "horas",
  days: "dias",
};

const UNIT_MINUTES: Record<DurationUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 1440,
};

export function toMinutes(amount: number, unit: DurationUnit): number {
  return Math.round(amount) * UNIT_MINUTES[unit];
}

// Escolhe a maior unidade que divide o valor exatamente (90 min → 90 minutos,
// 120 min → 2 horas, 2880 min → 2 dias).
export function splitMinutes(total: number): {
  amount: number;
  unit: DurationUnit;
} {
  const abs = Math.abs(total);
  if (abs !== 0 && abs % 1440 === 0)
    return { amount: abs / 1440, unit: "days" };
  if (abs !== 0 && abs % 60 === 0) return { amount: abs / 60, unit: "hours" };
  return { amount: abs, unit: "minutes" };
}

export function formatMinutes(total: number): string {
  const { amount, unit } = splitMinutes(total);
  if (unit === "days") return amount === 1 ? "1 dia" : `${amount} dias`;
  if (unit === "hours") return amount === 1 ? "1 hora" : `${amount} horas`;
  return amount === 1 ? "1 minuto" : `${amount} minutos`;
}

// ---------- Gatilho efetivo de um passo ----------

type StepTriggerFields = Pick<
  EmailFlowStep,
  | "id"
  | "parent_step_id"
  | "trigger_type"
  | "offset_reference"
  | "trigger_param"
  | "offset_minutes"
  | "is_active"
>;

export type EffectiveTrigger = {
  // Passo onde está o gatilho que conta (a raiz, ou o passo seguinte mais
  // próximo que tenha gatilho próprio).
  anchorId: string;
  triggerType: TriggerType;
  offsetReference: OffsetReference | null;
  triggerParam: string | null;
  // Atraso total desde o evento do gatilho (do passo-âncora para baixo).
  offsetMinutes: number;
  // Falso se o passo ou qualquer antecessor estiver desativado.
  active: boolean;
  depth: number;
};

// Percorre a árvore até à raiz. O gatilho é o do passo mais próximo (a
// começar pelo próprio) que tenha trigger_type; os atrasos somam-se do passo
// até essa âncora. Devolve null se a raiz não tem gatilho, se a cadeia está
// partida ou se houver um ciclo.
export function resolveEffectiveTrigger(
  step: StepTriggerFields,
  byId: Map<string, StepTriggerFields>,
): EffectiveTrigger | null {
  let current: StepTriggerFields = step;
  let offset = 0;
  let active = true;
  let depth = 0;
  let anchor: StepTriggerFields | null = null;
  const seen = new Set<string>();

  for (;;) {
    if (seen.has(current.id)) return null;
    seen.add(current.id);

    if (!anchor) {
      offset += current.offset_minutes;
      if (current.trigger_type) anchor = current;
    }
    if (!current.is_active) active = false;

    if (current.parent_step_id === null) {
      if (!anchor) return null;
      return {
        anchorId: anchor.id,
        triggerType: anchor.trigger_type as TriggerType,
        offsetReference: anchor.offset_reference,
        triggerParam: anchor.trigger_param,
        offsetMinutes: offset,
        active,
        depth,
      };
    }

    const parent = byId.get(current.parent_step_id);
    if (!parent) return null;
    current = parent;
    depth += 1;
  }
}

// Descreve num só resumo o que dispara um gatilho (raiz).
export function describeTrigger(step: {
  trigger_type: TriggerType | null;
  offset_reference: OffsetReference | null;
  offset_minutes: number;
  trigger_param: string | null;
}): string {
  const minutes = step.offset_minutes;
  const after = (event: string) =>
    minutes === 0 ? null : `${formatMinutes(minutes)} depois de ${event}`;

  switch (step.trigger_type) {
    case null:
      return "Gatilho por definir";
    case "booking_created":
      return after("a reserva ser criada") ?? "Ao criar a reserva";
    case "cleaning_completed":
      return after("a limpeza terminar") ?? "Quando a limpeza termina";
    case "cleaning_ready_on_checkin":
      return "Quarto limpo, no dia do check-in";
    case "booking_status": {
      const status =
        BOOKING_STATUS_NAMES[step.trigger_param ?? ""] ??
        step.trigger_param ??
        "?";
      return (
        after(`a reserva passar a «${status}»`) ??
        `Quando a reserva passa a «${status}»`
      );
    }
    case "date_offset": {
      const reference = step.offset_reference
        ? OFFSET_REFERENCE_LABELS[step.offset_reference]
        : "?";
      if (minutes === 0) return `À hora do ${reference}`;
      if (minutes < 0) return `${formatMinutes(minutes)} antes do ${reference}`;
      return `${formatMinutes(minutes)} depois do ${reference}`;
    }
  }
}

// Espelho de BOOKING_STATUS_LABELS (evita importar o módulo de reservas
// para dentro do módulo partilhado de email marketing).
export const BOOKING_STATUS_NAMES: Record<string, string> = {
  pendente: "Pendente",
  confirmada: "Confirmada",
  em_curso: "Em curso",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export type TemplateVariables = {
  guest_name: string;
  check_in: string;
  check_out: string;
  room_name: string;
  property_name: string;
  booking_number: string;
  access_code: string;
  check_in_time: string;
  check_out_time: string;
};

export const TEMPLATE_VARIABLE_KEYS = [
  "guest_name",
  "check_in",
  "check_out",
  "room_name",
  "property_name",
  "booking_number",
  "access_code",
  "check_in_time",
  "check_out_time",
] as const satisfies readonly (keyof TemplateVariables)[];

// Substitui {{variavel}} pelo valor correspondente. Variáveis desconhecidas ou
// sem valor ficam como texto vazio, para nunca aparecer "{{...}}" por enviar.
export function renderTemplate(
  text: string,
  variables: TemplateVariables,
): string {
  return text.replace(/{{\s*([a-z_]+)\s*}}/gi, (_match, key: string) => {
    const value = variables[key as keyof TemplateVariables];
    return value ?? "";
  });
}
