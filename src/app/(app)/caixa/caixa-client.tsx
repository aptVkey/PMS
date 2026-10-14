"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Briefcase,
  Landmark,
  LineChart,
  Percent,
  Plus,
  Scale,
  Search,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  CASH_TRANSACTION_TYPE_LABELS,
  type CashTransaction,
  type CashTransactionType,
} from "@/lib/cash";
import {
  PERIOD_PRESETS,
  PERIOD_PRESET_LABELS,
  formatCurrency,
  formatPeriodLabel,
  getPresetRange,
  type PeriodPreset,
} from "@/lib/reporting";
import { DateRangePicker, type DateRange } from "../reservas/date-range-picker";
import { KpiCard } from "@/components/kpi-card";
import { DonutChart } from "@/components/donut-chart";
import { TransactionRow } from "./transaction-row";
import { TransactionFormModal } from "./transaction-form-modal";

const selectClasses =
  "min-h-11 rounded-md border border-border bg-canvas px-3 text-body text-ink focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";

const DISTRIBUTION_COLORS = [
  "bg-primary",
  "bg-action",
  "bg-success",
  "bg-highlight",
  "bg-error",
  "bg-ink-subdued",
];

const DISTRIBUTION_COLOR_VARS = [
  "var(--color-primary)",
  "var(--color-action)",
  "var(--color-success)",
  "var(--color-highlight)",
  "var(--color-error)",
  "var(--color-ink-subdued)",
];

// Não há um campo dedicado a impostos — heurística sobre a categoria que o
// próprio utilizador já escreve nos movimentos (ver form de movimento).
const TAX_CATEGORY_KEYWORDS = [
  "imposto",
  "iva",
  "irs",
  "irc",
  "segurança social",
  "seguranca social",
];

function categoryTotals(transactions: CashTransaction[]) {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    const key = t.category ?? "Sem categoria";
    totals.set(key, (totals.get(key) ?? 0) + t.amount);
  }
  return Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({
      label,
      value,
      colorClass: DISTRIBUTION_COLORS[i % DISTRIBUTION_COLORS.length],
      colorVar: DISTRIBUTION_COLOR_VARS[i % DISTRIBUTION_COLOR_VARS.length],
    }));
}

