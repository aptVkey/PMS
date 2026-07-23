import { Construction } from "lucide-react";

export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[24px] font-bold text-ink">{title}</h1>
        <p className="mt-1 text-body text-ink-muted">{description}</p>
      </div>

      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-canvas py-16 text-center">
        <Construction className="h-8 w-8 text-ink-subdued" strokeWidth={1.5} />
        <p className="text-body font-semibold text-ink">Em construção</p>
        <p className="max-w-sm text-body text-ink-subdued">
          Esta secção ainda não está disponível. Vamos construí-la nos
          próximos passos.
        </p>
      </div>
    </div>
  );
}
