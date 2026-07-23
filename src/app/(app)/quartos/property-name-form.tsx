"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updateProperty } from "./actions";

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";

export function PropertyNameForm({
  propertyId,
  name,
  onSaved,
}: {
  propertyId: string;
  name: string;
  onSaved: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    if (!value.trim()) {
      setError("O nome é obrigatório.");
      return;
    }
    startTransition(async () => {
      const result = await updateProperty(propertyId, { name: value.trim() });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setError(null);
      onSaved(value.trim());
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(name);
          setEditing(true);
        }}
        className="group flex items-center gap-2 text-left"
      >
        <h1 className="text-[24px] font-bold text-ink">{name}</h1>
        <Pencil
          className="h-4 w-4 text-ink-subdued opacity-0 transition-opacity duration-fast ease-standard group-hover:opacity-100"
          strokeWidth={2}
        />
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
        className={`${inputClasses} sm:w-64`}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="min-h-11 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "A guardar..." : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setValue(name);
            setEditing(false);
            setError(null);
          }}
          disabled={isPending}
          className="min-h-11 rounded-md border border-border bg-canvas px-4 text-body font-semibold text-ink transition-colors duration-fast ease-standard hover:bg-surface-1 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
      {error && (
        <p aria-live="polite" className="w-full text-[12px] text-error">
          {error}
        </p>
      )}
    </div>
  );
}
