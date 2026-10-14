"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAutomations, type AutomationRunSummary } from "@/lib/automations";
import {
  LIST_KINDS,
  TRIGGER_TYPES,
  OFFSET_REFERENCES,
} from "@/lib/email-marketing";

export type FormState = { error: string } | { success: true } | undefined;

const PERMISSION = "marketing" as const;

// ---------- Templates ----------

const TemplateSchema = z.object({
  name: z.string().min(1, { error: "O nome é obrigatório." }),
  subject: z.string().min(1, { error: "O assunto é obrigatório." }),
  bodyHtml: z.string().min(1, { error: "O corpo do email é obrigatório." }),
});

export async function saveTemplate(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  const parsed = TemplateSchema.safeParse({
    name: formData.get("name"),
    subject: formData.get("subject"),
    bodyHtml: formData.get("bodyHtml"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifica os campos." };
  }

  const supabase = await createClient();
  const payload = {
    name: parsed.data.name,
    subject: parsed.data.subject,
    body_html: parsed.data.bodyHtml,
  };

  const id = formData.get("id");
  const { error } = id
    ? await supabase
        .from("email_templates")
        .update(payload)
        .eq("id", String(id))
    : await supabase.from("email_templates").insert(payload);

  if (error) {
    return { error: "Não foi possível guardar o modelo. Tenta novamente." };
  }

  revalidatePath("/email-marketing");
  return { success: true };
}

export async function deleteTemplate(
  templateId: string,
): Promise<{ error: string } | { success: true }> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  const supabase = await createClient();
  const { error } = await supabase
    .from("email_templates")
    .delete()
    .eq("id", templateId);

  if (error) {
    return {
      error:
        "Não foi possível remover o modelo — confirma que não está a ser usado por nenhuma etapa.",
    };
  }

  revalidatePath("/email-marketing");
  return { success: true };
}

// ---------- Listas ----------

const ListSchema = z.object({
  name: z.string().min(1, { error: "O nome é obrigatório." }),
  description: z.string().optional(),
  kind: z.enum(LIST_KINDS, { error: "Escolhe um tipo válido." }),
  nationality: z.string().optional(),
  propertyId: z.string().optional(),
  minVisitCount: z.coerce.number().int().min(0).optional(),
});

export async function saveList(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  const parsed = ListSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    kind: formData.get("kind"),
    nationality: formData.get("nationality") || undefined,
    propertyId: formData.get("propertyId") || undefined,
    minVisitCount: formData.get("minVisitCount") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifica os campos." };
  }

  const filter =
    parsed.data.kind === "dynamic"
      ? {
          nationality: parsed.data.nationality || null,
          property_id: parsed.data.propertyId || null,
          min_visit_count: parsed.data.minVisitCount ?? null,
        }
      : null;

  const supabase = await createClient();
  const payload = {
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    kind: parsed.data.kind,
    filter,
  };

  const id = formData.get("id");
  const { error } = id
    ? await supabase.from("email_lists").update(payload).eq("id", String(id))
    : await supabase.from("email_lists").insert(payload);

  if (error) {
    return { error: "Não foi possível guardar a lista. Tenta novamente." };
  }

  revalidatePath("/email-marketing");
  return { success: true };
}

export async function deleteList(
  listId: string,
): Promise<{ error: string } | { success: true }> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  const supabase = await createClient();
  const { error } = await supabase
    .from("email_lists")
    .delete()
    .eq("id", listId);

  if (error) {
    return {
      error:
        "Não foi possível remover a lista — confirma que não está a ser usada por nenhuma etapa.",
    };
  }

  revalidatePath("/email-marketing");
  return { success: true };
}

export async function addListMember(
  listId: string,
  guestId: string,
): Promise<{ error: string } | { success: true }> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  const supabase = await createClient();
  const { error } = await supabase
    .from("email_list_members")
    .insert({ list_id: listId, guest_id: guestId });

  if (error && error.code !== "23505") {
    return { error: "Não foi possível adicionar o hóspede. Tenta novamente." };
  }

  revalidatePath("/email-marketing");
  return { success: true };
}

export async function removeListMember(
  listId: string,
  guestId: string,
): Promise<{ error: string } | { success: true }> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  const supabase = await createClient();
  const { error } = await supabase
    .from("email_list_members")
    .delete()
    .eq("list_id", listId)
    .eq("guest_id", guestId);

  if (error) {
    return { error: "Não foi possível remover o hóspede. Tenta novamente." };
  }

  revalidatePath("/email-marketing");
  return { success: true };
}

// ---------- Fluxos ----------

const FlowSchema = z.object({
  name: z.string().min(1, { error: "O nome é obrigatório." }),
  description: z.string().optional(),
});

