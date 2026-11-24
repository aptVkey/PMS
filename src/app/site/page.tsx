import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Plus } from "lucide-react";
import { SITE } from "@/lib/site";
import { loadSiteProperties, loadSiteReviews } from "@/lib/site-data";
import { Reveal } from "@/components/site/reveal";
import { ScrollWords } from "@/components/site/scroll-words";
import { ParallaxImage } from "@/components/site/parallax-image";
import { ReviewsCarousel } from "@/components/site/reviews-carousel";
import { PropertyCard } from "./property-card";

// Lê da base de dados a cada pedido: propriedades e reviews mudam sem deploy.
export const dynamic = "force-dynamic";

const PROMISES = [
  "Reserva direta",
  "Sem taxas de serviço",
  "Pagamento seguro",
  "Check-in sem complicações",
  "Atendimento humano",
  "Casas escolhidas a dedo",
];

const STEPS = [
  {
    title: "Escolhe as datas",
    text: "Vês a disponibilidade real e o preço final antes de decidires. O que aparece no ecrã é o que pagas — sem taxas a surgir no último passo.",
  },
  {
    title: "Reserva em minutos",
    text: "Deixas os teus dados, pagas com segurança e a casa fica tua. Sem contas para criar, sem formulários intermináveis.",
  },
  {
    title: "Chega e fica",
    text: "Antes da viagem recebes tudo o que precisas para entrar sem esperas. Se surgir alguma coisa, estamos a uma mensagem de distância.",
  },
];

const FAQ = [
  {
    q: "Porque devo reservar diretamente?",
    a: "Porque falas com quem cuida da casa, e não com uma central. Não pagas taxas de serviço de plataformas, e pedidos como uma chegada mais cedo, um berço ou uma sugestão para jantar ficam resolvidos numa só conversa.",
  },
  {
    q: "Como funciona o check-in?",
    a: "Antes da chegada enviamos as instruções de acesso e tudo o que precisas de saber sobre a casa e a zona. Chegas, entras e começas as férias — sem filas nem horários apertados para levantar chaves.",
  },
  {
    q: "O pagamento é seguro?",
    a: "Sim. Os pagamentos com cartão são processados pela Stripe, uma das maiores plataformas de pagamentos do mundo. Nunca vemos nem guardamos os dados do teu cartão.",
  },
  {
    q: "E se precisar de cancelar ou mudar as datas?",
    a: "As condições dependem da casa e da época. Fala connosco antes ou depois de reservar — explicamos tudo com clareza e procuramos sempre a solução mais justa.",
  },
  {
    q: "Aceitam estadias longas?",
    a: "Com todo o gosto. Podes reservar online até 90 noites; para períodos mais longos, escreve-nos e preparamos uma proposta à medida.",
  },
];

const MANIFESTO =
  "Não somos uma plataforma. Somos as pessoas que preparam a casa antes de chegares, que deixam as instruções claras e que respondem quando precisas. Menos intermediários, mais cuidado — é só isso.";

function SectionLabel({
  index,
  children,
  tone = "dark",
}: {
  index: string;
  children: React.ReactNode;
  tone?: "dark" | "light";
}) {
  return (
    <p
      className={`site-eyebrow flex items-center gap-3 ${
        tone === "light" ? "text-canvas/55" : "text-ink-subdued"
      }`}
    >
      <span className="tabular-nums">({index})</span>
      <span
        className={`h-px w-8 ${tone === "light" ? "bg-canvas/30" : "bg-ink/25"}`}
      />
      {children}
    </p>
  );
}

