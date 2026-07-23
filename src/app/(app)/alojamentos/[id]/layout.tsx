import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Property } from "@/lib/property";
import { WorkspaceChrome } from "./workspace-chrome";

export default async function AlojamentoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!property) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <WorkspaceChrome property={property as Property} />
      {children}
    </div>
  );
}
