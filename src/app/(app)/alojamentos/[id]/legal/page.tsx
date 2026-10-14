import { createClient } from "@/lib/supabase/server";
import { SibaCard } from "./siba-card";

export default async function LegalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: property } = await supabase
    .from("properties")
    .select("siba_nif, siba_estabelecimento, siba_chave_hint")
    .eq("id", id)
    .maybeSingle();

  return (
    <SibaCard
      propertyId={id}
      nif={property?.siba_nif ?? null}
      estabelecimento={property?.siba_estabelecimento ?? null}
      chaveHint={property?.siba_chave_hint ?? null}
    />
  );
}
