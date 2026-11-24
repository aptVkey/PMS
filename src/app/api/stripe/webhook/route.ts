import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStripeClient, stripeWebhookSecret } from "@/lib/stripe";

// O Stripe assina o corpo em bruto: qualquer parsing antes de verificar a
// assinatura invalida-a. Daí request.text() e não request.json().
export async function POST(request: NextRequest) {
  const stripe = await createStripeClient();
  const secret = await stripeWebhookSecret();

  if (!stripe || !secret) {
    return NextResponse.json(
      { error: "Stripe não configurado." },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Sem assinatura." }, { status: 400 });
  }

  const payload = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    // Assinatura inválida: pode ser alguém a tentar forjar um pagamento.
    return NextResponse.json(
      { error: "Assinatura inválida." },
      { status: 400 },
    );
  }

  // Checkout que expirou sem pagamento: a reserva pendente que segurava as
  // datas é cancelada, para as noites voltarem a estar à venda.
  if (event.type === "checkout.session.expired") {
    const expiredBookingId = event.data.object.metadata?.booking_id;
    if (expiredBookingId) {
      const admin = createAdminClient();
      if (!admin) {
        return NextResponse.json(
          { error: "Sem acesso à base." },
          { status: 500 },
        );
      }
      const { error } = await admin
        .from("bookings")
        .update({ status: "cancelada" })
        .eq("id", expiredBookingId)
        .eq("status", "pendente");
      if (error) {
        return NextResponse.json(
          { error: "Falha a libertar a reserva." },
          { status: 500 },
        );
      }
    }
    return NextResponse.json({ received: true });
  }

  if (event.type !== "checkout.session.completed") {
    // Devolvemos 200 para o Stripe não reenviar eventos que não tratamos.
    return NextResponse.json({ received: true });
  }

  const session = event.data.object;
  const bookingId = session.metadata?.booking_id;

  if (!bookingId) {
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();
  if (!admin) {
    // 500 para o Stripe voltar a tentar mais tarde.
    return NextResponse.json({ error: "Sem acesso à base." }, { status: 500 });
  }

  const amount = (session.amount_total ?? 0) / 100;
  const externalRef =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? session.id);

  // O índice único em external_ref torna isto idempotente: o Stripe reenvia o
  // mesmo evento até receber 200, e o reenvio não duplica o pagamento.
  const { error: paymentError } = await admin.from("payments").insert({
    booking_id: bookingId,
    amount,
    method: "cartao",
    paid_at: new Date().toISOString().slice(0, 10),
    notes: "Pagamento online (Stripe)",
    external_ref: externalRef,
  });

  // 23505 = já existe: é um reenvio, não um erro.
  if (paymentError && paymentError.code !== "23505") {
    return NextResponse.json(
      { error: "Falha a registar o pagamento." },
      { status: 500 },
    );
  }

  const { error: bookingError } = await admin
    .from("bookings")
    .update({ status: "confirmada" })
    .eq("id", bookingId)
    .eq("status", "pendente");

  if (bookingError) {
    return NextResponse.json(
      { error: "Falha a confirmar a reserva." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
