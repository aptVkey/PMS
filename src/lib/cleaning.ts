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
  room?: { name: string } | null;
  assignee?: { name: string; hourly_rate: number | null } | null;
  booking?: { guest: { name: string } | null } | null;
};
