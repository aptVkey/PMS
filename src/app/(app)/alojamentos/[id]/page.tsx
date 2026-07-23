import { redirect } from "next/navigation";

export default async function AlojamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/alojamentos/${id}/rates`);
}
