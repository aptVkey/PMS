import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createResendClient } from "@/lib/resend";
import { formatDateLabel } from "@/lib/date-utils";
import {
  renderTemplate,
  resolveEffectiveTrigger,
  type EffectiveTrigger,
  type EmailFlowStep,
  type ListFilter,
} from "@/lib/email-marketing";

type Candidate = {
  booking_id: string;
  guest_id: string;
  guest_email: string | null;
  guest_name: string;
  room_id: string;
  room_name: string;
  property_id: string;
  property_name: string;
  check_in: string;
  check_out: string;
  booking_number: number;
  access_code: string | null;
};

const DEFAULT_TIMES = { checkIn: "15:00", checkOut: "11:00" };

export type AutomationStepSummary = {
  stepId: string;
  flowName: string;
  triggerType: string;
  matched: number;
  sent: number;
  skipped: number;
  failed: number;
};

export type AutomationRunSummary = {
  ranAt: string;
  steps: AutomationStepSummary[];
};

// Um hóspede pertence a uma lista manual se estiver em email_list_members; a
// uma lista dinâmica se cumprir o filtro guardado.
async function loadListGuestIds(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  listId: string,
): Promise<Set<string>> {
  const { data: list } = await admin
    .from("email_lists")
    .select("kind, filter")
    .eq("id", listId)
    .maybeSingle();

  if (!list) return new Set();

  if (list.kind === "manual") {
    const { data: members } = await admin
      .from("email_list_members")
      .select("guest_id")
      .eq("list_id", listId);
    return new Set((members ?? []).map((m) => m.guest_id as string));
  }

  const filter = (list.filter ?? {}) as ListFilter;
  let query = admin.from("guests").select("id");

  if (filter.nationality) {
    query = query.eq("nationality", filter.nationality);
  }
  if (typeof filter.min_visit_count === "number") {
    query = query.gte("visit_count", filter.min_visit_count);
  }

  const { data: guests } = await query;
  let ids = new Set((guests ?? []).map((g) => g.id as string));

  // property_id filtra por reservas do hóspede naquele alojamento — precisa
  // de um segundo passo porque não é uma coluna de `guests`.
  if (filter.property_id) {
    const { data: bookings } = await admin
      .from("bookings")
      .select("guest_id, rooms!inner(property_id)")
      .eq("rooms.property_id", filter.property_id);
    const withProperty = new Set(
      (bookings ?? []).map((b) => b.guest_id as string),
    );
    ids = new Set([...ids].filter((id) => withProperty.has(id)));
  }

  return ids;
}

async function findCandidates(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  step: EmailFlowStep,
  trigger: EffectiveTrigger,
  activatedAt: string,
): Promise<Candidate[]> {
  const { data, error } = await admin.rpc("email_flow_candidates", {
    p_trigger_type: trigger.triggerType,
    p_offset_reference: trigger.offsetReference,
    p_offset_minutes: trigger.offsetMinutes,
    p_trigger_param: trigger.triggerParam,
    p_activated_at: activatedAt,
    p_property_id: step.property_id,
  });

  if (error || !data) return [];

  let candidates = data as Candidate[];

  if (step.list_id) {
    const listGuestIds = await loadListGuestIds(admin, step.list_id);
    candidates = candidates.filter((c) => listGuestIds.has(c.guest_id));
  }

  return candidates;
}

function buildVariables(
  candidate: Candidate,
  times: { checkIn: string; checkOut: string },
) {
  return {
    guest_name: candidate.guest_name,
    check_in: formatDateLabel(candidate.check_in),
    check_out: formatDateLabel(candidate.check_out),
    room_name: candidate.room_name,
    property_name: candidate.property_name,
    booking_number: String(candidate.booking_number),
    access_code: candidate.access_code ?? "",
    check_in_time: times.checkIn,
    check_out_time: times.checkOut,
  };
}

