import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { getCurrentStaff } from "@/lib/current-staff";
import type { PermissionKey } from "@/lib/staff";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getCurrentStaff();
  // Sem sessão não há área de gestão (reforço do proxy, que normalmente já
  // redirecionou). Com sessão mas sem ficha ativa mostra-se um aviso em vez
  // de redirecionar para /login — o proxy devolvia para aqui (ciclo).
  if (!me.userId) redirect("/login");

  const permissions: PermissionKey[] = me.permissions;

  async function logout() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  if (!me.active) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-surface-1 p-6">
        <div className="max-w-sm rounded-lg border border-border bg-canvas p-6 text-center shadow-card">
          <p className="text-[18px] font-bold text-ink">Sem acesso</p>
          <p className="mt-2 text-body text-ink-muted">
            A tua conta não está ativa como colaborador. Pede ao Administrador
            para te dar acesso.
          </p>
          <form action={logout} className="mt-5">
            <button
              type="submit"
              className="min-h-11 rounded-md border border-border px-4 text-body font-semibold text-ink hover:bg-surface-1"
            >
              Terminar sessão
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <AppShell
      permissions={permissions}
      userEmail={me.email ?? ""}
      logoutAction={logout}
    >
      {children}
    </AppShell>
  );
}
