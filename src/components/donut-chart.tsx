"use client";

const SIZE = 160;
const STROKE_WIDTH = 22;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export type DonutItem = { label: string; value: number; colorVar: string };

// Doughnut simples em SVG puro (sem dependência de gráficos) — cada fatia é
// um <circle> com stroke-dasharray/offset, a técnica standard para isto sem
// precisar de <path> com arcos.
export function DonutChart({
  items,
  centerLabel,
  centerValue,
}: {
  items: DonutItem[];
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  if (total <= 0) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full border border-dashed border-border text-[12px] text-ink-subdued"
        style={{ width: SIZE, height: SIZE }}
      >
        Sem dados
      </div>
    );
  }

  // Comprimento e deslocamento de cada fatia pré-calculados num reduce à
  // parte (não dentro do .map do JSX) — mutar uma variável de fora enquanto
  // se gera o JSX quebra a regra de imutabilidade do React Compiler.
  const segments = items.reduce<
    { item: DonutItem; length: number; offset: number }[]
  >((acc, item) => {
    const previous = acc[acc.length - 1];
    const offset = previous ? previous.offset + previous.length : 0;
    const length = (item.value / total) * CIRCUMFERENCE;
    acc.push({ item, length, offset });
    return acc;
  }, []);

  return (
    <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="-rotate-90"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-surface-1)"
          strokeWidth={STROKE_WIDTH}
        />
        {segments.map(({ item, length, offset }) => (
          <circle
            key={item.label}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={item.colorVar}
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
            strokeDashoffset={-offset}
          />
        ))}
      </svg>
      {(centerLabel ?? centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          {centerValue && (
            <span className="text-[15px] font-bold text-ink">
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span className="text-[11px] text-ink-subdued">{centerLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
