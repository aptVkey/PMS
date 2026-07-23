import { createClient } from "@/lib/supabase/server";
import type { Room } from "@/lib/rooms";
import type { RoomDailyPrice, RoomRatePeriod } from "@/lib/pricing";
import type { Booking } from "@/lib/bookings";
import { PrecosClient } from "./precos-client";

export default async function PrecosPage() {
  const supabase = await createClient();

  const [{ data: rooms }, { data: periods }, { data: dailyPrices }, { data: bookings }] =
    await Promise.all([
      supabase
        .from("rooms")
        .select(
          "id, name, type, description, capacity_adults, capacity_children, capacity_infants, bedrooms, bathrooms, size_m2, base_price, min_stay_nights, currency, amenities, photos, is_published, created_at, updated_at",
        )
        .order("name"),
      supabase.from("room_rate_periods").select("*").order("start_date"),
      supabase.from("room_daily_prices").select("*").order("date"),
      supabase
        .from("bookings")
        .select("room_id, check_in, check_out, status"),
    ]);

  return (
    <PrecosClient
      rooms={(rooms as Room[]) ?? []}
      periods={(periods as RoomRatePeriod[]) ?? []}
      dailyPrices={(dailyPrices as RoomDailyPrice[]) ?? []}
      bookings={(bookings as Pick<Booking, "room_id" | "check_in" | "check_out" | "status">[]) ?? []}
    />
  );
}
