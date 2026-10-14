export const MAINTENANCE_PRIORITIES = ["baixa", "media", "alta"] as const;

export type MaintenancePriority = (typeof MAINTENANCE_PRIORITIES)[number];

export const MAINTENANCE_PRIORITY_LABELS: Record<MaintenancePriority, string> =
  {
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
  };

export const MAINTENANCE_PRIORITY_STYLES: Record<MaintenancePriority, string> =
  {
    baixa: "bg-surface-2 text-ink-muted",
    media: "bg-highlight text-highlight-ink",
    alta: "bg-error/10 text-error",
  };

export const MAINTENANCE_STATUSES = [
  "reportado",
  "em_curso",
  "resolvido",
] as const;

export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  reportado: "Reportado",
  em_curso: "Em curso",
  resolvido: "Resolvido",
};

export const MAINTENANCE_STATUS_STYLES: Record<MaintenanceStatus, string> = {
  reportado: "bg-highlight text-highlight-ink",
  em_curso: "bg-action/10 text-action",
  resolvido: "bg-success/10 text-success",
};

export type MaintenanceIssue = {
  id: string;
  room_id: string | null;
  location_label: string | null;
  title: string;
  description: string | null;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assigned_to: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  room?: { name: string } | null;
  assignee?: { name: string; hourly_rate: number | null } | null;
};
