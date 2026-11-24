import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SITE, SITE_LINKS } from "@/lib/site";
import { NewsletterForm } from "@/app/site/newsletter-form";

export function SiteFooter() {
  const { contact } = SITE;
  const details = [
    contact.email && { label: contact.email, href: `mailto:${contact.email}` },
    contact.phone && {
      label: contact.phone,
      href: `tel:${contact.phone.replace(/\s+/g, "")}`,
    },
    contact.address && { label: contact.address, href: null },
  ].filter(Boolean) as { label: string; href: string | null }[];

  return (
    <footer className="site-grain relative overflow-hidden bg-ink text-canvas">
      <div className="relative z-10 mx-auto max-w-[1440px] px-5 pt-24 sm:px-8 lg:px-12">
        <div className="grid gap-16 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div className="max-w-md">
            <p className="site-eyebrow text-canvas/50">Newsletter</p>
            <p className="mt-5 font-serif text-[34px] leading-[1.05] tracking-tight sm:text-[40px]">
              Datas livres, ofertas diretas e pouco mais.{" "}
              <em className="text-canvas/60">Prometido.</em>
            </p>
            <div className="mt-8">
              <NewsletterForm />
            </div>
            <p className="mt-3 text-[12px] text-canvas/50">
              Um email de vez em quando. Sais com um clique.
            </p>
          </div>

          <nav aria-label="Rodapé">
            <p className="site-eyebrow text-canvas/50">Explorar</p>
            <ul className="mt-5 flex flex-col gap-3">
              {SITE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-serif text-[24px] leading-tight text-canvas/85 transition-colors hover:text-canvas"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="site-eyebrow text-canvas/50">Fala connosco</p>
            <ul className="mt-5 flex flex-col gap-3 text-[15px] text-canvas/80">
              {details.map((d) => (
                <li key={d.label}>
                  {d.href ? (
                    <a href={d.href} className="hover:text-canvas">
                      {d.label}
                    </a>
                  ) : (
                    d.label
                  )}
                </li>
              ))}
              <li>
                <Link
                  href="/site/contactos"
                  className="group inline-flex items-center gap-1.5 border-b border-canvas/30 pb-0.5 text-canvas transition-colors hover:border-canvas"
                >
                  Enviar mensagem
                  <ArrowUpRight
                    className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    strokeWidth={1.75}
                  />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-20 flex flex-col gap-2 border-t border-canvas/15 py-6 text-[12px] text-canvas/50 sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE.name}. Todos os direitos
            reservados.
          </p>
          <p>Reservas diretas · Pagamentos seguros</p>
        </div>
      </div>

      {/* Assinatura gigante, cortada pelo fundo da página. */}
      <p
        aria-hidden="true"
        className="relative z-10 -mb-[0.22em] select-none whitespace-nowrap text-center font-serif text-[17vw] leading-none tracking-[-0.04em] text-canvas/[0.07]"
      >
        {SITE.name}
      </p>
    </footer>
  );
}
