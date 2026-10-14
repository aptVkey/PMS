import { createClient } from "@/lib/supabase/server";
import type { InventoryItem } from "@/lib/inventory";
import { InventarioClient } from "./inventario-client";

export default async function InventarioPage() {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("inventory_items")
    .select("*")
    .order("name", { ascending: true });

  return <InventarioClient items={(items as InventoryItem[]) ?? []} />;
}
