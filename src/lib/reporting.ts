import {
  addDaysISO,
  diffDaysISO,
  formatDateLabel,
  todayISO,
} from "@/lib/date-utils";
import type { BookingStatus } from "@/lib/bookings";

export type ReportingBooking = {
  id: string;
  check_in: string;
  check_out: string;
  status: BookingStatus;
  total_amount: number;
  channel: string | null;
  guest_id: string;
  room_id: string;
  num_adults: number;
  num_children: number;
  num_infants: number;
  payments?: { amount: number }[];
  guest?: {
    name: string;
    visit_count: number;
    nationality: string | null;
  } | null;
};

export type ReportingCleaningTask = {
  result?: { total_cost: number | null } | null;
  status: "pendente" | "em_curso" | "concluida";
  started_at: string | null;
  completed_at: string | null;
  assignee?: { hourly_rate: number | null } | null;
};

export type ReportingMaintenanceIssue = {
  status: "reportado" | "em_curso" | "resolvido";
  priority: "baixa" | "media" | "alta";
  started_at: string | null;
  completed_at: string | null;
  // Custo gravado ao resolver; se faltar, calcula-se com o valor/hora atual.
  total_cost?: number | null;
  assignee?: { hourly_rate: number | null } | null;
};

export const PERIOD_PRESETS = [
  "hoje",
  "7dias",
  "mes",
  "ano",
  "lifetime",
  "custom",
] as const;

export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export const PERIOD_PRESET_LABELS: Record<PeriodPreset, string> = {
  hoje: "Hoje",
  "7dias": "7 dias",
  mes: "Este mês",
  ano: "Este ano",
  lifetime: "Lifetime",
  custom: "Personalizado",
};

// Lifetime: da data mais antiga com dados até hoje (ou à última data futura).
export function getLifetimeRange(dates: string[]): {
  start: string;
  end: string;
} {
  const today = todayISO();
  let start = today;
  let end = today;
  for (const d of dates) {
    if (!d) continue;
    if (d < start) start = d;
    if (d > end) end = d;
  }
  return { start, end };
}

