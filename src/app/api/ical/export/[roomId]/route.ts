import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildIcsExport } from "@/lib/ical-export";

// Pedida diretamente pelo servidor da Booking.com/Airbnb, sem sessão — por
// isso usa o cliente admin (o cliente normal, com RLS, devolveria zero
// linhas a um pedido anónimo) e nunca inclui dados do hóspede na resposta.
export async function GET(
  _request: NextRequest,
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

  const { data: bookings } = await admin
    .from("bookings")
    .select("id, check_in, check_out")
    .eq("room_id", roomId)
    .neq("status", "cancelada");

  const ics = buildIcsExport(bookings ?? []);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
