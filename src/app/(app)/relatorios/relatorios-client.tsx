"use client";

import { useMemo, useState } from "react";
import {
  BedDouble,
  Calendar,
  CalendarRange,
  Euro,
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
import { KpiCard } from "./kpi-card";
import { BreakdownList } from "./breakdown-list";

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
    for (const i of resolved) counts.set(i.priority, (counts.get(i.priority) ?? 0) + 1);
    const priorityBreakdown = Array.from(counts.entries()).map(
      ([priority, value]) => ({
        label: MAINTENANCE_PRIORITY_LABELS[priority as keyof typeof MAINTENANCE_PRIORITY_LABELS],
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
