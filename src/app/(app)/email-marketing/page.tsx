import { createClient } from "@/lib/supabase/server";
import type { Property } from "@/lib/property";
import type { Guest } from "@/lib/guests";
import type {
  EmailFlow,
  EmailFlowStep,
  EmailList,
  EmailSendRow,
  EmailTemplate,
} from "@/lib/email-marketing";
import { EmailMarketingClient } from "./email-marketing-client";

export default async function EmailMarketingPage() {
  const supabase = await createClient();

  const [
    { data: templates },
    { data: lists },
    { data: listMembers },
    { data: flows },
    { data: steps },
    { data: sends },
    { data: sentRows },
    { data: properties },
    { data: guests },
  ] = await Promise.all([
    supabase.from("email_templates").select("*").order("name"),
    supabase.from("email_lists").select("*").order("name"),
    supabase.from("email_list_members").select("list_id, guest_id"),
    supabase.from("email_flows").select("*").order("name"),
    supabase.from("email_flow_steps").select("*").order("position"),
    supabase
      .from("email_sends")
      .select(
        "*, guest:guests(name, email), booking:bookings(booking_number), step:email_flow_steps(trigger_type, flow:email_flows(name))",
      )
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("email_sends").select("flow_step_id").eq("status", "sent"),
    supabase.from("properties").select("*").order("name"),
    supabase.from("guests").select("*").order("name"),
  ]);

  const sendCounts: Record<string, number> = {};
  for (const row of sentRows ?? []) {
    const id = row.flow_step_id as string;
    sendCounts[id] = (sendCounts[id] ?? 0) + 1;
  }

  return (
    <EmailMarketingClient
      templates={(templates as EmailTemplate[]) ?? []}
      lists={(lists as EmailList[]) ?? []}
      listMembers={listMembers ?? []}
      flows={(flows as EmailFlow[]) ?? []}
      steps={(steps as EmailFlowStep[]) ?? []}
      sends={(sends as unknown as EmailSendRow[]) ?? []}
      sendCounts={sendCounts}
      properties={(properties as Property[]) ?? []}
      guests={(guests as Guest[]) ?? []}
    />
  );
}
