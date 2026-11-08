import { createClient } from "@/lib/supabase/server";
import type { StaffMember } from "@/lib/staff";
import type {
  ReportingBooking,
  ReportingCleaningTask,
  ReportingMaintenanceIssue,
} from "@/lib/reporting";
import { RelatoriosClient } from "./relatorios-client";

export default async function RelatoriosPage() {
  const supabase = await createClient();

  const [
    { data: staff },
    { data: authData },
    { data: rooms },
    { data: bookings },
    { data: cleaningTasks },
    { data: maintenanceIssues },
  ] = await Promise.all([
    supabase.from("staff").select("*"),
    supabase.auth.getUser(),
    supabase.from("rooms").select("id, name"),
    supabase
      .from("bookings")
      .select(
        "id, check_in, check_out, status, total_amount, channel, guest_id, room_id, num_adults, num_children, num_infants, payments(amount), guest:guests(name, visit_count, nationality)",
      )
      .order("check_in", { ascending: false }),
    supabase
      .from("cleaning_tasks")
      .select(
        "id, status, started_at, completed_at, assignee:staff(hourly_rate)",
      ),
    supabase
      .from("maintenance_issues")
      .select(
        "status, priority, started_at, completed_at, total_cost, assignee:staff(hourly_rate)",
      ),
  ]);

  const currentUserId = authData.user?.id ?? "";
  const staffList = (staff as StaffMember[]) ?? [];
  const currentStaff = staffList.find((member) => member.id === currentUserId);
  const permissions = currentStaff?.permissions ?? [];
  const isAdmin = permissions.includes("equipas");

  const { data: cleaningResults } = isAdmin
    ? await supabase.from("cleaning_task_results").select("task_id, total_cost")
    : { data: [] };
  const resultByTask = new Map(
    (cleaningResults ?? []).map((result) => [result.task_id, result]),
  );
  const cleaningWithResults = (
    (cleaningTasks ?? []) as unknown as (ReportingCleaningTask & {
      id: string;
    })[]
  ).map((task) => ({ ...task, result: resultByTask.get(task.id) ?? null }));

  return (
    <RelatoriosClient
      bookings={(bookings as unknown as ReportingBooking[]) ?? []}
      rooms={(rooms as { id: string; name: string }[]) ?? []}
      cleaningTasks={isAdmin ? cleaningWithResults : []}
      maintenanceIssues={
        isAdmin
          ? ((maintenanceIssues as unknown as ReportingMaintenanceIssue[]) ??
            [])
          : []
      }
      isAdmin={isAdmin}
    />
  );
}
