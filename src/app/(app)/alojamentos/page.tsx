import { createClient } from "@/lib/supabase/server";
import type { Room } from "@/lib/rooms";
import type { RoomTypology } from "@/lib/room-typologies";
import type { Property } from "@/lib/property";
import { AlojamentosClient } from "./alojamentos-client";

export default async function QuartosPage() {
  const supabase = await createClient();

  const [{ data: properties }, { data: rooms }, { data: typologies }] =
    await Promise.all([
      supabase.from("properties").select("*").order("created_at"),
      supabase
        .from("rooms")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("room_typologies").select("*").order("name"),
    ]);

  return (
    <AlojamentosClient
      properties={(properties as Property[]) ?? []}
      rooms={(rooms as Room[]) ?? []}
      typologies={(typologies as RoomTypology[]) ?? []}
    />
  );
}
