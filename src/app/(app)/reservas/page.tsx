import { createClient } from "@/lib/supabase/server";
import type { Booking } from "@/lib/bookings";
import type { Room } from "@/lib/rooms";
import type { Guest } from "@/lib/guests";
import type { RoomDailyPrice, RoomRatePeriod } from "@/lib/pricing";
import { ReservasClient } from "./reservas-client";

export default async function ReservasPage() {
  const supabase = await createClient();

  const [
    { data: bookings },
    { data: rooms },
    { data: guests },
    { data: ratePeriods },
    { data: dailyPrices },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, room:rooms(name), guest:guests(name), payments(*)")
      .order("check_in", { ascending: false }),
    supabase.from("rooms").select("*").order("name"),
    supabase.from("guests").select("*").order("name"),
    supabase.from("room_rate_periods").select("*"),
    supabase.from("room_daily_prices").select("*"),
  ]);

  return (
    <ReservasClient
      bookings={(bookings as unknown as Booking[]) ?? []}
      rooms={(rooms as Room[]) ?? []}
      guests={(guests as Guest[]) ?? []}
      ratePeriods={(ratePeriods as RoomRatePeriod[]) ?? []}
      dailyPrices={(dailyPrices as RoomDailyPrice[]) ?? []}
    />
  );
}
