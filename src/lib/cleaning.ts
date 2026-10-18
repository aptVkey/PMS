export const CLEANING_STATUSES = ["pendente", "em_curso", "concluida"] as const;

export type CleaningStatus = (typeof CLEANING_STATUSES)[number];

export const CLEANING_STATUS_LABELS: Record<CleaningStatus, string> = {
  pendente: "Por limpar",
  em_curso: "Em limpeza",
  concluida: "Limpo",
};

export const CLEANING_STATUS_STYLES: Record<CleaningStatus, string> = {
  pendente: "bg-highlight text-highlight-ink",
  em_curso: "bg-action/10 text-action",
  concluida: "bg-success/10 text-success",
};

export const CLEANING_SOURCES = ["checkout", "manual"] as const;

export type CleaningSource = (typeof CLEANING_SOURCES)[number];

export const CLEANING_SOURCE_LABELS: Record<CleaningSource, string> = {
  checkout: "Checkout",
  manual: "Manual",
};

export type CleaningTask = {
  id: string;
  room_id: string;
  booking_id: string | null;
  task_date: string;
  source: CleaningSource;
  status: CleaningStatus;
  assigned_to: string | null;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  result?: CleaningTaskResult | null;
  room?: { name: string } | null;
  assignee?: { name: string; hourly_rate: number | null } | null;
  booking?: { guest: { name: string } | null } | null;
};

// ---------- Checklist por zona ----------

export type CleaningTaskItem = {
  id: string;
  task_id: string;
  zone: string;
  label: string;
  position: number;
  checked: boolean;
  checked_by: string | null;
  checked_at: string | null;
};

export type CleaningProgress = { done: number; total: number };

// Agrupa os itens por zona mantendo a ordem do modelo (position).
export function groupItemsByZone(items: CleaningTaskItem[]): {
  zone: string;
  items: CleaningTaskItem[];
  done: number;
}[] {
  const zones = new Map<string, CleaningTaskItem[]>();
  for (const item of [...items].sort((a, b) => a.position - b.position)) {
    zones.set(item.zone, [...(zones.get(item.zone) ?? []), item]);
  }
  return Array.from(zones.entries()).map(([zone, zoneItems]) => ({
    zone,
    items: zoneItems,
    done: zoneItems.filter((i) => i.checked).length,
  }));
}

export type CleaningTaskResult = {
  task_id: string;
  staff_id: string;
  staff_name: string;
  hourly_rate: number;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  total_cost: number | null;
  started_by: string;
  completed_by: string | null;
};

export type CleaningTaskState = Pick<CleaningTask,
  "id" | "status" | "assigned_to" | "started_at" | "completed_at"
>;

export type CleaningActionResult =
  | { error: string }
  | { success: true; task: CleaningTaskState; item?: CleaningTaskItem };

export function cleaningElapsedSeconds(startedAt: string, endedAt: string | number): number {
  return Math.max(0, Math.floor((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000));
}
