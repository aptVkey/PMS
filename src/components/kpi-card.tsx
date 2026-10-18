import { ArrowDown, ArrowUp, Minus, type LucideIcon } from "lucide-react";

export type KpiComparison = {
  // Variação face ao período homólogo; null = sem base de comparação.
  delta: number | null;
  unit: "%" | "pp";
  // Valor do período homólogo, já formatado.
  previous: string;
  hasBase: boolean;
};

function formatDelta(delta: number, unit: "%" | "pp"): string {
  const abs = Math.abs(delta);
  return unit === "pp" ? `${abs.toFixed(1)} p.p.` : `${abs.toFixed(1)}%`;
}

function ComparisonRow({ comparison }: { comparison: KpiComparison }) {
  if (!comparison.hasBase) {
    return (
      <p className="mt-auto border-t border-border pt-3 text-[12px] text-ink-subdued">
        Sem dados do ano anterior
      </p>
    );
  }

  const { delta } = comparison;
  // Variações abaixo de 0,05 aparecem como "0.0" — trata-as como estáveis.
  const stable = delta === null || Math.abs(delta) < 0.05;
  const up = !stable && delta > 0;

  return (
    <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3">
      <p
        className={`flex items-center gap-1 text-[13px] font-semibold ${
          stable ? "text-ink-subdued" : up ? "text-success" : "text-error"
        }`}
      >
        {stable ? (
          <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
        ) : up ? (
          <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
        ) : (
          <ArrowDown className="h-3.5 w-3.5" strokeWidth={2.5} />
        )}
        {delta === null ? "—" : formatDelta(delta, comparison.unit)}
      </p>
      <p className="text-right text-[11px] text-ink-subdued">
        Ano anterior
        <span className="block text-[12px] font-semibold text-ink-muted">
          {comparison.previous}
        </span>
      </p>
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  comparison,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  comparison?: KpiComparison;
}) {
  return (
    <div className="flex h-full min-w-0 flex-col gap-3 rounded-lg border border-border bg-canvas p-5 shadow-card">
      <div className="flex items-center justify-between gap-3 text-[12px] font-medium text-ink-muted">
        <span>{label}</span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-1 text-ink-subdued"><Icon className="h-3.5 w-3.5" strokeWidth={1.6} /></span>
      </div>
      <p className="ui-stat text-[clamp(20px,2.3vw,28px)] font-semibold leading-none text-ink">{value}</p>
      {hint && <p className="text-[11px] leading-relaxed text-ink-subdued">{hint}</p>}
      {comparison && <ComparisonRow comparison={comparison} />}
    </div>
  );
}
