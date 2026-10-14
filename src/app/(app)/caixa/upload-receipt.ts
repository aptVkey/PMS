"use client";

import { createClient } from "@/lib/supabase/client";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export class ReceiptUploadError extends Error {}

// Upload direto do browser para o Storage, tal como as fotos dos
// alojamentos — evita o corpo da server action ultrapassar o limite
// configurado (ver next.config.ts). O bucket "cash-receipts" não é
// público: guarda-se só o path, o URL assinado é gerado no servidor.
export async function uploadReceipt(file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new ReceiptUploadError(
      `"${file.name}" tem mais de 20MB. Reduz o tamanho e tenta novamente.`,
    );
  }

  const supabase = createClient();
  const extension = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase()
    : "bin";
  const path = `${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from("cash-receipts")
    .upload(path, file, { contentType: file.type });

  if (error) {
    throw new ReceiptUploadError(
      `Não foi possível enviar "${file.name}": ${error.message}`,
    );
  }

  return path;
}
