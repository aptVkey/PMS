"use client";

import { useMemo, useState } from "react";
import {
  BedDouble,
  Calendar,
  CalendarRange,
  Euro,
  Globe2,
  LineChart,
  Moon,
  Receipt,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_STYLES,
  type BookingStatus,
} from "@/lib/bookings";
import {
  MAINTENANCE_PRIORITY_LABELS,
  MAINTENANCE_PRIORITY_STYLES,
} from "@/lib/maintenance";
import {
  PERIOD_PRESETS,
  PERIOD_PRESET_LABELS,
  elapsedHours,
  formatCurrency,
  formatHours,
  formatPeriodLabel,
  getPresetRange,
  nightsOverlap,
  proratedRevenue,
  type PeriodPreset,
  type ReportingBooking,
  type ReportingCleaningTask,
  type ReportingMaintenanceIssue,
} from "@/lib/reporting";
import { diffDaysISO } from "@/lib/date-utils";
import { DateRangePicker, type DateRange } from "../reservas/date-range-picker";
import { KpiCard } from "@/components/kpi-card";
import { BreakdownList } from "@/components/breakdown-list";
import { WorldMap } from "@/components/world-map";
import { NATIONALITY_TO_MAP_NAME } from "@/lib/geo";

const CHANNEL_COLORS = [
  "bg-primary",
  "bg-action",
  "bg-success",
  "bg-highlight",
  "bg-error",
  "bg-ink-subdued",
];

