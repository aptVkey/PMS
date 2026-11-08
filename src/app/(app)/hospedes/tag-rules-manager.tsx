"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Wand2 } from "lucide-react";
import {
  RULE_METRICS,
  RULE_METRIC_IS_MONEY,
  RULE_METRIC_LABELS,
  RULE_OPERATORS,
  RULE_OPERATOR_LABELS,
  TAG_COLORS,
  TAG_COLOR_LABELS,
  describeRule,
  type CrmTag,
  type CrmTagRule,
  type RuleMetric,
  type RuleOperator,
  type RuleThresholdMode,
  type TagColor,
} from "@/lib/crm";
import { deleteTagRule, saveTagRule } from "./crm-actions";
import {
  TagChip,
  formatMoney,
  inputClasses,
  labelClasses,
  primaryButton,
  secondaryButton,
} from "./crm-ui";

export function TagRulesManager({
  rules,
  averages,
  matchCounts,
}: {
  rules: CrmTagRule[];
  averages: Record<RuleMetric, number | null>;
  // Quantos hóspedes cada regra apanha neste momento.
  matchCounts: Map<string, number>;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<TagColor>("green");
  const [metric, setMetric] = useState<RuleMetric>("avg_booking");
  const [operator, setOperator] = useState<RuleOperator>("gt");
  const [mode, setMode] = useState<RuleThresholdMode>("average");
  const [value, setValue] = useState("100");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const money = RULE_METRIC_IS_MONEY[metric];
  const average = averages[metric];

  function run(
    tasks: Parameters<typeof saveTagRule>[0][],
    onDone?: () => void,
  ) {
    setError(null);
    startTransition(async () => {
      for (const task of tasks) {
        const result = await saveTagRule(task);
        if ("error" in result) {
          setError(result.error);
          return;
        }
      }
      onDone?.();
    });
  }

  function create() {
    const number = Number(value.replace(",", "."));
    if (!Number.isFinite(number)) {
      setError("Indica um valor numérico.");
      return;
    }
    run(
      [
        {
          name,
          color,
          metric,
          operator,
          thresholdMode: mode,
          value: number,
        },
      ],
      () => setName(""),
    );
  }

  // Atalho para o caso mais comum: separar acima / abaixo da média.
  function createAboveBelow() {
    run([
      {
        name: "Valor acima da média",
        color: "green",
        metric: "avg_booking",
        operator: "gt",
        thresholdMode: "average",
        value: 100,
      },
      {
        name: "Valor abaixo da média",
        color: "red",
        metric: "avg_booking",
        operator: "lte",
        thresholdMode: "average",
        value: 100,
      },
    ]);
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-canvas p-5 shadow-card">
      <div>
        <h2 className="text-[16px] font-bold text-ink">
          Classificação automática
        </h2>
        <p className="text-[12px] text-ink-subdued">
          Etiquetas que se atribuem sozinhas conforme o histórico do hóspede e
          se atualizam com cada reserva.
        </p>
      </div>

      {rules.length === 0 ? (
        <button
          type="button"
          onClick={createAboveBelow}
          disabled={isPending}
          className={secondaryButton}
        >
          <Wand2 className="h-4 w-4" strokeWidth={2} />
          Criar verde / vermelho pelo valor médio
        </button>
      ) : (
        <ul className="flex flex-col gap-3">
          {rules.map((rule) => (
            <li key={rule.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <TagChip
                  tag={{
                    id: rule.id,
                    name: rule.name,
                    color: rule.color,
                    auto: true,
                  }}
                />
                <span className="flex items-center gap-2">
                  <span className="text-[12px] text-ink-subdued">
                    {matchCounts.get(rule.id) ?? 0} hóspede(s)
                  </span>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await deleteTagRule(rule.id);
                        if ("error" in result) setError(result.error);
                      })
                    }
                    aria-label={`Remover regra ${rule.name}`}
                    className="rounded p-1 text-ink-subdued hover:bg-error/10 hover:text-error"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                  </button>
                </span>
              </div>
              <p className="text-[12px] text-ink-muted">
                {describeRule(rule, averages)}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <p className="text-[13px] font-semibold text-ink">Nova regra</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da etiqueta (ex.: Alto valor)"
          aria-label="Nome da etiqueta"
          maxLength={40}
          className={`${inputClasses} min-h-10`}
        />

        <label htmlFor="rule-metric" className={labelClasses}>
          Quando o hóspede tem
        </label>
        <select
          id="rule-metric"
          value={metric}
          onChange={(e) => setMetric(e.target.value as RuleMetric)}
          className={`${inputClasses} min-h-10`}
        >
          {RULE_METRICS.map((m) => (
            <option key={m} value={m}>
              {RULE_METRIC_LABELS[m]}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <select
            value={operator}
            onChange={(e) => setOperator(e.target.value as RuleOperator)}
            aria-label="Comparação"
            className={`${inputClasses} min-h-10 flex-1`}
          >
            {RULE_OPERATORS.map((o) => (
              <option key={o} value={o}>
                {RULE_OPERATOR_LABELS[o]}
              </option>
            ))}
          </select>
          <select
            value={mode}
            onChange={(e) => {
              const next = e.target.value as RuleThresholdMode;
              setMode(next);
              setValue(next === "average" ? "100" : "");
            }}
            aria-label="Comparar com"
            className={`${inputClasses} min-h-10 flex-1`}
          >
            <option value="average">a média de todos</option>
            <option value="fixed">um valor fixo</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label={
              mode === "average" ? "Percentagem da média" : "Valor limite"
            }
            className={`${inputClasses} min-h-10`}
          />
          <span className="shrink-0 text-body text-ink-muted">
            {mode === "average" ? "% da média" : money ? "€" : ""}
          </span>
        </div>
        {average !== null && (
          <p className="text-[12px] text-ink-subdued">
            Média atual de «{RULE_METRIC_LABELS[metric]}»:{" "}
            <strong className="text-ink-muted">
              {money ? formatMoney(average) : Math.round(average * 10) / 10}
            </strong>
          </p>
        )}

        <div className="flex gap-2">
          <select
            value={color}
            onChange={(e) => setColor(e.target.value as TagColor)}
            aria-label="Cor"
            className={`${inputClasses} min-h-10 flex-1`}
          >
            {TAG_COLORS.map((c) => (
              <option key={c} value={c}>
                {TAG_COLOR_LABELS[c]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={create}
            disabled={isPending || !name.trim() || value === ""}
            className={`${primaryButton} min-h-10`}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Criar
          </button>
        </div>
        {error && <p className="text-body text-error">{error}</p>}
      </div>
    </section>
  );
}

// Só para tipagem de quem importa o conjunto de etiquetas.
export type { CrmTag };
