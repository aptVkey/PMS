"use client";

import { useEffect, useState } from "react";
import { cleaningElapsedSeconds, type CleaningStatus } from "@/lib/cleaning";

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export function CleaningTaskTimer({
  status,
  startedAt,
  completedAt,
  hourlyRate,
  finalCost,
}: {
  status: CleaningStatus;
  startedAt: string | null;
  completedAt: string | null;
  hourlyRate: number | null;
  finalCost?: number | null;
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
      ? (finalCost ?? ((elapsedMs / 3_600_000) * hourlyRate)).toFixed(2)
      : null;

  return (
    <div className="text-[12px] text-ink-muted">
      <p className="font-semibold text-ink">{formatDuration(elapsedMs)}</p>
      {cost !== null && <p>{cost} €</p>}
    </div>
  );
}
