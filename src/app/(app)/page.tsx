import {
  BedDouble,
  LogIn,
  LogOut,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { addDaysISO, formatDateLabel, formatISO, todayISO } from "@/lib/date-utils";
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

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = todayISO();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStart = formatISO(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthEndExclusive = addDaysISO(
    formatISO(year, month - 1, daysInMonth),
    1,
  );

  const [
    { data: rooms },
    { data: bookingsData },
    { data: cleaningTasksData },
    { data: maintenanceIssuesData },
  ] = await Promise.all([
    supabase.from("rooms").select("id"),
    supabase
      .from("bookings")
      .select(
        "*, room:rooms(name), guest:guests(name), payments(amount, paid_at)",
      )
      .neq("status", "cancelada")
      .order("check_in"),
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
  ]);

  const bookings = (bookingsData as unknown as Booking[]) ?? [];
  const totalRooms = rooms?.length ?? 0;

  const occupiedToday = bookings.filter(
    (b) => b.check_in <= today && b.check_out > today,
  ).length;
  const occupancyPercent =
    totalRooms > 0 ? Math.round((occupiedToday / totalRooms) * 100) : 0;

  const checkInsToday = bookings.filter((b) => b.check_in === today).length;
  const checkOutsToday = bookings.filter((b) => b.check_out === today).length;

  const monthlyRevenue = bookings.reduce((sum, booking) => {
    const payments = booking.payments ?? [];
    const paidThisMonth = payments
      .filter((p) => {
        const paidDate = p.paid_at.slice(0, 10);
        return paidDate >= monthStart && paidDate < monthEndExclusive;
      })
      .reduce((s, p) => s + p.amount, 0);
    return sum + paidThisMonth;
  }, 0);

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

  const upcomingBookings = bookings
    .filter((b) => b.check_in >= today)
    .slice(0, UPCOMING_BOOKINGS_LIMIT);

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
      <div>
        <h1 className="text-[24px] font-bold text-ink">Início</h1>
        <p className="mt-1 text-body text-ink-muted">
          Visão geral do teu hotel hoje.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-lg border border-border bg-canvas p-5 shadow-card"
          >
            <div className="flex items-center gap-2 text-ink-subdued">
              <Icon className="h-4 w-4" strokeWidth={2} />
              <span className="text-body">{label}</span>
            </div>
            <p className="mt-2 text-[28px] font-bold leading-tight text-ink">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-canvas p-6 shadow-card">
          <h2 className="text-body font-bold text-ink">Próximas reservas</h2>
          {upcomingBookings.length === 0 ? (
            <p className="mt-4 text-body text-ink-subdued">
              Sem reservas agendadas.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {upcomingBookings.map((booking) => (
                <li
                  key={booking.id}
                  className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-body font-semibold text-ink">
                      {booking.guest?.name ?? "—"}
                    </p>
                    <p className="text-[12px] text-ink-subdued">
                      {booking.room?.name ?? "—"} · Check-in{" "}
                      {formatDateLabel(booking.check_in)}
                    </p>
                  </div>
                  <span
                    className={`rounded-pill px-3 py-1 text-[12px] font-semibold ${BOOKING_STATUS_STYLES[booking.status]}`}
                  >
                    {BOOKING_STATUS_LABELS[booking.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-border bg-canvas p-6 shadow-card">
          <h2 className="text-body font-bold text-ink">Tarefas pendentes</h2>
          {pendingTasks.length === 0 ? (
            <p className="mt-4 text-body text-ink-subdued">
              Sem tarefas pendentes.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {pendingTasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
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
                    className={`rounded-pill px-3 py-1 text-[12px] font-semibold ${task.badgeStyle}`}
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
