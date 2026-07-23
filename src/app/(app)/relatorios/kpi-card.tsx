import type { LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-canvas p-4 shadow-card">
      <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-ink-subdued">
        <Icon className="h-4 w-4" strokeWidth={2} />
        {label}
      </div>
      <p className="text-[24px] font-bold text-ink">{value}</p>
      {hint && <p className="text-[12px] text-ink-subdued">{hint}</p>}
    </div>
  );
}
