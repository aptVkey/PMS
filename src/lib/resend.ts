import "server-only";
import { Resend } from "resend";
import { readIntegrationSecret } from "@/lib/integrations";

export const RESEND_API_KEY = "resend_api_key";

export async function createResendClient(): Promise<Resend | null> {
  const apiKey =
    (await readIntegrationSecret(RESEND_API_KEY)) ??
    process.env.RESEND_API_KEY ??
    null;

  if (!apiKey) return null;

  return new Resend(apiKey);
}
