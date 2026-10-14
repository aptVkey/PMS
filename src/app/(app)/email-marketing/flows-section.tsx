"use client";

import { useState, useTransition } from "react";
import { Pencil, Play, Plus, Trash2, Workflow } from "lucide-react";
import type { Property } from "@/lib/property";
import type {
  EmailFlow,
  EmailFlowStep,
  EmailList,
  EmailTemplate,
} from "@/lib/email-marketing";
import { deleteFlow, runAutomationsNow, setFlowActive } from "./actions";
import { FlowFormModal } from "./flow-form-modal";
import { ConfirmDeleteModal } from "./confirm-delete-modal";
import { FlowCanvas } from "./flow-canvas";
import { ToggleSwitch } from "@/components/toggle-switch";
import type { AutomationRunSummary } from "@/lib/automations";

function RunNowButton() {
  const [isPending, startTransition] = useTransition();
  const [summary, setSummary] = useState<AutomationRunSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleRun() {
    setError(null);
    startTransition(async () => {
      const result = await runAutomationsNow();
      if ("error" in result) {
        setError(result.error);
        setSummary(null);
        return;
      }
      setSummary(result.summary);
    });
  }

  const totals = summary?.steps.reduce(
    (acc, step) => ({
      matched: acc.matched + step.matched,
      sent: acc.sent + step.sent,
      skipped: acc.skipped + step.skipped,
      failed: acc.failed + step.failed,
    }),
    { matched: 0, sent: 0, skipped: 0, failed: 0 },
  );

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={handleRun}
        disabled={isPending}
        className="flex min-h-11 items-center gap-2 rounded-md border border-border bg-canvas px-4 text-body font-semibold text-ink transition-colors duration-fast ease-standard hover:bg-surface-1 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Play className="h-4 w-4" strokeWidth={2} />
        {isPending ? "A correr..." : "Correr agora"}
      </button>
      {error && <p className="text-[12px] text-error">{error}</p>}
      {totals && (
        <p className="text-[12px] text-ink-subdued">
          {totals.sent} enviado(s), {totals.skipped} ignorado(s),{" "}
          {totals.failed} falhado(s) de {totals.matched} encontrado(s).
        </p>
      )}
    </div>
  );
}

export function FlowsSection({
  flows,
  steps,
  sendCounts,
  templates,
  lists,
  properties,
}: {
  flows: EmailFlow[];
  steps: EmailFlowStep[];
  sendCounts: Record<string, number>;
  templates: EmailTemplate[];
  lists: EmailList[];
  properties: Property[];
}) {
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [editingFlow, setEditingFlow] = useState<EmailFlow | "new" | null>(
    null,
  );
  const [deletingFlow, setDeletingFlow] = useState<EmailFlow | null>(null);
  const [isToggling, startToggle] = useTransition();

  // Se o fluxo selecionado desapareceu (apagado), cai para o primeiro.
  const flow = flows.find((f) => f.id === selectedFlowId) ?? flows[0] ?? null;
  const flowSteps = flow ? steps.filter((s) => s.flow_id === flow.id) : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {flows.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedFlowId(f.id)}
              className={`flex min-h-11 items-center gap-2 rounded-md border px-3 text-body font-semibold transition-colors duration-fast ease-standard ${
                flow?.id === f.id
                  ? "border-action bg-surface-2 text-primary"
                  : "border-border bg-canvas text-ink-muted hover:bg-surface-1"
              }`}
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${
                  f.is_active ? "bg-success" : "bg-ink-subdued/50"
                }`}
              />
              {f.name}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setEditingFlow("new")}
          className="flex min-h-11 items-center gap-2 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Novo fluxo
        </button>
      </div>

      {!flow ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-canvas py-16 text-center">
          <Workflow className="h-8 w-8 text-ink-subdued" strokeWidth={1.5} />
          <p className="text-body font-semibold text-ink">
            Ainda não tens fluxos
          </p>
          <p className="text-body text-ink-subdued">
            Cria um fluxo e desenha-o no canvas com gatilhos e emails.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-canvas px-4 py-3 shadow-card">
            <div className="min-w-0">
              <p className="truncate text-body font-bold text-ink">
                {flow.name}
              </p>
              <p className="truncate text-[12px] text-ink-subdued">
                {flow.is_active
                  ? "Ativo: os emails são enviados automaticamente."
                  : "Pausado: nenhum email deste fluxo é enviado."}
                {flow.description ? ` · ${flow.description}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ToggleSwitch
                label={`Fluxo ${flow.name}`}
                checked={flow.is_active}
                onLabel="Fluxo ativo"
                offLabel="Fluxo pausado"
                disabled={isToggling}
                onChange={() =>
                  startToggle(async () => {
                    await setFlowActive(flow.id, !flow.is_active);
                  })
                }
              />
              <button
                type="button"
                onClick={() => setEditingFlow(flow)}
                aria-label="Editar fluxo"
                className="rounded-md p-2 text-ink-subdued hover:bg-surface-1"
              >
                <Pencil className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => setDeletingFlow(flow)}
                aria-label="Remover fluxo"
                className="rounded-md p-2 text-ink-subdued hover:bg-error/10 hover:text-error"
              >
                <Trash2 className="h-4 w-4" strokeWidth={2} />
              </button>
              <RunNowButton />
            </div>
          </div>

          <FlowCanvas
            key={flow.id}
            flowId={flow.id}
            steps={flowSteps}
            sendCounts={sendCounts}
            templates={templates}
            lists={lists}
            properties={properties}
          />
        </>
      )}

      {editingFlow && (
        <FlowFormModal
          flow={editingFlow === "new" ? undefined : editingFlow}
          onClose={() => setEditingFlow(null)}
        />
      )}
      {deletingFlow && (
        <ConfirmDeleteModal
          title="Remover fluxo"
          message={`Isto remove o fluxo «${deletingFlow.name}» e todos os seus passos. Os envios já feitos ficam no histórico.`}
          onConfirm={() => deleteFlow(deletingFlow.id)}
          onClose={() => setDeletingFlow(null)}
        />
      )}
    </div>
  );
}
