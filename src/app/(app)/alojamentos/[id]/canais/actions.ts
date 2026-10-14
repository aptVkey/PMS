"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/permissions";
import { syncIcalFeed, type IcalFeed, type SyncResult } from "@/lib/ical-sync";

export type FormState = { error: string } | { success: true } | undefined;

const FeedSchema = z.object({
  propertyId: z.string().min(1),
  roomId: z.string().min(1, { error: "Escolhe um quarto." }),
  channel: z.string().min(1, { error: "Indica o canal." }),
  feedUrl: z.url({ error: "Indica um URL válido." }),
});

export async function saveIcalFeed(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await requirePermission("quartos");
  if (denied) return denied;

  const parsed = FeedSchema.safeParse({
    propertyId: formData.get("propertyId"),
    roomId: formData.get("roomId"),
    channel: formData.get("channel"),
    feedUrl: formData.get("feedUrl"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifica os campos." };
  }

  const supabase = await createClient();
  const payload = {
    room_id: parsed.data.roomId,
    channel: parsed.data.channel,
    feed_url: parsed.data.feedUrl,
  };

  const id = formData.get("id");
  const { error } = id
    ? await supabase.from("ical_feeds").update(payload).eq("id", String(id))
    : await supabase.from("ical_feeds").insert(payload);

  if (error) {
    return { error: "Não foi possível guardar o feed. Tenta novamente." };
  }

  revalidatePath(`/alojamentos/${parsed.data.propertyId}/canais`);
  return { success: true };
}

export async function deleteIcalFeed(
  feedId: string,
  propertyId: string,
): Promise<{ error: string } | { success: true }> {
  const denied = await requirePermission("quartos");
  if (denied) return denied;

  const supabase = await createClient();
  const { error } = await supabase.from("ical_feeds").delete().eq("id", feedId);

  if (error) {
    return { error: "Não foi possível remover o feed. Tenta novamente." };
  }

  revalidatePath(`/alojamentos/${propertyId}/canais`);
  return { success: true };
}

export async function toggleIcalFeedActive(
  feedId: string,
  isActive: boolean,
  propertyId: string,
): Promise<{ error: string } | { success: true }> {
  const denied = await requirePermission("quartos");
  if (denied) return denied;

  const supabase = await createClient();
  const { error } = await supabase
    .from("ical_feeds")
    .update({ is_active: isActive })
    .eq("id", feedId);

  if (error) {
    return { error: "Não foi possível atualizar o feed. Tenta novamente." };
  }

  revalidatePath(`/alojamentos/${propertyId}/canais`);
  return { success: true };
}

export async function syncFeedNow(
  feedId: string,
  propertyId: string,
): Promise<{ error: string } | { success: true; result: SyncResult }> {
  const denied = await requirePermission("quartos");
  if (denied) return denied;

  const admin = createAdminClient();
  if (!admin) {
    return {
      error:
        "Falta a chave service_role do Supabase no servidor (SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  const { data: feed } = await admin
    .from("ical_feeds")
    .select("*")
    .eq("id", feedId)
    .maybeSingle();

  if (!feed) {
    return { error: "Feed não encontrado." };
  }

  const result = await syncIcalFeed(admin, feed as IcalFeed);
  revalidatePath(`/alojamentos/${propertyId}/canais`);

  return { success: true, result };
}
