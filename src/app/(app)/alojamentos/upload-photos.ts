"use client";

import { createClient } from "@/lib/supabase/client";

// 20MB por foto: generoso para fotos de telemóvel, mas com teto — sem isto
// uma única foto gigante trava a UI sem feedback nenhum.
const MAX_FILE_SIZE = 20 * 1024 * 1024;

export class PhotoUploadError extends Error {}

// Upload direto do browser para o Storage — a Server Action nunca vê o
// binário, só o URL público que sai daqui. É o que evita o corpo do pedido
// da action ultrapassar o limite configurado no proxy (ver next.config.ts).
export async function uploadRoomPhoto(file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new PhotoUploadError(
      `"${file.name}" tem mais de 20MB. Reduz o tamanho e tenta novamente.`,
    );
  }

  const supabase = createClient();
  // O Storage rejeita chaves com acentos ou pontuação (comum em nomes de
  // ficheiro PT, ex: "Captura de ecrã ..., às ...") com "Invalid key" — por
  // isso o nome original nunca entra no path, só a extensão.
  const extension = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase()
    : "jpg";
  const path = `${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from("room-photos")
    .upload(path, file);
  if (error) {
    throw new PhotoUploadError(
      `Não foi possível enviar "${file.name}": ${error.message}`,
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("room-photos").getPublicUrl(path);
  return publicUrl;
}
