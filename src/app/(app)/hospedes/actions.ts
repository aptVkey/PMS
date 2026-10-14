"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { DOCUMENT_TYPES } from "@/lib/guests";

const GuestSchema = z.object({
  name: z.string().min(1, { error: "O nome é obrigatório." }),
  email: z
    .union([z.email({ error: "Introduz um email válido." }), z.literal("")])
    .optional(),
  phone: z.string().optional(),
  birthday: z.string().optional(),
  nationality: z.string().optional(),
  documentType: z.union([z.enum(DOCUMENT_TYPES), z.literal("")]).optional(),
  documentNumber: z.string().optional(),
  notes: z.string().optional(),
});

export type GuestFormState = { error: string } | { success: true } | undefined;

export async function saveGuest(
  _prevState: GuestFormState,
  formData: FormData,
): Promise<GuestFormState> {
  const denied = await requirePermission("hospedes");
  if (denied) return denied;

  const parsed = GuestSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    birthday: formData.get("birthday") || undefined,
    nationality: formData.get("nationality") || undefined,
    documentType: formData.get("documentType") || undefined,
    documentNumber: formData.get("documentNumber") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: "Verifica os campos assinalados e tenta novamente." };
  }

  const supabase = await createClient();

  const payload = {
    name: parsed.data.name,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    birthday: parsed.data.birthday || null,
    nationality: parsed.data.nationality || null,
    document_type: parsed.data.documentType || null,
    document_number: parsed.data.documentNumber || null,
    notes: parsed.data.notes || null,
  };

  const id = formData.get("id");
  const { error } = id
    ? await supabase.from("guests").update(payload).eq("id", String(id))
    : await supabase.from("guests").insert(payload);

  if (error) {
    return { error: "Não foi possível guardar o hóspede. Tenta novamente." };
  }

  revalidatePath("/hospedes");
  return { success: true };
}

export async function deleteGuest(
  guestId: string,
): Promise<{ error: string } | { success: true }> {
  const denied = await requirePermission("hospedes");
  if (denied) return denied;

  const supabase = await createClient();

  const { error } = await supabase.from("guests").delete().eq("id", guestId);

  if (error) {
    return { error: "Não foi possível eliminar o hóspede. Tenta novamente." };
  }

  revalidatePath("/hospedes");
  return { success: true };
}
