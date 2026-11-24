"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

// Revela o conteúdo quando entra no ecrã (uma só vez). O estado inicial
// escondido está no CSS (.site-reveal); com movimento reduzido nada anima.
export function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  variant = "fade",
  className = "",
}: {
  children: React.ReactNode;
  as?: "div" | "li" | "section" | "article" | "p" | "span";
  delay?: number;
  variant?: "fade" | "image";
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      // @ts-expect-error — o ref serve para qualquer elemento HTML da lista.
      ref={ref}
      data-visible={visible}
      style={{ "--delay": `${delay}ms` } as CSSProperties}
      className={`${variant === "image" ? "site-reveal-img" : "site-reveal"} ${className}`}
    >
      {children}
    </Tag>
  );
}
