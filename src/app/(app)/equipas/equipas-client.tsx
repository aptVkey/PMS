"use client";

import { useMemo, useState } from "react";
import { Plus, Sparkles, Users, Wrench } from "lucide-react";
import type { StaffMember, PermissionKey } from "@/lib/staff";
import type { CleaningProgress, CleaningTask } from "@/lib/cleaning";
import type { MaintenanceIssue } from "@/lib/maintenance";
import { StaffRow } from "./staff-row";
import { StaffFormModal } from "./staff-form-modal";
import { LimpezaSection } from "./limpeza-section";
import { ManutencaoSection } from "./manutencao-section";

type Tab = "equipa" | "limpeza" | "manutencao";

const TABS: {
  key: Tab;
  label: string;
  icon: typeof Users;
  permission: PermissionKey;
}[] = [
  { key: "equipa", label: "Equipa", icon: Users, permission: "equipas" },
  { key: "limpeza", label: "Limpeza", icon: Sparkles, permission: "limpeza" },
  {
    key: "manutencao",
    label: "Manutenção",
    icon: Wrench,
    permission: "manutencao",
  },
];

export function EquipasClient({
  staff,
  rooms,
  cleaningTasks,
  cleaningProgress,
  maintenanceIssues,
  currentUserId,
  permissions,
}: {
  staff: StaffMember[];
  rooms: { id: string; name: string }[];
  cleaningTasks: CleaningTask[];
  cleaningProgress: Record<string, CleaningProgress>;
  maintenanceIssues: MaintenanceIssue[];
  currentUserId: string;
  permissions: PermissionKey[];
}) {
  const canManageTeam = permissions.includes("equipas");
  // Administradores (permissão "equipas") veem sempre todos os sub-separadores.
  const availableTabs = useMemo(
    () =>
      TABS.filter(
        (t) =>
          canManageTeam ||
          permissions.includes(t.permission) ||
          (t.key === "limpeza" && permissions.includes("gerir_limpeza")),
      ),
    [permissions, canManageTeam],
  );
  const [tab, setTab] = useState<Tab>(availableTabs[0]?.key ?? "equipa");
  const [modalOpen, setModalOpen] = useState(false);

  const canSeeLimpeza =
    canManageTeam ||
    permissions.includes("limpeza") ||
    permissions.includes("gerir_limpeza");
  const canSeeManutencao = canManageTeam || permissions.includes("manutencao");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="ui-eyebrow">Operação</p>
          <h1 className="text-[24px] font-bold text-ink">Equipas e tarefas</h1>
          <p className="mt-1 text-body text-ink-muted">
            Gere a equipa, permissões, limpeza e manutenção.
          </p>
        </div>
        {tab === "equipa" && canManageTeam && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex min-h-11 items-center gap-2 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Adicionar membro
          </button>
        )}
      </div>

      <div className="ui-segmented flex rounded-md border border-border p-0.5 sm:w-fit">
        {availableTabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1.5 text-[12px] font-semibold transition-colors duration-fast ease-standard sm:flex-none sm:px-3 sm:text-body ${
              tab === key
                ? "bg-surface-2 text-primary"
                : "text-ink-muted hover:bg-surface-1"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
            {label}
            {key === "equipa" && (
              <span className="ml-1 hidden rounded bg-primary/5 px-1.5 py-0.5 text-[10px] tabular-nums sm:inline">
                {staff.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "equipa" &&
        canManageTeam &&
        (staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-canvas py-16 text-center">
            <Users className="h-8 w-8 text-ink-subdued" strokeWidth={1.5} />
            <p className="text-body font-semibold text-ink">
              Ainda não tens membros na equipa
            </p>
            <p className="max-w-sm text-body text-ink-subdued">
              Adiciona o primeiro membro para começares a gerir acessos.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-canvas shadow-card">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-5">
              <div>
                <h2 className="text-body font-semibold text-ink">
                  Membros da equipa
                </h2>
                <p className="mt-1 text-[12px] text-ink-subdued">
                  Pessoas, responsabilidades e acessos.
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pill border border-border px-2.5 py-1 text-[11px] text-ink-muted">
                <span className="h-1.5 w-1.5 rounded-pill bg-success" />
                {staff.filter((member) => member.active).length}{" "}
                {staff.filter((member) => member.active).length === 1
                  ? "ativo"
                  : "ativos"}
              </span>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-surface-1 text-[12px] font-semibold uppercase tracking-wide text-ink-subdued">
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Cargo</th>
                  <th className="px-4 py-3">Permissões</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <StaffRow
                    key={member.id}
                    member={member}
                    isCurrentUser={member.id === currentUserId}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {tab === "limpeza" && canSeeLimpeza && (
        <LimpezaSection
          tasks={cleaningTasks}
          progress={cleaningProgress}
          rooms={rooms}
          staff={staff}
          currentUserId={currentUserId}
          permissions={permissions}
        />
      )}

      {tab === "manutencao" && canSeeManutencao && (
        <ManutencaoSection
          issues={maintenanceIssues}
          rooms={rooms}
          staff={staff}
          currentUserId={currentUserId}
          permissions={permissions}
        />
      )}

      {modalOpen && <StaffFormModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
