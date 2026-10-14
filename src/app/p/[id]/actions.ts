"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl, createStripeClient } from "@/lib/stripe";
import {
  calculateStayTotal,
  resolveMinStay,
  type RoomDailyPrice,
  type RoomRatePeriod,
} from "@/lib/pricing";

const EXCLUSION_VIOLATION = "23P01";

const DirectBookingSchema = z
  .object({
    propertyId: z.string().min(1),
    roomId: z.string().min(1, { error: "Escolhe uma unidade." }),
    checkIn: z.string().min(1, { error: "Indica a data de chegada." }),
    checkOut: z.string().min(1, { error: "Indica a data de partida." }),
    numAdults: z.coerce.number().int().min(1),
    numChildren: z.coerce.number().int().min(0),
    numInfants: z.coerce.number().int().min(0),
    name: z.string().min(1, { error: "Indica o teu nome." }),
    email: z.email({ error: "Indica um email válido." }),
    phone: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((data) => data.checkOut > data.checkIn, {
    error: "A data de partida tem de ser depois da chegada.",
    path: ["checkOut"],
  });

export type DirectBookingState =
  | { error: string }
  // checkoutUrl só vem preenchido quando o Stripe está configurado; sem ele o
  // pedido fica pendente e o pagamento combina-se por fora.
  | {
      success: true;
      total: number;
      nights: number;
      currency: string;
      checkoutUrl?: string;
    }
  | undefined;

// O visitante não tem sessão, e as policies RLS não deixam o papel `anon`
// escrever em bookings nem em guests — de propósito, senão qualquer pessoa
// podia poluir a base de dados. Esta action é a única porta de entrada:
// valida tudo, calcula o preço no servidor e só depois escreve com a chave
// de serviço.
export async function requestDirectBooking(
  _prevState: DirectBookingState,
  formData: FormData,
): Promise<DirectBookingState> {
  const parsed = DirectBookingSchema.safeParse({
    propertyId: formData.get("propertyId"),
    roomId: formData.get("roomId"),
    checkIn: formData.get("checkIn"),
    checkOut: formData.get("checkOut"),
    numAdults: formData.get("numAdults"),
    numChildren: formData.get("numChildren"),
    numInfants: formData.get("numInfants"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Verifica os campos do pedido.",
    };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      error: "O pedido de reserva não está disponível de momento.",
    };
  }

  // A unidade tem de pertencer a este alojamento e estar publicada — senão
  // bastava adivinhar um id para reservar um quarto que não está à venda.
  const { data: room } = await admin
    .from("rooms")
    .select(
      "id, base_price, currency, min_stay_nights, capacity_adults, capacity_children, capacity_infants",
    )
    .eq("id", parsed.data.roomId)
    .eq("property_id", parsed.data.propertyId)
    .eq("is_published", true)
    .maybeSingle();

  if (!room) {
    return { error: "Esta unidade já não está disponível." };
  }

  const totalGuests = parsed.data.numAdults + parsed.data.numChildren;
  const maxGuests = room.capacity_adults + room.capacity_children;
  if (totalGuests > maxGuests) {
    return {
      error: `Esta unidade acomoda no máximo ${maxGuests} ${maxGuests === 1 ? "hóspede" : "hóspedes"} (sem contar bebés).`,
    };
  }
  if (parsed.data.numInfants > room.capacity_infants) {
    return {
      error: `Esta unidade acomoda no máximo ${room.capacity_infants} ${room.capacity_infants === 1 ? "bebé" : "bebés"}.`,
    };
  }

  const [{ data: periods }, { data: dailyPrices }] = await Promise.all([
    admin.from("room_rate_periods").select("*").eq("room_id", room.id),
    admin.from("room_daily_prices").select("*").eq("room_id", room.id),
  ]);

  const typedPeriods = (periods as RoomRatePeriod[]) ?? [];
  const typedDaily = (dailyPrices as RoomDailyPrice[]) ?? [];

  const minStay = resolveMinStay(
    parsed.data.checkIn,
    room.min_stay_nights,
    typedPeriods,
    typedDaily,
  );
  const nights = Math.round(
    (new Date(parsed.data.checkOut).getTime() -
      new Date(parsed.data.checkIn).getTime()) /
      86_400_000,
  );

  if (minStay != null && nights < minStay) {
    return {
      error: `Esta unidade exige um mínimo de ${minStay} ${minStay === 1 ? "noite" : "noites"} nestas datas.`,
    };
  }

  // O preço nunca vem do cliente: é sempre recalculado aqui.
  const total = calculateStayTotal(
    parsed.data.checkIn,
    parsed.data.checkOut,
    room.base_price,
    typedPeriods,
    typedDaily,
  );

  if (total <= 0) {
    return {
      error: "Esta unidade ainda não tem preço definido para estas datas.",
    };
  }

  // Hóspede recorrente reaproveita a ficha, para o CRM não ficar com
  // duplicados a cada pedido.
  const { data: existingGuest } = await admin
    .from("guests")
    .select("id")
    .eq("email", parsed.data.email)
    .limit(1)
    .maybeSingle();

  let guestId = existingGuest?.id as string | undefined;

  if (!guestId) {
    const { data: newGuest, error: guestError } = await admin
      .from("guests")
      .insert({
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
      })
      .select("id")
      .single();

    if (guestError || !newGuest) {
      return { error: "Não foi possível registar o pedido. Tenta novamente." };
    }
    guestId = newGuest.id;
  }

  // A reserva é criada antes do pagamento, de propósito: é ela que segura as
  // datas enquanto o hóspede está no checkout. Fica pendente até o webhook do
  // Stripe confirmar — ou até o anfitrião a cancelar, se o pagamento nunca
  // chegar.
  const { data: booking, error } = await admin
    .from("bookings")
    .insert({
      room_id: room.id,
      guest_id: guestId,
      check_in: parsed.data.checkIn,
      check_out: parsed.data.checkOut,
      num_adults: parsed.data.numAdults,
      num_children: parsed.data.numChildren,
      num_infants: parsed.data.numInfants,
      status: "pendente",
      total_amount: total,
      channel: "Direto",
      notes: parsed.data.notes || null,
    })
    .select("id, booking_number")
    .single();

  if (error || !booking) {
    if (error?.code === EXCLUSION_VIOLATION) {
      return {
        error:
          "Estas datas já não estão disponíveis. Escolhe outras, por favor.",
      };
    }
    return { error: "Não foi possível registar o pedido. Tenta novamente." };
  }

  const stripe = await createStripeClient();

  if (!stripe) {
    return { success: true, total, nights, currency: room.currency };
  }

  const baseUrl = await appUrl();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: parsed.data.email,
      // O booking_id viaja nos metadados para o webhook saber a que reserva
      // associar o pagamento.
      metadata: { booking_id: booking.id },
      success_url: `${baseUrl}/p/${parsed.data.propertyId}/reserva/sucesso?reserva=${booking.booking_number}`,
      cancel_url: `${baseUrl}/p/${parsed.data.propertyId}?cancelado=1`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: room.currency.toLowerCase(),
            // O Stripe trabalha na menor unidade da moeda: cêntimos.
            unit_amount: Math.round(total * 100),
            product_data: {
              name: `${nights} ${nights === 1 ? "noite" : "noites"} · ${parsed.data.checkIn} a ${parsed.data.checkOut}`,
            },
          },
        },
      ],
    });

    return {
      success: true,
      total,
      nights,
      currency: room.currency,
      checkoutUrl: session.url ?? undefined,
    };
  } catch {
    // O pagamento falhou a arrancar, mas a reserva existe e as datas estão
    // seguras — o anfitrião trata do resto.
    return { success: true, total, nights, currency: room.currency };
  }
}
