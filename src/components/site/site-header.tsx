"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { SITE_LINKS } from "@/lib/site";

// Cabeçalho fixo. Na página inicial começa transparente por cima do hero e
// ganha fundo ao fazer scroll; esconde-se ao descer e volta ao subir.
export function SiteHeader({ name }: { name: string }) {
  const pathname = usePathname();
  const overlay = pathname === "/site";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      setScrolled(y > 24);
      setHidden(y > 480 && y > lastY + 2);
      if (Math.abs(y - lastY) > 2) lastY = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // Bloqueia o scroll da página enquanto o menu móvel está aberto.
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const light = overlay && !scrolled && !open;
  const solid = !light && !open;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[transform,background-color,border-color,color] duration-500 ease-[cubic-bezier(0.2,0.7,0.1,1)] ${
          hidden && !open ? "-translate-y-full" : "translate-y-0"
        } ${
          solid
            ? "border-b border-ink/10 bg-canvas/80 text-ink backdrop-blur-xl"
            : "border-b border-transparent"
        } ${light ? "text-white" : ""} ${open ? "text-canvas" : ""}`}
      >
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link
            href="/site"
            onClick={() => setOpen(false)}
            className="font-serif text-[26px] leading-none tracking-tight"
          >
            {name}
            <span className="text-action">.</span>
          </Link>

          <nav
            aria-label="Principal"
            className="hidden items-center gap-9 md:flex"
          >
            {SITE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group relative text-[14px] font-medium"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 h-px w-full origin-right scale-x-0 bg-current transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.1,1)] group-hover:origin-left group-hover:scale-x-100" />
              </Link>
            ))}
            <Link
              href="/site#alojamentos"
              className={`group inline-flex h-11 items-center gap-2 rounded-pill pl-5 pr-4 text-[14px] font-semibold transition-colors duration-300 ${
                light
                  ? "bg-white text-ink hover:bg-canvas"
                  : "bg-ink text-canvas hover:bg-action"
              }`}
            >
              Reservar
              <ArrowUpRight
                className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                strokeWidth={2}
              />
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            aria-controls="site-mobile-menu"
            className="relative -mr-2 flex h-11 w-11 items-center justify-center md:hidden"
          >
            <span
              className={`absolute h-px w-6 bg-current transition-transform duration-500 ${
                open ? "rotate-45" : "-translate-y-[4px]"
              }`}
            />
            <span
              className={`absolute h-px w-6 bg-current transition-transform duration-500 ${
                open ? "-rotate-45" : "translate-y-[4px]"
              }`}
            />
          </button>
        </div>
      </header>

      {/* Menu móvel em ecrã inteiro. */}
      <div
        id="site-mobile-menu"
        aria-hidden={!open}
        inert={!open}
        className={`site-grain fixed inset-0 z-[45] flex flex-col bg-ink px-5 pb-10 pt-28 text-canvas transition-[clip-path] duration-700 ease-[cubic-bezier(0.7,0,0.2,1)] md:hidden ${
          open ? "[clip-path:inset(0_0_0_0)]" : "[clip-path:inset(0_0_100%_0)]"
        }`}
      >
        <nav aria-label="Menu" className="relative z-10 flex flex-col">
          {SITE_LINKS.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              style={{ transitionDelay: open ? `${150 + i * 70}ms` : "0ms" }}
              className={`flex items-baseline gap-4 border-b border-canvas/15 py-5 transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.2,0.7,0.1,1)] ${
                open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
              }`}
            >
              <span className="text-[12px] tabular-nums text-canvas/50">
                0{i + 1}
              </span>
              <span className="font-serif text-[44px] leading-none tracking-tight">
                {link.label}
              </span>
            </Link>
          ))}
        </nav>
        <Link
          href="/site#alojamentos"
          onClick={() => setOpen(false)}
          className="relative z-10 mt-auto inline-flex h-14 items-center justify-center gap-2 rounded-pill bg-canvas text-[15px] font-semibold text-ink"
        >
          Reservar a tua estadia
          <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
        </Link>
      </div>

      {!overlay && <div aria-hidden="true" className="h-[72px]" />}
    </>
  );
}
