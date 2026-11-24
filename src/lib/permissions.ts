import "server-only";
import { getCurrentStaff } from "@/lib/current-staff";
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
  const { userId, permissions } = await getCurrentStaff();
  return { userId, permissions };
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
