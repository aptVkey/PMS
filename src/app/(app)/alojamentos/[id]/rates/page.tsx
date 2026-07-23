import { createClient } from "@/lib/supabase/server";
import type { Room } from "@/lib/rooms";
import type { RoomDailyPrice, RoomRatePeriod } from "@/lib/pricing";
import type { Booking } from "@/lib/bookings";
import { PrecosClient } from "../../../precos/precos-client";

export default async function RatesPage({
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

  const [{ data: periods }, { data: dailyPrices }, { data: bookings }] =
    await Promise.all([
      supabase
        .from("room_rate_periods")
        .select("*")
        .in("room_id", roomIds)
        .order("start_date"),
      supabase
        .from("room_daily_prices")
        .select("*")
        .in("room_id", roomIds)
        .order("date"),
      supabase
        .from("bookings")
        .select("room_id, check_in, check_out, status")
        .in("room_id", roomIds),
    ]);

  return (
    <PrecosClient
      rooms={rooms}
      periods={(periods as RoomRatePeriod[]) ?? []}
      dailyPrices={(dailyPrices as RoomDailyPrice[]) ?? []}
      bookings={
        (bookings as Pick<
          Booking,
          "room_id" | "check_in" | "check_out" | "status"
        >[]) ?? []
      }
      hideHeader
    />
  );
}
