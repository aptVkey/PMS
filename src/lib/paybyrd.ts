import "server-only";
import { readIntegrationSecret } from "@/lib/integrations";

export const PAYBYRD_API_KEY = "paybyrd_api_key";
export const PAYBYRD_WEBHOOK_PASSWORD = "paybyrd_webhook_password";

const PAYBYRD_BASE_URL = "https://gateway.paybyrd.com";

export async function getPaybyrdApiKey(): Promise<string | null> {
  return (
    (await readIntegrationSecret(PAYBYRD_API_KEY)) ??
    process.env.PAYBYRD_API_KEY ??
    null
  );
}

export type PaybyrdVerification =
  { success: true } | { success: false; error: string };

// Chamada sem efeitos secundários (só lista webhooks configurados) — serve
// só para confirmar que a chave é válida antes de a guardar.
export async function verifyPaybyrdApiKey(
  apiKey: string,
): Promise<PaybyrdVerification> {
  try {
    const response = await fetch(`${PAYBYRD_BASE_URL}/api/v2/webhooks`, {
      headers: { "x-api-key": apiKey },
    });

    if (!response.ok) {
      return {
        success: false,
        error: "A Paybyrd recusou esta chave. Confirma que a copiaste inteira.",
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro de rede desconhecido.",
    };
  }
}

export type PaybyrdWebhook = {
  id: string;
  url: string;
  webhookUser: string;
  webhookPassword: string;
};

// A Paybyrd gera e devolve as credenciais do webhook (webhookUser/
// webhookPassword) — não somos nós a escolhê-las, ao contrário do padrão
// usado nas rotas de cron internas desta app.
export async function listPaybyrdWebhooks(
  apiKey: string,
): Promise<PaybyrdWebhook[]> {
  try {
    const response = await fetch(`${PAYBYRD_BASE_URL}/api/v2/webhooks`, {
      headers: { "x-api-key": apiKey },
    });
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

export type RegisterPaybyrdWebhookResult =
  | { success: true; webhook: PaybyrdWebhook }
  | { success: false; error: string };

// Regista o endpoint de webhook desta app na Paybyrd. Sem 'events' no
// pedido, a Paybyrd subscreve todos os eventos disponíveis (confirmado na
// documentação) — fica pronto a filtrar no nosso lado quando for preciso.
export async function registerPaybyrdWebhook(
  apiKey: string,
  webhookUrl: string,
): Promise<RegisterPaybyrdWebhookResult> {
  try {
    const response = await fetch(`${PAYBYRD_BASE_URL}/api/v2/webhooks`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: webhookUrl,
        credentialType: "basic",
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error:
          payload?.description ?? "A Paybyrd recusou o registo do webhook.",
      };
    }

    return { success: true, webhook: payload };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro de rede desconhecido.",
    };
  }
}

// Confirma que um pedido recebido em /api/paybyrd/webhook vem mesmo da
// Paybyrd — compara o header Authorization (Basic) com as credenciais que
// a Paybyrd gerou ao registar o webhook.
export function verifyPaybyrdWebhookAuth(
  authorizationHeader: string | null,
  expectedUser: string,
  expectedPassword: string,
): boolean {
  if (!authorizationHeader?.startsWith("Basic ")) return false;

  try {
    const decoded = Buffer.from(
      authorizationHeader.slice("Basic ".length),
      "base64",
    ).toString("utf-8");
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex === -1) return false;

    const user = decoded.slice(0, separatorIndex);
    const password = decoded.slice(separatorIndex + 1);
    return user === expectedUser && password === expectedPassword;
  } catch {
    return false;
  }
}

export type PaybyrdShopper = {
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
};

export type CreatePaybyrdOrderInput = {
  amount: string;
  currency: string;
  orderRef: string;
  redirectUrl: string;
  shopper: PaybyrdShopper;
  expiresIn?: number;
};

export type CreatePaybyrdOrderResult =
  | { success: true; orderId: string; checkoutUrl: string }
  | { success: false; error: string };

// Pronto a ser chamado a partir da página pública de reserva quando se
// quiser oferecer a Paybyrd como forma de pagamento — cria uma "order" e
// devolve o URL da página de pagamento alojada pela Paybyrd (o hóspede nunca
// introduz dados do cartão nesta app).
export async function createPaybyrdOrder(
  apiKey: string,
  input: CreatePaybyrdOrderInput,
): Promise<CreatePaybyrdOrderResult> {
  try {
    const response = await fetch(`${PAYBYRD_BASE_URL}/api/v2/orders`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: input.amount,
        currency: input.currency,
        orderRef: input.orderRef,
        expiresIn: input.expiresIn ?? 24,
        shopper: {
          firstName: input.shopper.firstName,
          lastName: input.shopper.lastName,
          email: input.shopper.email,
          phoneNumber: input.shopper.phoneNumber,
        },
        orderOptions: {
          redirectUrl: input.redirectUrl,
          checkoutVersion: 2,
        },
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error:
          payload?.description ?? "A Paybyrd recusou o pedido de pagamento.",
      };
    }

    return {
      success: true,
      orderId: payload.orderId,
      checkoutUrl: payload.checkoutUrl,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro de rede desconhecido.",
    };
  }
}

export type PaybyrdOrderStatus = {
  orderId: string;
  status: string;
  raw: Record<string, unknown>;
};

// Pronto a ser chamado pelo webhook da Paybyrd para confirmar o estado real
// da order antes de dar a reserva como paga — a autenticação do webhook da
// Paybyrd (Basic auth simples) é mais fraca do que a assinatura HMAC da
// Stripe, por isso vale a pena confirmar aqui.
export async function getPaybyrdOrder(
  apiKey: string,
  orderId: string,
): Promise<PaybyrdOrderStatus | null> {
  try {
    const response = await fetch(
      `${PAYBYRD_BASE_URL}/api/v2/orders/${orderId}`,
      { headers: { "x-api-key": apiKey } },
    );

    if (!response.ok) return null;

    const payload = await response.json();
    return {
      orderId,
      status: payload.status ?? payload.orderStatus ?? "",
      raw: payload,
    };
  } catch {
    return null;
  }
}
