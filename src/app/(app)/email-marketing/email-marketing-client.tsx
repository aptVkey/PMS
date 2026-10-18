"use client";

import { useState } from "react";
import { Workflow, FileText, Users2, History } from "lucide-react";
import type { Property } from "@/lib/property";
import type { Guest } from "@/lib/guests";
import type {
  EmailFlow,
  EmailFlowStep,
  EmailList,
  EmailSendRow,
  EmailTemplate,
} from "@/lib/email-marketing";
import { FlowsSection } from "./flows-section";
import { TemplatesSection } from "./templates-section";
import { ListsSection } from "./lists-section";
import { HistorySection } from "./history-section";

type Tab = "fluxos" | "modelos" | "listas" | "historico";

const TABS: { key: Tab; label: string; icon: typeof Workflow }[] = [
  { key: "fluxos", label: "Fluxos", icon: Workflow },
  { key: "modelos", label: "Modelos", icon: FileText },
  { key: "listas", label: "Listas", icon: Users2 },
  { key: "historico", label: "Histórico", icon: History },
];

export function EmailMarketingClient({
  templates,
  lists,
  listMembers,
  flows,
  steps,
  sends,
  sendCounts,
  properties,
  guests,
}: {
  templates: EmailTemplate[];
  lists: EmailList[];
  listMembers: { list_id: string; guest_id: string }[];
  flows: EmailFlow[];
  steps: EmailFlowStep[];
  sends: EmailSendRow[];
  // Emails enviados com sucesso por passo (todos, não só os 200 do histórico).
  sendCounts: Record<string, number>;
  properties: Property[];
  guests: Guest[];
}) {
  const [tab, setTab] = useState<Tab>("fluxos");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[24px] font-bold text-ink">Email marketing</h1>
        <p className="mt-1 text-body text-ink-muted">
          Cria fluxos automáticos de email, modelos, listas e acompanha o que já
          foi enviado.
        </p>
      </div>

      <div className="ui-segmented flex rounded-md border border-border p-0.5 sm:w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-body font-semibold transition-colors duration-fast ease-standard sm:flex-none ${
              tab === key
                ? "bg-surface-2 text-primary"
                : "text-ink-muted hover:bg-surface-1"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>

      {tab === "fluxos" && (
        <FlowsSection
          flows={flows}
          steps={steps}
          sendCounts={sendCounts}
          templates={templates}
          lists={lists}
          properties={properties}
        />
      )}
      {tab === "modelos" && <TemplatesSection templates={templates} />}
      {tab === "listas" && (
        <ListsSection
          lists={lists}
          listMembers={listMembers}
          guests={guests}
          properties={properties}
        />
      )}
      {tab === "historico" && <HistorySection sends={sends} flows={flows} />}
    </div>
  );
}
