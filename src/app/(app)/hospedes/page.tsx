import { createClient } from "@/lib/supabase/server";
import type { Guest } from "@/lib/guests";
import type { Booking } from "@/lib/bookings";
import { HospedesClient } from "./hospedes-client";

export default async function HospedesPage() {
  const supabase = await createClient();

  const [{ data: guests }, { data: bookings }] = await Promise.all([
    supabase.from("guests").select("*").order("created_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("*, room:rooms(name)")
      .order("check_in", { ascending: false }),
  ]);

  return (
    <HospedesClient
      guests={(guests as Guest[]) ?? []}
      bookings={(bookings as unknown as Booking[]) ?? []}
    />
  );
}
