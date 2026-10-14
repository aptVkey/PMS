import { createClient } from "@/lib/supabase/server";
import type { StaffMember } from "@/lib/staff";
import type { CleaningTask } from "@/lib/cleaning";
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
  ]);

  const currentUserId = authData.user?.id ?? "";
  const staffList = (staff as StaffMember[]) ?? [];
  const currentStaff = staffList.find((member) => member.id === currentUserId);
  const permissions = currentStaff?.permissions ?? [];
  const isAdmin = permissions.includes("equipas");

  // O tempo/custo de limpeza e manutenção e o valor à hora são sensíveis: só
  // o Administrador (permissão "equipas") os recebe. Para os restantes,
  // removemos antes de enviar para o cliente — nunca chegam ao browser.
  const staffForClient = isAdmin
    ? staffList
    : staffList.map((member) => ({ ...member, hourly_rate: null }));

  const cleaningTasksRaw = (cleaningTasks as unknown as CleaningTask[]) ?? [];
  const cleaningTasksForClient = isAdmin
    ? cleaningTasksRaw
    : cleaningTasksRaw.map((task) => ({
        ...task,
        started_at: null,
        completed_at: null,
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
        assignee: issue.assignee
          ? { ...issue.assignee, hourly_rate: null }
          : null,
      }));

  return (
    <EquipasClient
      staff={staffForClient}
      rooms={(rooms as { id: string; name: string }[]) ?? []}
      cleaningTasks={cleaningTasksForClient}
      maintenanceIssues={maintenanceIssuesForClient}
      currentUserId={currentUserId}
      permissions={permissions}
    />
  );
}
