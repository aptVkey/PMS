"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PERMISSION_KEYS } from "@/lib/staff";

const StaffSchema = z.object({
  name: z.string().min(1, { error: "Indica o nome." }),
  email: z.email({ error: "Indica um email válido." }),
  password: z
    .string()
    .min(8, { error: "A password deve ter pelo menos 8 caracteres." }),
  roleLabel: z.string().optional(),
  hourlyRate: z.coerce.number().min(0, { error: "Indica um valor válido." }),
  permissions: z.array(z.enum(PERMISSION_KEYS)),
});

export type StaffFormState =
  | { error: string }
  | { success: true }
  | undefined;

function readPermissions(formData: FormData) {
  return formData
    .getAll("permissions")
    .map(String)
    .filter((value): value is (typeof PERMISSION_KEYS)[number] =>
      (PERMISSION_KEYS as readonly string[]).includes(value),
    );
}

export async function createStaffMember(
  _prevState: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const parsed = StaffSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    roleLabel: formData.get("roleLabel") || undefined,
    hourlyRate: formData.get("hourlyRate"),
    permissions: readPermissions(formData),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifica os campos assinalados." };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      error:
        "Falta configurar a chave service_role do Supabase no servidor (SUPABASE_SERVICE_ROLE_KEY) antes de criar novos utilizadores.",
    };
  }

  const { data, error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });

  if (createError || !data.user) {
    const message =
      createError?.code === "email_exists"
        ? "Já existe um utilizador com este email."
        : "Não foi possível criar o utilizador. Tenta novamente.";
    return { error: message };
  }

  const supabase = await createClient();
  const { error: staffError } = await supabase.from("staff").insert({
    id: data.user.id,
    name: parsed.data.name,
    email: parsed.data.email,
    role_label: parsed.data.roleLabel || null,
    hourly_rate: parsed.data.hourlyRate,
    permissions: parsed.data.permissions,
    active: true,
  });

  if (staffError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: "Não foi possível guardar os dados da equipa. Tenta novamente." };
  }

  revalidatePath("/equipas");
  return { success: true };
}

const UpdateStaffSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, { error: "Indica o nome." }),
  roleLabel: z.string().optional(),
  hourlyRate: z.coerce.number().min(0, { error: "Indica um valor válido." }),
  permissions: z.array(z.enum(PERMISSION_KEYS)),
  active: z.coerce.boolean(),
});

export async function updateStaffMember(
  _prevState: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const parsed = UpdateStaffSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    roleLabel: formData.get("roleLabel") || undefined,
    hourlyRate: formData.get("hourlyRate"),
    permissions: readPermissions(formData),
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifica os campos assinalados." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id === parsed.data.id && !parsed.data.active) {
    return { error: "Não podes desativar a tua própria conta." };
  }

  if (user?.id === parsed.data.id && !parsed.data.permissions.includes("equipas")) {
    return { error: "Não podes retirar a ti próprio o acesso a Equipas e tarefas." };
  }

  const { error } = await supabase
    .from("staff")
    .update({
      name: parsed.data.name,
      role_label: parsed.data.roleLabel || null,
      hourly_rate: parsed.data.hourlyRate,
      permissions: parsed.data.permissions,
      active: parsed.data.active,
    })
    .eq("id", parsed.data.id);

  if (error) {
    return { error: "Não foi possível guardar as alterações. Tenta novamente." };
  }

  revalidatePath("/equipas");
  return { success: true };
}

export async function deleteStaffMember(
  staffId: string,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id === staffId) {
    return { error: "Não podes remover a tua própria conta." };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      error:
        "Falta configurar a chave service_role do Supabase no servidor (SUPABASE_SERVICE_ROLE_KEY) antes de remover utilizadores.",
    };
  }

  const { error } = await admin.auth.admin.deleteUser(staffId);

  if (error) {
    return { error: "Não foi possível remover o utilizador. Tenta novamente." };
  }

  revalidatePath("/equipas");
  return { success: true };
}
