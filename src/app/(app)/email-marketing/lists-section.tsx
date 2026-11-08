"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, Users2 } from "lucide-react";
import type { Guest } from "@/lib/guests";
import type { Property } from "@/lib/property";
import { LIST_KIND_LABELS, type EmailList } from "@/lib/email-marketing";
import { deleteList } from "./actions";
import { ListFormModal } from "./list-form-modal";
import { ListMembersModal } from "./list-members-modal";
import { ConfirmDeleteModal } from "./confirm-delete-modal";

export function ListsSection({
  lists,
  listMembers,
  guests,
  properties,
}: {
  lists: EmailList[];
  listMembers: { list_id: string; guest_id: string }[];
  guests: Guest[];
  properties: Property[];
}) {
  const [editing, setEditing] = useState<EmailList | "new" | null>(null);
  const [managingMembers, setManagingMembers] = useState<EmailList | null>(
    null,
  );
  const [deleting, setDeleting] = useState<EmailList | null>(null);

  const memberCountByList = useMemo(() => {
    const counts = new Map<string, number>();
    for (const member of listMembers) {
      counts.set(member.list_id, (counts.get(member.list_id) ?? 0) + 1);
    }
    return counts;
  }, [listMembers]);

  const memberGuestIdsByList = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const member of listMembers) {
      if (!map.has(member.list_id)) map.set(member.list_id, new Set());
      map.get(member.list_id)?.add(member.guest_id);
    }
    return map;
  }, [listMembers]);

  function describeList(list: EmailList): string {
    if (list.kind === "manual") {
      return `${memberCountByList.get(list.id) ?? 0} membro(s)`;
    }
    if (list.kind === "segment") {
      return "atualiza-se sozinha a cada reserva";
    }
    const parts: string[] = [];
    if (list.filter?.nationality) parts.push(list.filter.nationality);
    if (list.filter?.min_visit_count) {
      parts.push(`≥ ${list.filter.min_visit_count} estadias`);
    }
    return parts.length > 0 ? parts.join(" · ") : "Sem filtro definido";
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="flex min-h-11 items-center gap-2 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Nova lista
        </button>
      </div>

      {lists.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-canvas py-16 text-center">
          <Users2 className="h-8 w-8 text-ink-subdued" strokeWidth={1.5} />
          <p className="text-body font-semibold text-ink">
            Ainda não tens listas
          </p>
          <p className="text-body text-ink-subdued">
            Cria uma lista para restringir a quem os fluxos enviam email.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-canvas shadow-card">
          {lists.map((list, index) => (
            <div
              key={list.id}
              className={`flex items-center gap-4 px-5 py-4 ${
                index > 0 ? "border-t border-border" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-bold text-ink">
                  {list.name}
                </p>
                <p className="truncate text-[12px] text-ink-subdued">
                  {LIST_KIND_LABELS[list.kind]} · {describeList(list)}
                </p>
              </div>
              {list.kind === "manual" && (
                <button
                  type="button"
                  onClick={() => setManagingMembers(list)}
                  className="min-h-9 rounded-md border border-border px-3 text-[13px] font-semibold text-ink-muted transition-colors duration-fast ease-standard hover:bg-surface-1"
                >
                  Gerir membros
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditing(list)}
                aria-label="Editar"
                className="rounded-md p-2 text-ink-subdued hover:bg-surface-1"
              >
                <Pencil className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => setDeleting(list)}
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
        <ListFormModal
          list={editing === "new" ? undefined : editing}
          properties={properties}
          onClose={() => setEditing(null)}
        />
      )}
      {managingMembers && (
        <ListMembersModal
          list={managingMembers}
          guests={guests}
          memberGuestIds={
            memberGuestIdsByList.get(managingMembers.id) ?? new Set()
          }
          onClose={() => setManagingMembers(null)}
        />
      )}
      {deleting && (
        <ConfirmDeleteModal
          title="Remover lista"
          message={`Tens a certeza que queres remover a lista "${deleting.name}"?`}
          onConfirm={() => deleteList(deleting.id)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
