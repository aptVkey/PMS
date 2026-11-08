import { diffDaysISO } from "@/lib/date-utils";
import type { Guest } from "@/lib/guests";

// ---------- Etiquetas ----------

export const TAG_COLORS = [
  "blue",
  "green",
  "amber",
  "red",
  "purple",
  "gray",
] as const;
export type TagColor = (typeof TAG_COLORS)[number];

export const TAG_COLOR_LABELS: Record<TagColor, string> = {
  blue: "Azul",
  green: "Verde",
  amber: "Amarelo",
  red: "Vermelho",
  purple: "Roxo",
  gray: "Cinzento",
};

export const TAG_COLOR_CLASSES: Record<TagColor, string> = {
  blue: "bg-action/10 text-action",
  green: "bg-success/10 text-success",
  amber: "bg-highlight/25 text-highlight-ink",
  red: "bg-error/10 text-error",
  purple: "bg-primary/10 text-primary",
  gray: "bg-surface-2 text-ink-muted",
};

export type CrmTag = {
  id: string;
  name: string;
  color: TagColor;
  // Etiqueta calculada por uma regra (não se atribui nem remove à mão).
  auto?: boolean;
};

// ---------- Interações ----------

export const INTERACTION_TYPES = [
  "nota",
  "chamada",
  "email",
  "whatsapp",
  "presencial",
] as const;
export type InteractionType = (typeof INTERACTION_TYPES)[number];

export const INTERACTION_LABELS: Record<InteractionType, string> = {
  nota: "Nota",
  chamada: "Chamada",
  email: "Email",
  whatsapp: "WhatsApp",
  presencial: "Presencial",
};

export type CrmInteraction = {
  id: string;
  guest_id: string;
  type: InteractionType;
  body: string;
  created_by: string | null;
  created_at: string;
  author?: { name: string } | null;
};

// ---------- Tarefas ----------

export type CrmTask = {
  id: string;
  title: string;
  due_date: string | null;
  guest_id: string | null;
  lead_id: string | null;
  assigned_to: string | null;
  done: boolean;
  done_at: string | null;
  created_at: string;
  guest?: { name: string } | null;
  lead?: { name: string } | null;
  assignee?: { name: string } | null;
};

// ---------- Leads ----------

export const LEAD_STATUSES = [
  "novo",
  "contactado",
  "proposta",
  "reservou",
  "perdido",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  novo: "Novo",
  contactado: "Contactado",
  proposta: "Proposta enviada",
  reservou: "Reservou",
  perdido: "Perdido",
};

export const LEAD_STATUS_STYLES: Record<LeadStatus, string> = {
  novo: "bg-highlight/25 text-highlight-ink",
  contactado: "bg-action/10 text-action",
  proposta: "bg-primary/10 text-primary",
  reservou: "bg-success/10 text-success",
  perdido: "bg-surface-2 text-ink-muted",
};

export const LEAD_SOURCES = ["website", "manual", "telefone", "outro"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  website: "Website",
  manual: "Manual",
  telefone: "Telefone",
  outro: "Outro",
};

export type CrmLead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  source: LeadSource;
  status: LeadStatus;
  notes: string | null;
  assigned_to: string | null;
  guest_id: string | null;
  created_at: string;
  updated_at: string;
  assignee?: { name: string } | null;
};

// ---------- Estatísticas por hóspede ----------

export type StatBooking = {
  guest_id: string;
  check_in: string;
  check_out: string;
  status: string;
  total_amount: number;
  channel: string | null;
};

export type GuestStats = {
  stays: number;
  nights: number;
  value: number;
  firstStay: string | null;
  // Último check-out já ocorrido (ou estadia em curso).
  lastStay: string | null;
  // Próximo check-in a partir de hoje.
  nextStay: string | null;
  channels: Record<string, number>;
};

export const EMPTY_STATS: GuestStats = {
  stays: 0,
  nights: 0,
  value: 0,
  firstStay: null,
  lastStay: null,
  nextStay: null,
  channels: {},
};

// Reservas canceladas não contam como estadias.
export function computeGuestStats(
  bookings: StatBooking[],
  today: string,
): GuestStats {
  const active = bookings.filter((b) => b.status !== "cancelada");
  if (active.length === 0) return EMPTY_STATS;

  const channels: Record<string, number> = {};
  let nights = 0;
  let value = 0;
  let firstStay: string | null = null;
  let lastStay: string | null = null;
  let nextStay: string | null = null;

  for (const b of active) {
    nights += Math.max(0, diffDaysISO(b.check_in, b.check_out));
    value += b.total_amount;
    const channel = b.channel || "Sem canal";
    channels[channel] = (channels[channel] ?? 0) + 1;
    if (!firstStay || b.check_in < firstStay) firstStay = b.check_in;
    if (b.check_in <= today && (!lastStay || b.check_out > lastStay)) {
      lastStay = b.check_out;
    }
    if (b.check_in >= today && (!nextStay || b.check_in < nextStay)) {
      nextStay = b.check_in;
    }
  }

  return {
    stays: active.length,
    nights,
    value,
    firstStay,
    lastStay,
    nextStay,
    channels,
  };
}

