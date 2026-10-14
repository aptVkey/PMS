"use client";

import { useMemo, useState } from "react";
import { History } from "lucide-react";
import {
  SEND_STATUS_LABELS,
  SEND_STATUSES,
  TRIGGER_TYPE_LABELS,
  type EmailFlow,
  type EmailSendRow,
} from "@/lib/email-marketing";

const selectClasses =
  "min-h-11 rounded-md border border-border bg-canvas px-3 text-body text-ink focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";

const STATUS_BADGE_CLASSES: Record<string, string> = {
  sent: "bg-success/10 text-success",
  failed: "bg-error/10 text-error",
  skipped: "bg-surface-2 text-ink-subdued",
};

export function HistorySection({
  sends,
  flows,
}: {
  sends: EmailSendRow[];
  flows: EmailFlow[];
}) {
  const [flowFilter, setFlowFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = useMemo(() => {
    return sends.filter((send) => {
      const matchesFlow =
        flowFilter === "" || send.step?.flow?.name === flowFilter;
      const matchesStatus = statusFilter === "" || send.status === statusFilter;
      return matchesFlow && matchesStatus;
    });
  }, [sends, flowFilter, statusFilter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={flowFilter}
          onChange={(e) => setFlowFilter(e.target.value)}
          className={selectClasses}
        >
          <option value="">Todos os fluxos</option>
          {flows.map((flow) => (
            <option key={flow.id} value={flow.name}>
              {flow.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={selectClasses}
        >
          <option value="">Todos os estados</option>
          {SEND_STATUSES.map((status) => (
            <option key={status} value={status}>
              {SEND_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-canvas py-16 text-center">
          <History className="h-8 w-8 text-ink-subdued" strokeWidth={1.5} />
          <p className="text-body font-semibold text-ink">
            Ainda não há emails enviados
          </p>
          <p className="text-body text-ink-subdued">
            Assim que um fluxo disparar, o histórico aparece aqui.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-canvas shadow-card">
          <table className="w-full min-w-[720px] text-left text-body">
            <thead>
              <tr className="border-b border-border text-[12px] font-semibold text-ink-subdued">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Hóspede</th>
                <th className="px-4 py-3">Fluxo</th>
                <th className="px-4 py-3">Reserva</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((send) => (
                <tr
                  key={send.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3 text-ink-muted">
                    {new Date(send.created_at).toLocaleString("pt-PT")}
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {send.guest?.name ?? "—"}
                    {send.error && send.status !== "skipped" && (
                      <p className="text-[12px] text-error">{send.error}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {send.step?.flow?.name ?? "—"}
                    {send.step && (
                      <p className="text-[12px] text-ink-subdued">
                        {send.step.trigger_type
                          ? TRIGGER_TYPE_LABELS[send.step.trigger_type]
                          : "Email seguinte do fluxo"}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {send.booking ? `#${send.booking.booking_number}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-pill px-2.5 py-1 text-[12px] font-semibold ${
                        STATUS_BADGE_CLASSES[send.status]
                      }`}
                    >
                      {SEND_STATUS_LABELS[send.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
