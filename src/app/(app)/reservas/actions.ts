"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { BOOKING_STATUSES, PAYMENT_METHODS } from "@/lib/bookings";

const BookingSchema = z
  .object({
    roomId: z.string().min(1, { error: "Escolhe um quarto." }),
    guestId: z.string().min(1, { error: "Escolhe um hóspede." }),
    checkIn: z.string().min(1, { error: "Indica a data de check-in." }),
    checkOut: z.string().min(1, { error: "Indica a data de check-out." }),
    numAdults: z.coerce.number().int().min(1),
    numChildren: z.coerce.number().int().min(0),
    numInfants: z.coerce.number().int().min(0),
    status: z.enum(BOOKING_STATUSES),
    totalAmount: z.coerce.number().min(0),
    channel: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((data) => data.checkOut > data.checkIn, {
    error: "A data de check-out deve ser depois do check-in.",
    path: ["checkOut"],
  });

export type BookingFormState =
  | { error: string }
  | { success: true }
  | undefined;

export async function saveBooking(
  _prevState: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const parsed = BookingSchema.safeParse({
    roomId: formData.get("roomId"),
    guestId: formData.get("guestId"),
    checkIn: formData.get("checkIn"),
    checkOut: formData.get("checkOut"),
    numAdults: formData.get("numAdults"),
    numChildren: formData.get("numChildren"),
    numInfants: formData.get("numInfants"),
    status: formData.get("status"),
    totalAmount: formData.get("totalAmount"),
    channel: formData.get("channel") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifica os campos assinalados." };
  }

  const supabase = await createClient();
  const id = formData.get("id");

  let conflictQuery = supabase
    .from("bookings")
    .select("id")
    .eq("room_id", parsed.data.roomId)
    .neq("status", "cancelada")
    .lt("check_in", parsed.data.checkOut)
    .gt("check_out", parsed.data.checkIn);

  if (id) {
    conflictQuery = conflictQuery.neq("id", String(id));
  }

  const { data: conflicts, error: conflictError } = await conflictQuery;

  if (conflictError) {
    return { error: "Não foi possível validar a disponibilidade. Tenta novamente." };
  }

  if (conflicts && conflicts.length > 0) {
    return {
      error: "Já existe uma reserva para este quarto nessas datas.",
    };
  }

  const payload = {
    room_id: parsed.data.roomId,
    guest_id: parsed.data.guestId,
    check_in: parsed.data.checkIn,
    check_out: parsed.data.checkOut,
    num_adults: parsed.data.numAdults,
    num_children: parsed.data.numChildren,
    num_infants: parsed.data.numInfants,
    status: parsed.data.status,
    total_amount: parsed.data.totalAmount,
    channel: parsed.data.channel || null,
    notes: parsed.data.notes || null,
  };

  const { error } = id
    ? await supabase.from("bookings").update(payload).eq("id", String(id))
    : await supabase.from("bookings").insert(payload);

  if (error) {
    return { error: "Não foi possível guardar a reserva. Tenta novamente." };
  }

  revalidatePath("/reservas");
  revalidatePath("/hospedes");
  return { success: true };
}

export async function deleteBooking(
  bookingId: string,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", bookingId);

  if (error) {
    return { error: "Não foi possível eliminar a reserva. Tenta novamente." };
  }

  revalidatePath("/reservas");
  revalidatePath("/hospedes");
  return { success: true };
}

const PaymentSchema = z.object({
  bookingId: z.string().min(1),
  amount: z.coerce.number().positive({ error: "Indica um valor válido." }),
  method: z.enum(PAYMENT_METHODS),
  paidAt: z.string().min(1, { error: "Indica a data do pagamento." }),
  notes: z.string().optional(),
});

export type PaymentFormState =
  | { error: string }
  | { success: true }
  | undefined;

export async function addPayment(
  _prevState: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const parsed = PaymentSchema.safeParse({
    bookingId: formData.get("bookingId"),
    amount: formData.get("amount"),
    method: formData.get("method"),
    paidAt: formData.get("paidAt"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: "Verifica os campos do pagamento." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("payments").insert({
    booking_id: parsed.data.bookingId,
    amount: parsed.data.amount,
    method: parsed.data.method,
    paid_at: parsed.data.paidAt,
    notes: parsed.data.notes || null,
  });

  if (error) {
    return { error: "Não foi possível registar o pagamento. Tenta novamente." };
  }

  revalidatePath("/reservas");
  revalidatePath("/hospedes");
  return { success: true };
}

export async function deletePayment(
  paymentId: string,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("id", paymentId);

  if (error) {
    return { error: "Não foi possível eliminar o pagamento. Tenta novamente." };
  }

  revalidatePath("/reservas");
  revalidatePath("/hospedes");
  return { success: true };
}
