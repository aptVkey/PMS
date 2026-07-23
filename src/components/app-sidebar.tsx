"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { filterNavSectionsByPermissions } from "@/lib/navigation";
import type { PermissionKey } from "@/lib/staff";

export function AppSidebar({
  permissions,
  open,
  onNavigate,
}: {
  permissions: PermissionKey[];
  open: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const sections = filterNavSectionsByPermissions(permissions);

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={onNavigate}
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 shrink-0 -translate-x-full flex-col border-r border-border bg-canvas transition-transform duration-base ease-standard md:static md:translate-x-0 ${
          open ? "translate-x-0" : ""
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-border px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-body font-bold text-on-primary">
            P
          </div>
          <div className="leading-tight">
            <p className="text-body font-bold text-ink">PMS</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {sections.map((section, index) => (
            <div key={section.title ?? `section-${index}`} className="mb-6">
              {section.title && (
                <p className="mb-2 px-3 text-[12px] font-semibold uppercase tracking-wide text-ink-subdued">
                  {section.title}
                </p>
              )}
              <ul className="flex flex-col gap-1">
                {section.items.map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={`flex items-center gap-3 rounded-md px-3 py-2 text-body font-semibold transition-colors duration-fast ease-standard ${
                          isActive
                            ? "bg-surface-2 text-primary"
                            : "text-ink-muted hover:bg-surface-1 hover:text-ink"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
