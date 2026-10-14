"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { BED_TYPES, ROOM_TYPES } from "@/lib/rooms";
import { PROPERTY_TYPES, type PropertyType } from "@/lib/property";

const BedRowSchema = z.object({
  type: z.enum(BED_TYPES),
  count: z.coerce.number().int().min(1),
});

const BedroomSchema = z.object({
  beds: z.array(BedRowSchema).min(1),
});

const BathroomSchema = z.object({
  ensuiteBedroomIndex: z.coerce.number().int().min(0).nullable(),
});

const RoomSchema = z.object({
  propertyId: z.string().min(1, { error: "Alojamento inválido." }),
  name: z.string().min(1, { error: "O nome é obrigatório." }),
  type: z.enum(ROOM_TYPES, { error: "Escolhe um tipo válido." }),
  description: z.string().optional(),
  capacityAdults: z.coerce.number().int().min(1),
  capacityChildren: z.coerce.number().int().min(0),
  capacityInfants: z.coerce.number().int().min(0),
  sizeM2: z.coerce.number().int().min(0).optional(),
  accessCode: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
  bedrooms: z.array(BedroomSchema).min(1),
  bathrooms: z.array(BathroomSchema).min(1),
  typologyId: z.string().optional(),
});

export type RoomFormState = { error: string } | { success: true } | undefined;

function photoUrlToStoragePath(url: string): string | null {
  const marker = "/room-photos/";
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length).split("?")[0];
}

export async function saveRoom(
  _prevState: RoomFormState,
  formData: FormData,
): Promise<RoomFormState> {
  const denied = await requirePermission("quartos");
  if (denied) return denied;

  const sizeM2Raw = formData.get("sizeM2");

  let bedroomsRaw: unknown;
  let bathroomsRaw: unknown;
  try {
    bedroomsRaw = JSON.parse(String(formData.get("bedroomsJson") ?? "[]"));
    bathroomsRaw = JSON.parse(String(formData.get("bathroomsJson") ?? "[]"));
  } catch {
    return { error: "Dados de quartos ou casas de banho inválidos." };
  }

  const parsed = RoomSchema.safeParse({
    propertyId: formData.get("propertyId"),
    name: formData.get("name"),
    type: formData.get("type"),
    description: formData.get("description") || undefined,
    capacityAdults: formData.get("capacityAdults"),
    capacityChildren: formData.get("capacityChildren"),
    capacityInfants: formData.get("capacityInfants"),
    sizeM2: sizeM2Raw ? sizeM2Raw : undefined,
    accessCode: formData.get("accessCode") || undefined,
    amenities: formData.getAll("amenities"),
    isPublished: formData.get("isPublished") === "on",
    bedrooms: bedroomsRaw,
    bathrooms: bathroomsRaw,
    typologyId: formData.get("typologyId") || undefined,
  });

  if (!parsed.success) {
    return { error: "Verifica os campos assinalados e tenta novamente." };
  }

  const supabase = await createClient();

  // As fotos já foram enviadas para o Storage a partir do browser antes desta
  // submissão (ver upload-photos.ts) — chegam aqui só como URLs, nunca como
  // binário. É o que mantém o corpo deste pedido pequeno, independentemente
  // de quantas fotos ou de que tamanho.
  const photos = formData.getAll("existingPhotoUrls").map(String);

  const payload = {
    property_id: parsed.data.propertyId,
    name: parsed.data.name,
    type: parsed.data.type,
    description: parsed.data.description ?? null,
    capacity_adults: parsed.data.capacityAdults,
    capacity_children: parsed.data.capacityChildren,
    capacity_infants: parsed.data.capacityInfants,
    bedrooms: parsed.data.bedrooms,
    bathrooms: parsed.data.bathrooms,
    size_m2: parsed.data.sizeM2 ?? null,
    access_code: parsed.data.accessCode ?? null,
    amenities: parsed.data.amenities ?? [],
    photos,
    is_published: parsed.data.isPublished ?? false,
    typology_id: parsed.data.typologyId ?? null,
  };

  const id = formData.get("id");
  const { error } = id
    ? await supabase.from("rooms").update(payload).eq("id", String(id))
    : await supabase.from("rooms").insert(payload);

  if (error) {
    return { error: "Não foi possível guardar o quarto. Tenta novamente." };
  }

  revalidatePath("/alojamentos");
  revalidatePath("/alojamentos/[id]", "layout");
  return { success: true };
}

