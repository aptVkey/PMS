import { addDaysISO, diffDaysISO, formatDateLabel, todayISO } from "@/lib/date-utils";
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
  guest?: { name: string; visit_count: number; nationality: string | null } | null;
};

export type ReportingCleaningTask = {
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
  assignee?: { hourly_rate: number | null } | null;
};

export const PERIOD_PRESETS = ["hoje", "7dias", "mes", "ano", "custom"] as const;

export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export const PERIOD_PRESET_LABELS: Record<PeriodPreset, string> = {
  hoje: "Hoje",
  "7dias": "7 dias",
  mes: "Este mês",
  ano: "Este ano",
  custom: "Personalizado",
};

export function getPresetRange(preset: PeriodPreset): { start: string; end: string } {
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
  const overlapEnd = checkOut < periodEndExclusive ? checkOut : periodEndExclusive;
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
