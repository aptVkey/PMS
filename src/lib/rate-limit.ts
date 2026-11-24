import "server-only";
import { headers } from "next/headers";

// Limite simples de pedidos por IP, em memória, para os formulários públicos
// (site, reserva direta). Trava abusos básicos (bots a encher a base de
// dados ou a bloquear datas); com vários servidores cada um tem o seu
// contador, por isso não substitui um WAF.
const buckets = new Map<string, number[]>();

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "desconhecido"
  );
}

// true = pode avançar; false = excedeu o limite nesta janela.
export function allowRequest(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  // Limpeza ocasional para o mapa não crescer sem fim.
  if (buckets.size > 5000) {
    for (const [k, times] of buckets) {
      if (times.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }

  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  buckets.set(key, [...hits, now]);
  return true;
}
