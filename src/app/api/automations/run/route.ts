import { NextResponse, type NextRequest } from "next/server";
import { readIntegrationSecret } from "@/lib/integrations";
import { runAutomations } from "@/lib/automations";

// Chamada periodicamente pelo pg_cron (ver migração
// email_automation_scheduling), autenticada por um segredo partilhado
// gerado nessa mesma migração — nunca exposto na interface.
export async function POST(request: NextRequest) {
  const expectedSecret = await readIntegrationSecret("automation_cron_secret");
  const providedSecret = request.headers.get("x-automation-secret");

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const summary = await runAutomations();
  return NextResponse.json(summary);
}
