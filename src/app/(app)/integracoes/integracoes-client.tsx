"use client";

import { useState } from "react";
import { CreditCard, MessageSquare, Sparkles } from "lucide-react";
import { StripeCard } from "./stripe-card";
import { PaybyrdCard } from "./paybyrd-card";
import { AnthropicCard } from "./anthropic-card";
import { GeminiCard } from "./gemini-card";
import { AiProviderPicker } from "./ai-provider-picker";
import type { AiProvider } from "@/lib/ai-providers";
import { ResendCard } from "./resend-card";
import { WhatsAppCard } from "./whatsapp-card";

type Tab = "pagamentos" | "comunicacao" | "ia";

const TABS: { key: Tab; label: string; icon: typeof CreditCard }[] = [
  { key: "pagamentos", label: "Pagamentos", icon: CreditCard },
  { key: "comunicacao", label: "Comunicação", icon: MessageSquare },
  { key: "ia", label: "Inteligência artificial", icon: Sparkles },
];

type Settings = {
  stripe_secret_hint: string | null;
  stripe_webhook_set: boolean;
  stripe_account_label: string | null;
  app_url: string | null;
  anthropic_key_hint: string | null;
  gemini_key_hint: string | null;
  ai_provider: AiProvider | null;
  resend_key_hint: string | null;
  resend_from_email: string | null;
  resend_from_name: string | null;
  whatsapp_token_hint: string | null;
  whatsapp_phone_number_id: string | null;
  whatsapp_business_account_id: string | null;
  whatsapp_verified_name: string | null;
  paybyrd_key_hint: string | null;
  paybyrd_webhook_id: string | null;
};

function NoAccess() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-canvas py-16 text-center">
      <p className="text-body font-semibold text-ink">
        Sem acesso às integrações
      </p>
      <p className="mt-1 text-body text-ink-subdued">
        Só o Administrador pode configurar chaves de API.
      </p>
    </div>
  );
}

export function IntegracoesClient({
  settings,
  appUrl,
}: {
  settings: Settings | null;
  appUrl: string;
}) {
  const [tab, setTab] = useState<Tab>("pagamentos");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[24px] font-bold text-ink">Integrações</h1>
        <p className="mt-1 text-body text-ink-muted">
          Liga o teu PMS a pagamentos e outras ferramentas. Canais de reserva e
          obrigações legais (SIBA) configuram-se dentro de cada alojamento, em
          Alojamentos.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-md border border-border p-0.5 sm:w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex min-h-9 items-center gap-1.5 rounded px-3 text-[13px] font-semibold transition-colors duration-fast ease-standard ${
              tab === key
                ? "bg-surface-2 text-primary"
                : "text-ink-muted hover:bg-surface-1"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>

      <div>
        {tab === "pagamentos" &&
          (settings ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
              <StripeCard
                secretHint={settings.stripe_secret_hint}
                webhookSet={settings.stripe_webhook_set}
                accountLabel={settings.stripe_account_label}
                appUrl={settings.app_url ?? appUrl}
                webhookUrl={`${appUrl}/api/stripe/webhook`}
              />
              <PaybyrdCard
                keyHint={settings.paybyrd_key_hint}
                webhookSet={Boolean(settings.paybyrd_webhook_id)}
              />
            </div>
          ) : (
            <NoAccess />
          ))}

        {tab === "comunicacao" &&
          (settings ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
              <ResendCard
                keyHint={settings.resend_key_hint}
                fromEmail={settings.resend_from_email}
                fromName={settings.resend_from_name}
              />
              <WhatsAppCard
                tokenHint={settings.whatsapp_token_hint}
                phoneNumberId={settings.whatsapp_phone_number_id}
                businessAccountId={settings.whatsapp_business_account_id}
                verifiedName={settings.whatsapp_verified_name}
              />
            </div>
          ) : (
            <NoAccess />
          ))}

        {tab === "ia" &&
          (settings ? (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
                <AnthropicCard keyHint={settings.anthropic_key_hint} />
                <GeminiCard keyHint={settings.gemini_key_hint} />
              </div>
              <AiProviderPicker
                anthropicConnected={Boolean(settings.anthropic_key_hint)}
                geminiConnected={Boolean(settings.gemini_key_hint)}
                selected={settings.ai_provider}
              />
            </div>
          ) : (
            <NoAccess />
          ))}
      </div>
    </div>
  );
}
