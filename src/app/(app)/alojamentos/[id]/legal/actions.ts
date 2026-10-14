"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/permissions";
import { readIntegrationSecret, maskSecret } from "@/lib/integrations";
import { sibaChaveAcessoSecretName, verifySibaCredentials } from "@/lib/siba";

export type FormState =
  { error: string } | { success: true; message: string } | undefined;

const SibaSettingsSchema = z.object({
  propertyId: z.string().min(1),
  nif: z.string().min(1, { error: "Indica o NIF da unidade hoteleira." }),
  estabelecimento: z
    .string()
    .min(1, { error: "Indica o número de estabelecimento." }),
  // Vazio significa "manter a chave que já lá está".
  chaveAcesso: z.string().optional(),
});

export async function saveSibaSettings(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await requirePermission("quartos");
  if (denied) return denied;

  const parsed = SibaSettingsSchema.safeParse({
    propertyId: formData.get("propertyId"),
    nif: (formData.get("nif") as string)?.trim(),
    estabelecimento: (formData.get("estabelecimento") as string)?.trim(),
    chaveAcesso: (formData.get("chaveAcesso") as string)?.trim() || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifica os campos." };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      error:
        "Falta a chave service_role do Supabase no servidor (SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  const secretName = sibaChaveAcessoSecretName(parsed.data.propertyId);
  const chaveToVerify =
    parsed.data.chaveAcesso ?? (await readIntegrationSecret(secretName));

  if (!chaveToVerify) {
    return { error: "Indica a chave de ativação." };
  }

  // Confirma as credenciais contra a SIBA antes de as guardar, enviando uma
  // lista de boletins vazia (nada é comunicado, só valida o acesso).
  const verification = await verifySibaCredentials({
    nif: parsed.data.nif,
    estabelecimento: parsed.data.estabelecimento,
    chaveAcesso: chaveToVerify,
  });

  if (!verification.success) {
    return { error: verification.error };
  }

  if (parsed.data.chaveAcesso) {
    const { error: secretError } = await admin.rpc("set_integration_secret", {
      p_name: secretName,
      p_value: parsed.data.chaveAcesso,
    });

    if (secretError) {
      return { error: "Não foi possível guardar a chave. Tenta novamente." };
    }
  }

  const { error } = await admin
    .from("properties")
    .update({
      siba_nif: parsed.data.nif,
      siba_estabelecimento: parsed.data.estabelecimento,
      siba_chave_hint: maskSecret(chaveToVerify),
    })
    .eq("id", parsed.data.propertyId);

  if (error) {
    return {
      error: "Não foi possível guardar as definições. Tenta novamente.",
    };
  }

  revalidatePath(`/alojamentos/${parsed.data.propertyId}/legal`);
  return { success: true, message: "Credenciais da SIBA guardadas." };
}

export async function disconnectSiba(
  propertyId: string,
): Promise<{ error: string } | { success: true }> {
  const denied = await requirePermission("quartos");
  if (denied) return denied;

  const admin = createAdminClient();
  if (!admin) {
    return { error: "Sem acesso ao servidor de dados." };
  }

  await admin.rpc("set_integration_secret", {
    p_name: sibaChaveAcessoSecretName(propertyId),
    p_value: "",
  });

  const { error } = await admin
    .from("properties")
    .update({
      siba_nif: null,
      siba_estabelecimento: null,
      siba_chave_hint: null,
    })
    .eq("id", propertyId);

  if (error) {
    return { error: "Não foi possível desligar a SIBA. Tenta novamente." };
  }

  revalidatePath(`/alojamentos/${propertyId}/legal`);
  return { success: true };
}
