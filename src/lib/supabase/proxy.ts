import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// "/p" é a página pública de cada alojamento: reserva direta, sem sessão.
// O webhook do Stripe também chega sem sessão e seria redirecionado para
// /login — a assinatura é o que o autentica, não um cookie.
// O motor de automação também chega sem sessão (chamado pelo pg_cron) — é o
// segredo partilhado que o autentica, não um cookie, tal como o webhook da
// Stripe. A sincronização iCal é a mesma história (chamada pelo pg_cron), e a
// exportação iCal é pedida diretamente pelo servidor da Booking.com/Airbnb,
// que nunca tem sessão nenhuma.
const PUBLIC_PATHS = [
  "/login",
  "/p/",
  "/site",
  "/api/stripe/webhook",
  "/api/automations/run",
  "/api/ical/sync",
  "/api/ical/export/",
  "/api/paybyrd/webhook",
];

const PATH_PERMISSIONS: Record<string, string[]> = {
  "/alojamentos": ["quartos"],
  "/equipas": ["equipas", "limpeza", "gerir_limpeza", "manutencao"],
  "/hospedes": ["hospedes"],
  "/reservas": ["reservas"],
  "/automacao": ["automacao"],
  "/relatorios": ["relatorios"],
  "/integracoes": ["integracoes"],
  "/inventario": ["inventario"],
  "/caixa": ["caixa"],
  "/email-marketing": ["marketing"],
};

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

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

    const requiredPermissions = Object.entries(PATH_PERMISSIONS).find(
      ([path]) => request.nextUrl.pathname.startsWith(path),
    )?.[1];

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