export async function saveFlow(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  const parsed = FlowSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifica os campos." };
  }

  const supabase = await createClient();
  const payload = {
    name: parsed.data.name,
    description: parsed.data.description ?? null,
  };

  const id = formData.get("id");
  const { error } = id
    ? await supabase.from("email_flows").update(payload).eq("id", String(id))
    : await supabase.from("email_flows").insert(payload);

  if (error) {
    return { error: "Não foi possível guardar o fluxo. Tenta novamente." };
  }

  revalidatePath("/email-marketing");
  return { success: true };
}

export async function setFlowActive(
  flowId: string,
  isActive: boolean,
): Promise<{ error: string } | { success: true }> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  const supabase = await createClient();
  // Ao reativar, avança o "activated_at" — evita que reservas criadas
  // enquanto o fluxo esteve pausado disparem de repente o gatilho de
  // "criação da reserva" assim que volta a ficar ativo.
  const payload = isActive
    ? { is_active: true, activated_at: new Date().toISOString() }
    : { is_active: false };

  const { error } = await supabase
    .from("email_flows")
    .update(payload)
    .eq("id", flowId);

  if (error) {
    return { error: "Não foi possível atualizar o fluxo. Tenta novamente." };
  }

  revalidatePath("/email-marketing");
  return { success: true };
}

export async function deleteFlow(
  flowId: string,
): Promise<{ error: string } | { success: true }> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  const supabase = await createClient();
  const { error } = await supabase
    .from("email_flows")
    .delete()
    .eq("id", flowId);

  if (error) {
    return { error: "Não foi possível remover o fluxo. Tenta novamente." };
  }

  revalidatePath("/email-marketing");
  return { success: true };
}

// ---------- Canvas do fluxo (passos como nós) ----------

type ActionResult = { error: string } | { success: true };

const MAX_OFFSET_MINUTES = 60 * 24 * 365;

const OffsetMinutesSchema = z
  .number()
  .int()
  .min(-MAX_OFFSET_MINUTES)
  .max(MAX_OFFSET_MINUTES);

const NodeCreateSchema = z.object({
  flowId: z.string().min(1),
  parentStepId: z.string().min(1).nullable(),
  triggerType: z.enum(TRIGGER_TYPES).optional(),
  x: z.number().finite(),
  y: z.number().finite(),
});

// Cria um passo no canvas. Sem modelo escolhido o motor ignora-o, por isso um
// nó acabado de arrastar nunca envia nada até lhe ser atribuído um modelo.
export async function createFlowNode(
  input: z.input<typeof NodeCreateSchema>,
): Promise<{ error: string } | { success: true; id: string }> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  const parsed = NodeCreateSchema.safeParse(input);
  if (!parsed.success) return { error: "Dados do nó inválidos." };

  const { flowId, parentStepId, triggerType, x, y } = parsed.data;

  if (!parentStepId && !triggerType) {
    return { error: "Escolhe o gatilho do novo passo." };
  }

  const supabase = await createClient();

  if (parentStepId) {
    const { data: parent } = await supabase
      .from("email_flow_steps")
      .select("flow_id")
      .eq("id", parentStepId)
      .maybeSingle();
    if (!parent || parent.flow_id !== flowId) {
      return { error: "O passo anterior não pertence a este fluxo." };
    }
  }

  const { count } = await supabase
    .from("email_flow_steps")
    .select("id", { count: "exact", head: true })
    .eq("flow_id", flowId);

  // Valores iniciais sensatos por tipo de gatilho (editáveis no painel).
  const rootDefaults: Record<
    string,
    {
      offset_reference: string | null;
      offset_minutes: number;
      trigger_param: string | null;
    }
  > = {
    booking_created: {
      offset_reference: null,
      offset_minutes: 0,
      trigger_param: null,
    },
    booking_status: {
      offset_reference: null,
      offset_minutes: 0,
      trigger_param: "confirmada",
    },
    date_offset: {
      offset_reference: "check_in",
      offset_minutes: -24 * 60,
      trigger_param: null,
    },
    cleaning_completed: {
      offset_reference: null,
      offset_minutes: 0,
      trigger_param: null,
    },
    cleaning_ready_on_checkin: {
      offset_reference: null,
      offset_minutes: 0,
      trigger_param: null,
    },
  };

  const root = triggerType ? rootDefaults[triggerType] : null;
  const isRoot = !parentStepId && triggerType;

  const { data, error } = await supabase
    .from("email_flow_steps")
    .insert({
      flow_id: flowId,
      position: count ?? 0,
      parent_step_id: parentStepId,
      template_id: null,
      trigger_type: isRoot ? triggerType : null,
      offset_reference: isRoot && root ? root.offset_reference : null,
      offset_minutes: isRoot && root ? root.offset_minutes : 24 * 60,
      offset_days:
        isRoot && root && triggerType === "date_offset"
          ? Math.trunc(root.offset_minutes / 1440)
          : null,
      trigger_param: isRoot && root ? root.trigger_param : null,
      pos_x: Math.round(x),
      pos_y: Math.round(y),
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Não foi possível criar o passo. Tenta novamente." };
  }

  revalidatePath("/email-marketing");
  return { success: true, id: data.id as string };
}

