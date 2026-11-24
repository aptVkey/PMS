"use client";

import { useEffect, useRef, useState } from "react";

// Texto manifesto: as palavras "acendem" à medida que o parágrafo atravessa o
// ecrã. Com movimento reduzido, o texto aparece logo por inteiro.
export function ScrollWords({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [progress, setProgress] = useState(1);
  const words = text.split(" ");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 quando o topo entra pelo fundo do ecrã; 1 quando o fim passa a
      // meio do ecrã.
      const start = vh * 0.9;
      const end = vh * 0.45;
      const total = rect.height + (start - end);
      const value = (start - rect.top) / total;
      setProgress(Math.min(1, Math.max(0, value)));
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
  }, []);

  const lit = progress * words.length;

  return (
    <p ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, i) => {
          const amount = Math.min(1, Math.max(0, lit - i));
          return (
            <span
              key={i}
              style={{
                opacity: 0.16 + amount * 0.84,
                transition: "opacity 200ms linear",
              }}
            >
              {word}{" "}
            </span>
          );
        })}
      </span>
    </p>
  );
}
