import { formatISO, MONTH_ABBREV } from "@/lib/date-utils";

export {
  pad2,
  formatISO,
  todayISO,
  addDaysISO,
  diffDaysISO,
  formatDateLabel,
  MONTH_ABBREV,
  WEEKDAY_LABELS,
} from "@/lib/date-utils";

export type MonthDay = {
  date: string;
  day: number;
  weekday: number;
  isWeekend: boolean;
};

export function getDaysWindow(startISO: string, count: number): MonthDay[] {
  const [y, m, d] = startISO.split("-").map(Number);
  const days: MonthDay[] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(y, m - 1, d + i);
    const weekday = date.getDay();
    days.push({
      date: formatISO(date.getFullYear(), date.getMonth(), date.getDate()),
      day: date.getDate(),
      weekday,
      isWeekend: weekday === 0 || weekday === 6,
    });
  }
  return days;
}

export function getMonthGrid(year: number, month: number): (MonthDay | null)[] {
  const startWeekday = new Date(year, month, 1).getDay();
  const numDays = new Date(year, month + 1, 0).getDate();
  const cells: (MonthDay | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= numDays; d++) {
    const weekday = new Date(year, month, d).getDay();
    cells.push({
      date: formatISO(year, month, d),
      day: d,
      weekday,
      isWeekend: weekday === 0 || weekday === 6,
    });
  }
  return cells;
}

export const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function formatRangeLabel(startISO: string, endISO: string): string {
  const [sy, sm, sd] = startISO.split("-").map(Number);
  const [ey, em, ed] = endISO.split("-").map(Number);
  const startLabel = `${sd} ${MONTH_ABBREV[sm - 1]}`;
  const endLabel = `${ed} ${MONTH_ABBREV[em - 1]}`;
  return sy === ey
    ? `${startLabel} → ${endLabel} ${ey}`
    : `${startLabel} ${sy} → ${endLabel} ${ey}`;
}