// Etiquetas automáticas, calculadas (não guardadas).
export function autoTagLabels(stats: GuestStats): string[] {
  const labels: string[] = [];
  if (stats.stays >= 2) labels.push("Recorrente");
  if (stats.nextStay) labels.push("Reserva futura");
  return labels;
}

// ---------- Segmentos ----------

export type SegmentFilter = {
  tagIds?: string[];
  nationality?: string;
  minStays?: number;
  minValue?: number;
  // Sem estadia há pelo menos N dias (inclui quem nunca ficou? não).
  inactiveDays?: number;
  hasUpcoming?: boolean;
  hasEmail?: boolean;
};

export type CrmSegment = {
  id: string;
  name: string;
  filter: SegmentFilter;
  created_at: string;
};

export function matchesSegment(
  guest: Pick<Guest, "nationality" | "email">,
  stats: GuestStats,
  tagIds: string[],
  filter: SegmentFilter,
  today: string,
): boolean {
  if (filter.tagIds?.length && !filter.tagIds.some((t) => tagIds.includes(t))) {
    return false;
  }
  if (filter.nationality && guest.nationality !== filter.nationality) {
    return false;
  }
  if (filter.minStays && stats.stays < filter.minStays) return false;
  if (filter.minValue && stats.value < filter.minValue) return false;
  if (filter.hasUpcoming && !stats.nextStay) return false;
  if (filter.hasEmail && !guest.email) return false;
  if (filter.inactiveDays) {
    if (!stats.lastStay) return false;
    if (diffDaysISO(stats.lastStay, today) < filter.inactiveDays) return false;
  }
  return true;
}

export function describeSegment(
  filter: SegmentFilter,
  tags: CrmTag[],
): string[] {
  const parts: string[] = [];
  if (filter.tagIds?.length) {
    const names = filter.tagIds
      .map((id) => tags.find((t) => t.id === id)?.name)
      .filter(Boolean);
    parts.push(`Etiqueta: ${names.join(" ou ")}`);
  }
  if (filter.nationality) parts.push(`Nacionalidade: ${filter.nationality}`);
  if (filter.minStays) parts.push(`${filter.minStays}+ estadias`);
  if (filter.minValue) parts.push(`${filter.minValue}+ € em reservas`);
  if (filter.inactiveDays) {
    parts.push(`Sem estadia há ${filter.inactiveDays}+ dias`);
  }
  if (filter.hasUpcoming) parts.push("Com reserva futura");
  if (filter.hasEmail) parts.push("Com email");
  return parts;
}

// ---------- Regras de classificação automática ----------

export const RULE_METRICS = [
  "avg_booking",
  "ltv",
  "avg_night",
  "stays",
  "nights",
  "days_since_last",
] as const;
export type RuleMetric = (typeof RULE_METRICS)[number];

export const RULE_METRIC_LABELS: Record<RuleMetric, string> = {
  avg_booking: "Valor médio por estadia",
  ltv: "Valor total (LTV)",
  avg_night: "Valor médio por noite",
  stays: "Nº de estadias",
  nights: "Nº de noites",
  days_since_last: "Dias desde a última estadia",
};

// Métricas em euros (para formatar o limiar).
export const RULE_METRIC_IS_MONEY: Record<RuleMetric, boolean> = {
  avg_booking: true,
  ltv: true,
  avg_night: true,
  stays: false,
  nights: false,
  days_since_last: false,
};

export const RULE_OPERATORS = ["gt", "gte", "lt", "lte"] as const;
export type RuleOperator = (typeof RULE_OPERATORS)[number];

export const RULE_OPERATOR_LABELS: Record<RuleOperator, string> = {
  gt: "superior a",
  gte: "superior ou igual a",
  lt: "inferior a",
  lte: "inferior ou igual a",
};

export type RuleThresholdMode = "fixed" | "average";

export type CrmTagRule = {
  id: string;
  name: string;
  color: TagColor;
  metric: RuleMetric;
  operator: RuleOperator;
  threshold_mode: RuleThresholdMode;
  value: number;
  created_at: string;
};

