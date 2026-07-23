"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const RulesSchema = z.object({
  roomId: z.string().min(1, { error: "Escolhe um quarto." }),
  checkInFrom: z.string().optional(),
  checkInUntil: z.string().optional(),
  checkOutUntil: z.string().optional(),
  minAge: z.coerce.number().int().min(0).max(120).optional(),
  smokingAllowed: z.coerce.boolean(),
  petsAllowed: z.coerce.boolean(),
  partiesAllowed: z.coerce.boolean(),
  quietHoursFrom: z.string().optional(),
  quietHoursUntil: z.string().optional(),
  houseRulesNotes: z.string().optional(),
  cancellationFreeUntilDays: z.coerce.number().int().min(0).max(365).optional(),
  cancellationRefundPercent: z.coerce.number().int().min(0).max(100).optional(),
  cancellationNotes: z.string().optional(),
});

export type RulesFormState = { error: string } | { success: true } | undefined;

export async function saveRules(
  _prevState: RulesFormState,
  formData: FormData,
): Promise<RulesFormState> {
  const parsed = RulesSchema.safeParse({
    roomId: formData.get("roomId"),
    checkInFrom: formData.get("checkInFrom") || undefined,
    checkInUntil: formData.get("checkInUntil") || undefined,
    checkOutUntil: formData.get("checkOutUntil") || undefined,
    minAge: formData.get("minAge") || undefined,
    smokingAllowed: formData.get("smokingAllowed") === "on",
    petsAllowed: formData.get("petsAllowed") === "on",
    partiesAllowed: formData.get("partiesAllowed") === "on",
    quietHoursFrom: formData.get("quietHoursFrom") || undefined,
    quietHoursUntil: formData.get("quietHoursUntil") || undefined,
    houseRulesNotes: formData.get("houseRulesNotes") || undefined,
    cancellationFreeUntilDays: formData.get("cancellationFreeUntilDays") || undefined,
    cancellationRefundPercent: formData.get("cancellationRefundPercent") || undefined,
    cancellationNotes: formData.get("cancellationNotes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifica os campos assinalados." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("room_rules").upsert(
    {
      room_id: parsed.data.roomId,
      check_in_from: parsed.data.checkInFrom || null,
      check_in_until: parsed.data.checkInUntil || null,
      check_out_until: parsed.data.checkOutUntil || null,
      min_age: parsed.data.minAge ?? null,
      smoking_allowed: parsed.data.smokingAllowed,
      pets_allowed: parsed.data.petsAllowed,
      parties_allowed: parsed.data.partiesAllowed,
      quiet_hours_from: parsed.data.quietHoursFrom || null,
      quiet_hours_until: parsed.data.quietHoursUntil || null,
      house_rules_notes: parsed.data.houseRulesNotes || null,
      cancellation_free_until_days: parsed.data.cancellationFreeUntilDays ?? null,
      cancellation_refund_percent: parsed.data.cancellationRefundPercent ?? null,
      cancellation_notes: parsed.data.cancellationNotes || null,
    },
    { onConflict: "room_id" },
  );

  if (error) {
    return { error: "Não foi possível guardar as regras. Tenta novamente." };
  }

  revalidatePath("/regras");
  return { success: true };
}
