"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu } from "lucide-react";
import { navSections } from "@/lib/navigation";

export function AppTopbar({ onMenuClick, menuOpen }: { onMenuClick: () => void; menuOpen: boolean }) {
  const pathname = usePathname();
  const current = navSections.flatMap(section => section.items).find(item => item.href === "/" ? pathname === "/" : pathname.startsWith(item.href));
  const label = current?.label ?? "Gestão";
  const nested = current && pathname !== current.href;

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-canvas/95 px-4 backdrop-blur-md md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" aria-label="Abrir menu" aria-expanded={menuOpen} aria-controls="app-navigation" onClick={onMenuClick}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-ink hover:bg-surface-1 md:hidden"><Menu className="h-4 w-4" /></button>
        <nav aria-label="Localização" className="flex min-w-0 items-center gap-2 text-[12px]">
          <Link href="/" className="hidden text-ink-subdued hover:text-action sm:inline">Área de gestão</Link>
          <ChevronRight className="hidden h-3 w-3 shrink-0 text-ink-subdued/60 sm:block" />
          {nested ? <><Link href={current.href} className="truncate text-ink-muted hover:text-action">{label}</Link><ChevronRight className="h-3 w-3 shrink-0 text-ink-subdued/60" /><span className="font-medium text-ink">Detalhe</span></> : <span aria-current="page" className="truncate font-medium text-ink">{label}</span>}
        </nav>
      </div>
      <div className="flex shrink-0 items-center gap-2 rounded-md border border-border bg-surface-1 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
        <span className="h-1.5 w-1.5 rounded-pill bg-primary" />PMS<span className="hidden sm:inline"> · Operação</span>
      </div>
    </header>
  );
}
