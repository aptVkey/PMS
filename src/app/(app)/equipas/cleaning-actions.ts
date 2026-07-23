"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CLEANING_STATUSES } from "@/lib/cleaning";

async function getRequestPermissions(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { userId: null, permissions: [] as string[] };

  const { data: staffRow } = await supabase
    .from("staff")
    .select("permissions")
    .eq("id", user.id)
    .maybeSingle();

  return { userId: user.id, permissions: (staffRow?.permissions as string[]) ?? [] };
}

const CleaningTaskSchema = z.object({
  roomId: z.string().min(1, { error: "Escolhe um quarto." }),
  taskDate: z.string().min(1, { error: "Indica a data." }),
  notes: z.string().optional(),
  assignedTo: z.string().optional(),
});

export type CleaningTaskFormState =
  | { error: string }
  | { success: true }
  | undefined;

export async function createCleaningTask(
  _prevState: CleaningTaskFormState,
  formData: FormData,
): Promise<CleaningTaskFormState> {
  const parsed = CleaningTaskSchema.safeParse({
    roomId: formData.get("roomId"),
    taskDate: formData.get("taskDate"),
    notes: formData.get("notes") || undefined,
    assignedTo: formData.get("assignedTo") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifica os campos assinalados." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("cleaning_tasks").insert({
    room_id: parsed.data.roomId,
    task_date: parsed.data.taskDate,
    source: "manual",
    status: "pendente",
    notes: parsed.data.notes || null,
    assigned_to: parsed.data.assignedTo || null,
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
  const { error } = await supabase
    .from("cleaning_tasks")
    .update(payload)
    .eq("id", parsed.data.id);

  if (error) {
    return { error: "Não foi possível guardar as alterações. Tenta novamente." };
  }

  revalidatePath("/equipas");
  return { success: true };
}

export async function setCleaningTaskStatus(
  taskId: string,
  status: string,
): Promise<{ error: string } | { success: true }> {
  if (!(CLEANING_STATUSES as readonly string[]).includes(status)) {
    return { error: "Estado inválido." };
  }

  const supabase = await createClient();
  const { userId, permissions } = await getRequestPermissions(supabase);

  if (!userId) {
    return { error: "Sessão inválida. Inicia sessão novamente." };
  }

  const { data: task } = await supabase
    .from("cleaning_tasks")
    .select("assigned_to")
    .eq("id", taskId)
    .maybeSingle();

  const isAuthorized =
    permissions.includes("equipas") ||
    permissions.includes("limpeza") ||
    task?.assigned_to === userId;

  if (!isAuthorized) {
    return {
      error:
        "Só o Administrador, a pessoa responsável pela Limpeza ou quem está atribuído a esta tarefa pode alterar o estado.",
    };
  }

  const { error } = await supabase
    .from("cleaning_tasks")
    .update({ status })
    .eq("id", taskId);

  if (error) {
    return { error: "Não foi possível atualizar o estado. Tenta novamente." };
  }

  revalidatePath("/equipas");
  return { success: true };
}

export async function setCleaningTaskAssignee(
  taskId: string,
  staffId: string | null,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const { permissions } = await getRequestPermissions(supabase);

  if (!permissions.includes("equipas") && !permissions.includes("limpeza")) {
    return {
      error:
        "Só o Administrador ou a pessoa responsável pela Limpeza pode atribuir tarefas.",
    };
  }

  const { error } = await supabase
    .from("cleaning_tasks")
    .update({ assigned_to: staffId })
    .eq("id", taskId);

  if (error) {
    return { error: "Não foi possível atribuir a tarefa. Tenta novamente." };
  }

  revalidatePath("/equipas");
  return { success: true };
}

export async function deleteCleaningTask(
  taskId: string,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("cleaning_tasks")
    .delete()
    .eq("id", taskId)
    .eq("source", "manual");

  if (error) {
    return { error: "Não foi possível remover a tarefa. Tenta novamente." };
  }

  revalidatePath("/equipas");
  return { success: true };
}