// Valor da métrica para um hóspede; null quando não se aplica (por exemplo,
// quem nunca ficou não deve ser etiquetado como "valor baixo").
export function ruleMetricValue(
  stats: GuestStats,
  metric: RuleMetric,
  today: string,
): number | null {
  if (stats.stays === 0) return null;
  switch (metric) {
    case "ltv":
      return stats.value;
    case "avg_booking":
      return stats.value / stats.stays;
    case "avg_night":
      return stats.nights > 0 ? stats.value / stats.nights : null;
    case "stays":
      return stats.stays;
    case "nights":
      return stats.nights;
    case "days_since_last":
      return stats.lastStay ? diffDaysISO(stats.lastStay, today) : null;
  }
}

// Média de cada métrica entre os hóspedes a que ela se aplica.
export function metricAverages(
  statsList: GuestStats[],
  today: string,
): Record<RuleMetric, number | null> {
  const result = {} as Record<RuleMetric, number | null>;
  for (const metric of RULE_METRICS) {
    const values = statsList
      .map((s) => ruleMetricValue(s, metric, today))
      .filter((v): v is number => v !== null);
    result[metric] =
      values.length > 0
        ? values.reduce((a, b) => a + b, 0) / values.length
        : null;
  }
  return result;
}

export function ruleThreshold(
  rule: CrmTagRule,
  averages: Record<RuleMetric, number | null>,
): number | null {
  if (rule.threshold_mode === "fixed") return rule.value;
  const average = averages[rule.metric];
  return average === null ? null : (average * rule.value) / 100;
}

export function ruleMatches(
  rule: CrmTagRule,
  stats: GuestStats,
  averages: Record<RuleMetric, number | null>,
  today: string,
): boolean {
  const metric = ruleMetricValue(stats, rule.metric, today);
  const threshold = ruleThreshold(rule, averages);
  if (metric === null || threshold === null) return false;
  switch (rule.operator) {
    case "gt":
      return metric > threshold;
    case "gte":
      return metric >= threshold;
    case "lt":
      return metric < threshold;
    case "lte":
      return metric <= threshold;
  }
}

export function describeRule(
  rule: CrmTagRule,
  averages: Record<RuleMetric, number | null>,
): string {
  const money = RULE_METRIC_IS_MONEY[rule.metric];
  const fmt = (n: number) =>
    money
      ? new Intl.NumberFormat("pt-PT", {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: 0,
        }).format(n)
      : String(Math.round(n * 10) / 10);

  const operator = RULE_OPERATOR_LABELS[rule.operator];
  const metricLabel = RULE_METRIC_LABELS[rule.metric];
  if (rule.threshold_mode === "fixed") {
    return `${metricLabel} ${operator} ${fmt(rule.value)}`;
  }

  const average = averages[rule.metric];
  const hint =
    average !== null ? ` (hoje ${fmt((average * rule.value) / 100)})` : "";
  // "superior a" + "a média" lê-se "superior à média".
  return rule.value === 100
    ? `${metricLabel} ${operator.replace(/ a$/, " à")} média${hint}`
    : `${metricLabel} ${operator} ${rule.value}% da média${hint}`;
}

// Quem pertence a um segmento neste momento. É a mesma lógica do ecrã do CRM,
// usada também pelo motor de emails ao enviar — por isso as listas ligadas a
// segmentos e as etiquetas por regra acompanham sempre as reservas atuais.
export function segmentGuestIds(input: {
  guests: Pick<Guest, "id" | "nationality" | "email">[];
  bookings: StatBooking[];
  manualTags: { guest_id: string; tag_id: string }[];
  rules: CrmTagRule[];
  filter: SegmentFilter;
  today: string;
}): string[] {
  const { guests, bookings, manualTags, rules, filter, today } = input;

  const bookingsByGuest = new Map<string, StatBooking[]>();
  for (const b of bookings) {
    bookingsByGuest.set(b.guest_id, [
      ...(bookingsByGuest.get(b.guest_id) ?? []),
      b,
    ]);
  }
  const stats = new Map<string, GuestStats>();
  for (const guest of guests) {
    stats.set(
      guest.id,
      computeGuestStats(bookingsByGuest.get(guest.id) ?? [], today),
    );
  }

  const averages = metricAverages(Array.from(stats.values()), today);

  const tagsByGuest = new Map<string, string[]>();
  for (const row of manualTags) {
    tagsByGuest.set(row.guest_id, [
      ...(tagsByGuest.get(row.guest_id) ?? []),
      row.tag_id,
    ]);
  }

  return guests
    .filter((guest) => {
      const guestStats = stats.get(guest.id) ?? EMPTY_STATS;
      const tagIds = [
        ...(tagsByGuest.get(guest.id) ?? []),
        ...rules
          .filter((rule) => ruleMatches(rule, guestStats, averages, today))
          .map((rule) => rule.id),
      ];
      return matchesSegment(guest, guestStats, tagIds, filter, today);
    })
    .map((guest) => guest.id);
}
