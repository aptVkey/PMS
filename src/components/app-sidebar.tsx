"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Building2, ChevronRight, LogOut, X } from "lucide-react";
import { filterNavSectionsByPermissions } from "@/lib/navigation";
import type { PermissionKey } from "@/lib/staff";

export function AppSidebar({
  permissions, open, onNavigate, userEmail, logoutAction,
}: {
  permissions: PermissionKey[];
  open: boolean;
  onNavigate: () => void;
  userEmail: string;
  logoutAction: (formData: FormData) => void | Promise<void>;
}) {
  const pathname = usePathname();
  const sections = filterNavSectionsByPermissions(permissions);
  const initials = userEmail.slice(0, 2).toUpperCase() || "P";
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const sidebar = sidebarRef.current;
    const focusable = () => Array.from(sidebar?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)') ?? []);
    focusable()[0]?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    sidebar?.addEventListener("keydown", trapFocus);
    return () => {
      sidebar?.removeEventListener("keydown", trapFocus);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  return (
    <>
      {open && <button type="button" aria-label="Fechar menu" onClick={onNavigate}
        className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm md:hidden" />}
      <aside ref={sidebarRef} id="app-navigation" aria-label="Navegação principal" role={open ? "dialog" : undefined} aria-modal={open || undefined}
        className={`fixed inset-y-0 left-0 z-50 flex h-svh w-64 shrink-0 flex-col bg-primary text-on-primary transition-[transform,visibility] duration-base ease-standard md:sticky md:top-0 md:z-30 md:visible md:translate-x-0 ${open ? "visible translate-x-0" : "invisible -translate-x-full"}`}>
        <div className="flex h-20 shrink-0 items-center justify-between px-6">
          <Link href="/" onClick={onNavigate} aria-label="PMS — Início" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-on-primary text-[20px] font-bold tracking-tight text-primary">P</span>
            <span className="text-[21px] font-bold tracking-tight">PMS<span className="text-highlight">.</span></span>
          </Link>
          <button type="button" aria-label="Fechar navegação" onClick={onNavigate} className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-on-primary/10 md:hidden"><X className="h-4 w-4" /></button>
        </div>

        <div className="mx-4 mb-7 flex items-center gap-3 rounded-lg border border-on-primary/15 bg-on-primary/5 px-3 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-on-primary/10"><Building2 className="h-4 w-4" strokeWidth={1.7} /></span>
          <div><p className="text-[12px] font-semibold">Gestão de alojamentos</p><p className="mt-0.5 text-[11px] text-on-primary/65">Área de operação</p></div>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-5">
          {sections.map((section, index) => (
            <div key={section.title ?? `section-${index}`} className="mb-6 last:mb-0">
              {section.title && <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-primary/55">{section.title}</p>}
              <ul className="flex flex-col gap-1">
                {section.items.map((item) => {
                  const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return <li key={item.href}>
                    <Link href={item.href} onClick={onNavigate} aria-current={isActive ? "page" : undefined}
                      className={`group flex min-h-10 items-center gap-3 rounded-md px-3 py-2.5 text-[13px] transition-colors duration-base ${isActive ? "bg-on-primary/15 font-semibold text-on-primary" : "font-medium text-on-primary/75 hover:bg-on-primary/10 hover:text-on-primary"}`}>
                      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.7} />
                      <span className="flex-1">{item.label}</span>
                      {isActive && <ChevronRight className="h-3.5 w-3.5 text-on-primary/60" />}
                    </Link>
                  </li>;
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mx-4 flex shrink-0 items-center gap-2.5 border-t border-on-primary/15 py-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-on-primary/15 text-[11px] font-bold">{initials}</span>
          <div className="min-w-0 flex-1"><p className="text-[12px] font-semibold">A tua conta</p><p className="mt-0.5 truncate text-[11px] text-on-primary/65" title={userEmail}>{userEmail}</p></div>
          <form action={logoutAction}><button type="submit" aria-label="Terminar sessão" title="Terminar sessão" className="flex h-9 w-9 items-center justify-center rounded-md text-on-primary/70 hover:bg-on-primary/10 hover:text-on-primary"><LogOut className="h-4 w-4" /></button></form>
        </div>
      </aside>
    </>
  );
}
