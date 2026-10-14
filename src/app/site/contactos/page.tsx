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
      <section className="border-b border-border">
        <div className="mx-auto max-w-[1200px] px-6 py-24 text-center">
          <p className="text-[12px] font-medium uppercase tracking-[0.3em] text-ink-subdued">
            Contactos
          </p>
          <h1 className="mx-auto mt-4 max-w-2xl font-serif text-[40px] font-normal leading-tight tracking-tight text-ink sm:text-[54px]">
            Vamos falar sobre a tua estadia
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-ink-muted">
            Tens uma dúvida ou queres reservar? Escreve-nos e respondemos o mais
            depressa possível.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1200px] gap-12 px-6 py-16 lg:grid-cols-[1fr_340px]">
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
