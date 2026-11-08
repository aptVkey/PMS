"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionPermissions, requirePermission } from "@/lib/permissions";
import {
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_STATUSES,
} from "@/lib/maintenance";

const MaintenanceIssueSchema = z
  .object({
    roomId: z.string().optional(),
    locationLabel: z.string().optional(),
    title: z.string().min(1, { error: "Indica um título." }),
    description: z.string().optional(),
    priority: z.enum(MAINTENANCE_PRIORITIES),
    assignedTo: z.string().optional(),
  })
  .refine((data) => data.roomId || data.locationLabel, {
    error: "Escolhe um quarto ou indica uma zona comum.",
    path: ["locationLabel"],
  });

export type MaintenanceIssueFormState =
  { error: string } | { success: true } | undefined;

export async function createMaintenanceIssue(
  _prevState: MaintenanceIssueFormState,
  formData: FormData,
): Promise<MaintenanceIssueFormState> {
  const denied = await requirePermission("equipas", "manutencao");
  if (denied) return denied;

  const parsed = MaintenanceIssueSchema.safeParse({
    roomId: formData.get("roomId") || undefined,
    locationLabel: formData.get("locationLabel") || undefined,
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    priority: formData.get("priority"),
    assignedTo: formData.get("assignedTo") || undefined,
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Verifica os campos assinalados.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("maintenance_issues").insert({
    room_id: parsed.data.roomId || null,
    location_label: parsed.data.roomId
      ? null
      : parsed.data.locationLabel || null,
    title: parsed.data.title,
    description: parsed.data.description || null,
    priority: parsed.data.priority,
    status: "reportado",
    assigned_to: parsed.data.assignedTo || null,
  });

  if (error) {
    return { error: "Não foi possível criar a ocorrência. Tenta novamente." };
  }

  revalidatePath("/equipas");
  return { success: true };
}

const EditMaintenanceIssueSchema = z
  .object({
    id: z.string().min(1),
    roomId: z.string().optional(),
    locationLabel: z.string().optional(),
    title: z.string().min(1, { error: "Indica um título." }),
    description: z.string().optional(),
    priority: z.enum(MAINTENANCE_PRIORITIES),
    assignedTo: z.string().optional(),
  })
  .refine((data) => data.roomId || data.locationLabel, {
    error: "Escolhe um quarto ou indica uma zona comum.",
    path: ["locationLabel"],
  });

export async function updateMaintenanceIssueDetails(
  _prevState: MaintenanceIssueFormState,
  formData: FormData,
): Promise<MaintenanceIssueFormState> {
  const denied = await requirePermission("equipas", "manutencao");
  if (denied) return denied;

  const parsed = EditMaintenanceIssueSchema.safeParse({
    id: formData.get("id"),
    roomId: formData.get("roomId") || undefined,
    locationLabel: formData.get("locationLabel") || undefined,
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    priority: formData.get("priority"),
    assignedTo: formData.get("assignedTo") || undefined,
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Verifica os campos assinalados.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("maintenance_issues")
    .update({
      room_id: parsed.data.roomId || null,
      location_label: parsed.data.roomId
        ? null
        : parsed.data.locationLabel || null,
      title: parsed.data.title,
      description: parsed.data.description || null,
      priority: parsed.data.priority,
      // Só mexe no responsável se o formulário o enviou (o select existe
      // sempre; "Não atribuído" envia vazio e desatribui de propósito).
      ...(formData.has("assignedTo")
        ? { assigned_to: parsed.data.assignedTo || null }
        : {}),
    })
    .eq("id", parsed.data.id);

  if (error) {
    return {
      error: "Não foi possível guardar as alterações. Tenta novamente.",
    };
  }

  revalidatePath("/equipas");
  return { success: true };
}

export async function setMaintenanceIssueStatus(
  issueId: string,
  status: string,
): Promise<{ error: string } | { success: true }> {
  if (!(MAINTENANCE_STATUSES as readonly string[]).includes(status)) {
    return { error: "Estado inválido." };
  }

  const { userId, permissions } = await getSessionPermissions();

  if (!userId) {
    return { error: "Sessão inválida. Inicia sessão novamente." };
  }

  const supabase = await createClient();
  const { data: issue } = await supabase
    .from("maintenance_issues")
    .select("assigned_to")
    .eq("id", issueId)
    .maybeSingle();

  const isAuthorized =
    permissions.includes("equipas") ||
    permissions.includes("manutencao") ||
    issue?.assigned_to === userId;

  if (!isAuthorized) {
    return {
      error:
        "Só o Administrador, a pessoa responsável pela Manutenção ou quem está atribuído a esta ocorrência pode alterar o estado.",
    };
  }

  const { error } = await supabase
    .from("maintenance_issues")
    .update({ status })
    .eq("id", issueId);

  if (error) {
    return { error: "Não foi possível atualizar o estado. Tenta novamente." };
  }

  revalidatePath("/equipas");
  return { success: true };
}

export async function setMaintenanceIssueAssignee(
  issueId: string,
  staffId: string | null,
): Promise<{ error: string } | { success: true }> {
  const { permissions } = await getSessionPermissions();

  if (!permissions.includes("equipas") && !permissions.includes("manutencao")) {
    return {
      error:
        "Só o Administrador ou a pessoa responsável pela Manutenção pode atribuir ocorrências.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("maintenance_issues")
    .update({ assigned_to: staffId })
    .eq("id", issueId);

  if (error) {
    return {
      error: "Não foi possível atribuir a ocorrência. Tenta novamente.",
    };
  }

  revalidatePath("/equipas");
  return { success: true };
}

export async function deleteMaintenanceIssue(
  issueId: string,
): Promise<{ error: string } | { success: true }> {
  const { permissions } = await getSessionPermissions();

  if (!permissions.includes("equipas") && !permissions.includes("manutencao")) {
    return {
      error:
        "Só o Administrador ou a pessoa responsável pela Manutenção pode remover ocorrências.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("maintenance_issues")
    .delete()
    .eq("id", issueId);

  if (error) {
    return { error: "Não foi possível remover a ocorrência. Tenta novamente." };
  }

  revalidatePath("/equipas");
  return { success: true };
}
