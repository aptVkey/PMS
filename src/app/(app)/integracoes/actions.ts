"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import Stripe from "stripe";
import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/permissions";
import {
  appUrl,
  maskSecret,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
} from "@/lib/stripe";
import { ANTHROPIC_API_KEY, GEMINI_API_KEY, verifyGeminiKey } from "@/lib/ai";
import { AI_PROVIDERS, type AiProvider } from "@/lib/ai-providers";
import { RESEND_API_KEY } from "@/lib/resend";
import {
  WHATSAPP_ACCESS_TOKEN,
  verifyWhatsAppCredentials,
} from "@/lib/whatsapp";
import {
  PAYBYRD_API_KEY,
  PAYBYRD_WEBHOOK_PASSWORD,
  listPaybyrdWebhooks,
  registerPaybyrdWebhook,
  verifyPaybyrdApiKey,
} from "@/lib/paybyrd";
import { readIntegrationSecret } from "@/lib/integrations";

const StripeSettingsSchema = z.object({
  // Vazio significa "manter a chave que já lá está" — assim o formulário pode
  // ser gravado só para mudar o URL, sem obrigar a recolar os segredos.
  secretKey: z.string().optional(),
  webhookSecret: z.string().optional(),
  appUrl: z
    .union([
      z.url({ error: "Indica um URL válido (com https://)." }),
      z.literal(""),
    ])
    .optional(),
});

export type IntegrationsFormState =
  { error: string } | { success: true; message: string } | undefined;

export async function saveStripeSettings(
  _prevState: IntegrationsFormState,
  formData: FormData,
): Promise<IntegrationsFormState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = StripeSettingsSchema.safeParse({
    secretKey: (formData.get("secretKey") as string)?.trim() || undefined,
    webhookSecret:
      (formData.get("webhookSecret") as string)?.trim() || undefined,
    appUrl: (formData.get("appUrl") as string)?.trim() || undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Verifica os campos.",
    };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      error:
        "Falta a chave service_role do Supabase no servidor (SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  const update: Record<string, unknown> = {};

  if (parsed.data.secretKey) {
    if (!parsed.data.secretKey.startsWith("sk_")) {
      return {
        error:
          "A chave secreta da Stripe começa por sk_. Não uses aqui a chave publicável (pk_).",
      };
    }

    // Confirma a chave contra a Stripe antes de a guardar: mais vale falhar
    // aqui do que no primeiro hóspede a tentar pagar.
    let accountLabel: string;
    try {
      const account = await new Stripe(
        parsed.data.secretKey,
      ).accounts.retrieveCurrent();
      accountLabel =
        account.business_profile?.name ??
        account.settings?.dashboard?.display_name ??
        account.email ??
        account.id;
    } catch {
      return {
        error: "A Stripe recusou esta chave. Confirma que a copiaste inteira.",
      };
    }

    const { error } = await admin.rpc("set_integration_secret", {
      p_name: STRIPE_SECRET_KEY,
      p_value: parsed.data.secretKey,
    });

    if (error) {
      return { error: "Não foi possível guardar a chave. Tenta novamente." };
    }

    update.stripe_secret_hint = maskSecret(parsed.data.secretKey);
    update.stripe_account_label = accountLabel;
  }

  if (parsed.data.webhookSecret) {
    if (!parsed.data.webhookSecret.startsWith("whsec_")) {
      return { error: "O segredo do webhook começa por whsec_." };
    }

    const { error } = await admin.rpc("set_integration_secret", {
      p_name: STRIPE_WEBHOOK_SECRET,
      p_value: parsed.data.webhookSecret,
    });

    if (error) {
      return {
        error:
          "Não foi possível guardar o segredo do webhook. Tenta novamente.",
      };
    }

    update.stripe_webhook_set = true;
  }

  if (parsed.data.appUrl !== undefined) {
    update.app_url = parsed.data.appUrl || null;
  }

  if (Object.keys(update).length === 0) {
    return { error: "Não indicaste nada para guardar." };
  }

  const { error } = await admin
    .from("integration_settings")
    .update(update)
    .eq("id", true);

  if (error) {
    return {
      error: "Não foi possível guardar as definições. Tenta novamente.",
    };
  }

  revalidatePath("/integracoes");
  return { success: true, message: "Definições da Stripe guardadas." };
}