const EmailNodeSchema = z.object({
  stepId: z.string().min(1),
  templateId: z.string().min(1).nullable(),
  listId: z.string().min(1).nullable(),
  propertyId: z.string().min(1).nullable(),
  // Só se aplica a passos que têm um passo anterior.
  delayMinutes: z.number().int().min(0).max(MAX_OFFSET_MINUTES).optional(),
});

export async function saveEmailNode(
  input: z.input<typeof EmailNodeSchema>,
): Promise<ActionResult> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  const parsed = EmailNodeSchema.safeParse(input);
  if (!parsed.success) return { error: "Verifica os campos do email." };

  const supabase = await createClient();
  const { data: step } = await supabase
    .from("email_flow_steps")
    .select("parent_step_id")
    .eq("id", parsed.data.stepId)
    .maybeSingle();

  if (!step) return { error: "Este passo já não existe." };

  const payload: Record<string, unknown> = {
    template_id: parsed.data.templateId,
    list_id: parsed.data.listId,
    property_id: parsed.data.propertyId,
  };
  if (step.parent_step_id && parsed.data.delayMinutes !== undefined) {
    payload.offset_minutes = parsed.data.delayMinutes;
  }

  const { error } = await supabase
    .from("email_flow_steps")
    .update(payload)
    .eq("id", parsed.data.stepId);

  if (error) {
    return { error: "Não foi possível guardar o email. Tenta novamente." };
  }

  revalidatePath("/email-marketing");
  return { success: true };
}

const TriggerNodeSchema = z.object({
  stepId: z.string().min(1),
  triggerType: z.enum(TRIGGER_TYPES),
  offsetReference: z.enum(OFFSET_REFERENCES).nullable(),
  triggerParam: z.string().min(1).nullable(),
  offsetMinutes: OffsetMinutesSchema,
});

// Guarda o gatilho de um passo: o da raiz, ou um gatilho próprio de um passo
// seguinte (ex.: "1 dia antes do check-in", em vez de "depois do anterior").
export async function saveTriggerNode(
  input: z.input<typeof TriggerNodeSchema>,
): Promise<ActionResult> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  const parsed = TriggerNodeSchema.safeParse(input);
  if (!parsed.success) return { error: "Verifica os campos do gatilho." };

  const { stepId, triggerType, offsetReference, triggerParam, offsetMinutes } =
    parsed.data;

  if (triggerType === "date_offset" && !offsetReference) {
    return { error: "Escolhe se é relativo ao check-in ou ao checkout." };
  }
  if (triggerType === "booking_status" && !triggerParam) {
    return { error: "Escolhe o estado da reserva." };
  }
  // Fora de date_offset não faz sentido um atraso negativo (não há "antes").
  if (triggerType !== "date_offset" && offsetMinutes < 0) {
    return { error: "O atraso não pode ser negativo para este gatilho." };
  }

  const supabase = await createClient();
  const { data: step } = await supabase
    .from("email_flow_steps")
    .select("parent_step_id")
    .eq("id", stepId)
    .maybeSingle();

  if (!step) return { error: "Este passo já não existe." };

  const { error } = await supabase
    .from("email_flow_steps")
    .update({
      trigger_type: triggerType,
      offset_reference: triggerType === "date_offset" ? offsetReference : null,
      trigger_param: triggerType === "booking_status" ? triggerParam : null,
      offset_minutes: offsetMinutes,
      offset_days:
        triggerType === "date_offset" ? Math.trunc(offsetMinutes / 1440) : null,
    })
    .eq("id", stepId);

  if (error) {
    return { error: "Não foi possível guardar o gatilho. Tenta novamente." };
  }

  revalidatePath("/email-marketing");
  return { success: true };
}

