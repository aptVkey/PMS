import { createClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/stripe";
import type { Room } from "@/lib/rooms";
import type { IcalConflictRow, IcalFeedRow } from "@/lib/ical";
import { CanaisClient } from "./canais-client";

export default async function CanaisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: rooms }, { data: feeds }, { data: conflicts }, base] =
    await Promise.all([
      supabase.from("rooms").select("*").eq("property_id", id).order("name"),
      supabase
        .from("ical_feeds")
        .select("*, room:rooms!inner(property_id)")
        .eq("room.property_id", id),
      supabase
        .from("ical_conflicts")
        .select(
          "id, feed_id, room_id, summary, check_in, check_out, same_dates, detected_at, feed:ical_feeds(channel), room:rooms!inner(name, property_id), blocking:bookings(booking_number, check_in, check_out, channel, guest:guests(name))",
        )
        .eq("room.property_id", id)
        .is("resolved_at", null)
        .order("detected_at", { ascending: false }),
      appUrl(),
    ]);

  const cleanFeeds: IcalFeedRow[] = (feeds ?? []).map((f) => ({
    id: f.id,
    room_id: f.room_id,
    channel: f.channel,
    feed_url: f.feed_url,
    is_active: f.is_active,
    last_synced_at: f.last_synced_at,
    last_sync_status: f.last_sync_status,
    last_sync_error: f.last_sync_error,
    created_count: f.created_count,
    updated_count: f.updated_count,
    cancelled_count: f.cancelled_count,
    conflict_count: f.conflict_count,
    created_at: f.created_at,
    updated_at: f.updated_at,
  }));

  return (
    <CanaisClient
      propertyId={id}
      rooms={(rooms as Room[]) ?? []}
      feeds={cleanFeeds}
      conflicts={(conflicts as unknown as IcalConflictRow[]) ?? []}
      appUrl={base}
    />
  );
}