export function getPresetRange(
  preset: PeriodPreset,
  lifetimeDates: string[] = [],
): {
  start: string;
  end: string;
} {
  const today = todayISO();
  switch (preset) {
    case "hoje":
      return { start: today, end: today };
    case "7dias":
      return { start: addDaysISO(today, -6), end: today };
    case "mes": {
      // Mês completo (não só até hoje), para incluir reservas futuras já
      // feitas para este mês.
      const [y, m] = today.split("-").map(Number);
      const start = `${y}-${String(m).padStart(2, "0")}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      return { start, end };
    }
    case "ano": {
      // Ano completo (não só até hoje), pelo mesmo motivo.
      const [y] = today.split("-").map(Number);
      return { start: `${y}-01-01`, end: `${y}-12-31` };
    }
    case "lifetime":
      return getLifetimeRange(lifetimeDates);
    default:
      return { start: today, end: today };
  }
}

export function formatPeriodLabel(start: string, end: string): string {
  return start === end
    ? formatDateLabel(start)
    : `${formatDateLabel(start)} → ${formatDateLabel(end)}`;
}

// Número de noites de uma reserva [checkIn, checkOut) que caem dentro do
// período [periodStart, periodEnd] (inclusive), para calcular ocupação.
export function nightsOverlap(
  checkIn: string,
  checkOut: string,
  periodStart: string,
  periodEnd: string,
): number {
  const periodEndExclusive = addDaysISO(periodEnd, 1);
  const overlapStart = checkIn > periodStart ? checkIn : periodStart;
  const overlapEnd =
    checkOut < periodEndExclusive ? checkOut : periodEndExclusive;
  return Math.max(0, diffDaysISO(overlapStart, overlapEnd));
}

// Receita de uma reserva atribuída às noites que caem dentro do período
// (proporcional ao valor total da reserva), para calcular ADR/RevPAR/TrevPAR
// de forma consistente com nightsOverlap.
export function proratedRevenue(
  checkIn: string,
  checkOut: string,
  totalAmount: number,
  periodStart: string,
  periodEnd: string,
): number {
  const totalNights = diffDaysISO(checkIn, checkOut);
  if (totalNights <= 0) return 0;
  const overlap = nightsOverlap(checkIn, checkOut, periodStart, periodEnd);
  return (totalAmount / totalNights) * overlap;
}

export function elapsedHours(
  startedAt: string | null,
  completedAt: string | null,
): number {
  if (!startedAt || !completedAt) return 0;
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  return Math.max(0, ms / 3_600_000);
}

export function formatCurrency(value: number): string {
  return `${value.toFixed(2).replace(".", ",")} €`;
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ---------- Comparação com o ano anterior ----------

// Mesmas datas, um ano antes (29 Fev passa a 28 Fev em anos não bissextos).
export function shiftYearBack(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const year = y - 1;
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const day = m === 2 && d === 29 && !isLeap ? 28 : d;
  return `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export type PeriodMetrics = {
  // Número de reservas (qualquer estado) que entram no período — se for 0,
  // não há base para comparar.
  totalBookings: number;
  bookingCount: number;
  revenue: number;
  paid: number;
  pending: number;
  avgBookingValue: number;
  roomNights: number;
  availableNights: number;
  occupancyRate: number;
  adr: number;
  revPar: number;
  trevPar: number;
  avgLengthOfStay: number;
  guests: number;
  repeatGuests: number;
};

// Todas as métricas do separador de reporting para um período, numa função
// pura — assim o mesmo cálculo serve o período atual e o homólogo.
export function computePeriodMetrics(
  bookings: ReportingBooking[],
  roomCount: number,
  range: { start: string; end: string },
): PeriodMetrics {
  const daysInRange = diffDaysISO(range.start, range.end) + 1;

  const periodBookings = bookings.filter(
    (b) => b.check_in >= range.start && b.check_in <= range.end,
  );
  const active = periodBookings.filter((b) => b.status !== "cancelada");

  const revenue = active.reduce((sum, b) => sum + b.total_amount, 0);
  const paid = active.reduce(
    (sum, b) => sum + (b.payments ?? []).reduce((s, p) => s + p.amount, 0),
    0,
  );

  const nonCancelled = bookings.filter((b) => b.status !== "cancelada");
  const roomNights = nonCancelled.reduce(
    (sum, b) =>
      sum + nightsOverlap(b.check_in, b.check_out, range.start, range.end),
    0,
  );
  const availableNights = roomCount * daysInRange;
  const nightBasedRevenue = nonCancelled.reduce(
    (sum, b) =>
      sum +
      proratedRevenue(
        b.check_in,
        b.check_out,
        b.total_amount,
        range.start,
        range.end,
      ),
    0,
  );

  const revPar = availableNights > 0 ? nightBasedRevenue / availableNights : 0;

  const totalNights = active.reduce(
    (sum, b) => sum + diffDaysISO(b.check_in, b.check_out),
    0,
  );

  const distinctGuests = new Map<string, number>();
  let guests = 0;
  for (const b of active) {
    if (b.guest) distinctGuests.set(b.guest_id, b.guest.visit_count);
    guests += b.num_adults + b.num_children + b.num_infants;
  }

  return {
    totalBookings: periodBookings.length,
    bookingCount: active.length,
    revenue,
    paid,
    pending: Math.max(0, revenue - paid),
    avgBookingValue: active.length > 0 ? revenue / active.length : 0,
    roomNights,
    availableNights,
    occupancyRate: availableNights > 0 ? roomNights / availableNights : 0,
    adr: roomNights > 0 ? nightBasedRevenue / roomNights : 0,
    revPar,
    // Sem outras receitas registadas, o TrevPAR coincide com o RevPAR.
    trevPar: revPar,
    avgLengthOfStay: active.length > 0 ? totalNights / active.length : 0,
    guests,
    repeatGuests: Array.from(distinctGuests.values()).filter((v) => v > 1)
      .length,
  };
}

export type Comparison = {
  // null quando o período homólogo não tem dados ou o valor anterior é 0.
  delta: number | null;
  unit: "%" | "pp";
  previous: string;
  hasBase: boolean;
};

// Variação percentual face ao ano anterior (ou em pontos percentuais, para
// taxas como a ocupação).
export function buildComparison(
  current: number,
  previous: number,
  hasBase: boolean,
  format: (value: number) => string,
  unit: "%" | "pp" = "%",
): Comparison {
  if (!hasBase) {
    return { delta: null, unit, previous: format(previous), hasBase: false };
  }

  if (unit === "pp") {
    return {
      delta: (current - previous) * 100,
      unit,
      previous: format(previous),
      hasBase: true,
    };
  }

  return {
    delta: previous > 0 ? ((current - previous) / previous) * 100 : null,
    unit,
    previous: format(previous),
    hasBase: true,
  };
}
