import "server-only";
import { readIntegrationSecret } from "@/lib/integrations";
import { createAdminClient } from "@/lib/supabase/admin";

export const WHATSAPP_ACCESS_TOKEN = "whatsapp_access_token";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export type WhatsAppConfig = {
  accessToken: string;
  phoneNumberId: string;
};

// Lê o token do Vault e o Phone Number ID de integration_settings. Ambos são
// precisos para poder enviar — sem qualquer um dos dois devolve null.
export async function getWhatsAppConfig(): Promise<WhatsAppConfig | null> {
  const accessToken =
    (await readIntegrationSecret(WHATSAPP_ACCESS_TOKEN)) ??
    process.env.WHATSAPP_ACCESS_TOKEN ??
    null;

  if (!accessToken) return null;

  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from("integration_settings")
    .select("whatsapp_phone_number_id")
    .eq("id", true)
    .maybeSingle();

  const phoneNumberId = data?.whatsapp_phone_number_id as string | null;
  if (!phoneNumberId) return null;

  return { accessToken, phoneNumberId };
}

export type WhatsAppSendResult =
  { success: true; messageId: string } | { success: false; error: string };

// Envia uma mensagem de texto simples. Fora da janela de 24h de uma
// conversa iniciada pelo hóspede, a Meta só aceita mensagens através de um
// modelo (template) pré-aprovado — texto livre é recusado nesse caso.
export async function sendWhatsAppMessage(
  config: WhatsAppConfig,
  to: string,
  text: string,
): Promise<WhatsAppSendResult> {
  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: text },
        }),
      },
    );

    const payload = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: payload?.error?.message ?? "A Meta recusou o envio.",
      };
    }

    return {
      success: true,
      messageId: payload?.messages?.[0]?.id ?? "",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro de rede desconhecido.",
    };
  }
}

export type WhatsAppVerification =
  | { success: true; displayPhoneNumber: string; verifiedName: string }
  | { success: false; error: string };

// Só para validar as credenciais ao guardar em Integrações — confirma que o
// token tem acesso a este Phone Number ID, sem enviar nada.
export async function verifyWhatsAppCredentials(
  accessToken: string,
  phoneNumberId: string,
): Promise<WhatsAppVerification> {
  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/${phoneNumberId}?fields=display_phone_number,verified_name`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const payload = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: payload?.error?.message ?? "A Meta recusou estas credenciais.",
      };
    }

    return {
      success: true,
      displayPhoneNumber: payload.display_phone_number ?? "",
      verifiedName: payload.verified_name ?? "",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro de rede desconhecido.",
    };
  }
}
