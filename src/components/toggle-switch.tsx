"use client";

import { Check, X } from "lucide-react";

// Interruptor com o estado escrito ao lado: cor + ícone no botão + texto,
// para nunca depender só da cor para se perceber se está ligado.
export function ToggleSwitch({
  checked,
  onChange,
  disabled,
  label,
  onLabel = "Ativa",
  offLabel = "Inativa",
  showLabel = true,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  // Nome acessível do interruptor (ex.: "Etapa Confirmação de reserva").
  label?: string;
  onLabel?: string;
  offLabel?: string;
  showLabel?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={
        checked
          ? `${onLabel} — clica para desativar`
          : `${offLabel} — clica para ativar`
      }
      disabled={disabled}
      onClick={onChange}
      className="group inline-flex shrink-0 items-center gap-2 rounded-pill focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span
        className={`relative h-6 w-11 shrink-0 rounded-pill border transition-colors duration-fast ease-standard ${
          checked
            ? "border-success bg-success"
            : "border-ink-subdued/50 bg-surface-2"
        }`}
      >
        <span
          className={`absolute top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border bg-canvas shadow-card transition-transform duration-fast ease-standard ${
            checked
              ? "translate-x-[22px] border-success text-success"
              : "translate-x-0.5 border-ink-subdued/50 text-ink-subdued"
          }`}
        >
          {checked ? (
            <Check className="h-3 w-3" strokeWidth={3} />
          ) : (
            <X className="h-3 w-3" strokeWidth={3} />
          )}
        </span>
      </span>
      {showLabel && (
        <span
          className={`min-w-[3.5rem] text-left text-[12px] font-semibold ${
            checked ? "text-success" : "text-ink-subdued"
          }`}
        >
          {checked ? onLabel : offLabel}
        </span>
      )}
    </button>
  );
}
