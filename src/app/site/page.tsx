import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  Home,
  KeyRound,
  MessageCircle,
  ShieldCheck,
  Star,
} from "lucide-react";
import { SITE } from "@/lib/site";
import { loadSiteProperties, loadSiteReviews } from "@/lib/site-data";
import { PropertyCard } from "./property-card";

// Lê da base de dados a cada pedido: propriedades e reviews mudam sem deploy.
export const dynamic = "force-dynamic";

function Stars({ value }: { value: number }) {
  return (
    <span
      className="flex items-center gap-0.5"
      role="img"
      aria-label={`${value} em 5 estrelas`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < value ? "fill-highlight text-highlight" : "text-border"
          }`}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

const ABOUT_POINTS = [
  {
    icon: ShieldCheck,
    title: "Reserva direta",
    text: "Reservas diretamente connosco, sem intermediários nem comissões escondidas.",
  },
  {
    icon: KeyRound,
    title: "Chegada sem complicações",
    text: "Instruções claras antes da estadia para entrares com tranquilidade.",
  },
  {
    icon: MessageCircle,
    title: "Atendimento próximo",
    text: "Falas com quem gere os alojamentos, antes e durante a tua estadia.",
  },
];

export default async function SiteHomePage() {
  const [properties, reviews] = await Promise.all([
    loadSiteProperties(),
    loadSiteReviews(),
  ]);

  const heroPhoto = properties.find((p) => p.coverPhoto)?.coverPhoto ?? null;
  // A média só conta reviews reais: os exemplos de demonstração não entram.
  const realReviews = reviews.filter((r) => !r.is_demo);
  const averageRating =
    realReviews.length > 0
      ? realReviews.reduce((sum, r) => sum + r.rating, 0) / realReviews.length
      : null;

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="relative isolate flex min-h-[calc(100svh-4rem)] items-center justify-center overflow-hidden bg-primary">
        {heroPhoto && (
          <Image
            src={heroPhoto}
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-20 object-cover"
          />
        )}
        {/* Véu suave: a foto continua a ser a protagonista. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-b from-black/45 via-black/30 to-black/60"
        />

        <div className="mx-auto w-full max-w-3xl px-6 py-28 text-center">
          <p className="text-[12px] font-medium uppercase tracking-[0.32em] text-white/80">
            {SITE.tagline}
          </p>

          <h1 className="mt-7 font-serif text-[42px] font-normal leading-[1.1] tracking-tight text-white sm:text-[60px] lg:text-[72px]">
            {SITE.heroTitle}
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-[17px] leading-relaxed text-white/85">
            {SITE.heroSubtitle}
          </p>

          <div className="mt-12 flex flex-col items-center justify-center gap-5 sm:flex-row sm:gap-8">
            <Link
              href="#alojamentos"
              className="flex min-h-12 items-center gap-2 rounded-pill bg-white px-8 text-[15px] font-semibold text-ink transition-colors duration-base ease-standard hover:bg-white/90"
            >
              Ver alojamentos
              <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
            </Link>
            <Link
              href="/site/contactos"
              className="text-[15px] font-medium text-white underline decoration-white/40 underline-offset-[6px] transition-colors duration-base ease-standard hover:decoration-white"
            >
              Fala connosco
            </Link>
          </div>
        </div>

        <Link
          href="#alojamentos"
          aria-label="Ver alojamentos"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/70 transition-colors duration-base ease-standard hover:text-white"
        >
          <ChevronDown className="h-6 w-6" strokeWidth={1.5} />
        </Link>
      </section>

      {/* ---------- Alojamentos ---------- */}
      <section
        id="alojamentos"
        className="mx-auto max-w-[1200px] scroll-mt-20 px-6 py-28"
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12px] font-medium uppercase tracking-[0.3em] text-ink-subdued">
            Alojamentos
          </p>
          <h2 className="mt-4 font-serif text-[36px] font-normal leading-tight tracking-tight text-ink sm:text-[46px]">
            Escolhe o teu próximo refúgio
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-muted">
            Clica num alojamento para ver fotografias, preços e reservar as tuas
            datas.
          </p>
        </div>

        {properties.length === 0 ? (
          <div className="mt-16 rounded-2xl border border-dashed border-border p-16 text-center">
            <Home
              className="mx-auto h-9 w-9 text-ink-subdued"
              strokeWidth={1.25}
            />
            <p className="mt-3 font-serif text-[20px] text-ink">
              Em breve, novos alojamentos
            </p>
          </div>
        ) : (
          <div
            className={`mt-16 grid gap-x-8 gap-y-14 ${
              properties.length === 1
                ? "mx-auto max-w-sm"
                : properties.length === 2
                  ? "mx-auto max-w-3xl md:grid-cols-2"
                  : "md:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </section>

      {/* ---------- Reviews ---------- */}
      {reviews.length > 0 && (
        <section id="reviews" className="scroll-mt-20 bg-surface-1">
          <div className="mx-auto max-w-[1200px] px-6 py-28">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[12px] font-medium uppercase tracking-[0.3em] text-ink-subdued">
                Reviews
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-tight tracking-tight text-ink sm:text-[46px]">
                O que dizem os nossos hóspedes
              </h2>
              {averageRating !== null && (
                <div className="mt-6 flex items-center justify-center gap-3">
                  <span className="font-serif text-[34px] leading-none text-ink">
                    {averageRating.toFixed(1)}
                  </span>
                  <div className="text-left">
                    <Stars value={Math.round(averageRating)} />
                    <p className="mt-0.5 text-[12px] text-ink-subdued">
                      {realReviews.length} reviews
                    </p>
                  </div>
                </div>
              )}
            </div>

            <ul className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((review) => (
                <li
                  key={review.id}
                  className="flex flex-col gap-5 rounded-2xl bg-canvas p-8"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Stars value={review.rating} />
                    {review.is_demo && (
                      <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-ink-subdued">
                        Exemplo
                      </span>
                    )}
                  </div>
                  <p className="font-serif text-[18px] leading-relaxed text-ink">
                    “{review.body}”
                  </p>
                  <div className="mt-auto border-t border-border pt-5">
                    <p className="text-body font-semibold text-ink">
                      {review.author_name}
                    </p>
                    <p className="text-[12px] text-ink-subdued">
                      {[review.author_location, review.property_name]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ---------- Sobre ---------- */}
      <section
        id="sobre"
        className="mx-auto grid max-w-[1200px] scroll-mt-20 gap-16 px-6 py-28 lg:grid-cols-2 lg:items-center lg:gap-24"
      >
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.3em] text-ink-subdued">
            Sobre nós
          </p>
          <h2 className="mt-4 font-serif text-[36px] font-normal leading-tight tracking-tight text-ink sm:text-[46px]">
            Alojamento com um toque pessoal
          </h2>
          <p className="mt-6 text-[16px] leading-relaxed text-ink-muted">
            Gerimos cada alojamento com atenção ao detalhe, para que a tua
            estadia seja simples do primeiro contacto ao check-out. Ao
            reservares diretamente connosco falas com quem cuida da casa e tens
            um atendimento sem intermediários.
          </p>
          <Link
            href="/site/contactos"
            className="mt-10 inline-flex min-h-12 items-center gap-2 rounded-pill border border-ink px-8 text-[15px] font-medium text-ink transition-colors duration-base ease-standard hover:bg-ink hover:text-white"
          >
            Entrar em contacto
            <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
          </Link>
        </div>

        <ul className="flex flex-col">
          {ABOUT_POINTS.map(({ icon: Icon, title, text }) => (
            <li
              key={title}
              className="flex gap-5 border-t border-border py-8 last:border-b"
            >
              <Icon
                className="mt-1 h-6 w-6 shrink-0 text-ink"
                strokeWidth={1.25}
              />
              <div>
                <h3 className="font-serif text-[22px] font-normal text-ink">
                  {title}
                </h3>
                <p className="mt-2 text-body leading-relaxed text-ink-muted">
                  {text}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
