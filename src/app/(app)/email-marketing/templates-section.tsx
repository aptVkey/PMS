"use client";

import { useState } from "react";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import type { EmailTemplate } from "@/lib/email-marketing";
import { deleteTemplate } from "./actions";
import { TemplateFormModal } from "./template-form-modal";
import { ConfirmDeleteModal } from "./confirm-delete-modal";

export function TemplatesSection({
  templates,
}: {
  templates: EmailTemplate[];
}) {
  const [editing, setEditing] = useState<EmailTemplate | "new" | null>(null);
  const [deleting, setDeleting] = useState<EmailTemplate | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="flex min-h-11 items-center gap-2 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Novo modelo
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-canvas py-16 text-center">
          <FileText className="h-8 w-8 text-ink-subdued" strokeWidth={1.5} />
          <p className="text-body font-semibold text-ink">
            Ainda não tens modelos de email
          </p>
          <p className="text-body text-ink-subdued">
            Cria um modelo para o poderes usar nos fluxos.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-canvas shadow-card">
          {templates.map((template, index) => (
            <div
              key={template.id}
              className={`flex items-center gap-4 px-5 py-4 ${
                index > 0 ? "border-t border-border" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-bold text-ink">
                  {template.name}
                </p>
                <p className="truncate text-[12px] text-ink-subdued">
                  {template.subject}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(template)}
                aria-label="Editar"
                className="rounded-md p-2 text-ink-subdued hover:bg-surface-1"
              >
                <Pencil className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => setDeleting(template)}
                aria-label="Remover"
                className="rounded-md p-2 text-ink-subdued hover:bg-error/10 hover:text-error"
              >
                <Trash2 className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <TemplateFormModal
          template={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <ConfirmDeleteModal
          title="Remover modelo"
          message={`Tens a certeza que queres remover o modelo "${deleting.name}"?`}
          onConfirm={() => deleteTemplate(deleting.id)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
