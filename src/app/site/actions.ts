"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export type SiteFormState =
  { error: string } | { success: true; message: string } | undefined;

const NewsletterSchema = z.object({
  email: z.email({ error: "Indica um email válido." }).max(254),
});

export async function subscribeNewsletter(
  _prev: SiteFormState,
  formData: FormData,
): Promise<SiteFormState> {
  // Campo-armadilha: um humano nunca o preenche.
  if (formData.get("website")) {
    return { success: true, message: "Obrigado! Ficas a par das novidades." };
  }

  const parsed = NewsletterSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Email inválido." };
  }

  const admin = createAdminClient();
  if (!admin) {
    return { error: "Não foi possível subscrever agora. Tenta mais tarde." };
  }

  const { error } = await admin
    .from("newsletter_subscribers")
    .insert({ email: parsed.data.email });

  // 23505 = já subscrito: para o visitante é o mesmo resultado.
  if (error && error.code !== "23505") {
    return { error: "Não foi possível subscrever agora. Tenta mais tarde." };
  }

  return { success: true, message: "Obrigado! Ficas a par das novidades." };
}

const ContactSchema = z.object({
  name: z.string().min(2, { error: "Indica o teu nome." }).max(120),
  email: z.email({ error: "Indica um email válido." }).max(254),
  phone: z.string().max(40).optional(),
  message: z
    .string()
    .min(10, { error: "Escreve uma mensagem com pelo menos 10 caracteres." })
    .max(4000),
});

export async function sendContactMessage(
  _prev: SiteFormState,
  formData: FormData,
): Promise<SiteFormState> {
  if (formData.get("website")) {
    return {
      success: true,
      message: "Mensagem enviada. Respondemos o mais depressa possível.",
    };
  }

  const parsed = ContactSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    message: String(formData.get("message") ?? "").trim(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifica os campos." };
  }

  const admin = createAdminClient();
  if (!admin) {
    return { error: "Não foi possível enviar agora. Tenta mais tarde." };
  }

  const { error } = await admin.from("contact_messages").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone ?? null,
    message: parsed.data.message,
  });

  if (error) {
    return { error: "Não foi possível enviar agora. Tenta mais tarde." };
  }

  return {
    success: true,
    message: "Mensagem enviada. Respondemos o mais depressa possível.",
  };
}
