export function BreakdownList({
  title,
  items,
  formatValue,
}: {
  title: string;
  items: { label: string; value: number; colorClass: string }[];
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-canvas p-4 shadow-card">
      <p className="text-body font-semibold text-ink">{title}</p>
      {items.length === 0 ? (
        <p className="text-body text-ink-subdued">Sem dados neste período.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((item) => (
            <div key={item.label} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[12px] text-ink-muted">
                <span>{item.label}</span>
                <span className="font-semibold text-ink">
                  {formatValue ? formatValue(item.value) : item.value}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-pill bg-surface-1">
                <div
                  className={`h-full rounded-pill ${item.colorClass}`}
                  style={{ width: `${(item.value / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
