export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatISO(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

export function todayISO(): string {
  const now = new Date();
  return formatISO(now.getFullYear(), now.getMonth(), now.getDate());
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return formatISO(date.getFullYear(), date.getMonth(), date.getDate());
}

export function diffDaysISO(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const dateA = new Date(ay, am - 1, ad);
  const dateB = new Date(by, bm - 1, bd);
  return Math.round((dateB.getTime() - dateA.getTime()) / (1000 * 60 * 60 * 24));
}

export const MONTH_ABBREV = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTH_ABBREV[m - 1]} ${y}`;
}

export const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

export const WEEKDAY_NAMES_FULL = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export function formatFullDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const weekday = new Date(y, m - 1, d).getDay();
  return `${WEEKDAY_NAMES_FULL[weekday]}, ${d} ${MONTH_ABBREV[m - 1]} ${y}`;
}
