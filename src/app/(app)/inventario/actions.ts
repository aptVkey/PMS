"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { MOVEMENT_TYPES, type InventoryMovement } from "@/lib/inventory";

const ItemSchema = z.object({
  name: z.string().min(1, { error: "O nome é obrigatório." }),
  sku: z.string().optional(),
  category: z.string().optional(),
  quantity: z.coerce.number({ error: "Quantidade inválida." }).min(0),
  unit: z.string().min(1, { error: "A unidade é obrigatória." }),
  minQuantity: z.coerce.number({ error: "Stock mínimo inválido." }).min(0),
  unitCost: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  supplier: z.string().optional(),
  notes: z.string().optional(),
});

export type ItemFormState = { error: string } | { success: true } | undefined;

export async function saveItem(
  _prevState: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  const denied = await requirePermission("inventario");
  if (denied) return denied;

  const parsed = ItemSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku") || undefined,
    category: formData.get("category") || undefined,
    quantity: formData.get("quantity") || 0,
    unit: formData.get("unit"),
    minQuantity: formData.get("minQuantity"),
    unitCost: formData.get("unitCost") || undefined,
    supplier: formData.get("supplier") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: "Verifica os campos assinalados e tenta novamente." };
  }

  const supabase = await createClient();
  const id = formData.get("id");

  // A quantidade em stock só se move através de um movimento (ver
  // recordMovement) — nunca é escrita diretamente aqui, para "atual",
  // "comprado" e "usado" nunca poderem divergir. Ao editar um produto
  // existente, o campo quantity do formulário é ignorado.
  const staticPayload = {
    name: parsed.data.name,
    sku: parsed.data.sku || null,
    category: parsed.data.category || null,
    unit: parsed.data.unit,
    min_quantity: parsed.data.minQuantity,
    unit_cost:
      parsed.data.unitCost === "" || parsed.data.unitCost === undefined
        ? null
        : parsed.data.unitCost,
    supplier: parsed.data.supplier || null,
    notes: parsed.data.notes || null,
  };

  if (id) {
    const { error } = await supabase
      .from("inventory_items")
      .update(staticPayload)
      .eq("id", String(id));

    if (error) {
      return { error: "Não foi possível guardar o produto. Tenta novamente." };
    }
  } else {
    const { data: created, error } = await supabase
      .from("inventory_items")
      .insert({ ...staticPayload, quantity: 0 })
      .select("id")
      .single();

    if (error || !created) {
      return { error: "Não foi possível guardar o produto. Tenta novamente." };
    }

    if (parsed.data.quantity > 0) {
      const { error: movementError } = await supabase
        .from("inventory_movements")
        .insert({
          item_id: created.id,
          type: "entrada",
          quantity: parsed.data.quantity,
          note: "Stock inicial",
        });

      if (movementError) {
        return {
          error:
            "Produto criado, mas não foi possível registar o stock inicial.",
        };
      }
    }
  }

  revalidatePath("/inventario");
  return { success: true };
}

export async function deleteItem(
  itemId: string,
): Promise<{ error: string } | { success: true }> {
  const denied = await requirePermission("inventario");
  if (denied) return denied;

  const supabase = await createClient();

  const { error } = await supabase
    .from("inventory_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    return { error: "Não foi possível eliminar o produto. Tenta novamente." };
  }

  revalidatePath("/inventario");
  return { success: true };
}

const MovementSchema = z.object({
  itemId: z.string().min(1),
  type: z.enum(MOVEMENT_TYPES, { error: "Tipo de movimento inválido." }),
  quantity: z.coerce
    .number({ error: "Quantidade inválida." })
    .positive({ error: "A quantidade tem de ser maior que zero." }),
  note: z.string().optional(),
});

export async function recordMovement(
  _prevState: { error: string } | { success: true } | undefined,
  formData: FormData,
): Promise<{ error: string } | { success: true }> {
  const denied = await requirePermission("inventario");
  if (denied) return denied;

  const parsed = MovementSchema.safeParse({
    itemId: formData.get("itemId"),
    type: formData.get("type"),
    quantity: formData.get("quantity"),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    return { error: "Verifica os campos assinalados e tenta novamente." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("inventory_movements").insert({
    item_id: parsed.data.itemId,
    type: parsed.data.type,
    quantity: parsed.data.quantity,
    note: parsed.data.note || null,
  });

  if (error) {
    return { error: "Não foi possível registar o movimento. Tenta novamente." };
  }

  revalidatePath("/inventario");
  return { success: true };
}

export async function deleteMovement(
  movementId: string,
): Promise<{ error: string } | { success: true }> {
  const denied = await requirePermission("inventario");
  if (denied) return denied;

  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_movements")
    .delete()
    .eq("id", movementId);

  if (error) {
    return { error: "Não foi possível eliminar o movimento. Tenta novamente." };
  }

  revalidatePath("/inventario");
  return { success: true };
}

export async function getItemMovements(
  itemId: string,
): Promise<
  { error: string } | { success: true; movements: InventoryMovement[] }
> {
  const denied = await requirePermission("inventario");
  if (denied) return denied;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_movements")
    .select("*")
    .eq("item_id", itemId)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: "Não foi possível carregar o histórico." };
  }

  return { success: true, movements: (data as InventoryMovement[]) ?? [] };
}
