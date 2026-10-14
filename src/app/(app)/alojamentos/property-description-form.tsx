"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updateProperty } from "./actions";

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";

export function PropertyDescriptionForm({
  propertyId,
  description,
  onSaved,
}: {
  propertyId: string;
  description: string | null;
  onSaved: (description: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(description ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    startTransition(async () => {
      const result = await updateProperty(propertyId, {
        description: value.trim(),
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setError(null);
      const saved = value.trim() || null;
      onSaved(saved);
      setValue(saved ?? "");
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(description ?? "");
          setEditing(true);
        }}
        className="group flex max-w-xl items-start gap-2 text-left"
      >
        <p
          className={`text-body ${description ? "text-ink-muted" : "text-ink-subdued italic"}`}
        >
          {description || "Adicionar descrição do alojamento"}
        </p>
        <Pencil
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-subdued opacity-0 transition-opacity duration-fast ease-standard group-hover:opacity-100"
          strokeWidth={2}
        />
      </button>
    );
  }

  return (
    <div className="flex max-w-xl flex-col gap-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
        rows={4}
        placeholder="Apresenta o alojamento: localização, ambiente, o que o torna especial..."
        className={`${inputClasses} min-h-0 py-2`}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="min-h-9 rounded-md bg-action px-3 text-[13px] font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "A guardar..." : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setValue(description ?? "");
            setEditing(false);
            setError(null);
          }}
          disabled={isPending}
          className="min-h-9 rounded-md border border-border bg-canvas px-3 text-[13px] font-semibold text-ink transition-colors duration-fast ease-standard hover:bg-surface-1 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
      {error && (
        <p aria-live="polite" className="text-[12px] text-error">
          {error}
        </p>
      )}
    </div>
  );
}
