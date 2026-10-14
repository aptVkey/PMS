"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  Euro,
  Package,
  Plus,
  Search,
} from "lucide-react";
import { isLowStock, type InventoryItem } from "@/lib/inventory";
import { formatCurrency } from "@/lib/reporting";
import { KpiCard } from "@/components/kpi-card";
import { BreakdownList } from "@/components/breakdown-list";
import { ItemRow } from "./item-row";
import { ItemFormModal } from "./item-form-modal";

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

const TOP_PRODUCTS_LIMIT = 8;

function itemValue(item: InventoryItem): number {
  return item.quantity * (item.unit_cost ?? 0);
}

export function InventarioClient({ items }: { items: InventoryItem[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  const categories = useMemo(() => {
    const values = new Set(
      items.map((i) => i.category).filter((c): c is string => !!c),
    );
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const lowStockCount = useMemo(() => items.filter(isLowStock).length, [items]);

  const totalValue = useMemo(
    () => items.reduce((sum, item) => sum + itemValue(item), 0),
    [items],
  );

  const itemsWithoutCost = useMemo(
    () => items.filter((item) => item.unit_cost === null).length,
    [items],
  );

  const categoryBreakdown = useMemo(() => {
    const totals = new Map<string, number>();
    for (const item of items) {
      const key = item.category ?? "Sem categoria";
      totals.set(key, (totals.get(key) ?? 0) + itemValue(item));
    }
    return Array.from(totals.entries())
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({
        label,
        value,
        colorClass: DISTRIBUTION_COLORS[i % DISTRIBUTION_COLORS.length],
      }));
  }, [items]);

  const productBreakdown = useMemo(() => {
    const sorted = [...items]
      .map((item) => ({ label: item.name, value: itemValue(item) }))
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value);
    const top = sorted.slice(0, TOP_PRODUCTS_LIMIT);
    const rest = sorted.slice(TOP_PRODUCTS_LIMIT);
    const restTotal = rest.reduce((sum, entry) => sum + entry.value, 0);
    const entries =
      restTotal > 0 ? [...top, { label: "Outros", value: restTotal }] : top;
    return entries.map((entry, i) => ({
      ...entry,
      colorClass: DISTRIBUTION_COLORS[i % DISTRIBUTION_COLORS.length],
    }));
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery =
        normalizedQuery === "" ||
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.sku?.toLowerCase().includes(normalizedQuery) ||
        item.supplier?.toLowerCase().includes(normalizedQuery);

      const matchesCategory =
        categoryFilter === "" || item.category === categoryFilter;

      const matchesLowStock = !onlyLowStock || isLowStock(item);

      return matchesQuery && matchesCategory && matchesLowStock;
    });
  }, [items, query, categoryFilter, onlyLowStock]);

  const hasFilters = query !== "" || categoryFilter !== "" || onlyLowStock;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-ink">Inventário</h1>
          <p className="mt-1 text-body text-ink-muted">
            Gere o stock de produtos do teu negócio.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex min-h-11 items-center gap-2 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Adicionar produto
        </button>
      </div>

      {items.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard
              label="Valor em stock"
              value={formatCurrency(totalValue)}
              icon={Euro}
              hint={
                itemsWithoutCost > 0
                  ? `${itemsWithoutCost} ${itemsWithoutCost === 1 ? "produto" : "produtos"} sem custo definido`
                  : undefined
              }
            />
            <KpiCard
              label="Produtos"
              value={String(items.length)}
              icon={Boxes}
            />
            <KpiCard
              label="Stock baixo"
              value={String(lowStockCount)}
              icon={AlertTriangle}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BreakdownList
              title="Valor por categoria"
              items={categoryBreakdown}
              formatValue={formatCurrency}
            />
            <BreakdownList
              title="Valor por produto"
              items={productBreakdown}
              formatValue={formatCurrency}
            />
          </div>
        </>
      )}

      {lowStockCount > 0 && (
        <button
          type="button"
          onClick={() => setOnlyLowStock((prev) => !prev)}
          className={`flex items-center gap-2 self-start rounded-md border px-3 py-2 text-body font-semibold transition-colors duration-fast ease-standard ${
            onlyLowStock
              ? "border-error bg-error/10 text-error"
              : "border-border bg-canvas text-error hover:bg-error/10"
          }`}
        >
          <AlertTriangle className="h-4 w-4" strokeWidth={2} />
          {lowStockCount}{" "}
          {lowStockCount === 1
            ? "produto com stock baixo"
            : "produtos com stock baixo"}
        </button>
      )}

      {items.length > 0 && (
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
              placeholder="Pesquisar por nome, SKU ou fornecedor..."
              className={`${selectClasses} w-full pl-9`}
            />
          </div>
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

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-canvas py-16 text-center">
          <Package className="h-8 w-8 text-ink-subdued" strokeWidth={1.5} />
          <p className="text-body font-semibold text-ink">
            Ainda não tens produtos
          </p>
          <p className="max-w-sm text-body text-ink-subdued">
            Adiciona o primeiro produto para começares a gerir o teu inventário.
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-canvas py-16 text-center">
          <Search className="h-8 w-8 text-ink-subdued" strokeWidth={1.5} />
          <p className="text-body font-semibold text-ink">
            Nenhum produto encontrado
          </p>
          <p className="max-w-sm text-body text-ink-subdued">
            {hasFilters
              ? "Tenta ajustar a pesquisa ou os filtros."
              : "Adiciona produtos para os veres aqui."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-canvas shadow-card">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-surface-1 text-[12px] font-semibold uppercase tracking-wide text-ink-subdued">
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3 text-right">Quantidade</th>
                <th className="px-4 py-3">Custo unitário</th>
                <th className="px-4 py-3">Fornecedor</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <ItemRow key={item.id} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && <ItemFormModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
