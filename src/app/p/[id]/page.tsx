import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BedDouble, Bath, Check, Moon, Users } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStripeClient } from "@/lib/stripe";
import { formatBedCount, ROOM_TYPE_LABELS, type Room } from "@/lib/rooms";
import type { Property } from "@/lib/property";
import type { Booking } from "@/lib/bookings";
import type { RoomDailyPrice, RoomRatePeriod } from "@/lib/pricing";
import { DirectBookingForm } from "./booking-form";
import { PhotoMosaic } from "./photo-mosaic";

// A página é pública, por isso lê com a chave de serviço — o papel `anon` não
// tem acesso às tabelas. Em contrapartida, só se selecciona o que pode ser
// público, e só de unidades publicadas.
async function loadProperty(id: string) {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: property } = await admin
    .from("properties")
    .select("id, name, property_type, description")
    .eq("id", id)
    .maybeSingle();

  if (!property) return null;

  const { data: rooms } = await admin
    .from("rooms")
    .select(
      "id, property_id, name, type, description, capacity_adults, capacity_children, capacity_infants, bedrooms, bathrooms, size_m2, base_price, currency, min_stay_nights, amenities, photos",
    )
    .eq("property_id", id)
    .eq("is_published", true)
    .order("name");

  const roomIds = (rooms ?? []).map((r) => r.id);

  const [{ data: periods }, { data: dailyPrices }, { data: bookings }] =
    roomIds.length > 0
      ? await Promise.all([
          admin.from("room_rate_periods").select("*").in("room_id", roomIds),
          admin.from("room_daily_prices").select("*").in("room_id", roomIds),
          // Só as datas — o calendário precisa de saber que noites já estão
          // ocupadas, nunca quem as ocupa. Sem dados de hóspede nenhum.
          admin
            .from("bookings")
            .select("room_id, check_in, check_out")
            .in("room_id", roomIds)
            .neq("status", "cancelada"),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];

  return {
    property: property as Pick<
      Property,
      "id" | "name" | "property_type" | "description"
    >,
    rooms: (rooms as unknown as Room[]) ?? [],
    periods: (periods as RoomRatePeriod[]) ?? [],
    dailyPrices: (dailyPrices as RoomDailyPrice[]) ?? [],
    bookings:
      (bookings as Pick<Booking, "room_id" | "check_in" | "check_out">[]) ?? [],
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await loadProperty(id);
  if (!data) return { title: "Alojamento não encontrado" };
  return {
    title: data.property.name,
    description:
      data.property.description ?? `Reserva direta em ${data.property.name}.`,
  };
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[20px] font-bold leading-tight text-ink">{children}</h2>
  );
}

