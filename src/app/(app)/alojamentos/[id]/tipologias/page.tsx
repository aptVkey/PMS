import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Property } from "@/lib/property";
import type { Room } from "@/lib/rooms";
import type { RoomTypology } from "@/lib/room-typologies";
import { TypologiesView } from "../../typologies-view";
import { RoomsGridView } from "../../rooms-grid-view";

export default async function TipologiasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: property }, { data: typologies }, { data: rooms }] =
    await Promise.all([
      supabase.from("properties").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("room_typologies")
        .select("*")
        .eq("property_id", id)
        .order("name"),
      supabase
        .from("rooms")
        .select("*")
        .eq("property_id", id)
        .order("created_at", { ascending: false }),
    ]);

  if (!property) {
    notFound();
  }

  const typedProperty = property as Property;
  const typedTypologies = (typologies as RoomTypology[]) ?? [];
  const typedRooms = (rooms as Room[]) ?? [];

  if (typedProperty.property_type === "multi_unidade") {
    return (
      <TypologiesView
        propertyId={typedProperty.id}
        typologies={typedTypologies}
        rooms={typedRooms}
      />
    );
  }

  return (
    <RoomsGridView
      propertyId={typedProperty.id}
      propertyName={typedProperty.name}
      rooms={typedRooms}
    />
  );
}
