import {
  AlertTriangle,
  BedDouble,
  CalendarDays,
  ClipboardList,
  Inbox,
  LogIn,
  LogOut,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionPermissions } from "@/lib/permissions";
import { formatDateLabel, todayISO } from "@/lib/date-utils";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_STYLES,
  type Booking,
} from "@/lib/bookings";
import {
  CLEANING_STATUS_LABELS,
  CLEANING_STATUS_STYLES,
  type CleaningTask,
} from "@/lib/cleaning";
import {
  MAINTENANCE_PRIORITY_LABELS,
  MAINTENANCE_PRIORITY_STYLES,
  type MaintenanceIssue,
} from "@/lib/maintenance";

const UPCOMING_BOOKINGS_LIMIT = 5;
const PENDING_TASKS_LIMIT = 6;

// Devolvido por public.dashboard_metrics(date).
type DashboardMetrics = {
  total_rooms: number;
  occupied_today: number;
  check_ins_today: number;
  check_outs_today: number;
  monthly_revenue: number;
};

type UpcomingBooking = Pick<Booking, "id" | "check_in" | "status"> & {
  room: { name: string } | null;
  guest: { name: string } | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = todayISO();

  // Permissões já calculadas pelo layout neste pedido (cache): instantâneo.
  const { permissions } = await getSessionPermissions();
  const canSeeCrm = permissions.includes("hospedes");
  // Reservas externas (iCal) que não couberam no calendário: overbooking.
  const canSeeConflicts =
    permissions.includes("quartos") || permissions.includes("reservas");

  // Tudo em paralelo: antes os blocos do CRM e dos conflitos esperavam pelos
  // anteriores, somando idas à base de dados.
  const [
    { data: metricsData },
    { data: upcomingData },
    { data: cleaningTasksData },
    { data: maintenanceIssuesData },
    { data: crmTasksData },
    { count: newLeadsCount },
    { data: conflictRows },
  ] = await Promise.all([
    // Os KPIs são agregados em SQL — antes esta página carregava todas as
    // reservas não canceladas com os pagamentos em join só para os contar.
    supabase.rpc("dashboard_metrics", { p_today: today }),
    supabase
      .from("bookings")
      .select("id, check_in, status, room:rooms(name), guest:guests(name)")
      .neq("status", "cancelada")
      .gte("check_in", today)
      .order("check_in")
      .limit(UPCOMING_BOOKINGS_LIMIT),
    supabase
      .from("cleaning_tasks")
      .select("*, room:rooms(name), assignee:staff(name)")
      .neq("status", "concluida")
      .order("task_date")
      .limit(PENDING_TASKS_LIMIT),
    supabase
      .from("maintenance_issues")
      .select("*, room:rooms(name), assignee:staff(name)")
      .neq("status", "resolvido")
      .order("created_at")
      .limit(PENDING_TASKS_LIMIT),
    // Follow-ups do CRM: só para quem tem a permissão (a RLS também o garante).
    canSeeCrm
      ? supabase
          .from("crm_tasks")
          .select(
            "id, title, due_date, guest:guests(name), lead:crm_leads(name)",
          )
          .eq("done", false)
          .lte("due_date", today)
          .order("due_date")
          .limit(5)
      : Promise.resolve({ data: null }),
    canSeeCrm
      ? supabase
          .from("crm_leads")
          .select("id", { count: "exact", head: true })
          .eq("status", "novo")
      : Promise.resolve({ count: 0 }),
    canSeeConflicts
      ? supabase
          .from("ical_conflicts")
          .select("id, room:rooms(property_id)")
          .is("resolved_at", null)
          .limit(50)
      : Promise.resolve({ data: null }),
  ]);
  const conflictList =
    (conflictRows as unknown as
      { id: string; room: { property_id: string } | null }[] | null) ?? [];
  const conflictPropertyId = conflictList.find((c) => c.room)?.room
    ?.property_id;

  const crmTasks =
    (crmTasksData as unknown as {
      id: string;
      title: string;
      due_date: string;
      guest: { name: string } | null;
      lead: { name: string } | null;
    }[]) ?? [];

  const metrics = (metricsData as DashboardMetrics[] | null)?.[0];
  const totalRooms = metrics?.total_rooms ?? 0;
  const occupiedToday = metrics?.occupied_today ?? 0;
  const occupancyPercent =
    totalRooms > 0 ? Math.round((occupiedToday / totalRooms) * 100) : 0;

  const checkInsToday = metrics?.check_ins_today ?? 0;
  const checkOutsToday = metrics?.check_outs_today ?? 0;
  const monthlyRevenue = Number(metrics?.monthly_revenue ?? 0);

  const currencyFormatter = new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

  const kpis: { label: string; value: string; icon: LucideIcon }[] = [
    { label: "Ocupação hoje", value: `${occupancyPercent}%`, icon: BedDouble },
    { label: "Check-ins hoje", value: String(checkInsToday), icon: LogIn },
    { label: "Check-outs hoje", value: String(checkOutsToday), icon: LogOut },
    {
      label: "Receita do mês",
      value: currencyFormatter.format(monthlyRevenue),
      icon: TrendingUp,
    },
  ];

  const upcomingBookings = (upcomingData as unknown as UpcomingBooking[]) ?? [];

  const cleaningTasks = (cleaningTasksData as unknown as CleaningTask[]) ?? [];
  const maintenanceIssues =
    (maintenanceIssuesData as unknown as MaintenanceIssue[]) ?? [];

  const pendingTasks = [
    ...cleaningTasks.map((task) => ({
      id: `cleaning-${task.id}`,
      title: `Limpeza — ${task.room?.name ?? "Quarto"}`,
      subtitle: task.assignee?.name ?? "Por atribuir",
      badgeLabel: CLEANING_STATUS_LABELS[task.status],
      badgeStyle: CLEANING_STATUS_STYLES[task.status],
    })),
    ...maintenanceIssues.map((issue) => ({
      id: `maintenance-${issue.id}`,
      title: issue.title,
      subtitle:
        issue.assignee?.name ??
        issue.room?.name ??
        issue.location_label ??
        "Manutenção",
      badgeLabel: MAINTENANCE_PRIORITY_LABELS[issue.priority],
      badgeStyle: MAINTENANCE_PRIORITY_STYLES[issue.priority],
    })),
  ].slice(0, PENDING_TASKS_LIMIT);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="ui-eyebrow">O teu centro de operações</p>
          <h1 className="text-[24px] font-bold text-ink">Visão geral</h1>
          <p className="mt-1 text-body text-ink-muted">
            Reservas, equipa e alojamentos. Tudo num só lugar.
          </p>
        </div>
        <span className="flex items-center gap-2 rounded-md border border-border bg-canvas px-3 py-2 text-[12px] text-ink-muted">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDateLabel(today)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {kpis.map(({ label, value, icon }) => (
          <KpiCard key={label} label={label} value={value} icon={icon} />
        ))}
      </div>

      {conflictList.length > 0 && (
        <Link
          href={
            conflictPropertyId
              ? `/alojamentos/${conflictPropertyId}/canais`
              : "/alojamentos"
          }
          role="alert"
          className="flex items-center gap-3 rounded-lg border border-error/30 bg-error/5 px-5 py-4 transition-colors hover:bg-error/10"
        >
          <AlertTriangle
            className="h-5 w-5 shrink-0 text-error"
            strokeWidth={2}
          />
          <div className="min-w-0">
            <p className="text-body font-bold text-error">
              {conflictList.length} possível(is) overbooking
            </p>
            <p className="text-[12px] text-ink-muted">
              Há reservas dos canais (Booking, Airbnb, VRBO) que se sobrepõem a
              reservas do PMS. Toca para ver e resolver.
            </p>
          </div>
        </Link>
      )}

      {canSeeCrm && (crmTasks.length > 0 || (newLeadsCount ?? 0) > 0) && (
        <div className="overflow-hidden rounded-lg border border-border bg-canvas shadow-card">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-body font-semibold text-ink">
                Follow-ups do CRM
              </h2>
              <p className="mt-1 text-[12px] text-ink-subdued">
                Tarefas atrasadas ou para hoje
                {(newLeadsCount ?? 0) > 0
                  ? ` · ${newLeadsCount} lead(s) novo(s) por contactar`
                  : ""}
              </p>
            </div>
            <Link
              href="/hospedes"
              className="flex shrink-0 items-center gap-1.5 text-[12px] font-semibold text-action hover:underline"
            >
              <Inbox className="h-4 w-4" strokeWidth={1.6} />
              Abrir CRM
            </Link>
          </div>
          {crmTasks.length === 0 ? (
            <p className="px-5 py-6 text-body text-ink-subdued">
              Sem tarefas para hoje.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {crmTasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-body font-semibold text-ink">
                      {task.title}
                    </p>
                    <p className="text-[12px] text-ink-subdued">
                      {task.guest?.name ?? task.lead?.name ?? "Sem hóspede"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-pill px-2.5 py-1 text-[10px] font-semibold ${
                      task.due_date < today
                        ? "bg-error/10 text-error"
                        : "bg-highlight/25 text-highlight-ink"
                    }`}
                  >
                    {task.due_date < today
                      ? `Atrasada · ${formatDateLabel(task.due_date)}`
                      : "Hoje"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-border bg-canvas shadow-card">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-5">
            <div>
              <h2 className="text-body font-semibold text-ink">
                Próximas reservas
              </h2>
              <p className="mt-1 text-[12px] text-ink-subdued">
                As próximas chegadas ao teu alojamento.
              </p>
            </div>
            <CalendarDays
              className="h-4 w-4 shrink-0 text-ink-subdued"
              strokeWidth={1.6}
            />
          </div>
          {upcomingBookings.length === 0 ? (
            <p className="px-5 py-12 text-center text-body text-ink-subdued">
              Sem reservas agendadas.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {upcomingBookings.map((booking) => (
                <li
                  key={booking.id}
                  className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-surface-1/50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-1 text-primary">
                      <BedDouble className="h-4 w-4" strokeWidth={1.6} />
                    </span>
                    <div>
                      <p className="text-body font-semibold text-ink">
                        {booking.guest?.name ?? "—"}
                      </p>
                      <p className="text-[12px] text-ink-subdued">
                        {booking.room?.name ?? "—"} · Check-in{" "}
                        {formatDateLabel(booking.check_in)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-pill px-2.5 py-1 text-[10px] font-semibold ${BOOKING_STATUS_STYLES[booking.status]}`}
                  >
                    {BOOKING_STATUS_LABELS[booking.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-canvas shadow-card">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-5">
            <div>
              <h2 className="text-body font-semibold text-ink">
                Tarefas pendentes
              </h2>
              <p className="mt-1 text-[12px] text-ink-subdued">
                Limpeza e manutenção por acompanhar.
              </p>
            </div>
            <ClipboardList
              className="h-4 w-4 shrink-0 text-ink-subdued"
              strokeWidth={1.6}
            />
          </div>
          {pendingTasks.length === 0 ? (
            <p className="px-5 py-12 text-center text-body text-ink-subdued">
              Sem tarefas pendentes.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {pendingTasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-surface-1/50"
                >
                  <div>
                    <p className="text-body font-semibold text-ink">
                      {task.title}
                    </p>
                    <p className="text-[12px] text-ink-subdued">
                      {task.subtitle}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-pill px-2.5 py-1 text-[10px] font-semibold ${task.badgeStyle}`}
                  >
                    {task.badgeLabel}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