export async function disconnectStripe(): Promise<
  { error: string } | { success: true }
> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const admin = createAdminClient();
  if (!admin) {
    return { error: "Sem acesso ao servidor de dados." };
  }

  // Apagar o segredo do Vault é o que efetivamente desliga: sem chave, o
  // createStripeClient devolve null e a página pública volta ao modo pedido.
  await admin.rpc("set_integration_secret", {
    p_name: STRIPE_SECRET_KEY,
    p_value: "",
  });
  await admin.rpc("set_integration_secret", {
    p_name: STRIPE_WEBHOOK_SECRET,
    p_value: "",
  });

  const { error } = await admin
    .from("integration_settings")
    .update({
      stripe_secret_hint: null,
      stripe_webhook_set: false,
      stripe_account_label: null,
    })
    .eq("id", true);

  if (error) {
    return { error: "Não foi possível desligar a Stripe. Tenta novamente." };
  }

  revalidatePath("/integracoes");
  return { success: true };
}

const AnthropicSettingsSchema = z.object({
  apiKey: z.string().min(1, { error: "Indica a chave de API." }),
});

export async function saveAnthropicSettings(
  _prevState: IntegrationsFormState,
  formData: FormData,
): Promise<IntegrationsFormState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = AnthropicSettingsSchema.safeParse({
    apiKey: (formData.get("apiKey") as string)?.trim(),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifica os campos." };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      error:
        "Falta a chave service_role do Supabase no servidor (SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  // Confirma a chave contra a Anthropic antes de a guardar: mais vale falhar
  // aqui do que na primeira fatura que alguém tentar ler.
  try {
    await new Anthropic({ apiKey: parsed.data.apiKey }).models.list({
      limit: 1,
    });
  } catch {
    return {
      error: "A Anthropic recusou esta chave. Confirma que a copiaste inteira.",
    };
  }

  const { error: secretError } = await admin.rpc("set_integration_secret", {
    p_name: ANTHROPIC_API_KEY,
    p_value: parsed.data.apiKey,
  });

  if (secretError) {
    return { error: "Não foi possível guardar a chave. Tenta novamente." };
  }

  const { error } = await admin
    .from("integration_settings")
    .update({ anthropic_key_hint: maskSecret(parsed.data.apiKey) })
    .eq("id", true);

  if (error) {
    return {
      error: "Não foi possível guardar as definições. Tenta novamente.",
    };
  }

  revalidatePath("/integracoes");
  return { success: true, message: "Chave da Anthropic guardada." };
}

export async function disconnectAnthropic(): Promise<
  { error: string } | { success: true }
> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const admin = createAdminClient();
  if (!admin) {
    return { error: "Sem acesso ao servidor de dados." };
  }

  await admin.rpc("set_integration_secret", {
    p_name: ANTHROPIC_API_KEY,
    p_value: "",
  });

  const { error } = await admin
    .from("integration_settings")
    .update({ anthropic_key_hint: null })
    .eq("id", true);

  // Se era o fornecedor escolhido, volta ao automático.
  await admin
    .from("integration_settings")
    .update({ ai_provider: null })
    .eq("id", true)
    .eq("ai_provider", "anthropic");

  if (error) {
    return { error: "Não foi possível desligar a IA. Tenta novamente." };
  }

  revalidatePath("/integracoes");
  return { success: true };
}

const GeminiSettingsSchema = z.object({
  apiKey: z.string().min(1, { error: "Indica a chave de API." }),
});

