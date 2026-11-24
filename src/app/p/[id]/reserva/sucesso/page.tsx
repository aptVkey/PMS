import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SiteFrame } from "@/components/site/site-frame";

export const metadata = { title: "Reserva confirmada" };

export default async function ReservaSucessoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reserva?: string }>;
}) {
  const { id } = await params;
  const { reserva } = await searchParams;

  return (
    <SiteFrame>
      <section className="mx-auto flex min-h-[70svh] max-w-[1200px] flex-col justify-center px-5 py-24 sm:px-8">
        <p className="site-eyebrow text-ink-subdued">Pagamento recebido</p>
        <h1 className="site-display mt-6 max-w-[14ch] text-[clamp(52px,8vw,124px)] text-ink">
          Está feito. <em className="text-action">Até breve.</em>
        </h1>
        <p className="mt-8 max-w-xl text-[17px] leading-relaxed text-ink-muted">
          A tua reserva está confirmada
          {reserva ? (
            <>
              {" "}
              com a referência{" "}
              <strong className="font-semibold text-ink">
                RES-{reserva.padStart(4, "0")}
              </strong>
            </>
          ) : null}
          . Vais receber os detalhes por email — e, antes da chegada, tudo o que
          precisas para entrar sem complicações.
        </p>
        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href={`/p/${id}`}
            className="group inline-flex h-14 items-center gap-3 rounded-pill bg-ink pl-7 pr-2 text-[15px] font-semibold text-canvas"
          >
            Voltar à casa
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-canvas text-ink transition-transform duration-500 group-hover:rotate-45">
              <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
            </span>
          </Link>
          <Link
            href="/site/contactos"
            className="inline-flex h-14 items-center rounded-pill border border-ink/25 px-7 text-[15px] font-medium text-ink transition-colors hover:border-ink"
          >
            Falar connosco
          </Link>
        </div>
      </section>
    </SiteFrame>
  );
}