// Volta a fazer um passo seguinte esperar "X depois do email anterior".
export async function clearStepTrigger(
  stepId: string,
  delayMinutes: number,
): Promise<ActionResult> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  const delay = z
    .number()
    .int()
    .min(0)
    .max(MAX_OFFSET_MINUTES)
    .safeParse(delayMinutes);
  if (!delay.success) return { error: "Tempo de espera inválido." };

  const supabase = await createClient();
  const { data: step } = await supabase
    .from("email_flow_steps")
    .select("parent_step_id")
    .eq("id", stepId)
    .maybeSingle();

  if (!step) return { error: "Este passo já não existe." };
  if (!step.parent_step_id) {
    return { error: "O primeiro passo de um ramo precisa de gatilho." };
  }

  const { error } = await supabase
    .from("email_flow_steps")
    .update({
      trigger_type: null,
      offset_reference: null,
      trigger_param: null,
      offset_days: null,
      offset_minutes: delay.data,
    })
    .eq("id", stepId);

  if (error) {
    return { error: "Não foi possível guardar o passo. Tenta novamente." };
  }

  revalidatePath("/email-marketing");
  return { success: true };
}

const MovePositionsSchema = z
  .array(
    z.object({
      id: z.string().min(1),
      x: z.number().finite(),
      y: z.number().finite(),
    }),
  )
  .max(200);

export async function moveFlowNodes(
  positions: z.input<typeof MovePositionsSchema>,
): Promise<ActionResult> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  const parsed = MovePositionsSchema.safeParse(positions);
  if (!parsed.success) return { error: "Posições inválidas." };

  const supabase = await createClient();
  for (const { id, x, y } of parsed.data) {
    const { error } = await supabase
      .from("email_flow_steps")
      .update({ pos_x: Math.round(x), pos_y: Math.round(y) })
      .eq("id", id);
    if (error) {
      return { error: "Não foi possível guardar a posição." };
    }
  }

  // Sem revalidatePath de propósito: o canvas já mostra a posição nova e
  // revalidar a cada arrasto só causaria recargas desnecessárias.
  return { success: true };
}

// Liga um passo a outro (arrastando de um nó para outro no canvas).
export async function reparentFlowNode(
  stepId: string,
  newParentId: string,
): Promise<ActionResult> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  if (stepId === newParentId) {
    return { error: "Um passo não pode ficar ligado a si próprio." };
  }

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("email_flow_steps")
    .select("id, flow_id, parent_step_id, offset_minutes, trigger_type")
    .in("id", [stepId, newParentId]);

  const step = rows?.find((r) => r.id === stepId);
  const parent = rows?.find((r) => r.id === newParentId);

  if (!step || !parent || step.flow_id !== parent.flow_id) {
    return { error: "Os dois passos têm de estar no mesmo fluxo." };
  }

  // Evita ciclos: o novo pai não pode descender do passo que se move.
  let cursor: string | null = parent.parent_step_id;
  const guard = new Set<string>();
  while (cursor && !guard.has(cursor)) {
    if (cursor === stepId) {
      return { error: "Essa ligação criaria um ciclo no fluxo." };
    }
    guard.add(cursor);
    const { data: up } = await supabase
      .from("email_flow_steps")
      .select("parent_step_id")
      .eq("id", cursor)
      .maybeSingle();
    cursor = (up?.parent_step_id as string | null | undefined) ?? null;
  }

  // Deixa de ter gatilho próprio: passa a herdar o do ramo onde entra.
  const { error } = await supabase
    .from("email_flow_steps")
    .update({
      parent_step_id: newParentId,
      trigger_type: null,
      offset_reference: null,
      trigger_param: null,
      offset_days: null,
      offset_minutes: Math.max(0, step.offset_minutes as number) || 24 * 60,
    })
    .eq("id", stepId);

  if (error) {
    return { error: "Não foi possível ligar os passos. Tenta novamente." };
  }

  revalidatePath("/email-marketing");
  return { success: true };
}

export async function setFlowStepActive(
  stepId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  const supabase = await createClient();
  const { error } = await supabase
    .from("email_flow_steps")
    .update({ is_active: isActive })
    .eq("id", stepId);

  if (error) {
    return { error: "Não foi possível atualizar a etapa. Tenta novamente." };
  }

  revalidatePath("/email-marketing");
  return { success: true };
}

// Os passos seguintes (filhos) são apagados em cascata pela base de dados.
export async function deleteFlowStep(stepId: string): Promise<ActionResult> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  const supabase = await createClient();
  const { error } = await supabase
    .from("email_flow_steps")
    .delete()
    .eq("id", stepId);

  if (error) {
    return { error: "Não foi possível remover a etapa. Tenta novamente." };
  }

  revalidatePath("/email-marketing");
  return { success: true };
}

// ---------- Execução manual ----------

export async function runAutomationsNow(): Promise<
  { error: string } | { success: true; summary: AutomationRunSummary }
> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  // Confirma que o cliente admin está disponível antes de correr — dá um
  // erro claro em vez de um resumo vazio e enganador.
  if (!createAdminClient()) {
    return {
      error:
        "Falta a chave service_role do Supabase no servidor (SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  const summary = await runAutomations();
  revalidatePath("/email-marketing");
  return { success: true, summary };
}
