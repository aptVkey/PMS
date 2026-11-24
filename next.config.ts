import type { NextConfig } from "next";

// O host do Supabase sai do env em vez de ser fixo, para o projeto continuar
// a funcionar noutra instância sem editar esta configuração.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

// Cabeçalhos de segurança aplicados a todas as respostas.
const securityHeaders = [
  // Ninguém pode embeber o PMS/site numa iframe de outro domínio (clickjacking).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  // O browser não tenta adivinhar tipos de ficheiro.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Links externos não recebem o URL completo (pode ter ids).
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Funcionalidades do browser que o PMS não usa ficam desligadas.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // Em produção (HTTPS), obriga o browser a usar sempre HTTPS.
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
  experimental: {
    // As fotos deixaram de passar por aqui — vão direto do browser para o
    // Supabase Storage (ver upload-photos.ts). Este limite só cobre os
    // campos de texto normais dos formulários, por isso volta a um valor
    // baixo em vez de acompanhar o tamanho de ficheiros.
    serverActions: {
      bodySizeLimit: "2mb",
    },
    // O proxy (src/proxy.ts) corre em todos os pedidos, incluindo os POST das
    // server actions, e tem o seu próprio limite de corpo — tem de acompanhar
    // o bodySizeLimit acima.
    proxyClientMaxBodySize: "2mb",
  },
};

export default nextConfig;
