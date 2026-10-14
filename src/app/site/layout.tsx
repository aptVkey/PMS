import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { SITE } from "@/lib/site";
import { SiteHeader } from "./site-header";
import { NewsletterForm } from "./newsletter-form";

export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s · ${SITE.name}` },
  description: SITE.heroSubtitle,
};

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { contact } = SITE;

  return (
    <div className="flex min-h-svh flex-col bg-canvas">
      <SiteHeader name={SITE.name} />
      <main className="flex-1">{children}</main>

      <footer className="bg-primary text-white">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-6 py-16 md:grid-cols-[1.2fr_1fr_1.4fr]">
          <div>
            <span className="font-serif text-[26px] font-normal tracking-tight">
              {SITE.name}
            </span>
            <p className="mt-4 max-w-xs text-body text-white/70">
              {SITE.tagline}
            </p>
            <ul className="mt-6 flex flex-col gap-2 text-body text-white/80">
              {contact.email && (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4" strokeWidth={2} />
                  {contact.email}
                </li>
              )}
              {contact.phone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4" strokeWidth={2} />
                  {contact.phone}
                </li>
              )}
              {contact.address && (
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" strokeWidth={2} />
                  {contact.address}
                </li>
              )}
            </ul>
          </div>

          <nav aria-label="Rodapé">
            <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-white/50">
              Explorar
            </p>
            <ul className="mt-4 flex flex-col gap-2.5 text-body">
              <li>
                <Link href="/site#alojamentos" className="hover:underline">
                  Alojamentos
                </Link>
              </li>
              <li>
                <Link href="/site#reviews" className="hover:underline">
                  Reviews
                </Link>
              </li>
              <li>
                <Link href="/site#sobre" className="hover:underline">
                  Sobre nós
                </Link>
              </li>
              <li>
                <Link href="/site/contactos" className="hover:underline">
                  Contactos
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-white/50">
              Newsletter
            </p>
            <p className="mt-4 font-serif text-[22px] font-normal leading-snug">
              Novidades e ofertas diretas na tua caixa de email.
            </p>
            <p className="mt-2 text-body text-white/70">
              Sem spam. Podes sair quando quiseres.
            </p>
            <div className="mt-5">
              <NewsletterForm />
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <p className="mx-auto max-w-[1200px] px-6 py-5 text-[12px] text-white/50">
            © {new Date().getFullYear()} {SITE.name}. Todos os direitos
            reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
