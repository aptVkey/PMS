"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { channelFromName } from "@/lib/channels";

// Quadrado colorido com a inicial do canal — identifica-o de relance sem
// depender de logótipos.
export function ChannelBadge({
  channel,
  size = 40,
}: {
  channel: string;
  size?: number;
}) {
  const def = channelFromName(channel);
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        backgroundColor: def.color,
        fontSize: Math.round(size * 0.45),
      }}
      className="flex shrink-0 items-center justify-center rounded-xl font-bold text-white"
    >
      {def.initial}
    </span>
  );
}

export function ExportBox({
  url,
  label = "Exportar",
  hint,
}: {
  url: string;
  label?: string;
  hint?: string;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-canvas px-3 py-2">
      <span
        className="shrink-0 text-[12px] font-semibold text-ink-subdued"
        title={hint}
      >
        {label}
      </span>
      <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-ink-muted">
        {url}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label="Copiar link de exportação"
        title="Copiar link de exportação — mostra só datas ocupadas, nunca dados do hóspede"
        className="flex min-h-8 shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface-1 px-2.5 text-[12px] font-semibold text-ink hover:bg-surface-2"
      >
        <Copy className="h-3.5 w-3.5" strokeWidth={2} />
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

export function StepList({ steps }: { steps: readonly string[] }) {
  return (
    <ol className="flex flex-col gap-1.5">
      {steps.map((step, index) => (
        <li key={step} className="flex gap-2.5 text-body text-ink-muted">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-bold text-primary">
            {index + 1}
          </span>
          {step}
        </li>
      ))}
    </ol>
  );
}
