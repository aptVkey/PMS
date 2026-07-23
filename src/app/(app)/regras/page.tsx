import { createClient } from "@/lib/supabase/server";
import type { RoomRules } from "@/lib/rules";
import { RegrasClient } from "./regras-client";

export default async function RegrasPage() {
  const supabase = await createClient();

  const [{ data: rooms }, { data: rules }] = await Promise.all([
    supabase.from("rooms").select("id, name").order("name"),
    supabase.from("room_rules").select("*"),
  ]);

  return (
    <RegrasClient
      rooms={(rooms as { id: string; name: string }[]) ?? []}
      rules={(rules as RoomRules[]) ?? []}
    />
  );
}
