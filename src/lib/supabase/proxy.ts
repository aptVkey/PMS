import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isPublicPath as isPublic, requiredPermissionsFor } from "@/lib/access";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getClaims() valida o token localmente (chaves ES256 do projeto) e renova
  // a sessão quando é preciso — sem a ida à rede do getUser() em cada pedido.
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  let userId =
    typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;
  // Recurso: se a validação local falhar, confirma no servidor de
  // autenticação (como antes) em vez de mandar a pessoa para o login.
  if (!userId && claimsError) {
    const { data: fallback } = await supabase.auth.getUser();
    userId = fallback.user?.id ?? null;
  }
  const user = userId ? { id: userId } : null;

  const isPublicPath = isPublic(request.nextUrl.pathname);

  if (!user && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (user && request.nextUrl.pathname === "/login") {
    const dashboardUrl = new URL("/", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  if (user && !isPublicPath) {
    const { data: staff } = await supabase
      .from("staff")
      .select("permissions, active")
      .eq("id", user.id)
      .maybeSingle();

    if (staff && !staff.active) {
      await supabase.auth.signOut();
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    const requiredPermissions = requiredPermissionsFor(
      request.nextUrl.pathname,
    );

    const permissions: string[] = staff?.permissions ?? [];

    if (
      requiredPermissions &&
      !requiredPermissions.some((key) => permissions.includes(key))
    ) {
      const dashboardUrl = new URL("/", request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return response;
}
