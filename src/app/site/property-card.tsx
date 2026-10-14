import Image from "next/image";
import Link from "next/link";
import { BedDouble, Home, Users } from "lucide-react";
import type { SiteProperty } from "@/lib/site-data";

// Cartão sem caixa: a fotografia é o elemento principal e o texto assenta
// diretamente sobre o fundo, com muito ar à volta.
export function PropertyCard({ property }: { property: SiteProperty }) {
  const price =
    property.priceFrom !== null
      ? new Intl.NumberFormat("pt-PT", {
          style: "currency",
          currency: property.currency,
          maximumFractionDigits: 0,
        }).format(property.priceFrom)
      : null;

  return (
    <Link
      href={`/p/${property.id}`}
      className="group flex flex-col gap-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-4"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface-1">
        {property.coverPhoto ? (
          <Image
            src={property.coverPhoto}
            alt={property.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 380px"
            className="object-cover transition-transform duration-700 ease-standard group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-subdued/50">
            <Home className="h-10 w-10" strokeWidth={1} />
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-subdued">
            {property.typeLabel}
          </p>
          <h3 className="mt-1.5 truncate font-serif text-[24px] font-normal leading-tight text-ink">
            {property.name}
          </h3>
          <p className="mt-2 flex items-center gap-4 text-[13px] text-ink-muted">
            {property.guests > 0 && (
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" strokeWidth={1.5} />
                {property.guests} hóspedes
              </span>
            )}
            {property.bedrooms > 0 && (
              <span className="flex items-center gap-1.5">
                <BedDouble className="h-4 w-4" strokeWidth={1.5} />
                {property.bedrooms} quartos
              </span>
            )}
          </p>
        </div>

        {price && (
          <p className="shrink-0 text-right">
            <span className="block text-[11px] uppercase tracking-[0.15em] text-ink-subdued">
              desde
            </span>
            <span className="font-serif text-[22px] text-ink">{price}</span>
            <span className="block text-[12px] text-ink-subdued">
              por noite
            </span>
          </p>
        )}
      </div>
    </Link>
  );
}