export async function deleteRoom(
  roomId: string,
  photos: string[],
  entityLabel: "quarto" | "alojamento" = "quarto",
): Promise<{ error: string } | { success: true }> {
  const denied = await requirePermission("quartos");
  if (denied) return denied;

  const supabase = await createClient();

  const { error } = await supabase.from("rooms").delete().eq("id", roomId);

  if (error) {
    if (error.code === "23503") {
      return {
        error: `Não é possível eliminar este ${entityLabel} porque tem reservas associadas. Elimina primeiro as reservas em Reservas e pagamentos, ou mantém o ${entityLabel} e apenas o torna não publicado.`,
      };
    }
    return {
      error: `Não foi possível eliminar o ${entityLabel}. Tenta novamente.`,
    };
  }

  const paths = photos
    .map(photoUrlToStoragePath)
    .filter((path): path is string => path !== null);

  if (paths.length > 0) {
    const { error: removeError } = await supabase.storage
      .from("room-photos")
      .remove(paths);
    if (removeError) {
      console.error("Failed to remove room photos from storage", {
        paths,
        removeError,
      });
    }
  }

  revalidatePath("/alojamentos");
  revalidatePath("/alojamentos/[id]", "layout");
  return { success: true };
}

const TypologySchema = z.object({
  id: z.string().optional(),
  propertyId: z.string().min(1, { error: "Alojamento inválido." }),
  name: z.string().min(1, { error: "O nome é obrigatório." }),
  description: z.string().optional(),
});

export type TypologyFormState =
  { error: string } | { success: true } | undefined;

