"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

// Fotografia com parallax suave: a imagem desloca-se mais devagar do que a
// página. Desligado com movimento reduzido.
export function ParallaxImage({
  src,
  alt,
  sizes = "100vw",
  strength = 0.12,
  className = "",
  priority = false,
}: {
  src: string;
  alt: string;
  sizes?: string;
  strength?: number;
  className?: string;
  priority?: boolean;
}) {
  const wrapper = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = wrapper.current;
    const layer = inner.current;
    if (!box || !layer) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = box.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.bottom < 0 || rect.top > vh) return;
      // -1 (a entrar pelo fundo) → 1 (a sair pelo topo)
      const center =
        (rect.top + rect.height / 2 - vh / 2) / (vh / 2 + rect.height / 2);
      layer.style.transform = `translate3d(0, ${(-center * strength * 100).toFixed(2)}%, 0) scale(${1 + strength * 2})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [strength]);

  return (
    <div ref={wrapper} className={`relative overflow-hidden ${className}`}>
      <div
        ref={inner}
        className="absolute inset-0 will-change-transform"
        style={{ transform: `scale(${1 + strength * 2})` }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      </div>
    </div>
  );
}
