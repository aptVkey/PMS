import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

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
    <main className="flex min-h-svh items-center justify-center bg-surface-1 px-6 py-12">
      <div className="flex max-w-lg flex-col items-center gap-4 rounded-lg border border-border bg-canvas p-10 text-center shadow-card">
        <CheckCircle2 className="h-12 w-12 text-success" strokeWidth={1.5} />
        <h1 className="text-[24px] font-bold text-ink">Pagamento recebido</h1>
        <p className="text-body text-ink-muted">
          A tua reserva está confirmada
          {reserva ? (
            <>
              {" "}
              com a referência{" "}
              <strong className="text-ink">
                RES-{reserva.padStart(4, "0")}
              </strong>
            </>
          ) : null}
          . Vais receber os detalhes por email.
        </p>
        <Link
          href={`/p/${id}`}
          className="mt-2 min-h-11 rounded-md border border-border px-4 py-2.5 text-body font-semibold text-ink transition-colors duration-fast ease-standard hover:bg-surface-1"
        >
          Voltar ao alojamento
        </Link>
      </div>
    </main>
  );
}
