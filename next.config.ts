import type { NextConfig } from "next";

// O host do Supabase sai do env em vez de ser fixo, para o projeto continuar
// a funcionar noutra instância sem editar esta configuração.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

const nextConfig: NextConfig = {
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
