"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  type StaffMember,
} from "@/lib/staff";
import { StaffFormModal } from "./staff-form-modal";
import { ConfirmRemoveModal } from "./confirm-remove-modal";
import { ModalPortal } from "@/components/modal-portal";

export function StaffRow({
  member,
  isCurrentUser,
}: {
  member: StaffMember;
  isCurrentUser: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);

  const hasAllPermissions =
    member.permissions.length === PERMISSION_KEYS.length;

  return (
    <>
      <tr className="border-b border-border last:border-0">
        <td className="whitespace-nowrap px-4 py-3">
          <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-[12px] font-semibold text-primary">{member.name.split(" ").filter(Boolean).slice(0, 2).map(part => part[0]).join("")}</span>
          <div>
          <p className="text-body font-semibold text-ink">
            {member.name}
            {isCurrentUser && (
              <span className="ml-2 text-[12px] font-normal text-ink-subdued">
                (tu)
              </span>
            )}
          </p>
          <p className="text-[12px] text-ink-subdued">{member.email}</p>
          </div>
          </div>
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-body text-ink-muted">
          {member.role_label || "—"}
        </td>
        <td className="px-4 py-3">
          {hasAllPermissions ? (
            <span className="rounded-pill bg-surface-2 px-3 py-1 text-[12px] font-semibold text-primary">
              Acesso total
            </span>
          ) : member.permissions.length === 0 ? (
            <span className="text-[12px] text-ink-subdued">Sem acessos</span>
          ) : (
            <span
              className="text-[12px] text-ink-muted"
              title={member.permissions
                .map((key) => PERMISSION_LABELS[key])
                .join(", ")}
            >
              {member.permissions.length}{" "}
              {member.permissions.length === 1 ? "acesso" : "acessos"}
            </span>
          )}
        </td>
        <td className="whitespace-nowrap px-4 py-3">
          <span
            className={`rounded-pill px-3 py-1 text-[12px] font-semibold ${
              member.active
                ? "bg-success/10 text-success"
                : "bg-ink-subdued/10 text-ink-subdued"
            }`}
          >
            {member.active ? "Ativo" : "Inativo"}
          </span>
        </td>
        <td className="whitespace-nowrap px-4 py-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Editar membro"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink transition-colors duration-fast ease-standard hover:bg-surface-1"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => setRemoving(true)}
              disabled={isCurrentUser}
              aria-label="Remover membro"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-error transition-colors duration-fast ease-standard hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        </td>
      </tr>

      <ModalPortal>
        {editing && (
          <StaffFormModal member={member} onClose={() => setEditing(false)} />
        )}
        {removing && (
          <ConfirmRemoveModal
            member={member}
            onClose={() => setRemoving(false)}
          />
        )}
      </ModalPortal>
    </>
  );
}
