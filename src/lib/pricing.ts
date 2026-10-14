import { addDaysISO, diffDaysISO, formatISO } from "@/lib/date-utils";
import type { Booking } from "@/lib/bookings";

export type RoomRatePeriod = {
  id: string;
  room_id: string;
  label: string;
  start_date: string;
  end_date: string;
  sunday_rate: number;
  weekday_rate: number;
  weekend_rate: number;
  min_stay_nights: number | null;
  created_at: string;
  updated_at: string;
};

// Devolve a tarifa do período aplicável ao dia da semana de `date`:
// Domingo, Segunda a Quinta, ou Sexta e Sábado.
export function periodRateForDate(
  period: RoomRatePeriod,
  date: string,
): number {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = new Date(y, m - 1, d).getDay();
  if (weekday === 0) return period.sunday_rate;
  if (weekday === 5 || weekday === 6) return period.weekend_rate;
  return period.weekday_rate;
}

// Uma exceção para um dia concreto. Pode alterar só o preço, só a estadia
// mínima, ou os dois — daí ambos serem opcionais.
export type RoomDailyPrice = {
  id: string;
  room_id: string;
  date: string;
  nightly_rate: number | null;
  min_stay_nights: number | null;
  created_at: string;
  updated_at: string;
};

// Resolve a tarifa de uma noite pela ordem de especificidade: preço diário
// (mais específico) > período sazonal > preço base (fallback geral).
export function resolveNightlyRate(
  date: string,
  basePrice: number,
  periods: RoomRatePeriod[],
  dailyPrices: RoomDailyPrice[] = [],
): number {
  const daily = dailyPrices.find((d) => d.date === date);
  if (daily?.nightly_rate != null) return daily.nightly_rate;
  const match = periods.find((p) => date >= p.start_date && date <= p.end_date);
  return match ? periodRateForDate(match, date) : basePrice;
}

// Soma a tarifa de cada noite entre checkIn (inclusive) e checkOut (exclusive),
// usando o preço diário, o período sazonal aplicável a cada noite, ou o preço
// base como fallback.
export function calculateStayTotal(
  checkIn: string,
  checkOut: string,
  basePrice: number,
  periods: RoomRatePeriod[],
  dailyPrices: RoomDailyPrice[] = [],
): number {
  if (!checkIn || !checkOut || checkOut <= checkIn) return 0;
  let total = 0;
  let cursor = checkIn;
  while (cursor < checkOut) {
    total += resolveNightlyRate(cursor, basePrice, periods, dailyPrices);
    cursor = addDaysISO(cursor, 1);
  }
  return Number(total.toFixed(2));
}

// Mesma ordem de especificidade do preço: exceção do dia > período sazonal >
// valor base do quarto.
export function resolveMinStay(
  checkIn: string,
  baseMinStay: number | null,
  periods: RoomRatePeriod[],
  dailyPrices: RoomDailyPrice[] = [],
): number | null {
  const daily = dailyPrices.find((d) => d.date === checkIn);
  if (daily?.min_stay_nights != null) return daily.min_stay_nights;
  const match = periods.find(
    (p) => checkIn >= p.start_date && checkIn <= p.end_date,
  );
  if (match && match.min_stay_nights != null) return match.min_stay_nights;
  return baseMinStay;
}

const ACTIVE_BOOKING_STATUSES = new Set([
  "pendente",
  "confirmada",
  "em_curso",
  "concluida",
]);

// Fração de noites ocupadas (0-1) de um quarto num mês, com base nas
// reservas ativas (exclui canceladas) que sobrepõem esse mês.
export function calculateMonthOccupancy(
  bookings: Pick<Booking, "room_id" | "check_in" | "check_out" | "status">[],
  roomId: string,
  year: number,
  month: number,
): number {
  const monthStart = formatISO(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthEndExclusive = addDaysISO(
    formatISO(year, month - 1, daysInMonth),
    1,
  );

  let bookedNights = 0;
  for (const booking of bookings) {
    if (booking.room_id !== roomId) continue;
    if (!ACTIVE_BOOKING_STATUSES.has(booking.status)) continue;
    const overlapStart =
      booking.check_in > monthStart ? booking.check_in : monthStart;
    const overlapEnd =
      booking.check_out < monthEndExclusive
        ? booking.check_out
        : monthEndExclusive;
    if (overlapEnd > overlapStart) {
      bookedNights += diffDaysISO(overlapStart, overlapEnd);
    }
  }

  return Math.min(1, bookedNights / daysInMonth);
}

export type OccupancyLevel = "alta" | "normal" | "baixa";

// Escalões de ocupação usados para sugerir ajustes de preço: ocupação alta
// sugere subir o preço, ocupação baixa sugere descer, entre os dois mantém.
export const OCCUPANCY_HIGH_THRESHOLD = 0.7;
export const OCCUPANCY_LOW_THRESHOLD = 0.3;
export const HIGH_OCCUPANCY_ADJUSTMENT = 0.15;
export const LOW_OCCUPANCY_ADJUSTMENT = -0.12;

export function suggestPriceAdjustment(occupancyRate: number): {
  adjustmentPercent: number;
  level: OccupancyLevel;
} {
  if (occupancyRate >= OCCUPANCY_HIGH_THRESHOLD) {
    return { adjustmentPercent: HIGH_OCCUPANCY_ADJUSTMENT, level: "alta" };
  }
  if (occupancyRate < OCCUPANCY_LOW_THRESHOLD) {
    return { adjustmentPercent: LOW_OCCUPANCY_ADJUSTMENT, level: "baixa" };
  }
  return { adjustmentPercent: 0, level: "normal" };
}