export async function saveGeminiSettings(
  _prevState: IntegrationsFormState,
  formData: FormData,
): Promise<IntegrationsFormState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = GeminiSettingsSchema.safeParse({
    apiKey: (formData.get("apiKey") as string)?.trim(),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifica os campos." };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      error:
        "Falta a chave service_role do Supabase no servidor (SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  if (!(await verifyGeminiKey(parsed.data.apiKey))) {
    return {
      error: "A Google recusou esta chave. Confirma que a copiaste inteira.",
    };
  }

  const { error: secretError } = await admin.rpc("set_integration_secret", {
    p_name: GEMINI_API_KEY,
    p_value: parsed.data.apiKey,
  });

  if (secretError) {
    return { error: "Não foi possível guardar a chave. Tenta novamente." };
  }

  const { error } = await admin
    .from("integration_settings")
    .update({ gemini_key_hint: maskSecret(parsed.data.apiKey) })
    .eq("id", true);

  if (error) {
    return {
      error: "Não foi possível guardar as definições. Tenta novamente.",
    };
  }

  revalidatePath("/integracoes");
  return { success: true, message: "Chave da Gemini guardada." };
}

export async function disconnectGemini(): Promise<
  { error: string } | { success: true }
> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const admin = createAdminClient();
  if (!admin) {
    return { error: "Sem acesso ao servidor de dados." };
  }

  await admin.rpc("set_integration_secret", {
    p_name: GEMINI_API_KEY,
    p_value: "",
  });

  const { error } = await admin
    .from("integration_settings")
    .update({ gemini_key_hint: null })
    .eq("id", true);

  if (error) {
    return { error: "Não foi possível desligar a Gemini. Tenta novamente." };
  }

  await admin
    .from("integration_settings")
    .update({ ai_provider: null })
    .eq("id", true)
    .eq("ai_provider", "gemini");

  revalidatePath("/integracoes");
  return { success: true };
}

// Escolhe qual fornecedor lê as faturas quando há mais do que um ligado.
export async function setAiProvider(
  provider: AiProvider,
): Promise<{ error: string } | { success: true }> {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!AI_PROVIDERS.includes(provider)) {
    return { error: "Fornecedor inválido." };
  }

  const admin = createAdminClient();
  if (!admin) {
    return { error: "Sem acesso ao servidor de dados." };
  }

  const { error } = await admin
    .from("integration_settings")
    .update({ ai_provider: provider })
    .eq("id", true);

  if (error) {
    return { error: "Não foi possível guardar a escolha. Tenta novamente." };
  }

  revalidatePath("/integracoes");
  return { success: true };
}

const ResendSettingsSchema = z.object({
  apiKey: z.string().optional(),
  fromEmail: z.email({ error: "Indica um email válido." }),
  fromName: z.string().optional(),
});

export async function saveResendSettings(
  _prevState: IntegrationsFormState,
  formData: FormData,
): Promise<IntegrationsFormState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = ResendSettingsSchema.safeParse({
    apiKey: (formData.get("apiKey") as string)?.trim() || undefined,
    fromEmail: (formData.get("fromEmail") as string)?.trim(),
    fromName: (formData.get("fromName") as string)?.trim() || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifica os campos." };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      error:
        "Falta a chave service_role do Supabase no servidor (SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  const update: Record<string, unknown> = {
    resend_from_email: parsed.data.fromEmail,
    resend_from_name: parsed.data.fromName ?? null,
  };

  if (parsed.data.apiKey) {
    // Confirma a chave contra a Resend antes de a guardar: mais vale falhar
    // aqui do que na primeira campanha que alguém tentar enviar.
    const { error: resendError } = await new Resend(
      parsed.data.apiKey,
    ).apiKeys.list();

    if (resendError) {
      return {
        error: "A Resend recusou esta chave. Confirma que a copiaste inteira.",
      };
    }

    const { error: secretError } = await admin.rpc("set_integration_secret", {
      p_name: RESEND_API_KEY,
      p_value: parsed.data.apiKey,
    });

    if (secretError) {
      return { error: "Não foi possível guardar a chave. Tenta novamente." };
    }

    update.resend_key_hint = maskSecret(parsed.data.apiKey);
  }

  const { error } = await admin
    .from("integration_settings")
    .update(update)
    .eq("id", true);

  if (error) {
    return {
      error: "Não foi possível guardar as definições. Tenta novamente.",
    };
  }

  revalidatePath("/integracoes");
  return { success: true, message: "Definições da Resend guardadas." };
}