export function RelatoriosClient({
  bookings,
  rooms,
  cleaningTasks,
  maintenanceIssues,
  isAdmin,
}: {
  bookings: ReportingBooking[];
  rooms: { id: string; name: string }[];
  cleaningTasks: ReportingCleaningTask[];
  maintenanceIssues: ReportingMaintenanceIssue[];
  isAdmin: boolean;
}) {
  const [preset, setPreset] = useState<PeriodPreset>("mes");
  const [customRange, setCustomRange] = useState<DateRange>({
    start: null,
    end: null,
  });

  const range = useMemo(() => {
    if (preset === "custom" && customRange.start && customRange.end) {
      return { start: customRange.start, end: customRange.end };
    }
    return getPresetRange(preset === "custom" ? "mes" : preset);
  }, [preset, customRange]);

  const daysInRange = diffDaysISO(range.start, range.end) + 1;

  const periodBookings = useMemo(
    () =>
      bookings.filter(
        (b) => b.check_in >= range.start && b.check_in <= range.end,
      ),
    [bookings, range],
  );
  const activeBookings = useMemo(
    () => periodBookings.filter((b) => b.status !== "cancelada"),
    [periodBookings],
  );

  const revenue = activeBookings.reduce((sum, b) => sum + b.total_amount, 0);
  const paid = activeBookings.reduce(
    (sum, b) => sum + (b.payments ?? []).reduce((s, p) => s + p.amount, 0),
    0,
  );
  const pending = Math.max(0, revenue - paid);
  const avgBookingValue =
    activeBookings.length > 0 ? revenue / activeBookings.length : 0;

  const nonCancelledBookings = useMemo(
    () => bookings.filter((b) => b.status !== "cancelada"),
    [bookings],
  );

  const roomNights = useMemo(
    () =>
      nonCancelledBookings.reduce(
        (sum, b) =>
          sum + nightsOverlap(b.check_in, b.check_out, range.start, range.end),
        0,
      ),
    [nonCancelledBookings, range],
  );
  const availableNights = rooms.length * daysInRange;
  const occupancyRate = availableNights > 0 ? roomNights / availableNights : 0;

  // Receita atribuída às noites do período (não à data de check-in), para
  // ADR/RevPAR/TrevPAR consistentes com room nights e ocupação.
  const nightBasedRevenue = useMemo(
    () =>
      nonCancelledBookings.reduce(
        (sum, b) =>
          sum +
          proratedRevenue(
            b.check_in,
            b.check_out,
            b.total_amount,
            range.start,
            range.end,
          ),
        0,
      ),
    [nonCancelledBookings, range],
  );

  const adr = roomNights > 0 ? nightBasedRevenue / roomNights : 0;
  const revPar = availableNights > 0 ? nightBasedRevenue / availableNights : 0;
  // Sem outras fontes de receita registadas além das reservas, por agora
  // o TrevPAR coincide com o RevPAR.
  const trevPar = revPar;

  const avgLengthOfStay = useMemo(() => {
    if (activeBookings.length === 0) return 0;
    const totalNights = activeBookings.reduce(
      (sum, b) => sum + diffDaysISO(b.check_in, b.check_out),
      0,
    );
    return totalNights / activeBookings.length;
  }, [activeBookings]);

  const statusBreakdown = useMemo(() => {
    const counts = new Map<BookingStatus, number>();
    for (const b of periodBookings) {
      counts.set(b.status, (counts.get(b.status) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([status, value]) => ({
      label: BOOKING_STATUS_LABELS[status],
      value,
      colorClass: BOOKING_STATUS_STYLES[status].split(" ")[0],
    }));
  }, [periodBookings]);

  const channelBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of activeBookings) {
      const key = b.channel || "Sem canal";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({
        label,
        value,
        colorClass: CHANNEL_COLORS[i % CHANNEL_COLORS.length],
      }));
  }, [activeBookings]);

  const guestStats = useMemo(() => {
    const distinctGuests = new Map<string, number>();
    let totalPeople = 0;
    for (const b of activeBookings) {
      if (b.guest) distinctGuests.set(b.guest_id, b.guest.visit_count);
      totalPeople += b.num_adults + b.num_children + b.num_infants;
    }
    const repeat = Array.from(distinctGuests.values()).filter(
      (visitCount) => visitCount > 1,
    ).length;
    return { totalPeople, repeat };
  }, [activeBookings]);

  const countryBreakdown = useMemo(() => {
    const groups = new Map<
      string,
      { bookings: number; nights: number; revenue: number }
    >();
    for (const b of activeBookings) {
      const key = b.guest?.nationality || "Desconhecida";
      const nights = diffDaysISO(b.check_in, b.check_out);
      const g = groups.get(key) ?? { bookings: 0, nights: 0, revenue: 0 };
      g.bookings += 1;
      g.nights += nights;
      g.revenue += b.total_amount;
      groups.set(key, g);
    }
    return Array.from(groups.entries())
      .map(([label, g]) => ({
        label,
        bookings: g.bookings,
        nights: g.nights,
        revenue: g.revenue,
        adr: g.nights > 0 ? g.revenue / g.nights : 0,
        alos: g.bookings > 0 ? g.nights / g.bookings : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [activeBookings]);

  const mapCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of countryBreakdown) {
      const mapName = NATIONALITY_TO_MAP_NAME[row.label];
      if (mapName) counts[mapName] = (counts[mapName] ?? 0) + row.bookings;
    }
    return counts;
  }, [countryBreakdown]);

  const propertyBreakdown = useMemo(() => {
    const roomNameById = new Map(rooms.map((r) => [r.id, r.name]));
    const groups = new Map<
      string,
      { bookings: number; nights: number; revenue: number }
    >();
    for (const b of activeBookings) {
      const key = roomNameById.get(b.room_id) ?? "Desconhecido";
      const nights = diffDaysISO(b.check_in, b.check_out);
      const g = groups.get(key) ?? { bookings: 0, nights: 0, revenue: 0 };
      g.bookings += 1;
      g.nights += nights;
      g.revenue += b.total_amount;
      groups.set(key, g);
    }
    return Array.from(groups.entries())
      .map(([label, g]) => ({
        label,
        bookings: g.bookings,
        nights: g.nights,
        revenue: g.revenue,
        adr: g.nights > 0 ? g.revenue / g.nights : 0,
        alos: g.bookings > 0 ? g.nights / g.bookings : 0,
        occupancy: daysInRange > 0 ? g.nights / daysInRange : 0,
        revPar: daysInRange > 0 ? g.revenue / daysInRange : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [activeBookings, rooms, daysInRange]);

  const cleaningStats = useMemo(() => {
    const completed = cleaningTasks.filter((t) => {
      if (t.status !== "concluida" || !t.completed_at) return false;
      const date = t.completed_at.slice(0, 10);
      return date >= range.start && date <= range.end;
    });
    const totalHours = completed.reduce(
      (sum, t) => sum + elapsedHours(t.started_at, t.completed_at),
      0,
    );
    const totalCost = completed.reduce(
      (sum, t) =>
        sum +
        elapsedHours(t.started_at, t.completed_at) *
          (t.assignee?.hourly_rate ?? 0),
      0,
    );
    return { count: completed.length, totalHours, totalCost };
  }, [cleaningTasks, range]);

  const maintenanceStats = useMemo(() => {
    const resolved = maintenanceIssues.filter((i) => {
      if (i.status !== "resolvido" || !i.completed_at) return false;
      const date = i.completed_at.slice(0, 10);
      return date >= range.start && date <= range.end;
    });
    const totalHours = resolved.reduce(
      (sum, i) => sum + elapsedHours(i.started_at, i.completed_at),
      0,
    );
    const totalCost = resolved.reduce(
      (sum, i) =>
        sum +
        elapsedHours(i.started_at, i.completed_at) *
          (i.assignee?.hourly_rate ?? 0),
      0,
    );
    const counts = new Map<string, number>();
    for (const i of resolved)
      counts.set(i.priority, (counts.get(i.priority) ?? 0) + 1);
    const priorityBreakdown = Array.from(counts.entries()).map(
      ([priority, value]) => ({
        label:
          MAINTENANCE_PRIORITY_LABELS[
            priority as keyof typeof MAINTENANCE_PRIORITY_LABELS
          ],
        value,
        colorClass:
          MAINTENANCE_PRIORITY_STYLES[
            priority as keyof typeof MAINTENANCE_PRIORITY_STYLES
          ].split(" ")[0],
      }),
    );
    return { count: resolved.length, totalHours, totalCost, priorityBreakdown };
  }, [maintenanceIssues, range]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[24px] font-bold text-ink">Dados e reporting</h1>
        <p className="mt-1 text-body text-ink-muted">
          Acompanha o desempenho do teu negócio com relatórios e métricas.
        </p>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Receita"
          value={formatCurrency(revenue)}
          icon={Euro}
          hint={`${formatCurrency(pending)} por cobrar`}
        />
        <KpiCard
          label="Taxa de ocupação"
          value={`${Math.round(occupancyRate * 100)}%`}
          icon={BedDouble}
          hint={`${roomNights} noites ocupadas`}
        />
        <KpiCard
          label="Reservas"
          value={String(activeBookings.length)}
          icon={Calendar}
        />
        <KpiCard
          label="Hóspedes"
          value={String(guestStats.totalPeople)}
          icon={Users}
          hint={`${guestStats.repeat} hóspedes recorrentes`}
        />
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-[18px] font-bold text-ink">Desempenho</h2>
          <p className="text-body text-ink-muted">
            Indicadores de hotelaria para o período selecionado.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="ADR"
            value={formatCurrency(adr)}
            icon={Receipt}
            hint="Valor médio por noite vendida"
          />
          <KpiCard
            label="RevPAR"
            value={formatCurrency(revPar)}
            icon={TrendingUp}
            hint="Receita por quarto disponível"
          />
          <KpiCard
            label="TrevPAR"
            value={formatCurrency(trevPar)}
            icon={LineChart}
            hint="Igual ao RevPAR (sem outras receitas registadas)"
          />
          <KpiCard
            label="Room nights"
            value={String(roomNights)}
            icon={Moon}
            hint={`de ${availableNights} disponíveis`}
          />
          <KpiCard
            label="Duração média de estadia"
            value={`${avgLengthOfStay.toFixed(1)} noites`}
            icon={CalendarRange}
          />
          <KpiCard
            label="Valor médio de reserva"
            value={formatCurrency(avgBookingValue)}
            icon={Wallet}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BreakdownList title="Reservas por estado" items={statusBreakdown} />
        <BreakdownList title="Reservas por canal" items={channelBreakdown} />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Globe2 className="h-5 w-5 text-primary" strokeWidth={2} />
          <div>
            <h2 className="text-[18px] font-bold text-ink">
              Distribuição geográfica
            </h2>
            <p className="text-body text-ink-muted">
              De onde vêm os teus hóspedes, e o desempenho por país e por
              alojamento no período selecionado.
            </p>
          </div>
        </div>

        <WorldMap counts={mapCounts} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PerformanceTable
            title="Desempenho por país"
            rows={countryBreakdown}
          />
          <PerformanceTable
            title="Desempenho por alojamento"
            rows={propertyBreakdown}
            showOccupancy
          />
        </div>
      </div>

      {isAdmin && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-[18px] font-bold text-ink">Operações</h2>
            <p className="text-body text-ink-muted">
              Tempo e custo de limpeza e manutenção. Visível só para o
              Administrador.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <KpiCard
              label="Limpeza concluída"
              value={String(cleaningStats.count)}
              icon={Sparkles}
              hint={`${formatHours(cleaningStats.totalHours)} · ${formatCurrency(cleaningStats.totalCost)}`}
            />
            <KpiCard
              label="Manutenção resolvida"
              value={String(maintenanceStats.count)}
              icon={Wrench}
              hint={`${formatHours(maintenanceStats.totalHours)} · ${formatCurrency(maintenanceStats.totalCost)}`}
            />
          </div>
          {maintenanceStats.priorityBreakdown.length > 0 && (
            <BreakdownList
              title="Manutenção resolvida por prioridade"
              items={maintenanceStats.priorityBreakdown}
            />
          )}
        </div>
      )}
    </div>
  );
}

type PerformanceRow = {
  label: string;
  bookings: number;
  nights: number;
  revenue: number;
  adr: number;
  alos: number;
  occupancy?: number;
  revPar?: number;
};

function PerformanceTable({
  title,
  rows,
  showOccupancy = false,
}: {
  title: string;
  rows: PerformanceRow[];
  showOccupancy?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-canvas p-4 shadow-card">
      <p className="text-body font-semibold text-ink">{title}</p>
      {rows.length === 0 ? (
        <p className="text-body text-ink-subdued">Sem dados neste período.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wide text-ink-subdued">
                <th className="py-2 pr-3">
                  {showOccupancy ? "Alojamento" : "País"}
                </th>
                <th className="px-3 py-2 text-right">Reservas</th>
                <th className="px-3 py-2 text-right">Noites</th>
                {showOccupancy && (
                  <th className="px-3 py-2 text-right">Ocupação</th>
                )}
                <th className="px-3 py-2 text-right">Receita</th>
                <th className="px-3 py-2 text-right">ADR</th>
                {showOccupancy && (
                  <th className="px-3 py-2 text-right">RevPAR</th>
                )}
                <th className="py-2 pl-3 text-right">ALOS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-2 pr-3 font-semibold text-ink">
                    {row.label}
                  </td>
                  <td className="px-3 py-2 text-right text-ink-muted">
                    {row.bookings}
                  </td>
                  <td className="px-3 py-2 text-right text-ink-muted">
                    {row.nights}
                  </td>
                  {showOccupancy && (
                    <td className="px-3 py-2 text-right text-ink-muted">
                      {Math.round((row.occupancy ?? 0) * 100)}%
                    </td>
                  )}
                  <td className="px-3 py-2 text-right text-ink-muted">
                    {formatCurrency(row.revenue)}
                  </td>
                  <td className="px-3 py-2 text-right text-ink-muted">
                    {formatCurrency(row.adr)}
                  </td>
                  {showOccupancy && (
                    <td className="px-3 py-2 text-right text-ink-muted">
                      {formatCurrency(row.revPar ?? 0)}
                    </td>
                  )}
                  <td className="py-2 pl-3 text-right text-ink-muted">
                    {row.alos.toFixed(1)} noites
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