export async function saveTypology(
  _prevState: TypologyFormState,
  formData: FormData,
): Promise<TypologyFormState> {
  const denied = await requirePermission("quartos");
  if (denied) return denied;

  const parsed = TypologySchema.safeParse({
    id: formData.get("id") || undefined,
    propertyId: formData.get("propertyId"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Verifica os campos assinalados.",
    };
  }

  const supabase = await createClient();

  // Mesma lógica de saveRoom: as fotos já estão no Storage antes de chegar
  // aqui, só o URL viaja no pedido.
  const photos = formData.getAll("existingPhotoUrls").map(String);

  const payload = {
    property_id: parsed.data.propertyId,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    photos,
  };

  const id = formData.get("id");
  const { error } = id
    ? await supabase
        .from("room_typologies")
        .update(payload)
        .eq("id", String(id))
    : await supabase.from("room_typologies").insert(payload);

  if (error) {
    return { error: "Não foi possível guardar a tipologia. Tenta novamente." };
  }

  revalidatePath("/alojamentos");
  revalidatePath("/alojamentos/[id]", "layout");
  return { success: true };
}

export async function deleteTypology(
  typologyId: string,
  photos: string[],
): Promise<{ error: string } | { success: true }> {
  const denied = await requirePermission("quartos");
  if (denied) return denied;

  const supabase = await createClient();

  const paths = photos
    .map(photoUrlToStoragePath)
    .filter((path): path is string => path !== null);

  if (paths.length > 0) {
    const { error: removeError } = await supabase.storage
      .from("room-photos")
      .remove(paths);
    if (removeError) {
      console.error("Failed to remove typology photos from storage", {
        paths,
        removeError,
      });
    }
  }

  const { error } = await supabase
    .from("room_typologies")
    .delete()
    .eq("id", typologyId);

  if (error) {
    return { error: "Não foi possível eliminar a tipologia. Tenta novamente." };
  }

  revalidatePath("/alojamentos");
  revalidatePath("/alojamentos/[id]", "layout");
  return { success: true };
}

// Um alojamento de unidade singular tem os quartos soltos, sem tipologia.
// Ao ganhar uma segunda tipologia deixa de ser singular — e o quarto que já
// existia não pode ficar órfão, por isso passa a ter tipologia própria com o
// seu nome. Sem isto, a vista multi-unidade mostrá-lo-ia em "sem tipologia".
export async function convertPropertyToMultiUnit(
  propertyId: string,
): Promise<{ error: string } | { success: true; wrapped: number }> {
  const denied = await requirePermission("quartos");
  if (denied) return denied;

  const supabase = await createClient();

  const { data: orphanRooms, error: readError } = await supabase
    .from("rooms")
    .select("id, name")
    .eq("property_id", propertyId)
    .is("typology_id", null);

  if (readError) {
    return { error: "Não foi possível ler os quartos. Tenta novamente." };
  }

  for (const room of orphanRooms ?? []) {
    const { data: typology, error: typologyError } = await supabase
      .from("room_typologies")
      .insert({ property_id: propertyId, name: room.name })
      .select("id")
      .single();

    if (typologyError || !typology) {
      return { error: "Não foi possível organizar os quartos por tipologia." };
    }

    const { error: assignError } = await supabase
      .from("rooms")
      .update({ typology_id: typology.id })
      .eq("id", room.id);

    if (assignError) {
      return { error: "Não foi possível organizar os quartos por tipologia." };
    }
  }

  const { error } = await supabase
    .from("properties")
    .update({ property_type: "multi_unidade" })
    .eq("id", propertyId);

  if (error) {
    return {
      error: "Não foi possível converter o alojamento. Tenta novamente.",
    };
  }

  revalidatePath("/alojamentos");
  revalidatePath("/alojamentos/[id]", "layout");
  return { success: true, wrapped: (orphanRooms ?? []).length };
}

const PropertyCreateSchema = z.object({
  name: z.string().min(1, { error: "O nome é obrigatório." }),
  description: z.string().optional(),
});

export async function createProperty(
  name: string,
  isMultiUnidade: boolean,
  description?: string,
): Promise<{ propertyId: string } | { error: string }> {
  const denied = await requirePermission("quartos");
  if (denied) return denied;

  const parsed = PropertyCreateSchema.safeParse({ name, description });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Indica um nome válido.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .insert({
      name: parsed.data.name,
      property_type: isMultiUnidade ? "multi_unidade" : "unidade_singular",
      description: parsed.data.description?.trim() || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Não foi possível criar o alojamento. Tenta novamente." };
  }

  revalidatePath("/alojamentos");
  revalidatePath("/alojamentos/[id]", "layout");
  return { propertyId: data.id };
}

export async function updateProperty(
  propertyId: string,
  updates: {
    name?: string;
    propertyType?: PropertyType;
    description?: string;
    checkInTime?: string;
    checkOutTime?: string;
  },
): Promise<{ error: string } | { success: true }> {
  const denied = await requirePermission("quartos");
  if (denied) return denied;

  const payload: Record<string, string | null> = {};

  if (updates.name !== undefined) {
    if (!updates.name.trim()) {
      return { error: "O nome é obrigatório." };
    }
    payload.name = updates.name.trim();
  }

  if (updates.propertyType !== undefined) {
    if (!PROPERTY_TYPES.includes(updates.propertyType)) {
      return { error: "Tipo de propriedade inválido." };
    }
    payload.property_type = updates.propertyType;
  }

  if (updates.description !== undefined) {
    payload.description = updates.description.trim() || null;
  }

  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

  if (updates.checkInTime !== undefined) {
    if (!timePattern.test(updates.checkInTime)) {
      return { error: "Hora de check-in inválida." };
    }
    payload.check_in_time = updates.checkInTime;
  }

  if (updates.checkOutTime !== undefined) {
    if (!timePattern.test(updates.checkOutTime)) {
      return { error: "Hora de check-out inválida." };
    }
    payload.check_out_time = updates.checkOutTime;
  }

  if (Object.keys(payload).length === 0) {
    return { success: true };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("properties")
    .update(payload)
    .eq("id", propertyId);

  if (error) {
    return { error: "Não foi possível guardar. Tenta novamente." };
  }

  revalidatePath("/alojamentos");
  revalidatePath("/alojamentos/[id]", "layout");
  revalidatePath("/");
  return { success: true };
}

export async function deleteProperty(
  propertyId: string,
): Promise<{ error: string } | { success: true }> {
  const denied = await requirePermission("quartos");
  if (denied) return denied;

  const supabase = await createClient();

  const [{ data: rooms }, { data: typologies }] = await Promise.all([
    supabase.from("rooms").select("photos").eq("property_id", propertyId),
    supabase
      .from("room_typologies")
      .select("photos")
      .eq("property_id", propertyId),
  ]);

  const allPhotos = [
    ...(rooms ?? []).flatMap((r) => r.photos as string[]),
    ...(typologies ?? []).flatMap((t) => t.photos as string[]),
  ];
  const paths = allPhotos
    .map(photoUrlToStoragePath)
    .filter((path): path is string => path !== null);

  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", propertyId);

  if (error) {
    if (error.code === "23503") {
      return {
        error:
          "Não é possível eliminar este alojamento porque tem reservas associadas a algum dos seus quartos. Elimina primeiro essas reservas em Reservas e pagamentos.",
      };
    }
    return {
      error: "Não foi possível eliminar o alojamento. Tenta novamente.",
    };
  }

  if (paths.length > 0) {
    const { error: removeError } = await supabase.storage
      .from("room-photos")
      .remove(paths);
    if (removeError) {
      console.error("Failed to remove property photos from storage", {
        paths,
        removeError,
      });
    }
  }

  revalidatePath("/alojamentos");
  revalidatePath("/alojamentos/[id]", "layout");
  return { success: true };
}

export type TypologyUnitsInput = {
  name: string;
  unitNumbers: string[];
};

export async function createTypologiesWithUnits(
  propertyId: string,
  entries: TypologyUnitsInput[],
): Promise<{ error: string } | { success: true }> {
  const denied = await requirePermission("quartos");
  if (denied) return denied;

  const cleanEntries = entries
    .map((entry) => ({
      name: entry.name.trim(),
      unitNumbers: entry.unitNumbers.map((n) => n.trim()).filter(Boolean),
    }))
    .filter((entry) => entry.name.length > 0 && entry.unitNumbers.length > 0);

  if (cleanEntries.length === 0) {
    return {
      error:
        "Adiciona pelo menos uma tipologia com o nome e as unidades preenchidos.",
    };
  }

  const supabase = await createClient();

  for (const entry of cleanEntries) {
    const { data: typology, error: typologyError } = await supabase
      .from("room_typologies")
      .insert({ property_id: propertyId, name: entry.name })
      .select("id")
      .single();

    if (typologyError || !typology) {
      return {
        error: "Não foi possível criar as tipologias. Tenta novamente.",
      };
    }

    const roomRows = entry.unitNumbers.map((number) => ({
      property_id: propertyId,
      typology_id: typology.id,
      name: number,
      type: ROOM_TYPES[0],
      capacity_adults: 2,
      capacity_children: 0,
      capacity_infants: 0,
      bedrooms: [{ beds: [{ type: BED_TYPES[0], count: 1 }] }],
      bathrooms: [{ ensuiteBedroomIndex: null }],
      amenities: [],
      photos: [],
      is_published: false,
    }));

    const { error: roomsError } = await supabase.from("rooms").insert(roomRows);

    if (roomsError) {
      return {
        error:
          "Não foi possível criar os quartos/apartamentos. Tenta novamente.",
      };
    }
  }

  revalidatePath("/alojamentos");
  revalidatePath("/alojamentos/[id]", "layout");
  return { success: true };
}
