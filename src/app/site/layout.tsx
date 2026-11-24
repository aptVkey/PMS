import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { SiteFrame } from "@/components/site/site-frame";

export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s · ${SITE.name}` },
  description: SITE.heroSubtitle,
};

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SiteFrame>{children}</SiteFrame>;
}