export async function disconnectResend(): Promise<
  { error: string } | { success: true }
> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const admin = createAdminClient();
  if (!admin) {
    return { error: "Sem acesso ao servidor de dados." };
  }

  await admin.rpc("set_integration_secret", {
    p_name: RESEND_API_KEY,
    p_value: "",
  });

  const { error } = await admin
    .from("integration_settings")
    .update({ resend_key_hint: null })
    .eq("id", true);

  if (error) {
    return { error: "Não foi possível desligar a Resend. Tenta novamente." };
  }

  revalidatePath("/integracoes");
  return { success: true };
}

const WhatsAppSettingsSchema = z.object({
  // Vazio significa "manter o token que já lá está".
  accessToken: z.string().optional(),
  phoneNumberId: z.string().min(1, { error: "Indica o Phone Number ID." }),
  businessAccountId: z.string().optional(),
});

export async function saveWhatsAppSettings(
  _prevState: IntegrationsFormState,
  formData: FormData,
): Promise<IntegrationsFormState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = WhatsAppSettingsSchema.safeParse({
    accessToken: (formData.get("accessToken") as string)?.trim() || undefined,
    phoneNumberId: (formData.get("phoneNumberId") as string)?.trim(),
    businessAccountId:
      (formData.get("businessAccountId") as string)?.trim() || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifica os campos." };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      error:
        "Falta a chave service_role do Supabase no servidor (SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  // Se não vier token novo, valida com o que já está guardado — precisamos
  // sempre de confirmar a combinação (token, phone number id) contra a Meta,
  // mesmo que só o Phone Number ID tenha mudado.
  const tokenToVerify =
    parsed.data.accessToken ??
    (await readIntegrationSecret(WHATSAPP_ACCESS_TOKEN));

  if (!tokenToVerify) {
    return { error: "Indica o token de acesso." };
  }

  const verification = await verifyWhatsAppCredentials(
    tokenToVerify,
    parsed.data.phoneNumberId,
  );

  if (!verification.success) {
    return { error: verification.error };
  }

  if (parsed.data.accessToken) {
    const { error: secretError } = await admin.rpc("set_integration_secret", {
      p_name: WHATSAPP_ACCESS_TOKEN,
      p_value: parsed.data.accessToken,
    });

    if (secretError) {
      return { error: "Não foi possível guardar o token. Tenta novamente." };
    }
  }

  const { error } = await admin
    .from("integration_settings")
    .update({
      whatsapp_token_hint: maskSecret(tokenToVerify),
      whatsapp_phone_number_id: parsed.data.phoneNumberId,
      whatsapp_business_account_id: parsed.data.businessAccountId ?? null,
      whatsapp_verified_name: verification.verifiedName || null,
    })
    .eq("id", true);

  if (error) {
    return {
      error: "Não foi possível guardar as definições. Tenta novamente.",
    };
  }

  revalidatePath("/integracoes");
  return {
    success: true,
    message: `WhatsApp ligado (${verification.displayPhoneNumber || verification.verifiedName || "sem nome"}).`,
  };
}

export async function disconnectWhatsApp(): Promise<
  { error: string } | { success: true }
> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const admin = createAdminClient();
  if (!admin) {
    return { error: "Sem acesso ao servidor de dados." };
  }

  await admin.rpc("set_integration_secret", {
    p_name: WHATSAPP_ACCESS_TOKEN,
    p_value: "",
  });

  const { error } = await admin
    .from("integration_settings")
    .update({
      whatsapp_token_hint: null,
      whatsapp_phone_number_id: null,
      whatsapp_business_account_id: null,
      whatsapp_verified_name: null,
    })
    .eq("id", true);

  if (error) {
    return { error: "Não foi possível desligar o WhatsApp. Tenta novamente." };
  }

  revalidatePath("/integracoes");
  return { success: true };
}

