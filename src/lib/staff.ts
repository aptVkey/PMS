export const PERMISSION_KEYS = [
  "quartos",
  "equipas",
  "limpeza",
  "manutencao",
  "hospedes",
  "reservas",
  "automacao",
  "relatorios",
  "integracoes",
  "inventario",
  "caixa",
  "marketing",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  quartos: "Alojamentos",
  equipas: "Equipas e tarefas (gerir equipa)",
  limpeza: "Equipas e tarefas (limpeza)",
  manutencao: "Equipas e tarefas (manutenção)",
  hospedes: "Hóspedes / CRM",
  reservas: "Reservas e pagamentos",
  automacao: "Automação",
  relatorios: "Dados e reporting",
  integracoes: "Integrações",
  inventario: "Inventário",
  caixa: "Fluxo de caixa",
  marketing: "Email marketing",
};

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  role_label: string | null;
  permissions: PermissionKey[];
  active: boolean;
  hourly_rate: number | null;
  created_at: string;
};
