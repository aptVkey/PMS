import { createClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/stripe";
import { IntegracoesClient } from "./integracoes-client";

export default async function IntegracoesPage() {
  const supabase = await createClient();

  // A policy integration_settings_select só devolve linha a quem tem a
  // permissão 'equipas' — para os restantes os cartões ficam sem conteúdo.
  const { data: settings } = await supabase
    .from("integration_settings")
    .select(
      "stripe_secret_hint, stripe_webhook_set, stripe_account_label, app_url, anthropic_key_hint, gemini_key_hint, ai_provider, resend_key_hint, resend_from_email, resend_from_name, whatsapp_token_hint, whatsapp_phone_number_id, whatsapp_business_account_id, whatsapp_verified_name, paybyrd_key_hint, paybyrd_webhook_id",
    )
    .eq("id", true)
    .maybeSingle();

  const base = await appUrl();

  return <IntegracoesClient settings={settings} appUrl={base} />;
}
