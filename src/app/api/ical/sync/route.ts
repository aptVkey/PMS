import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { readIntegrationSecret } from "@/lib/integrations";
import { syncAllIcalFeeds } from "@/lib/ical-sync";

// Chamada periodicamente pelo pg_cron (ver migração ical_sync_scheduling),
// autenticada pelo mesmo segredo partilhado usado pelas automações de
// email — nunca exposto na interface.
// Vários feeds lentos processados um a um podem demorar — dá mais tempo do
// que o limite por omissão da plataforma.

export const maxDuration = 60;

// Comparação em tempo constante (não revela o segredo pelo tempo de resposta).
function sameSecret(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const expectedSecret = await readIntegrationSecret("automation_cron_secret");
  const providedSecret = request.headers.get("x-automation-secret");

  if (!expectedSecret || !sameSecret(providedSecret, expectedSecret)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const results = await syncAllIcalFeeds();
  return NextResponse.json({ ranAt: new Date().toISOString(), results });
}
