import "server-only";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { maskSecret, readIntegrationSecret } from "@/lib/integrations";

export const STRIPE_SECRET_KEY = "stripe_secret_key";
export const STRIPE_WEBHOOK_SECRET = "stripe_webhook_secret";

export { maskSecret, readIntegrationSecret };

export async function createStripeClient(): Promise<Stripe | null> {
  const secretKey =
    (await readIntegrationSecret(STRIPE_SECRET_KEY)) ??
    process.env.STRIPE_SECRET_KEY ??
    null;

  if (!secretKey) return null;

  return new Stripe(secretKey);
}

export async function stripeWebhookSecret(): Promise<string | null> {
  return (
    (await readIntegrationSecret(STRIPE_WEBHOOK_SECRET)) ??
    process.env.STRIPE_WEBHOOK_SECRET ??
    null
  );
}

// URL base usada nos returns do Checkout e para montar o endereço do webhook.
export async function appUrl(): Promise<string> {
  const admin = createAdminClient();

  if (admin) {
    const { data } = await admin
      .from("integration_settings")
      .select("app_url")
      .eq("id", true)
      .maybeSingle();

    const configured = (data?.app_url as string | null)?.trim();
    if (configured) return configured.replace(/\/$/, "");
  }

  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}
