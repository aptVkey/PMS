import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";
import type { Booking } from "@/lib/bookings";
import type { Room } from "@/lib/rooms";
import type { Guest } from "@/lib/guests";
import type { RoomDailyPrice, RoomRatePeriod } from "@/lib/pricing";
import { ReservasClient } from "../../../reservas/reservas-client";

export default async function AlojamentoReservasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: roomsData } = await supabase
    .from("rooms")
    .select("*")
    .eq("property_id", id)
    .order("name");

  const rooms = (roomsData as Room[]) ?? [];
  const roomIds = rooms.map((r) => r.id);

  const [
    { data: bookings },
    { data: guests },
    { data: periods },
    { data: dailyPrices },
  ] = await Promise.all([
    fetchAll((from, to) =>
      supabase
        .from("bookings")
        .select("*, room:rooms(name), guest:guests(name), payments(*)")
        .in("room_id", roomIds)
        .order("check_in", { ascending: false })
        .order("id")
        .range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from("guests")
        .select("*")
        .order("name")
        .order("id")
        .range(from, to),
    ),
    supabase.from("room_rate_periods").select("*").in("room_id", roomIds),
    supabase.from("room_daily_prices").select("*").in("room_id", roomIds),
  ]);

  return (
    <ReservasClient
      bookings={(bookings as unknown as Booking[]) ?? []}
      rooms={rooms}
      guests={(guests as Guest[]) ?? []}
      ratePeriods={(periods as RoomRatePeriod[]) ?? []}
      dailyPrices={(dailyPrices as RoomDailyPrice[]) ?? []}
      initialView="lista"
      lockView
      hideHeader
    />
  );
}
