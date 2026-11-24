// Regras de acesso por caminho, partilhadas entre o proxy (que redireciona
// antes de a página correr) e as próprias páginas (que voltam a verificar,
// para a segurança não depender só do proxy).

// Caminhos sem sessão:
// - /p e /site: website e reserva direta;
// - webhooks (Stripe, Paybyrd): autenticados pela assinatura/credenciais;
// - /api/automations/run e /api/ical/sync: chamados pelo pg_cron, com segredo;
// - /api/ical/export: pedido pelos servidores da Booking.com/Airbnb.
export const PUBLIC_PATHS = [
  "/login",
  "/p/",
  "/site",
  "/api/stripe/webhook",
  "/api/automations/run",
  "/api/ical/sync",
  "/api/ical/export/",
  "/api/paybyrd/webhook",
];

export const PATH_PERMISSIONS: Record<string, string[]> = {
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

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

export function requiredPermissionsFor(pathname: string): string[] | null {
  return (
    Object.entries(PATH_PERMISSIONS).find(([path]) =>
      pathname.startsWith(path),
    )?.[1] ?? null
  );
}
