"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import {
  INTERACTION_TYPES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  RULE_METRICS,
  RULE_OPERATORS,
  TAG_COLORS,
} from "@/lib/crm";

type Result = { error: string } | { success: true };

const PERMISSION = "hospedes" as const;
const id = z.string().min(1);
const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .transform((v) => v.trim())
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

function done(): Result {
  revalidatePath("/hospedes");
  return { success: true };
}

function fail(message = "Não foi possível guardar. Tenta novamente."): {
  error: string;
} {
  return { error: message };
}

// ---------- Etiquetas ----------

export async function createTag(
  name: string,
  color: string,
): Promise<{ error: string } | { success: true; id: string }> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  const parsed = z
    .object({
      name: z.string().trim().min(1, { error: "Indica o nome." }).max(40),
      color: z.enum(TAG_COLORS),
    })
    .safeParse({ name, color });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_tags")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error?.code === "23505") {
    return { error: "Já existe uma etiqueta com esse nome." };
  }
  if (error || !data) return fail();

  revalidatePath("/hospedes");
  return { success: true, id: data.id as string };
}

export async function deleteTag(tagId: string): Promise<Result> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  const supabase = await createClient();
  const { error } = await supabase.from("crm_tags").delete().eq("id", tagId);
  return error ? fail("Não foi possível remover a etiqueta.") : done();
}

export async function setGuestTag(
  guestId: string,
  tagId: string,
  on: boolean,
): Promise<Result> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  const supabase = await createClient();
  const { error } = on
    ? await supabase
        .from("crm_guest_tags")
        .insert({ guest_id: guestId, tag_id: tagId })
    : await supabase
        .from("crm_guest_tags")
        .delete()
        .eq("guest_id", guestId)
        .eq("tag_id", tagId);

  // 23505 = já tinha a etiqueta.
  if (error && error.code !== "23505") return fail();
  return done();
}

// ---------- Regras de classificação automática ----------

const TagRuleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Indica o nome da etiqueta." })
    .max(40),
  color: z.enum(TAG_COLORS),
  metric: z.enum(RULE_METRICS),
  operator: z.enum(RULE_OPERATORS),
  thresholdMode: z.enum(["fixed", "average"]),
  value: z.number().finite().min(0).max(10_000_000),
});

export async function saveTagRule(
  input: z.input<typeof TagRuleSchema>,
): Promise<Result> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  const parsed = TagRuleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("crm_tag_rules").insert({
    name: d.name,
    color: d.color,
    metric: d.metric,
    operator: d.operator,
    threshold_mode: d.thresholdMode,
    value: d.value,
  });

  if (error?.code === "23505") {
    return { error: "Já existe uma regra com esse nome." };
  }
  return error ? fail() : done();
}

export async function deleteTagRule(ruleId: string): Promise<Result> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_tag_rules")
    .delete()
    .eq("id", ruleId);
  return error ? fail("Não foi possível remover a regra.") : done();
}

// ---------- Interações ----------

export async function addInteraction(
  guestId: string,
  type: string,
  body: string,
): Promise<Result> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  const parsed = z
    .object({
      guestId: id,
      type: z.enum(INTERACTION_TYPES),
      body: z.string().trim().min(1, { error: "Escreve a nota." }).max(4000),
    })
    .safeParse({ guestId, type, body });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("crm_interactions").insert({
    guest_id: parsed.data.guestId,
    type: parsed.data.type,
    body: parsed.data.body,
  });
  return error ? fail() : done();
}

export async function deleteInteraction(
  interactionId: string,
): Promise<Result> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_interactions")
    .delete()
    .eq("id", interactionId);
  return error ? fail("Não foi possível remover.") : done();
}

// ---------- Tarefas ----------

const TaskSchema = z.object({
  id: id.optional(),
  title: z
    .string()
    .trim()
    .min(1, { error: "Indica o que há a fazer." })
    .max(200),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  guestId: id.nullable().optional(),
  leadId: id.nullable().optional(),
  assignedTo: id.nullable().optional(),
});

export async function saveTask(
  input: z.input<typeof TaskSchema>,
): Promise<Result> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  const parsed = TaskSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const {
    id: taskId,
    title,
    dueDate,
    guestId,
    leadId,
    assignedTo,
  } = parsed.data;
  const payload = {
    title,
    due_date: dueDate ?? null,
    guest_id: guestId ?? null,
    lead_id: leadId ?? null,
    assigned_to: assignedTo ?? null,
  };

  const supabase = await createClient();
  const { error } = taskId
    ? await supabase.from("crm_tasks").update(payload).eq("id", taskId)
    : await supabase.from("crm_tasks").insert(payload);
  return error ? fail() : done();
}

export async function setTaskDone(
  taskId: string,
  isDone: boolean,
): Promise<Result> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_tasks")
    .update({ done: isDone, done_at: isDone ? new Date().toISOString() : null })
    .eq("id", taskId);
  return error ? fail() : done();
}

export async function deleteTask(taskId: string): Promise<Result> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  const supabase = await createClient();
  const { error } = await supabase.from("crm_tasks").delete().eq("id", taskId);
  return error ? fail("Não foi possível remover a tarefa.") : done();
}

// ---------- Leads ----------

const LeadSchema = z.object({
  id: id.optional(),
  name: z.string().trim().min(1, { error: "Indica o nome." }).max(120),
  email: z
    .union([z.email({ error: "Email inválido." }), z.literal("")])
    .nullable()
    .optional(),
  phone: optionalText(40),
  message: optionalText(4000),
  notes: optionalText(4000),
  source: z.enum(LEAD_SOURCES),
  status: z.enum(LEAD_STATUSES),
  assignedTo: id.nullable().optional(),
});

