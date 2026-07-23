import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import type { PermissionKey } from "@/lib/staff";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: staff } = user
    ? await supabase
        .from("staff")
        .select("permissions")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const permissions: PermissionKey[] = staff?.permissions ?? [];

  async function logout() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <AppShell
      permissions={permissions}
      userEmail={user?.email ?? ""}
      logoutAction={logout}
    >
      {children}
    </AppShell>
  );
}