const PaybyrdSettingsSchema = z.object({
  apiKey: z.string().min(1, { error: "Indica a chave de API." }),
});

export async function savePaybyrdSettings(
  _prevState: IntegrationsFormState,
  formData: FormData,
): Promise<IntegrationsFormState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = PaybyrdSettingsSchema.safeParse({
    apiKey: (formData.get("apiKey") as string)?.trim(),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifica os campos." };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      error:
        "Falta a chave service_role do Supabase no servidor (SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  // Confirma a chave contra a Paybyrd antes de a guardar: mais vale falhar
  // aqui do que na primeira reserva que alguém tentar pagar.
  const verification = await verifyPaybyrdApiKey(parsed.data.apiKey);
  if (!verification.success) {
    return { error: verification.error };
  }

  const { error: secretError } = await admin.rpc("set_integration_secret", {
    p_name: PAYBYRD_API_KEY,
    p_value: parsed.data.apiKey,
  });

  if (secretError) {
    return { error: "Não foi possível guardar a chave. Tenta novamente." };
  }

  // A chave sozinha não chega para receber notificações de pagamento — é
  // preciso também registar o endpoint de webhook desta app na Paybyrd, que
  // gera credenciais próprias (webhookUser/webhookPassword) para o
  // autenticar. Reaproveita o registo se já existir um para este URL, em
  // vez de duplicar a cada vez que a chave é guardada.
  const base = await appUrl();
  const webhookUrl = `${base}/api/paybyrd/webhook`;
  const existingWebhooks = await listPaybyrdWebhooks(parsed.data.apiKey);
  const existing = existingWebhooks.find((w) => w.url === webhookUrl);

  const webhookUpdate: Record<string, unknown> = {
    paybyrd_key_hint: maskSecret(parsed.data.apiKey),
  };

  if (existing) {
    webhookUpdate.paybyrd_webhook_id = existing.id;
    webhookUpdate.paybyrd_webhook_user = existing.webhookUser;
    await admin.rpc("set_integration_secret", {
      p_name: PAYBYRD_WEBHOOK_PASSWORD,
      p_value: existing.webhookPassword,
    });
  } else {
    const registration = await registerPaybyrdWebhook(
      parsed.data.apiKey,
      webhookUrl,
    );
    if (registration.success) {
      webhookUpdate.paybyrd_webhook_id = registration.webhook.id;
      webhookUpdate.paybyrd_webhook_user = registration.webhook.webhookUser;
      await admin.rpc("set_integration_secret", {
        p_name: PAYBYRD_WEBHOOK_PASSWORD,
        p_value: registration.webhook.webhookPassword,
      });
    }
    // Se o registo do webhook falhar, a chave fica na mesma guardada — só
    // não há notificações automáticas até se tentar guardar de novo.
  }

  const { error } = await admin
    .from("integration_settings")
    .update(webhookUpdate)
    .eq("id", true);

  if (error) {
    return {
      error: "Não foi possível guardar as definições. Tenta novamente.",
    };
  }

  revalidatePath("/integracoes");
  return { success: true, message: "Chave da Paybyrd guardada." };
}

export async function disconnectPaybyrd(): Promise<
  { error: string } | { success: true }
> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const admin = createAdminClient();
  if (!admin) {
    return { error: "Sem acesso ao servidor de dados." };
  }

  await admin.rpc("set_integration_secret", {
    p_name: PAYBYRD_API_KEY,
    p_value: "",
  });
  await admin.rpc("set_integration_secret", {
    p_name: PAYBYRD_WEBHOOK_PASSWORD,
    p_value: "",
  });

  const { error } = await admin
    .from("integration_settings")
    .update({
      paybyrd_key_hint: null,
      paybyrd_webhook_id: null,
      paybyrd_webhook_user: null,
    })
    .eq("id", true);

  if (error) {
    return { error: "Não foi possível desligar a Paybyrd. Tenta novamente." };
  }

  revalidatePath("/integracoes");
  return { success: true };
}
