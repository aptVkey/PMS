"use client";

import { Menu } from "lucide-react";

export function AppTopbar({
  userEmail,
  onMenuClick,
  logoutAction,
}: {
  userEmail: string;
  onMenuClick: () => void;
  logoutAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-canvas px-4 md:px-6">
      <button
        type="button"
        aria-label="Abrir menu"
        onClick={onMenuClick}
        className="flex h-10 w-10 items-center justify-center rounded-md text-ink hover:bg-surface-1 md:hidden"
      >
        <Menu className="h-5 w-5" strokeWidth={2} />
      </button>

      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        <span className="hidden text-body text-ink-muted sm:inline">
          {userEmail}
        </span>
        <form action={logoutAction}>
          <button
            type="submit"
            className="min-h-9 rounded-md border border-border bg-canvas px-3 text-body font-semibold text-ink transition-colors duration-fast ease-standard hover:bg-surface-1"
          >
            Terminar sessão
          </button>
        </form>
      </div>
    </header>
  );
}
