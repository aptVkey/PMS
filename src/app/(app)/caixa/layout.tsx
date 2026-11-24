import { requireSectionAccess } from "@/lib/current-staff";

// Reforço do proxy: sem permissão para esta área, a página nem chega a correr.
export default async function SectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSectionAccess("/caixa");
  return children;
}
