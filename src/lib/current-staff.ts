import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requiredPermissionsFor } from "@/lib/access";
import type { PermissionKey } from "@/lib/staff";

export type CurrentStaff = {
  userId: string | null;
  email: string | null;
  active: boolean;
  permissions: PermissionKey[];
};

// Quem está a fazer o pedido, calculado UMA vez por pedido (cache do React):
// o layout, a página e as verificações de permissão partilham o resultado.
// getClaims() valida o token localmente com as chaves públicas do projeto
// (ES256), sem ir à rede como o getUser() — poupa uma ida ao servidor de
// autenticação em cada utilização.
export const getCurrentStaff = cache(async (): Promise<CurrentStaff> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  let claims: Record<string, unknown> | null = data?.claims ?? null;
  // Se a validação local falhar (ex.: chave pública indisponível), confirma
  // no servidor de autenticação em vez de pôr a pessoa fora da sessão.
  if (error && !claims) {
    const { data: fallback } = await supabase.auth.getUser();
    claims = fallback.user
      ? { sub: fallback.user.id, email: fallback.user.email }
      : null;
  }
  const userId = typeof claims?.sub === "string" ? claims.sub : null;

  if (!userId) {
    return { userId: null, email: null, active: false, permissions: [] };
  }

  const { data: staff } = await supabase
    .from("staff")
    .select("permissions, active")
    .eq("id", userId)
    .maybeSingle();

  return {
    userId,
    email: typeof claims?.email === "string" ? claims.email : null,
    active: Boolean(staff?.active),
    permissions: staff?.active
      ? ((staff.permissions as PermissionKey[]) ?? [])
      : [],
  };
});

// Usado no layout de cada área: sem sessão → login; sem permissão → início.
// Repete a regra do proxy para a segurança não depender só dele.
export async function requireSectionAccess(path: string): Promise<void> {
  const me = await getCurrentStaff();
  if (!me.userId) redirect("/login");
  // Sem ficha ativa: o layout da área de gestão mostra o aviso de acesso.
  if (!me.active) redirect("/");

  const required = requiredPermissionsFor(path);
  if (
    required &&
    !required.some((key) => me.permissions.includes(key as PermissionKey))
  ) {
    redirect("/");
  }
}
