import { createClient } from "@/lib/supabase/server";
import type { StaffMember } from "@/lib/staff";
import type {
  ReportingBooking,
  ReportingCleaningTask,
  ReportingMaintenanceIssue,
} from "@/lib/reporting";
import { RelatoriosClient } from "../../../relatorios/relatorios-client";

export default async function AlojamentoEstatisticasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: roomsData } = await supabase
    .from("rooms")
    .select("id, name")
    .eq("property_id", id);

  const rooms = (roomsData as { id: string; name: string }[]) ?? [];
  const roomIds = rooms.map((r) => r.id);

  const [
    { data: staff },
    { data: authData },
    { data: bookings },
    { data: cleaningTasks },
    { data: maintenanceIssues },
  ] = await Promise.all([
    supabase.from("staff").select("*"),
    supabase.auth.getUser(),
    supabase
      .from("bookings")
      .select(
        "id, check_in, check_out, status, total_amount, channel, guest_id, room_id, num_adults, num_children, num_infants, payments(amount), guest:guests(name, visit_count, nationality)",
      )
      .in("room_id", roomIds)
      .order("check_in", { ascending: false }),
    supabase
      .from("cleaning_tasks")
      .select(
        "room_id, status, started_at, completed_at, assignee:staff(hourly_rate)",
      )
      .in("room_id", roomIds),
    supabase
      .from("maintenance_issues")
      .select(
        "room_id, status, priority, started_at, completed_at, assignee:staff(hourly_rate)",
      )
      .in("room_id", roomIds),
  ]);

  const currentUserId = authData.user?.id ?? "";
  const staffList = (staff as StaffMember[]) ?? [];
  const currentStaff = staffList.find((member) => member.id === currentUserId);
  const permissions = currentStaff?.permissions ?? [];
  const isAdmin = permissions.includes("equipas");

  return (
    <RelatoriosClient
      bookings={(bookings as unknown as ReportingBooking[]) ?? []}
      rooms={rooms}
      cleaningTasks={
        isAdmin
          ? ((cleaningTasks as unknown as ReportingCleaningTask[]) ?? [])
          : []
      }
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