export default async function PublicPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadProperty(id);

  if (!data) notFound();

  const { property, rooms, periods, dailyPrices, bookings } = data;

  // Configurado pela tab de Integrações, com o env como alternativa.
  const paymentsEnabled = Boolean(await createStripeClient());

  const currencyFormatter = new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: rooms[0]?.currency ?? "EUR",
    maximumFractionDigits: 0,
  });

  const photos = rooms.flatMap((r) => r.photos);
  const amenities = Array.from(new Set(rooms.flatMap((r) => r.amenities)));

  const capacity = rooms.reduce(
    (sum, r) => sum + r.capacity_adults + r.capacity_children,
    0,
  );
  const bedroomCount = rooms.reduce((sum, r) => sum + r.bedrooms.length, 0);
  const bathroomCount = rooms.reduce((sum, r) => sum + r.bathrooms.length, 0);
  const bedCount = rooms.reduce(
    (sum, r) =>
      sum +
      r.bedrooms.reduce(
        (b, bedroom) => b + bedroom.beds.reduce((n, bed) => n + bed.count, 0),
        0,
      ),
    0,
  );

  const precoDesde = rooms.reduce(
    (min, r) => (r.base_price > 0 && r.base_price < min ? r.base_price : min),
    Number.POSITIVE_INFINITY,
  );

  const minStay = rooms.reduce<number | null>((max, r) => {
    if (r.min_stay_nights == null) return max;
    return max == null || r.min_stay_nights > max ? r.min_stay_nights : max;
  }, null);

  // Cada quarto do JSON `bedrooms` vira um cartão em "Onde irá dormir", com a
  // composição de camas que lá está definida.
  const sleepingAreas = rooms.flatMap((room) =>
    room.bedrooms.map((bedroom, index) => ({
      key: `${room.id}-${index}`,
      label:
        rooms.length > 1
          ? `${room.name} · Quarto ${index + 1}`
          : `Quarto ${index + 1}`,
      beds: bedroom.beds,
    })),
  );

  // A descrição do alojamento (a apresentação geral) tem prioridade sobre a
  // de um quarto específico, que existe para detalhar essa unidade em
  // concreto — só cai para ela se o alojamento ainda não tiver a sua própria.
  const description =
    property.description ??
    rooms.find((r) => r.description)?.description ??
    null;
  const roomTypeLabel = rooms[0] ? ROOM_TYPE_LABELS[rooms[0].type] : null;

  return (
    // pb-24: espaço para a barra fixa do motor de reservas em mobile não
    // tapar o rodapé; lg: ela deixa de ser fixa, por isso o padding some. Só
    // se aplica quando a barra existe de facto (há unidades para reservar).
    <main
      className={`min-h-svh bg-canvas ${rooms.length > 0 ? "pb-24 lg:pb-0" : ""}`}
    >
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4">
          <p className="text-body font-bold text-primary">{property.name}</p>
          <Link
            href="/site#alojamentos"
            className="flex items-center gap-1.5 text-body font-semibold text-ink-muted hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            Todos os alojamentos
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-6 py-6">
        <h1 className="font-serif text-[34px] font-normal leading-tight tracking-tight text-ink">
          {property.name}
        </h1>

        <div className="mt-4">
          <PhotoMosaic photos={photos} alt={property.name} />
        </div>

        {rooms.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-border p-12 text-center">
            <p className="text-body font-semibold text-ink">
              Sem unidades disponíveis
            </p>
            <p className="mt-1 text-body text-ink-subdued">
              Este alojamento ainda não tem unidades publicadas.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_372px] lg:items-start lg:gap-16">
            <div className="flex flex-col">
              <div className="pb-6">
                <h2 className="text-[22px] font-bold leading-tight text-ink">
                  {roomTypeLabel ?? "Alojamento"} em {property.name}
                </h2>
                <p className="mt-1 text-body text-ink-muted">
                  {capacity} {capacity === 1 ? "hóspede" : "hóspedes"} ·{" "}
                  {bedroomCount} {bedroomCount === 1 ? "quarto" : "quartos"} ·{" "}
                  {bedCount} {bedCount === 1 ? "cama" : "camas"} ·{" "}
                  {bathroomCount}{" "}
                  {bathroomCount === 1 ? "casa de banho" : "casas de banho"}
                </p>
              </div>

              {description && (
                <div className="border-t border-border py-6">
                  <p className="whitespace-pre-line text-body leading-relaxed text-ink-muted">
                    {description}
                  </p>
                </div>
              )}

              {sleepingAreas.length > 0 && (
                <div className="border-t border-border py-6">
                  <SectionHeading>Onde irá dormir</SectionHeading>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {sleepingAreas.map((area) => (
                      <div
                        key={area.key}
                        className="rounded-lg border border-border p-4"
                      >
                        <BedDouble
                          className="h-6 w-6 text-ink"
                          strokeWidth={1.5}
                        />
                        <p className="mt-3 text-body font-semibold text-ink">
                          {area.label}
                        </p>
                        <p className="text-[13px] text-ink-muted">
                          {area.beds
                            .map((bed) => formatBedCount(bed.count, bed.type))
                            .join(", ")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {amenities.length > 0 && (
                <div className="border-t border-border py-6">
                  <SectionHeading>O que este alojamento oferece</SectionHeading>
                  <ul className="mt-4 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                    {amenities.map((amenity) => (
                      <li
                        key={amenity}
                        className="flex items-center gap-3 border-b border-border py-3 text-body text-ink"
                      >
                        <Check
                          className="h-4 w-4 shrink-0 text-ink-muted"
                          strokeWidth={2}
                        />
                        {amenity}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {rooms.length > 1 && (
                <div className="border-t border-border py-6">
                  <SectionHeading>Unidades disponíveis</SectionHeading>
                  <div className="mt-4 flex flex-col divide-y divide-border">
                    {rooms.map((room) => (
                      <div
                        key={room.id}
                        className="flex flex-wrap items-baseline justify-between gap-2 py-3"
                      >
                        <div>
                          <p className="text-body font-semibold text-ink">
                            {room.name}
                          </p>
                          <p className="text-[13px] text-ink-muted">
                            {ROOM_TYPE_LABELS[room.type]}
                            {room.size_m2 ? ` · ${room.size_m2} m²` : ""} ·{" "}
                            {room.capacity_adults + room.capacity_children}{" "}
                            hóspedes
                          </p>
                        </div>
                        {room.base_price > 0 && (
                          <p className="text-body font-bold text-ink">
                            {currencyFormatter.format(room.base_price)}
                            <span className="font-normal text-ink-muted">
                              {" "}
                              / noite
                            </span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-border py-6">
                <SectionHeading>Coisas a saber</SectionHeading>
                <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div>
                    <p className="text-body font-semibold text-ink">
                      Capacidade
                    </p>
                    <p className="mt-2 flex items-center gap-2 text-[13px] text-ink-muted">
                      <Users className="h-4 w-4 shrink-0" strokeWidth={2} />
                      Até {capacity} {capacity === 1 ? "hóspede" : "hóspedes"}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-[13px] text-ink-muted">
                      <Bath className="h-4 w-4 shrink-0" strokeWidth={2} />
                      {bathroomCount}{" "}
                      {bathroomCount === 1 ? "casa de banho" : "casas de banho"}
                    </p>
                  </div>
                  <div>
                    <p className="text-body font-semibold text-ink">Estadia</p>
                    <p className="mt-2 flex items-center gap-2 text-[13px] text-ink-muted">
                      <Moon className="h-4 w-4 shrink-0" strokeWidth={2} />
                      {minStay
                        ? `Mínimo de ${minStay} ${minStay === 1 ? "noite" : "noites"}`
                        : "Sem estadia mínima"}
                    </p>
                  </div>
                  <div>
                    <p className="text-body font-semibold text-ink">
                      Pagamento
                    </p>
                    <p className="mt-2 text-[13px] text-ink-muted">
                      {paymentsEnabled
                        ? "Pagamento seguro por cartão no momento da reserva."
                        : "O anfitrião contacta-te para combinar o pagamento."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:sticky lg:top-6">
              <DirectBookingForm
                propertyId={property.id}
                rooms={rooms}
                ratePeriods={periods}
                dailyPrices={dailyPrices}
                bookings={bookings}
                paymentsEnabled={paymentsEnabled}
                fromPrice={
                  precoDesde === Number.POSITIVE_INFINITY ? null : precoDesde
                }
              />
            </div>
          </div>
        )}
      </div>

      <footer className="border-t border-border px-6 py-8">
        <p className="mx-auto max-w-[1120px] text-[13px] text-ink-subdued">
          © {new Date().getFullYear()} {property.name}
        </p>
      </footer>
    </main>
  );
}