function CategoryDonutCard({
  title,
  items,
}: {
  title: string;
  items: ReturnType<typeof categoryTotals>;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-canvas p-4 shadow-card sm:flex-row sm:items-center">
      <DonutChart
        items={items}
        centerValue={formatCurrency(total)}
        centerLabel={title}
      />
      <div className="flex flex-1 flex-col gap-2">
        <p className="text-body font-semibold text-ink">{title}</p>
        {items.length === 0 ? (
          <p className="text-body text-ink-subdued">Sem dados neste período.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {items.map((item) => (
              <li
                key={item.label}
                className="flex items-center justify-between gap-3 text-[12px]"
              >
                <span className="flex items-center gap-2 text-ink-muted">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-sm ${item.colorClass}`}
                  />
                  {item.label}
                </span>
                <span className="whitespace-nowrap font-semibold text-ink">
                  {formatCurrency(item.value)}
                  <span className="ml-1 font-normal text-ink-subdued">
                    ({total > 0 ? Math.round((item.value / total) * 100) : 0}
                    %)
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function CaixaClient({
  transactions,
  receiptUrls,
}: {
  transactions: CashTransaction[];
  receiptUrls: Record<string, string>;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [preset, setPreset] = useState<PeriodPreset>("mes");
  const [customRange, setCustomRange] = useState<DateRange>({
    start: null,
    end: null,
  });
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<CashTransactionType | "">("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const range = useMemo(() => {
    if (preset === "custom" && customRange.start && customRange.end) {
      return { start: customRange.start, end: customRange.end };
    }
    return getPresetRange(preset === "custom" ? "mes" : preset);
  }, [preset, customRange]);

  const periodTransactions = useMemo(
    () =>
      transactions.filter(
        (t) =>
          t.transaction_date >= range.start && t.transaction_date <= range.end,
      ),
    [transactions, range],
  );

  const totalEntradas = useMemo(
    () =>
      periodTransactions
        .filter((t) => t.type === "entrada")
        .reduce((sum, t) => sum + t.amount, 0),
    [periodTransactions],
  );
  const totalSaidas = useMemo(
    () =>
      periodTransactions
        .filter((t) => t.type === "saida")
        .reduce((sum, t) => sum + t.amount, 0),
    [periodTransactions],
  );
  const saldo = totalEntradas - totalSaidas;
  const profitMargin = totalEntradas > 0 ? (saldo / totalEntradas) * 100 : null;

  const taxesPaid = useMemo(
    () =>
      periodTransactions
        .filter(
          (t) =>
            t.type === "saida" &&
            t.category &&
            TAX_CATEGORY_KEYWORDS.some((kw) =>
              t.category!.toLowerCase().includes(kw),
            ),
        )
        .reduce((sum, t) => sum + t.amount, 0),
    [periodTransactions],
  );

  const cogsTotal = useMemo(
    () =>
      periodTransactions
        .filter((t) => t.type === "saida" && t.cost_type === "cogs")
        .reduce((sum, t) => sum + t.amount, 0),
    [periodTransactions],
  );
  // Tudo o que não foi marcado como custo direto conta como operacional —
  // inclui os movimentos antigos, de antes deste campo existir, que ficam
  // sem cost_type (null): assumem-se operacionais por omissão.
  const opexTotal = totalSaidas - cogsTotal;
  const grossProfit = totalEntradas - cogsTotal;
  const grossMargin =
    totalEntradas > 0 ? (grossProfit / totalEntradas) * 100 : null;
  const opexRatio =
    totalEntradas > 0 ? (opexTotal / totalEntradas) * 100 : null;
  // EBITDA simplificado: lucro líquido com os impostos somados de volta. O
  // sistema não regista juros de empréstimos nem depreciação de ativos, por
  // isso não entram na conta (ver hint do cartão).
  const ebitda = saldo + taxesPaid;

  const entradasBreakdown = useMemo(
    () =>
      categoryTotals(periodTransactions.filter((t) => t.type === "entrada")),
    [periodTransactions],
  );
  const saidasBreakdown = useMemo(
    () => categoryTotals(periodTransactions.filter((t) => t.type === "saida")),
    [periodTransactions],
  );

  const categories = useMemo(() => {
    const values = new Set(
      transactions.map((t) => t.category).filter((c): c is string => !!c),
    );
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return periodTransactions.filter((t) => {
      const matchesQuery =
        normalizedQuery === "" ||
        t.description?.toLowerCase().includes(normalizedQuery) ||
        t.category?.toLowerCase().includes(normalizedQuery);

      const matchesType = typeFilter === "" || t.type === typeFilter;
      const matchesCategory =
        categoryFilter === "" || t.category === categoryFilter;

      return matchesQuery && matchesType && matchesCategory;
    });
  }, [periodTransactions, query, typeFilter, categoryFilter]);

  const hasFilters = query !== "" || typeFilter !== "" || categoryFilter !== "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-ink">Fluxo de caixa</h1>
          <p className="mt-1 text-body text-ink-muted">
            Controla as entradas e saídas de dinheiro do teu negócio.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex min-h-11 items-center gap-2 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Adicionar movimento
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap rounded-md border border-border p-0.5">
          {PERIOD_PRESETS.filter((p) => p !== "custom").map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPreset(p)}
              className={`rounded px-3 py-1.5 text-body font-semibold transition-colors duration-fast ease-standard ${
                preset === p
                  ? "bg-surface-2 text-primary"
                  : "text-ink-muted hover:bg-surface-1"
              }`}
            >
              {PERIOD_PRESET_LABELS[p]}
            </button>
          ))}
        </div>

        <DateRangePicker
          value={customRange}
          onChange={(value) => {
            setCustomRange(value);
            if (value.start && value.end) setPreset("custom");
          }}
          align="right"
          placeholder="Período personalizado"
        />
      </div>

      <p className="text-[12px] text-ink-subdued">
        A mostrar dados de {formatPeriodLabel(range.start, range.end)}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Saldo do período"
          value={formatCurrency(saldo)}
          icon={Wallet}
        />
        <KpiCard
          label="Entradas"
          value={formatCurrency(totalEntradas)}
          icon={ArrowUpCircle}
        />
        <KpiCard
          label="Saídas"
          value={formatCurrency(totalSaidas)}
          icon={ArrowDownCircle}
        />
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-[18px] font-bold text-ink">
            Indicadores financeiros
          </h2>
          <p className="text-body text-ink-muted">
            Margens, EBITDA e impostos no período selecionado.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="Margem bruta"
            value={grossMargin === null ? "—" : `${grossMargin.toFixed(1)}%`}
            icon={Scale}
            hint={`Lucro bruto (${formatCurrency(grossProfit)}) / Entradas`}
          />
          <KpiCard
            label="Margem líquida"
            value={profitMargin === null ? "—" : `${profitMargin.toFixed(1)}%`}
            icon={Percent}
            hint={`Saldo (${formatCurrency(saldo)}) / Entradas`}
          />
          <KpiCard
            label="EBITDA"
            value={formatCurrency(ebitda)}
            icon={TrendingUp}
            hint="Lucro líquido + impostos (sem juros nem depreciação, não registados)"
          />
          <KpiCard
            label="Custos diretos (COGS)"
            value={formatCurrency(cogsTotal)}
            icon={LineChart}
            hint={`${totalSaidas > 0 ? Math.round((cogsTotal / totalSaidas) * 100) : 0}% das saídas`}
          />
          <KpiCard
            label="Despesas operacionais"
            value={formatCurrency(opexTotal)}
            icon={Briefcase}
            hint={
              opexRatio === null
                ? "Sem entradas no período"
                : `${opexRatio.toFixed(1)}% das entradas`
            }
          />
          <KpiCard
            label="Impostos pagos"
            value={formatCurrency(taxesPaid)}
            icon={Landmark}
            hint={
              taxesPaid > 0
                ? `${totalSaidas > 0 ? Math.round((taxesPaid / totalSaidas) * 100) : 0}% das saídas`
                : 'Regista saídas com categoria "Imposto", "IVA", "IRS", "IRC" ou "Segurança Social" para aparecer aqui'
            }
          />
        </div>
        <p className="text-[12px] text-ink-subdued">
          Margem bruta separa custos diretos de uma estadia (COGS) das despesas
          operacionais — define o tipo de custo ao registares cada saída.
          Movimentos antigos, sem essa classificação, contam como operacionais.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CategoryDonutCard
          title="Entradas por categoria"
          items={entradasBreakdown}
        />
        <CategoryDonutCard
          title="Saídas por categoria"
          items={saidasBreakdown}
        />
      </div>

      {transactions.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subdued"
              strokeWidth={2}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar por categoria ou descrição..."
              className={`${selectClasses} w-full pl-9`}
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as CashTransactionType | "")
            }
            className={selectClasses}
          >
            <option value="">Entradas e saídas</option>
            {Object.entries(CASH_TRANSACTION_TYPE_LABELS).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={selectClasses}
          >
            <option value="">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      )}

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-canvas py-16 text-center">
          <Wallet className="h-8 w-8 text-ink-subdued" strokeWidth={1.5} />
          <p className="text-body font-semibold text-ink">
            Ainda não tens movimentos
          </p>
          <p className="max-w-sm text-body text-ink-subdued">
            Regista a primeira entrada ou saída para começares a acompanhar o
            teu fluxo de caixa.
          </p>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-canvas py-16 text-center">
          <Search className="h-8 w-8 text-ink-subdued" strokeWidth={1.5} />
          <p className="text-body font-semibold text-ink">
            Nenhum movimento encontrado
          </p>
          <p className="max-w-sm text-body text-ink-subdued">
            {hasFilters
              ? "Tenta ajustar a pesquisa, o período ou os filtros."
              : "Sem movimentos neste período."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-canvas shadow-card">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-surface-1 text-[12px] font-semibold uppercase tracking-wide text-ink-subdued">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  receiptUrl={
                    transaction.receipt_path
                      ? (receiptUrls[transaction.receipt_path] ?? null)
                      : null
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <TransactionFormModal onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}
