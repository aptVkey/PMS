"use client";

import { useMemo, useState } from "react";
import { Plus, Wrench } from "lucide-react";
import type { MaintenanceIssue } from "@/lib/maintenance";
import type { StaffMember, PermissionKey } from "@/lib/staff";
import { MaintenanceIssueRow } from "./maintenance-issue-row";
import { MaintenanceIssueFormModal } from "./maintenance-issue-form-modal";

const STATUS_RANK: Record<string, number> = {
  em_curso: 0,
  reportado: 1,
  resolvido: 2,
};

const PRIORITY_RANK: Record<string, number> = {
  alta: 0,
  media: 1,
  baixa: 2,
};

export function ManutencaoSection({
  issues,
  rooms,
  staff,
  currentUserId,
  permissions,
}: {
  issues: MaintenanceIssue[];
  rooms: { id: string; name: string }[];
  staff: StaffMember[];
  currentUserId: string;
  permissions: PermissionKey[];
}) {
  const isAdmin = permissions.includes("equipas");
  const canManageAnyIssue = isAdmin || permissions.includes("manutencao");
  const [showResolved, setShowResolved] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const visibleIssues = useMemo(() => {
    const filtered = showResolved
      ? issues
      : issues.filter((issue) => issue.status !== "resolvido");
    return [...filtered].sort((a, b) => {
      const statusDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
      if (statusDiff !== 0) return statusDiff;
      const priorityDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.created_at.localeCompare(b.created_at);
    });
  }, [issues, showResolved]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-body text-ink">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="h-4 w-4 rounded border-border text-action focus:ring-action"
          />
          Mostrar resolvidas
        </label>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={rooms.length === 0}
          className="flex min-h-11 items-center gap-2 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Adicionar ocorrência
        </button>
      </div>

      {visibleIssues.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-canvas py-16 text-center">
          <Wrench className="h-8 w-8 text-ink-subdued" strokeWidth={1.5} />
          <p className="text-body font-semibold text-ink">
            {showResolved
              ? "Ainda não há ocorrências"
              : "Sem ocorrências em aberto"}
          </p>
          <p className="max-w-sm text-body text-ink-subdued">
            Reporta um problema num quarto ou numa zona comum para começares a
            acompanhar aqui.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-canvas shadow-card">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-surface-1 text-[12px] font-semibold uppercase tracking-wide text-ink-subdued">
                <th className="px-4 py-3">Local</th>
                <th className="px-4 py-3">Ocorrência</th>
                <th className="px-4 py-3">Prioridade</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Atribuído a</th>
                {isAdmin && <th className="px-4 py-3">Tempo / Custo</th>}
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {visibleIssues.map((issue) => (
                <MaintenanceIssueRow
                  key={issue.id}
                  issue={issue}
                  rooms={rooms}
                  staff={staff}
                  canEditStatus={
                    canManageAnyIssue || issue.assigned_to === currentUserId
                  }
                  canManage={canManageAnyIssue}
                  isAdmin={isAdmin}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <MaintenanceIssueFormModal
          rooms={rooms}
          canDelete={false}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
