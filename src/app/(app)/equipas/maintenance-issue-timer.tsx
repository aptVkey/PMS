"use client";

import { useEffect, useState } from "react";
import { Clock, Coins } from "lucide-react";
import type { MaintenanceStatus } from "@/lib/maintenance";

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

const euro = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

// Tempo gasto e custo (horas x valor/hora do responsável). Em curso conta em
// direto; depois de resolvida mostra o custo gravado nesse momento.
export function MaintenanceIssueTimer({
  status,
  startedAt,
  completedAt,
  hourlyRate,
  totalCost,
  hasAssignee,
}: {
  status: MaintenanceStatus;
  startedAt: string | null;
  completedAt: string | null;
  hourlyRate: number | null;
  totalCost?: number | null;
  hasAssignee: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (status !== "em_curso" || !startedAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [status, startedAt]);

  if (!startedAt) {
    return (
      <p className="flex items-center gap-1.5 text-[12px] text-ink-subdued">
        <Clock className="h-3.5 w-3.5" strokeWidth={2} />
        Ainda não iniciada
      </p>
    );
  }

  const endTime =
    status === "resolvido" && completedAt
      ? new Date(completedAt).getTime()
      : now;
  const elapsedMs = Math.max(0, endTime - new Date(startedAt).getTime());

  const live = hourlyRate != null ? (elapsedMs / 3_600_000) * hourlyRate : null;
  const cost = status === "resolvido" ? (totalCost ?? live) : live;

  // Sem valor/hora (0 ou vazio) o custo é sempre 0: avisa em vez de mostrar
  // "0,00 €" como se estivesse calculado.
  const missingRate = !hourlyRate || hourlyRate <= 0;
  const hint = !hasAssignee
    ? "Atribui um colaborador para calcular o custo."
    : missingRate && !(totalCost && totalCost > 0)
      ? "O colaborador não tem valor/hora definido (Equipa)."
      : null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
        <span className="flex items-center gap-1.5 font-semibold text-ink">
          <Clock className="h-3.5 w-3.5 text-ink-subdued" strokeWidth={2} />
          {formatDuration(elapsedMs)}
        </span>
        {cost !== null && !hint && (
          <span className="flex items-center gap-1.5 font-semibold text-ink">
            <Coins className="h-3.5 w-3.5 text-ink-subdued" strokeWidth={2} />
            {euro.format(cost)}
          </span>
        )}
      </div>
      {hint && (
        <p className="text-[11px] leading-snug text-highlight-ink">
          <span className="rounded bg-highlight/25 px-1.5 py-0.5">{hint}</span>
        </p>
      )}
    </div>
  );
}
