"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "/site#alojamentos", label: "Alojamentos" },
  { href: "/site#reviews", label: "Reviews" },
  { href: "/site#sobre", label: "Sobre nós" },
  { href: "/site/contactos", label: "Contactos" },
];

export function SiteHeader({ name }: { name: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <Link
          href="/site"
          className="font-serif text-[22px] font-normal tracking-tight text-ink"
        >
          {name}
        </Link>

        <nav
          aria-label="Principal"
          className="hidden items-center gap-8 md:flex"
        >
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[14px] font-medium text-ink-muted transition-colors duration-base ease-standard hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/site#alojamentos"
            className="rounded-pill border border-ink px-5 py-2 text-[14px] font-medium text-ink transition-colors duration-base ease-standard hover:bg-ink hover:text-white"
          >
            Reservar
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          className="rounded-md p-2 text-ink md:hidden"
        >
          {open ? (
            <X className="h-6 w-6" strokeWidth={1.5} />
          ) : (
            <Menu className="h-6 w-6" strokeWidth={1.5} />
          )}
        </button>
      </div>

      {open && (
        <nav
          aria-label="Principal"
          className="flex flex-col border-t border-border bg-canvas px-6 py-3 md:hidden"
        >
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="border-b border-border/60 py-4 font-serif text-[20px] text-ink last:border-0"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
