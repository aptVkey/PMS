import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Os segredos de integrações vivem no Vault do Supabase e leem-se com a
// chave de serviço. As variáveis de ambiente continuam a funcionar como
// alternativa, para quem prefira configurar por deploy em vez de pela
// interface (ver cada chamador para o fallback específico).
export async function readIntegrationSecret(
  name: string,
): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin.rpc("get_integration_secret", {
    p_name: name,
  });

  if (error) return null;
  return (data as string | null) || null;
}

// Mostra o suficiente para se reconhecer a chave, sem a revelar.
export function maskSecret(value: string): string {
  const prefix = value.slice(0, 7);
  const suffix = value.slice(-4);
  return `${prefix}••••${suffix}`;
}
