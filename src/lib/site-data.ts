import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROPERTY_TYPE_LABELS, type PropertyType } from "@/lib/property";

export type SiteProperty = {
  id: string;
  name: string;
  typeLabel: string;
  description: string | null;
  coverPhoto: string | null;
  photoCount: number;
  guests: number;
  bedrooms: number;
  priceFrom: number | null;
  currency: string;
};

export type SiteReview = {
  id: string;
  author_name: string;
  author_location: string | null;
  rating: number;
  body: string;
  property_name: string | null;
  // Exemplo de demonstração — nunca entra nas estatísticas.
  is_demo: boolean;
};

type RoomRow = {
  property_id: string;
  capacity_adults: number;
  capacity_children: number;
  bedrooms: unknown;
  base_price: number | string | null;
  currency: string | null;
  photos: string[] | null;
};

// O site é público, por isso lê com a chave de serviço e só seleciona o que
// pode ser mostrado — e apenas de alojamentos com unidades publicadas.
export async function loadSiteProperties(): Promise<SiteProperty[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data: rooms } = await admin
    .from("rooms")
    .select(
      "property_id, capacity_adults, capacity_children, bedrooms, base_price, currency, photos",
    )
    .eq("is_published", true);

  const roomRows = (rooms ?? []) as RoomRow[];
  const propertyIds = Array.from(new Set(roomRows.map((r) => r.property_id)));
  if (propertyIds.length === 0) return [];

  const { data: properties } = await admin
    .from("properties")
    .select("id, name, property_type, description")
    .in("id", propertyIds)
    .order("name");

  return (properties ?? []).map((p) => {
    const own = roomRows.filter((r) => r.property_id === p.id);
    const photos = own.flatMap((r) => r.photos ?? []);
    const prices = own
      .map((r) => Number(r.base_price))
      .filter((n) => Number.isFinite(n) && n > 0);

    return {
      id: p.id as string,
      name: p.name as string,
      typeLabel:
        PROPERTY_TYPE_LABELS[p.property_type as PropertyType] ?? "Alojamento",
      description: (p.description as string | null) || null,
      coverPhoto: photos[0] ?? null,
      photoCount: photos.length,
      guests: own.reduce(
        (sum, r) => sum + r.capacity_adults + r.capacity_children,
        0,
      ),
      bedrooms: own.reduce(
        (sum, r) => sum + (Array.isArray(r.bedrooms) ? r.bedrooms.length : 0),
        0,
      ),
      priceFrom: prices.length > 0 ? Math.min(...prices) : null,
      currency: own[0]?.currency ?? "EUR",
    };
  });
}

export async function loadSiteReviews(): Promise<SiteReview[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from("site_reviews")
    .select(
      "id, author_name, author_location, rating, body, is_demo, property:properties(name)",
    )
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(9);

  return (data ?? []).map((r) => {
    const property = r.property as unknown as { name: string } | null;
    return {
      id: r.id as string,
      author_name: r.author_name as string,
      author_location: (r.author_location as string | null) ?? null,
      rating: r.rating as number,
      body: r.body as string,
      property_name: property?.name ?? null,
      is_demo: Boolean(r.is_demo),
    };
  });
}
