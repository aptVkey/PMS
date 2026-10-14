import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readIntegrationSecret } from "@/lib/integrations";
import {
  PAYBYRD_WEBHOOK_PASSWORD,
  verifyPaybyrdWebhookAuth,
} from "@/lib/paybyrd";

// Chamada pela Paybyrd quando o estado de uma order/transação muda — nunca
// tem sessão, por isso a autenticação é a credencial Basic que a própria
// Paybyrd gerou ao registarmos o webhook (ver registerPaybyrdWebhook em
// src/lib/paybyrd.ts e savePaybyrdSettings em integracoes/actions.ts).
//
// Estrutura pronta: valida a origem do pedido e devolve 200, mas ainda não
// atualiza nenhuma reserva — falta ligar isto ao fluxo de checkout quando a
// Paybyrd passar a ser usada para cobrar reservas de verdade.
export async function POST(request: NextRequest) {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Servidor sem acesso aos dados." },
      { status: 503 },
    );
  }

  const { data: settings } = await admin
    .from("integration_settings")
    .select("paybyrd_webhook_user")
    .eq("id", true)
    .maybeSingle();

  const webhookUser = settings?.paybyrd_webhook_user as string | null;
  const webhookPassword = await readIntegrationSecret(PAYBYRD_WEBHOOK_PASSWORD);

  if (!webhookUser || !webhookPassword) {
    return NextResponse.json(
      { error: "Webhook da Paybyrd não está configurado." },
      { status: 503 },
    );
  }

  const authorized = verifyPaybyrdWebhookAuth(
    request.headers.get("authorization"),
    webhookUser,
    webhookPassword,
  );

  if (!authorized) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  return NextResponse.json({ received: true });
}
