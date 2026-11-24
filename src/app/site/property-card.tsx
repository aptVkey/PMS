import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { SiteProperty } from "@/lib/site-data";
import { Reveal } from "@/components/site/reveal";

// Cartão editorial: a fotografia manda, o texto respira por baixo.
export function PropertyCard({
  property,
  index,
  priority = false,
}: {
  property: SiteProperty;
  index: number;
  priority?: boolean;
}) {
  const price =
    property.priceFrom !== null
      ? new Intl.NumberFormat("pt-PT", {
          style: "currency",
          currency: property.currency,
          maximumFractionDigits: 0,
        }).format(property.priceFrom)
      : null;

  const meta = [
    property.typeLabel,
    property.guests > 0 &&
      `${property.guests} ${property.guests === 1 ? "hóspede" : "hóspedes"}`,
    property.bedrooms > 0 &&
      `${property.bedrooms} ${property.bedrooms === 1 ? "quarto" : "quartos"}`,
  ].filter(Boolean) as string[];

  return (
    <Link
      href={`/p/${property.id}`}
      className="group block focus-visible:outline-offset-8"
    >
      <Reveal variant="image">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[6px] bg-surface-2">
          {property.coverPhoto ? (
            <Image
              src={property.coverPhoto}
              alt={property.name}
              fill
              priority={priority}
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.2,0.7,0.1,1)] group-hover:scale-[1.06]"
            />
          ) : (
            // Sem fotografia: uma capa tipográfica em vez de um ícone vazio.
            <div className="flex h-full w-full flex-col justify-end gap-5 bg-[radial-gradient(120%_90%_at_20%_10%,#efe6d8_0%,#e2d5c2_55%,#d6c6af_100%)] p-8">
              <span className="font-serif text-[clamp(48px,7vw,96px)] leading-[0.9] tracking-tight text-ink/80">
                {property.name}
              </span>
              <span className="site-eyebrow text-ink-subdued">
                Fotografias em breve
              </span>
            </div>
          )}

          <span className="absolute left-5 top-5 rounded-pill bg-canvas/85 px-3 py-1 text-[12px] font-medium tabular-nums text-ink backdrop-blur">
            {String(index + 1).padStart(2, "0")}
          </span>

          <span className="absolute bottom-5 right-5 flex h-14 w-14 scale-75 items-center justify-center rounded-full bg-canvas text-ink opacity-0 transition-all duration-500 ease-[cubic-bezier(0.2,0.7,0.1,1)] group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100">
            <ArrowUpRight className="h-5 w-5" strokeWidth={1.75} />
          </span>
        </div>
      </Reveal>

      <div className="mt-6 flex items-end justify-between gap-6 border-b border-ink/15 pb-6">
        <div className="min-w-0">
          <p className="text-[13px] text-ink-subdued">{meta.join(" · ")}</p>
          <h3 className="mt-2 truncate font-serif text-[36px] leading-none tracking-tight text-ink sm:text-[44px]">
            {property.name}
          </h3>
        </div>
        {price && (
          <p className="shrink-0 text-right">
            <span className="block text-[12px] text-ink-subdued">desde</span>
            <span className="font-serif text-[30px] leading-none text-ink">
              {price}
            </span>
            <span className="text-[13px] text-ink-subdued"> /noite</span>
          </p>
        )}
      </div>
    </Link>
  );
}
