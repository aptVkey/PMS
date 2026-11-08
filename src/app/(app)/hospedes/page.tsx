import { createClient } from "@/lib/supabase/server";
import type { Guest } from "@/lib/guests";
import type { Booking } from "@/lib/bookings";
import type {
  CrmLead,
  CrmSegment,
  CrmTag,
  CrmTagRule,
  CrmTask,
} from "@/lib/crm";
import { HospedesClient } from "./hospedes-client";

export type GuestBooking = Booking & {
  room?: { name: string; property: { name: string } | null } | null;
};

// O Supabase devolve no máximo 1000 linhas por pedido.
async function fetchGuestTags(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const rows: { guest_id: string; tag_id: string }[] = [];
  for (let page = 0; page < 20; page++) {
    const { data } = await supabase
      .from("crm_guest_tags")
      .select("guest_id, tag_id")
      .range(page * 1000, page * 1000 + 999);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

export default async function HospedesPage() {
  const supabase = await createClient();

  const [
    { data: authData },
    { data: guests },
    { data: bookings },
    { data: tags },
    guestTags,
    { data: tasks },
    { data: leads },
    { data: segments },
    { data: staff },
    { data: tagRules },
    { data: segmentLists },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("guests")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("*, room:rooms(name, property:properties(name))")
      .order("check_in", { ascending: false }),
    supabase.from("crm_tags").select("id, name, color").order("name"),
    fetchGuestTags(supabase),
    supabase
      .from("crm_tasks")
      .select(
        "*, guest:guests(name), lead:crm_leads(name), assignee:staff(name)",
      )
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(1000),
    supabase
      .from("crm_leads")
      .select("*, assignee:staff(name)")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase.from("crm_segments").select("*").order("created_at"),
    supabase.from("staff").select("id, name, active").order("name"),
    supabase.from("crm_tag_rules").select("*").order("created_at"),
    supabase
      .from("email_lists")
      .select("segment_id")
      .not("segment_id", "is", null),
  ]);

  return (
    <HospedesClient
      currentUserId={authData.user?.id ?? ""}
      guests={(guests as Guest[]) ?? []}
      bookings={(bookings as unknown as GuestBooking[]) ?? []}
      tags={(tags as CrmTag[]) ?? []}
      guestTags={guestTags}
      tasks={(tasks as unknown as CrmTask[]) ?? []}
      leads={(leads as unknown as CrmLead[]) ?? []}
      segments={(segments as CrmSegment[]) ?? []}
      tagRules={(tagRules as CrmTagRule[]) ?? []}
      segmentsWithList={((segmentLists as { segment_id: string }[]) ?? []).map(
        (l) => l.segment_id,
      )}
      staff={((staff as { id: string; name: string; active: boolean }[]) ?? [])
        .filter((s) => s.active)
        .map(({ id, name }) => ({ id, name }))}
    />
  );
}
