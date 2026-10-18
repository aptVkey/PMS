"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionPermissions, requirePermission } from "@/lib/permissions";
import type { CleaningActionResult } from "@/lib/cleaning";

const CleaningTaskSchema = z.object({
  roomId: z.string().min(1, { error: "Escolhe um quarto." }),
  taskDate: z.string().min(1, { error: "Indica a data." }),
  notes: z.string().optional(),
});

export type CleaningTaskFormState =
  { error: string } | { success: true } | undefined;

export async function createCleaningTask(
  _prevState: CleaningTaskFormState,
  formData: FormData,
): Promise<CleaningTaskFormState> {
  const denied = await requirePermission("equipas", "gerir_limpeza");
  if (denied) return denied;

  const parsed = CleaningTaskSchema.safeParse({
    roomId: formData.get("roomId"),
    taskDate: formData.get("taskDate"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Verifica os campos assinalados.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("cleaning_tasks").insert({
    room_id: parsed.data.roomId,
    task_date: parsed.data.taskDate,
    source: "manual",
    status: "pendente",
    notes: parsed.data.notes || null,
    assigned_to: null,
  });

  if (error) {
    return { error: "Não foi possível criar a tarefa. Tenta novamente." };
  }

  revalidatePath("/equipas");
  return { success: true };
}

const EditCleaningTaskSchema = z.object({
  id: z.string().min(1),
  roomId: z.string().optional(),
  taskDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function updateCleaningTaskDetails(
  _prevState: CleaningTaskFormState,
  formData: FormData,
): Promise<CleaningTaskFormState> {
  const denied = await requirePermission("equipas", "gerir_limpeza");
  if (denied) return denied;

  const parsed = EditCleaningTaskSchema.safeParse({
    id: formData.get("id"),
    roomId: formData.get("roomId") || undefined,
    taskDate: formData.get("taskDate") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: "Verifica os campos assinalados." };
  }

  const payload: Record<string, string | null> = {
    notes: parsed.data.notes || null,
  };
  if (parsed.data.roomId) payload.room_id = parsed.data.roomId;
  if (parsed.data.taskDate) payload.task_date = parsed.data.taskDate;

  const supabase = await createClient();
  const { data: updatedTask, error } = await supabase
    .from("cleaning_tasks")
    .update(payload)
    .eq("id", parsed.data.id)
    .eq("status", "pendente")
    .select("id").maybeSingle();

  if (error || !updatedTask) {
    return {
      error: "Só é possível editar tarefas por iniciar. Atualiza a página e tenta novamente.",
    };
  }

  revalidatePath("/equipas");
  return { success: true };
}

// The RPC locks the task and commits timestamps, checklist and cost together.
async function runCleaningAction(
  name: string,
  parameters: Record<string, string | boolean | null>,
): Promise<CleaningActionResult> {
  const { userId } = await getSessionPermissions();
  if (!userId) return { error: "Sessão inválida. Inicia sessão novamente." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(name, parameters);
  if (error) {
    if (error.code === "PGRST202") {
      return { error: "O fluxo de limpeza ainda precisa de ser ativado na base de dados. Contacta o administrador." };
    }
    return { error: ["42501", "22023"].includes(error.code)
      ? error.message : "Não foi possível guardar. Verifica a ligação e tenta novamente." };
  }
  if (!data?.task) return { error: "O servidor não confirmou a alteração. Atualiza a tarefa." };
  revalidatePath("/equipas");
  revalidatePath("/relatorios");
  revalidatePath("/");
  return { success: true, ...data } as CleaningActionResult;
}

export async function startCleaningTask(taskId: string): Promise<CleaningActionResult> {
  if (!z.uuid().safeParse(taskId).success) return { error: "Tarefa inválida." };
  return runCleaningAction("start_cleaning_task", { p_task_id: taskId });
}

export async function setCleaningTaskAssignee(taskId: string, staffId: string | null): Promise<CleaningActionResult> {
  const denied = await requirePermission("equipas", "gerir_limpeza");
  if (denied) return denied;
  if (!z.uuid().safeParse(taskId).success || (staffId !== null && !z.uuid().safeParse(staffId).success)) {
    return { error: "Tarefa ou responsável inválido." };
  }
  return runCleaningAction("assign_cleaning_task", { p_task_id: taskId, p_assignee: staffId });
}

export async function deleteCleaningTask(
  taskId: string,
): Promise<{ error: string } | { success: true }> {
  const denied = await requirePermission("equipas", "gerir_limpeza");
  if (denied) return denied;

  const supabase = await createClient();

  // As tarefas de checkout são geridas pelo trigger sync_checkout_cleaning_task
  // e desaparecem sozinhas se a reserva for cancelada. Antes o delete filtrava
  // por source = 'manual' e devolvia sucesso sem apagar nada.
  const { data: task } = await supabase
    .from("cleaning_tasks")
    .select("source, status")
    .eq("id", taskId)
    .maybeSingle();

  if (!task) {
    return { error: "Tarefa não encontrada." };
  }

  if (task.source !== "manual" || task.status !== "pendente") {
    return {
      error:
        "Só é possível remover tarefas manuais que ainda não começaram.",
    };
  }

  const { data: deletedTask, error } = await supabase
    .from("cleaning_tasks")
    .delete()
    .eq("id", taskId).eq("status", "pendente")
    .select("id").maybeSingle();

  if (error || !deletedTask) {
    return { error: "Não foi possível remover a tarefa. Tenta novamente." };
  }

  revalidatePath("/equipas");
  return { success: true };
}

export async function setCleaningItemChecked(
  taskId: string,
  itemId: string,
  checked: boolean,
): Promise<CleaningActionResult> {
  if (!z.uuid().safeParse(taskId).success || !z.uuid().safeParse(itemId).success || typeof checked !== "boolean") {
    return { error: "Item inválido." };
  }
  return runCleaningAction("check_cleaning_item", { p_task_id: taskId, p_item_id: itemId, p_checked: checked });
}
