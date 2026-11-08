import { createClient } from "@/lib/supabase/server";
import type { StaffMember } from "@/lib/staff";
import type {
  CleaningProgress,
  CleaningTask,
  CleaningTaskResult,
} from "@/lib/cleaning";
import { addDaysISO, todayISO } from "@/lib/date-utils";
import type { MaintenanceIssue } from "@/lib/maintenance";
import { EquipasClient } from "./equipas-client";

export default async function EquipasPage() {
  const supabase = await createClient();

  const [
    { data: staff },
    { data: authData },
    { data: rooms },
    { data: cleaningTasks },
    { data: maintenanceIssues },
    { data: progressRows },
  ] = await Promise.all([
    supabase.from("staff").select("*").order("created_at"),
    supabase.auth.getUser(),
    supabase.from("rooms").select("id, name").order("name"),
    supabase
      .from("cleaning_tasks")
      .select(
        "*, room:rooms(name), assignee:staff(name, hourly_rate), booking:bookings(guest:guests(name))",
      )
      .order("task_date"),
    supabase
      .from("maintenance_issues")
      .select("*, room:rooms(name), assignee:staff(name, hourly_rate)")
      .order("created_at"),
    // Progresso da checklist por tarefa, numa janela à volta de hoje.
    supabase.rpc("cleaning_task_progress", {
      p_from: addDaysISO(todayISO(), -14),
      p_to: addDaysISO(todayISO(), 60),
    }),
  ]);

  const cleaningProgress: Record<string, CleaningProgress> = {};
  for (const row of (progressRows as
    { task_id: string; total: number; done: number }[] | null) ?? []) {
    cleaningProgress[row.task_id] = { done: row.done, total: row.total };
  }

  const currentUserId = authData.user?.id ?? "";
  const staffList = (staff as StaffMember[]) ?? [];
  const currentStaff = staffList.find((member) => member.id === currentUserId);
  const permissions = currentStaff?.permissions ?? [];
  const isAdmin = permissions.includes("equipas");

  // Os custos e valores à hora são sensíveis: só
  // o Administrador (permissão "equipas") os recebe. Para os restantes,
  // removemos antes de enviar para o cliente — nunca chegam ao browser.
  // O executor recebe os horários da limpeza para acompanhar o cronómetro.
  const staffForClient = isAdmin
    ? staffList
    : staffList.map((member) => ({ ...member, hourly_rate: null }));

  const { data: cleaningResults } = isAdmin
    ? await supabase.from("cleaning_task_results").select("*")
    : { data: [] };
  const resultsByTask = new Map(
    ((cleaningResults ?? []) as CleaningTaskResult[]).map((result) => [
      result.task_id,
      result,
    ]),
  );
  const cleaningTasksRaw = (cleaningTasks as unknown as CleaningTask[]) ?? [];
  const cleaningTasksForClient = isAdmin
    ? cleaningTasksRaw.map((task) => ({
        ...task,
        result: resultsByTask.get(task.id) ?? null,
      }))
    : cleaningTasksRaw.map((task) => ({
        ...task,
        assignee: task.assignee
          ? { ...task.assignee, hourly_rate: null }
          : null,
      }));

  const maintenanceIssuesRaw =
    (maintenanceIssues as unknown as MaintenanceIssue[]) ?? [];
  const maintenanceIssuesForClient = isAdmin
    ? maintenanceIssuesRaw
    : maintenanceIssuesRaw.map((issue) => ({
        ...issue,
        started_at: null,
        completed_at: null,
        hourly_rate_snapshot: null,
        total_cost: null,
        assignee: issue.assignee
          ? { ...issue.assignee, hourly_rate: null }
          : null,
      }));

  return (
    <EquipasClient
      staff={staffForClient}
      rooms={(rooms as { id: string; name: string }[]) ?? []}
      cleaningTasks={cleaningTasksForClient}
      cleaningProgress={cleaningProgress}
      maintenanceIssues={maintenanceIssuesForClient}
      currentUserId={currentUserId}
      permissions={permissions}
    />
  );
}
