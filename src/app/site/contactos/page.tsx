import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { SITE } from "@/lib/site";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contactos",
  description: `Fala com a equipa ${SITE.name}.`,
};

export default function ContactPage() {
  const { contact } = SITE;
  const details = [
    { icon: Mail, label: "Email", value: contact.email },
    { icon: Phone, label: "Telefone", value: contact.phone },
    { icon: MapPin, label: "Morada", value: contact.address },
  ].filter((d) => d.value);

  return (
    <>
      <section className="mx-auto max-w-[1440px] px-5 pb-16 pt-16 sm:px-8 lg:px-12 lg:pb-24 lg:pt-24">
        <p className="site-eyebrow text-ink-subdued">Contactos</p>
        <h1 className="site-display mt-8 max-w-[13ch] text-[clamp(52px,8.5vw,136px)] text-ink">
          Vamos falar sobre a tua <em className="text-action">estadia.</em>
        </h1>
        <p className="mt-8 max-w-xl text-[17px] leading-relaxed text-ink-muted">
          Uma dúvida, um pedido especial ou datas que não encontras no
          calendário? Escreve-nos. Do outro lado está uma pessoa, não um robô.
        </p>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-12 border-t border-ink/10 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_380px] lg:px-12 lg:py-24">
        <ContactForm />

        <aside className="flex flex-col gap-4">
          {details.length > 0 ? (
            details.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex items-center gap-4 rounded-2xl border border-border p-5"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-1 text-ink">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] text-ink-subdued">{label}</p>
                  <p className="break-words text-body font-semibold text-ink">
                    {value}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl bg-surface-1 p-6">
              <p className="font-serif text-[20px] text-ink">Resposta rápida</p>
              <p className="mt-1 text-body text-ink-muted">
                Preenche o formulário e entramos em contacto contigo por email.
              </p>
            </div>
          )}
        </aside>
      </section>
    </>
  );
}
