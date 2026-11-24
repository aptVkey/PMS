import { SITE } from "@/lib/site";
import { siteSans, siteSerif } from "./fonts";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

// Moldura comum do website público: tema, fontes, cabeçalho e rodapé.
export function SiteFrame({
  children,
  footer = true,
}: {
  children: React.ReactNode;
  footer?: boolean;
}) {
  return (
    <div
      className={`site-theme ${siteSerif.variable} ${siteSans.variable} flex min-h-svh flex-col antialiased`}
    >
      {/* Sem JavaScript, o conteúdo nunca fica escondido à espera da animação. */}
      <noscript>
        <style>{`.site-reveal,.site-reveal-img{opacity:1!important;transform:none!important;clip-path:none!important}`}</style>
      </noscript>
      <SiteHeader name={SITE.name} />
      <main className="flex-1">{children}</main>
      {footer && <SiteFooter />}
    </div>
  );
}
