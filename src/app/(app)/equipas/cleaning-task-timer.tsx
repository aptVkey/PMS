"use client";

import { useEffect, useState } from "react";
import { Clock, Coins } from "lucide-react";
import { cleaningElapsedSeconds, type CleaningStatus } from "@/lib/cleaning";

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

export function CleaningTaskTimer({
  status,
  startedAt,
  completedAt,
  hourlyRate,
  finalCost,
  showCost = true,
}: {
  status: CleaningStatus;
  startedAt: string | null;
  completedAt: string | null;
  hourlyRate: number | null;
  finalCost?: number | null;
  // O custo só se mostra ao Administrador.
  showCost?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (status !== "em_curso" || !startedAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [status, startedAt]);

  if (!startedAt) {
    return <span className="text-[12px] text-ink-subdued">—</span>;
  }

  const endTime =
    status === "concluida" && completedAt
      ? new Date(completedAt).getTime()
      : now;
  const elapsedMs = cleaningElapsedSeconds(startedAt, endTime) * 1000;
  const cost =
    hourlyRate != null
      ? (finalCost ?? (elapsedMs / 3_600_000) * hourlyRate)
      : null;

  // Valor/hora a 0 dá sempre custo 0: avisa em vez de parecer calculado.
  const missingRate = hourlyRate != null && hourlyRate <= 0 && !finalCost;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-semibold text-ink">
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-ink-subdued" strokeWidth={2} />
          {formatDuration(elapsedMs)}
        </span>
        {showCost && cost !== null && !missingRate && (
          <span className="flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5 text-ink-subdued" strokeWidth={2} />
            {euro.format(cost)}
          </span>
        )}
      </div>
      {showCost && missingRate && (
        <p className="text-[11px] leading-snug text-highlight-ink">
          <span className="rounded bg-highlight/25 px-1.5 py-0.5">
            O colaborador não tem valor/hora definido (Equipa).
          </span>
        </p>
      )}
    </div>
  );
}
