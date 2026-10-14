export type InventoryItem = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  quantity: number;
  unit: string;
  min_quantity: number;
  unit_cost: number | null;
  supplier: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function isLowStock(item: InventoryItem): boolean {
  return item.quantity <= item.min_quantity;
}

export const MOVEMENT_TYPES = ["entrada", "saida"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  entrada: "Compra",
  saida: "Consumo",
};

export type InventoryMovement = {
  id: string;
  item_id: string;
  type: MovementType;
  quantity: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

export function movementStats(movements: InventoryMovement[]) {
  let totalPurchased = 0;
  let totalUsed = 0;
  for (const m of movements) {
    if (m.type === "entrada") totalPurchased += m.quantity;
    else totalUsed += m.quantity;
  }
  return { totalPurchased, totalUsed };
}