export default async function SiteHomePage() {
  const [properties, reviews] = await Promise.all([
    loadSiteProperties(),
    loadSiteReviews(),
  ]);

  const gallery = properties.flatMap((p) => p.gallery);
  const heroPhoto = gallery[0] ?? null;
  const storyPhoto = gallery[1] ?? gallery[0] ?? null;
  const bandPhoto = gallery[3] ?? gallery[2] ?? gallery[0] ?? null;
  const closingPhoto = gallery[5] ?? gallery[4] ?? gallery[0] ?? null;

  // A média só conta reviews reais: os exemplos de demonstração não entram.
  const realReviews = reviews.filter((r) => !r.is_demo);
  const averageRating =
    realReviews.length > 0
      ? realReviews.reduce((sum, r) => sum + r.rating, 0) / realReviews.length
      : null;

  const [lineOne, lineTwo] = ["Casas onde", "o tempo"];

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="site-grain relative flex min-h-svh flex-col justify-end overflow-hidden bg-ink text-white">
        {heroPhoto && (
          <div className="site-kenburns absolute inset-0">
            <Image
              src={heroPhoto}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,17,14,0.55)_0%,rgba(20,17,14,0.18)_35%,rgba(20,17,14,0.4)_60%,rgba(20,17,14,0.85)_100%)]"
        />

        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-5 pb-10 pt-36 sm:px-8 lg:px-12 lg:pb-14">
          <p
            className="site-eyebrow site-fade-in text-white/75"
            style={{ "--delay": "200ms" } as React.CSSProperties}
          >
            {SITE.tagline}
          </p>

          <h1 className="site-display mt-6 text-[clamp(56px,11.5vw,188px)]">
            <span className="site-line">
              <span style={{ "--delay": "250ms" } as React.CSSProperties}>
                {lineOne}
              </span>
            </span>
            <span className="site-line">
              <span style={{ "--delay": "380ms" } as React.CSSProperties}>
                {lineTwo} <em className="text-[#f1c9a8]">abranda.</em>
              </span>
            </span>
          </h1>

          <div
            className="site-fade-in mt-10 grid gap-8 border-t border-white/20 pt-8 md:grid-cols-[1fr_auto] md:items-end"
            style={{ "--delay": "750ms" } as React.CSSProperties}
          >
            <p className="max-w-[46ch] text-[16px] leading-relaxed text-white/85 sm:text-[17px]">
              {SITE.heroSubtitle}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="#alojamentos"
                className="group inline-flex h-14 items-center gap-3 rounded-pill bg-white pl-7 pr-2 text-[15px] font-semibold text-ink transition-colors duration-300 hover:bg-canvas"
              >
                Descobrir as casas
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-white transition-transform duration-500 group-hover:rotate-45">
                  <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
                </span>
              </Link>
              <Link
                href="#como-funciona"
                className="inline-flex h-14 items-center rounded-pill border border-white/35 px-7 text-[15px] font-medium text-white backdrop-blur-sm transition-colors duration-300 hover:border-white hover:bg-white/10"
              >
                Como funciona
              </Link>
            </div>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="absolute bottom-0 right-5 z-10 hidden h-24 w-px overflow-hidden bg-white/15 sm:right-8 md:block lg:right-12"
        >
          <span className="site-scroll-cue block h-full w-full bg-white" />
        </div>
      </section>

      {/* ---------- Faixa de promessas ---------- */}
      <section
        aria-label="As nossas promessas"
        className="overflow-hidden border-b border-ink/10 py-6"
      >
        <div className="site-marquee flex w-max">
          {[0, 1].map((copy) => (
            <ul
              key={copy}
              aria-hidden={copy === 1}
              className="flex shrink-0 items-center"
            >
              {PROMISES.map((item) => (
                <li
                  key={item}
                  className="flex items-center whitespace-nowrap font-serif text-[30px] italic leading-none tracking-tight text-ink sm:text-[38px]"
                >
                  <span className="px-8">{item}</span>
                  <span className="text-[18px] not-italic text-action">✦</span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </section>

      {/* ---------- Manifesto ---------- */}
      <section className="mx-auto max-w-[1440px] px-5 py-28 sm:px-8 sm:py-36 lg:px-12 lg:py-44">
        <SectionLabel index="01">A nossa ideia</SectionLabel>
        <ScrollWords
          text={MANIFESTO}
          className="mt-10 max-w-[1180px] font-serif text-[clamp(34px,5.4vw,84px)] leading-[1.02] tracking-[-0.02em] text-ink"
        />

        <div className="mt-20 grid gap-10 md:grid-cols-12 md:items-end lg:mt-28">
          {storyPhoto && (
            <Reveal variant="image" className="md:col-span-5 md:col-start-2">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[6px]">
                <Image
                  src={storyPhoto}
                  alt="Interior de uma das nossas casas"
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  className="object-cover"
                />
              </div>
            </Reveal>
          )}
          <Reveal
            delay={150}
            className={`md:col-span-4 ${storyPhoto ? "md:col-start-8" : "md:col-start-6"}`}
          >
            <p className="text-[17px] leading-relaxed text-ink-muted">
              Cada casa da coleção foi escolhida por uma razão: a luz da manhã,
              o silêncio da rua, a cozinha onde apetece mesmo cozinhar. Tratamos
              de cada uma como se fosse nossa — porque, de certa forma, é.
            </p>
            <p className="mt-8 font-serif text-[28px] italic leading-none text-ink">
              — A equipa {SITE.name}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------- Coleção ---------- */}
      <section
        id="alojamentos"
        className="scroll-mt-16 border-t border-ink/10 bg-surface-1/60"
      >
        <div className="mx-auto max-w-[1440px] px-5 py-28 sm:px-8 sm:py-36 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <SectionLabel index="02">A coleção</SectionLabel>
              <Reveal>
                <h2 className="site-display mt-8 text-[clamp(48px,7.5vw,120px)] text-ink">
                  Escolhe a casa.
                  <br />
                  <em className="text-action">Nós tratamos do resto.</em>
                </h2>
              </Reveal>
            </div>
            <Reveal delay={120} className="lg:col-span-4">
              <p className="max-w-sm text-[16px] leading-relaxed text-ink-muted">
                Fotografias reais, disponibilidade em tempo real e o preço final
                antes de reservares. Abre uma casa para escolher as datas.
              </p>
              <p className="mt-6 font-serif text-[22px] text-ink">
                {String(properties.length).padStart(2, "0")}{" "}
                {properties.length === 1
                  ? "casa disponível"
                  : "casas disponíveis"}
              </p>
            </Reveal>
          </div>

          {properties.length === 0 ? (
            <div className="mt-20 rounded-[6px] border border-dashed border-ink/20 p-16 text-center">
              <p className="font-serif text-[32px] text-ink">
                Novas casas a caminho.
              </p>
              <p className="mt-2 text-[15px] text-ink-muted">
                Deixa o teu email no fim da página e avisamos-te primeiro.
              </p>
            </div>
          ) : (
            <div
              className={`mt-20 grid gap-x-10 gap-y-20 lg:mt-28 ${
                properties.length === 1
                  ? "mx-auto max-w-2xl"
                  : "md:grid-cols-2 lg:gap-x-16"
              }`}
            >
              {properties.map((property, i) => (
                <div
                  key={property.id}
                  className={i % 2 === 1 ? "md:mt-40" : ""}
                >
                  <PropertyCard
                    property={property}
                    index={i}
                    priority={i < 2}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------- Faixa fotográfica ---------- */}
      {bandPhoto && (
        <section className="relative">
          <ParallaxImage
            src={bandPhoto}
            alt=""
            className="h-[78svh] min-h-[520px]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,17,14,0.1)_20%,rgba(20,17,14,0.72)_100%)]" />
          <div className="absolute inset-0 flex items-end">
            <div className="mx-auto w-full max-w-[1440px] px-5 pb-14 sm:px-8 lg:px-12 lg:pb-20">
              <Reveal>
                <p className="max-w-[18ch] font-serif text-[clamp(38px,6vw,96px)] leading-[0.98] tracking-[-0.02em] text-white">
                  As melhores férias começam quando sabes que{" "}
                  <em>está tudo tratado.</em>
                </p>
              </Reveal>
            </div>
          </div>
        </section>
      )}

      {/* ---------- Como funciona ---------- */}
      <section
        id="como-funciona"
        className="mx-auto grid max-w-[1440px] scroll-mt-16 gap-16 px-5 py-28 sm:px-8 sm:py-36 lg:grid-cols-12 lg:px-12"
      >
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-32">
            <SectionLabel index="03">Como funciona</SectionLabel>
            <Reveal>
              <h2 className="site-display mt-8 text-[clamp(44px,5.6vw,92px)] text-ink">
                Reservar não devia dar{" "}
                <em className="text-action">trabalho.</em>
              </h2>
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-8 max-w-md text-[16px] leading-relaxed text-ink-muted">
                Três passos, poucos minutos e nenhuma letra pequena. Tudo o que
                precisas de saber está à vista antes de confirmares.
              </p>
            </Reveal>
          </div>
        </div>

        <ol className="lg:col-span-6 lg:col-start-7">
          {STEPS.map((step, i) => (
            <Reveal
              as="li"
              key={step.title}
              delay={i * 80}
              className="grid grid-cols-[auto_1fr] gap-x-8 border-t border-ink/15 py-12 last:border-b sm:gap-x-12"
            >
              <span className="font-serif text-[64px] leading-[0.8] tracking-tight text-action sm:text-[88px]">
                {i + 1}
              </span>
              <div>
                <h3 className="font-serif text-[34px] leading-none tracking-tight text-ink sm:text-[40px]">
                  {step.title}
                </h3>
                <p className="mt-4 max-w-md text-[16px] leading-relaxed text-ink-muted">
                  {step.text}
                </p>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ---------- Reviews ---------- */}
      {reviews.length > 0 && (
        <section
          id="reviews"
          className="site-grain relative scroll-mt-16 overflow-hidden bg-ink text-canvas"
        >
          <div className="relative z-10 mx-auto max-w-[1440px] px-5 py-28 sm:px-8 sm:py-36 lg:px-12">
            <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-8">
                <SectionLabel index="04" tone="light">
                  Quem já ficou
                </SectionLabel>
                <Reveal>
                  <h2 className="site-display mt-8 text-[clamp(44px,6.4vw,104px)]">
                    Palavras de quem{" "}
                    <em className="text-[#f1c9a8]">voltaria.</em>
                  </h2>
                </Reveal>
              </div>
              {averageRating !== null && (
                <Reveal delay={120} className="lg:col-span-4 lg:text-right">
                  <p className="font-serif text-[96px] leading-none tracking-tight">
                    {averageRating.toFixed(1).replace(".", ",")}
                  </p>
                  <p className="mt-2 text-[14px] text-canvas/60">
                    média de {realReviews.length}{" "}
                    {realReviews.length === 1 ? "avaliação" : "avaliações"} de
                    hóspedes
                  </p>
                </Reveal>
              )}
            </div>

            <div className="mt-20">
              <ReviewsCarousel reviews={reviews} />
            </div>
          </div>
        </section>
      )}

      {/* ---------- Perguntas ---------- */}
      <section
        id="perguntas"
        className="mx-auto grid max-w-[1440px] scroll-mt-16 gap-14 px-5 py-28 sm:px-8 sm:py-36 lg:grid-cols-12 lg:px-12"
      >
        <div className="lg:col-span-4">
          <SectionLabel index="05">Perguntas</SectionLabel>
          <Reveal>
            <h2 className="site-display mt-8 text-[clamp(44px,5vw,80px)] text-ink">
              Antes de <em className="text-action">perguntares.</em>
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-8 max-w-xs text-[16px] leading-relaxed text-ink-muted">
              Não encontras o que procuras?{" "}
              <Link
                href="/site/contactos"
                className="border-b border-ink/40 text-ink transition-colors hover:border-ink"
              >
                Escreve-nos
              </Link>{" "}
              — respondemos depressa e sem respostas automáticas.
            </p>
          </Reveal>
        </div>

        <div className="border-b border-ink/15 lg:col-span-7 lg:col-start-6">
          {FAQ.map((item, i) => (
            <Reveal key={item.q} delay={i * 60}>
              <details className="group border-t border-ink/15">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-7 [&::-webkit-details-marker]:hidden">
                  <span className="font-serif text-[26px] leading-tight tracking-tight text-ink sm:text-[32px]">
                    {item.q}
                  </span>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ink/20 transition-all duration-500 group-open:rotate-45 group-open:border-action group-open:bg-action group-open:text-canvas">
                    <Plus className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                </summary>
                <p className="max-w-[58ch] pb-8 pr-16 text-[16px] leading-relaxed text-ink-muted">
                  {item.a}
                </p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Convite final ---------- */}
      <section className="px-3 pb-3 sm:px-4 sm:pb-4">
        <div className="site-grain relative overflow-hidden rounded-[10px] bg-action text-canvas">
          {closingPhoto && (
            <Image
              src={closingPhoto}
              alt=""
              fill
              sizes="100vw"
              className="object-cover opacity-25 mix-blend-multiply"
            />
          )}
          <div className="relative z-10 mx-auto flex max-w-[1440px] flex-col gap-12 px-5 py-24 sm:px-8 sm:py-32 lg:flex-row lg:items-end lg:justify-between lg:px-12">
            <Reveal>
              <h2 className="site-display max-w-[12ch] text-[clamp(52px,8.5vw,140px)]">
                A tua próxima estadia começa <em>aqui.</em>
              </h2>
            </Reveal>
            <Reveal delay={150} className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="#alojamentos"
                className="group inline-flex h-14 items-center justify-center gap-3 rounded-pill bg-canvas pl-7 pr-2 text-[15px] font-semibold text-ink"
              >
                Ver as casas
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-canvas transition-transform duration-500 group-hover:rotate-45">
                  <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
                </span>
              </Link>
              <Link
                href="/site/contactos"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-pill border border-canvas/40 px-7 text-[15px] font-medium transition-colors hover:bg-canvas/10"
              >
                Falar connosco
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