export async function runAutomations(): Promise<AutomationRunSummary> {
  const admin = createAdminClient();
  const summary: AutomationRunSummary = {
    ranAt: new Date().toISOString(),
    steps: [],
  };

  if (!admin) return summary;

  const { data: flows } = await admin
    .from("email_flows")
    .select("id, name, is_active, activated_at")
    .eq("is_active", true);

  if (!flows || flows.length === 0) return summary;

  const { data: settings } = await admin
    .from("integration_settings")
    .select("resend_from_email, resend_from_name")
    .eq("id", true)
    .maybeSingle();

  const fromEmail = settings?.resend_from_email as string | null;
  const fromName = (settings?.resend_from_name as string | null) || undefined;
  const resend = await createResendClient();

  // Horas de check-in/checkout por alojamento, para as variáveis do email.
  const { data: propertyRows } = await admin
    .from("properties")
    .select("id, check_in_time, check_out_time");
  const propertyTimes = new Map(
    (propertyRows ?? []).map((p) => [
      p.id as string,
      {
        checkIn: String(p.check_in_time ?? "15:00").slice(0, 5),
        checkOut: String(p.check_out_time ?? "11:00").slice(0, 5),
      },
    ]),
  );

  for (const flow of flows) {
    // Carrega todos os passos (ativos ou não): para saber se um passo está
    // ativo é preciso ver os antecessores, e o gatilho vive na raiz.
    const { data: steps } = await admin
      .from("email_flow_steps")
      .select("*")
      .eq("flow_id", flow.id);

    const allSteps = (steps ?? []) as EmailFlowStep[];
    const stepsById = new Map(allSteps.map((s) => [s.id, s]));

    for (const step of allSteps) {
      // Passo sem modelo (rascunho no canvas) ou com cadeia sem gatilho.
      if (!step.template_id) continue;

      const trigger = resolveEffectiveTrigger(step, stepsById);
      if (!trigger || !trigger.active) continue;

      const stepSummary: AutomationStepSummary = {
        stepId: step.id,
        flowName: flow.name,
        triggerType: trigger.triggerType,
        matched: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
      };
      summary.steps.push(stepSummary);

      const { data: template } = await admin
        .from("email_templates")
        .select("*")
        .eq("id", step.template_id)
        .maybeSingle();

      if (!template) continue;

      const candidates = await findCandidates(
        admin,
        step,
        trigger,
        flow.activated_at,
      );
      stepSummary.matched = candidates.length;
      if (candidates.length === 0) continue;

      const { data: alreadySent } = await admin
        .from("email_sends")
        .select("booking_id")
        .eq("flow_step_id", step.id)
        .in(
          "booking_id",
          candidates.map((c) => c.booking_id),
        );
      const doneBookingIds = new Set(
        (alreadySent ?? []).map((r) => r.booking_id as string),
      );

      for (const candidate of candidates) {
        if (doneBookingIds.has(candidate.booking_id)) continue;

        if (!candidate.guest_email) {
          const { error: insertError } = await admin
            .from("email_sends")
            .insert({
              flow_step_id: step.id,
              booking_id: candidate.booking_id,
              guest_id: candidate.guest_id,
              email_to: null,
              subject: template.subject,
              status: "skipped",
            });
          if (!insertError) stepSummary.skipped += 1;
          continue;
        }

        const variables = buildVariables(
          candidate,
          propertyTimes.get(candidate.property_id) ?? DEFAULT_TIMES,
        );
        const subject = renderTemplate(template.subject, variables);
        const html = renderTemplate(template.body_html, variables);

        // Reclama já a linha antes de enviar — é o índice único
        // (flow_step_id, booking_id) que impede duas execuções em paralelo
        // (o cron e um "Correr agora" a coincidir, por exemplo) de enviarem
        // o mesmo email duas vezes. Se outra já reclamou entretanto, o
        // insert falha e passamos à candidata seguinte.
        const { error: claimError } = await admin.from("email_sends").insert({
          flow_step_id: step.id,
          booking_id: candidate.booking_id,
          guest_id: candidate.guest_id,
          email_to: candidate.guest_email,
          subject,
          status: "failed",
          error: "A processar…",
        });

        if (claimError) continue;

        let status: "sent" | "failed" = "failed";
        let resendId: string | null = null;
        let sendError: string | null = null;

        if (!resend || !fromEmail) {
          sendError =
            "Resend não está configurada (chave ou remetente em falta).";
        } else {
          try {
            const result = await resend.emails.send({
              from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
              to: candidate.guest_email,
              subject,
              html,
            });
            if (result.error) {
              sendError = result.error.message;
            } else {
              status = "sent";
              resendId = result.data?.id ?? null;
            }
          } catch (err) {
            sendError =
              err instanceof Error ? err.message : "Erro desconhecido.";
          }
        }

        const { error: updateError } = await admin
          .from("email_sends")
          .update({ status, resend_id: resendId, error: sendError })
          .eq("flow_step_id", step.id)
          .eq("booking_id", candidate.booking_id);

        if (!updateError) {
          if (status === "sent") stepSummary.sent += 1;
          else stepSummary.failed += 1;
        }
      }
    }
  }

  return summary;
}
