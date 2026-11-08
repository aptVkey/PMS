"use client";

import { X, Zap } from "lucide-react";
import { TAG_COLOR_CLASSES, type CrmTag } from "@/lib/crm";

export const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
export const labelClasses = "text-[13px] font-semibold text-ink";
export const primaryButton =
  "flex min-h-11 items-center justify-center gap-2 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60";
export const secondaryButton =
  "flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-canvas px-4 text-body font-semibold text-ink transition-colors duration-fast ease-standard hover:bg-surface-1 disabled:cursor-not-allowed disabled:opacity-60";

export function TagChip({
  tag,
  onRemove,
}: {
  tag: CrmTag;
  onRemove?: () => void;
}) {
  return (
    <span
      title={
        tag.auto ? "Etiqueta automática (regra de classificação)" : undefined
      }
      className={`inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-[12px] font-semibold ${TAG_COLOR_CLASSES[tag.color]}`}
    >
      {tag.auto && (
        <Zap className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
      )}
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remover etiqueta ${tag.name}`}
          className="rounded-full hover:opacity-70"
        >
          <X className="h-3 w-3" strokeWidth={3} />
        </button>
      )}
    </span>
  );
}

export function AutoChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-pill border border-dashed border-border px-2.5 py-0.5 text-[12px] font-medium text-ink-subdued">
      {label}
    </span>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90svh] w-full max-w-lg flex-col rounded-lg bg-canvas shadow-popover">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-[18px] font-bold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-ink-subdued hover:bg-surface-1"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}
