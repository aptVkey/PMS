import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildIcsExport } from "@/lib/ical-export";

// Pedida diretamente pelo servidor da Booking.com/Airbnb, sem sessão — por
// isso usa o cliente admin (o cliente normal, com RLS, devolveria zero
// linhas a um pedido anónimo) e nunca inclui dados do hóspede na resposta.
// Com ?for=<feedId> deixa de fora as reservas que vieram desse mesmo canal:
// uma reserva da Booking.com não precisa de ser devolvida à Booking.com como
// bloqueio (evita "ecos" que apareceriam como conflitos no próximo ciclo).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Servidor sem acesso aos dados." },
      { status: 503 },
    );
  }

  const forFeed = request.nextUrl.searchParams.get("for");

  let query = admin
    .from("bookings")
    .select("id, check_in, check_out")
    .eq("room_id", roomId)
    .neq("status", "cancelada");

  // .neq() sozinho também deixaria de fora as linhas com feed nulo (reservas
  // diretas), por isso pede-se "sem feed OU de outro feed".
  if (forFeed && UUID.test(forFeed)) {
    query = query.or(`ical_feed_id.is.null,ical_feed_id.neq.${forFeed}`);
  }

  const { data: bookings } = await query;

  const ics = buildIcsExport(bookings ?? []);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