export async function saveLead(
  input: z.input<typeof LeadSchema>,
): Promise<Result> {
  const denied = await requirePermission(PERMISSION, "marketing");
  if (denied) return denied;

  const parsed = LeadSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const d = parsed.data;
  const payload = {
    name: d.name,
    email: d.email || null,
    phone: d.phone ?? null,
    message: d.message ?? null,
    notes: d.notes ?? null,
    source: d.source,
    status: d.status,
    assigned_to: d.assignedTo ?? null,
  };

  const supabase = await createClient();
  const { error } = d.id
    ? await supabase.from("crm_leads").update(payload).eq("id", d.id)
    : await supabase.from("crm_leads").insert(payload);
  return error ? fail() : done();
}

export async function setLeadStatus(
  leadId: string,
  status: string,
): Promise<Result> {
  const denied = await requirePermission(PERMISSION, "marketing");
  if (denied) return denied;

  const parsed = z.enum(LEAD_STATUSES).safeParse(status);
  if (!parsed.success) return { error: "Estado inválido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_leads")
    .update({ status: parsed.data })
    .eq("id", leadId);
  return error ? fail() : done();
}

export async function deleteLead(leadId: string): Promise<Result> {
  const denied = await requirePermission(PERMISSION, "marketing");
  if (denied) return denied;

  const supabase = await createClient();
  const { error } = await supabase.from("crm_leads").delete().eq("id", leadId);
  return error ? fail("Não foi possível remover o lead.") : done();
}

// Cria o hóspede a partir de um lead (ou liga a um hóspede que já tenha o
// mesmo email) e regista a conversa original como interação.
export async function convertLeadToGuest(leadId: string): Promise<Result> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("crm_leads")
    .select("name, email, phone, message, guest_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return { error: "Lead não encontrado." };
  if (lead.guest_id) return { error: "Este lead já está ligado a um hóspede." };

  let guestId: string | null = null;
  if (lead.email) {
    const { data: existing } = await supabase
      .from("guests")
      .select("id")
      .ilike("email", lead.email)
      .limit(1)
      .maybeSingle();
    guestId = (existing?.id as string | undefined) ?? null;
  }

  if (!guestId) {
    const { data: created, error } = await supabase
      .from("guests")
      .insert({ name: lead.name, email: lead.email, phone: lead.phone })
      .select("id")
      .single();
    if (error || !created) return fail("Não foi possível criar o hóspede.");
    guestId = created.id as string;
  }

  if (lead.message) {
    await supabase.from("crm_interactions").insert({
      guest_id: guestId,
      type: "nota",
      body: `Pedido original (lead): ${lead.message}`,
    });
  }

  const { error } = await supabase
    .from("crm_leads")
    .update({ guest_id: guestId })
    .eq("id", leadId);
  return error ? fail() : done();
}

// ---------- Segmentos ----------

const SegmentFilterSchema = z.object({
  tagIds: z.array(id).max(30).optional(),
  nationality: z.string().max(80).optional(),
  minStays: z.number().int().min(1).max(1000).optional(),
  minValue: z.number().min(0).max(10_000_000).optional(),
  inactiveDays: z.number().int().min(1).max(5000).optional(),
  hasUpcoming: z.boolean().optional(),
  hasEmail: z.boolean().optional(),
});

export async function saveSegment(
  name: string,
  filter: z.input<typeof SegmentFilterSchema>,
): Promise<Result> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  const parsed = z
    .object({
      name: z.string().trim().min(1, { error: "Indica o nome." }).max(80),
      filter: SegmentFilterSchema,
    })
    .safeParse({ name, filter });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("crm_segments").insert(parsed.data);
  return error ? fail() : done();
}

export async function deleteSegment(segmentId: string): Promise<Result> {
  const denied = await requirePermission(PERMISSION);
  if (denied) return denied;

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_segments")
    .delete()
    .eq("id", segmentId);
  // 23503: há uma lista de email ligada a este segmento.
  if (error?.code === "23503") {
    return {
      error:
        "Este segmento alimenta uma lista de email. Remove primeiro essa lista no Email marketing.",
    };
  }
  return error ? fail("Não foi possível remover o segmento.") : done();
}

// Liga uma lista de email a um segmento. A lista é DINÂMICA: quem pertence
// ao segmento é recalculado no envio, com as reservas e a média de então.
// Exige a permissão de Marketing, como o resto das listas.
export async function createEmailListFromSegment(
  segmentId: string,
): Promise<Result> {
  const denied = await requirePermission("marketing");
  if (denied) return denied;

  const supabase = await createClient();
  const { data: segment } = await supabase
    .from("crm_segments")
    .select("id, name")
    .eq("id", segmentId)
    .maybeSingle();
  if (!segment) return { error: "Segmento não encontrado." };

  const { data: existing } = await supabase
    .from("email_lists")
    .select("id")
    .eq("segment_id", segmentId)
    .maybeSingle();
  if (existing) {
    return { error: "Já existe uma lista de email ligada a este segmento." };
  }

  const { error } = await supabase.from("email_lists").insert({
    name: segment.name,
    description: "Dinâmica: segue o segmento do CRM a cada envio.",
    kind: "segment",
    segment_id: segmentId,
  });
  if (error) return fail("Não foi possível criar a lista.");

  revalidatePath("/email-marketing");
  return done();
}
