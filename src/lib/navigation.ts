import {
  LayoutDashboard,
  BedDouble,
  ClipboardList,
  ScrollText,
  Users,
  CalendarCheck,
  Workflow,
  BarChart3,
  Plug,
  Tag,
  type LucideIcon,
} from "lucide-react";

import type { PermissionKey } from "@/lib/staff";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permissionKeys?: PermissionKey[];
};

export type NavSection = {
  title: string | null;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    title: null,
    items: [{ label: "Início", href: "/", icon: LayoutDashboard }],
  },
  {
    title: "Hotel",
    items: [
      {
        label: "Alojamentos",
        href: "/alojamentos",
        icon: BedDouble,
        permissionKeys: ["quartos"],
      },
      {
        label: "Preços e tarifas",
        href: "/precos",
        icon: Tag,
        permissionKeys: ["quartos"],
      },
      {
        label: "Equipas e tarefas",
        href: "/equipas",
        icon: ClipboardList,
        permissionKeys: ["equipas", "limpeza", "manutencao"],
      },
      {
        label: "Regras locais",
        href: "/regras",
        icon: ScrollText,
        permissionKeys: ["regras"],
      },
    ],
  },
  {
    title: "Serviços comuns",
    items: [
      {
        label: "Hóspedes / CRM",
        href: "/hospedes",
        icon: Users,
        permissionKeys: ["hospedes"],
      },
      {
        label: "Reservas e pagamentos",
        href: "/reservas",
        icon: CalendarCheck,
        permissionKeys: ["reservas"],
      },
      {
        label: "Automação",
        href: "/automacao",
        icon: Workflow,
        permissionKeys: ["automacao"],
      },
      {
        label: "Dados e reporting",
        href: "/relatorios",
        icon: BarChart3,
        permissionKeys: ["relatorios"],
      },
      {
        label: "Integrações",
        href: "/integracoes",
        icon: Plug,
        permissionKeys: ["integracoes"],
      },
    ],
  },
];

export function filterNavSectionsByPermissions(
  permissions: PermissionKey[],
): NavSection[] {
  return navSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          !item.permissionKeys ||
          item.permissionKeys.some((key) => permissions.includes(key)),
      ),
    }))
    .filter((section) => section.items.length > 0);
}
