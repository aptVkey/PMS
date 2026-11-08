"use client";

import { useState, useTransition } from "react";
import { AI_PROVIDER_LABELS, type AiProvider } from "@/lib/ai-providers";
import { setAiProvider } from "./actions";

// Só faz sentido escolher quando há mais do que um fornecedor ligado.
export function AiProviderPicker({
  anthropicConnected,
  geminiConnected,
  selected,
}: {
  anthropicConnected: boolean;
  geminiConnected: boolean;
  selected: AiProvider | null;
}) {
  const connected: AiProvider[] = [
    ...(anthropicConnected ? (["anthropic"] as const) : []),
    ...(geminiConnected ? (["gemini"] as const) : []),
  ];
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (connected.length === 0) {
    return (
      <p className="text-body text-ink-subdued">
        Liga pelo menos um fornecedor para ativar a leitura automática de
        faturas.
      </p>
    );
  }

  // Sem escolha guardada, o sistema usa a Anthropic (se ligada), senão a Gemini.
  const effective =
    selected && connected.includes(selected) ? selected : connected[0];

  if (connected.length === 1) {
    return (
      <p className="text-body text-ink-muted">
        A leitura de faturas usa{" "}
        <strong className="text-ink">{AI_PROVIDER_LABELS[effective]}</strong>.
        Liga o outro fornecedor para poderes escolher.
      </p>
    );
  }

  function choose(provider: AiProvider) {
    setError(null);
    startTransition(async () => {
      const result = await setAiProvider(provider);
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-canvas p-5 shadow-card">
      <div>
        <p className="text-body font-bold text-ink">
          Fornecedor para ler faturas
        </p>
        <p className="text-[12px] text-ink-subdued">
          Qual dos dois lê as faturas anexadas no Fluxo de caixa.
        </p>
      </div>
      <div
        role="radiogroup"
        aria-label="Fornecedor de IA"
        className="flex flex-wrap gap-2"
      >
        {connected.map((provider) => (
          <button
            key={provider}
            type="button"
            role="radio"
            aria-checked={effective === provider}
            disabled={isPending}
            onClick={() => choose(provider)}
            className={`min-h-11 rounded-md border px-4 text-body font-semibold transition-colors duration-fast ease-standard disabled:cursor-not-allowed disabled:opacity-60 ${
              effective === provider
                ? "border-action bg-surface-2 text-primary"
                : "border-border bg-canvas text-ink-muted hover:bg-surface-1"
            }`}
          >
            {AI_PROVIDER_LABELS[provider]}
          </button>
        ))}
      </div>
      {error && (
        <p aria-live="polite" className="text-body text-error">
          {error}
        </p>
      )}
    </div>
  );
}
