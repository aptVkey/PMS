"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, EyeOff, X } from "lucide-react";
import {
  createStaffMember,
  updateStaffMember,
  type StaffFormState,
} from "./actions";
import {
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  type StaffMember,
} from "@/lib/staff";

const initialState: StaffFormState = undefined;

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
const labelClasses = "text-body font-semibold text-ink";

export function StaffFormModal({
  member,
  onClose,
}: {
  member?: StaffMember;
  onClose: () => void;
}) {
  const action = member ? updateStaffMember : createStaffMember;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [permissions, setPermissions] = useState<Set<string>>(
    new Set(member?.permissions ?? []),
  );

  useEffect(() => {
    if (state && "success" in state) {
      onClose();
    }
  }, [state, onClose]);

  function togglePermission(key: string) {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg bg-canvas shadow-popover ui-form-modal">
        <div className="ui-form-header flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-[18px] font-bold text-ink">
            {member ? "Editar membro" : "Adicionar membro"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-ink-subdued hover:bg-surface-1"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <form
          action={formAction}
          className="ui-form-scroll flex flex-col gap-5 overflow-y-auto px-6 py-5"
        >
          {member && <input type="hidden" name="id" value={member.id} />}

          <h3 className="ui-form-section-title">Dados da conta</h3>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className={labelClasses}>
              Nome
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={member?.name}
              placeholder="Nome completo"
              className={inputClasses}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className={labelClasses}>
              Email
            </label>
            {member ? (
              <input
                id="email"
                type="email"
                disabled
                value={member.email}
                className={`${inputClasses} cursor-not-allowed opacity-60`}
              />
            ) : (
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="off"
                placeholder="membro@email.com"
                className={inputClasses}
              />
            )}
          </div>

          {!member && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className={labelClasses}>
                Password temporária
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  className={`${inputClasses} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword ? "Ocultar password" : "Mostrar password"
                  }
                  className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-ink-subdued hover:bg-surface-1"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" strokeWidth={2} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={2} />
                  )}
                </button>
              </div>
              <p className="text-[12px] text-ink-subdued">
                Define esta password e partilha-a diretamente com a pessoa. Ela
                pode alterá-la mais tarde.
              </p>
            </div>
          )}

          <h3 className="ui-form-section-title">Função e custo</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="roleLabel" className={labelClasses}>
                Cargo
              </label>
              <input
                id="roleLabel"
                name="roleLabel"
                type="text"
                defaultValue={member?.role_label ?? ""}
                placeholder="Ex: Rececionista, Governanta..."
                className={inputClasses}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="hourlyRate" className={labelClasses}>
                Valor à hora (€)
              </label>
              <input
                id="hourlyRate"
                name="hourlyRate"
                type="number"
                min={0}
                step="0.01"
                required
                defaultValue={member?.hourly_rate ?? ""}
                placeholder="Ex: 7.50"
                className={inputClasses}
              />
              <p className="text-[12px] text-ink-subdued">
                Usado para calcular o custo do tempo de limpeza. Só visível pelo
                Administrador.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className={labelClasses}>Permissões de acesso</p>
            <p className="text-[12px] text-ink-subdued">
              Escolhe a que separadores da app esta pessoa tem acesso.
            </p>
            <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PERMISSION_KEYS.map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-body text-ink"
                >
                  <input
                    type="checkbox"
                    name="permissions"
                    value={key}
                    checked={permissions.has(key)}
                    onChange={() => togglePermission(key)}
                    className="h-4 w-4 rounded border-border text-action focus:ring-action"
                  />
                  {PERMISSION_LABELS[key]}
                </label>
              ))}
            </div>
          </div>

          {member && (
            <label className="flex items-center gap-2 text-body text-ink">
              <input
                type="checkbox"
                name="active"
                defaultChecked={member.active}
                className="h-4 w-4 rounded border-border text-action focus:ring-action"
              />
              Conta ativa
            </label>
          )}

          {state && "error" in state && (
            <p aria-live="polite" className="text-body text-error">
              {state.error}
            </p>
          )}

          <div className="ui-form-footer flex justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-md border border-border bg-canvas px-4 text-body font-semibold text-ink transition-colors duration-fast ease-standard hover:bg-surface-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="min-h-11 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending
                ? "A guardar..."
                : member
                  ? "Guardar alterações"
                  : "Criar utilizador"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
