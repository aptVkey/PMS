import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PermissionKey } from "@/lib/staff";

// As policies RLS já recusam escritas sem permissão, mas devolvem um erro
// genérico do Postgres. Estas guardas correm antes, para o utilizador receber
// uma mensagem clara — e para as server actions não dependerem apenas da
// camada da base de dados.

export type PermissionDenied = { error: string };

export async function getSessionPermissions(): Promise<{
  userId: string | null;
  permissions: PermissionKey[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { userId: null, permissions: [] };

  const { data: staffRow } = await supabase
    .from("staff")
    .select("permissions, active")
    .eq("id", user.id)
    .maybeSingle();

  if (!staffRow?.active) return { userId: user.id, permissions: [] };

  return {
    userId: user.id,
    permissions: (staffRow.permissions as PermissionKey[]) ?? [],
  };
}

// Devolve null quando o utilizador tem pelo menos uma das permissões pedidas,
// ou o erro a devolver diretamente da server action.
export async function requirePermission(
  ...keys: PermissionKey[]
): Promise<PermissionDenied | null> {
  const { userId, permissions } = await getSessionPermissions();

  if (!userId) {
    return { error: "Sessão inválida. Inicia sessão novamente." };
  }

  if (!keys.some((key) => permissions.includes(key))) {
    return { error: "Não tens permissão para esta operação." };
  }

  return null;
}

// "Administrador" nesta app é quem tem a permissão 'equipas'.
export async function requireAdmin(): Promise<PermissionDenied | null> {
  return requirePermission("equipas");
}
