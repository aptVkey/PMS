"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, UserMinus, UserPlus, X } from "lucide-react";
import type { Guest } from "@/lib/guests";
import type { EmailList } from "@/lib/email-marketing";
import { addListMember, removeListMember } from "./actions";

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas pl-9 pr-3 text-body text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";

export function ListMembersModal({
  list,
  guests,
  memberGuestIds,
  onClose,
}: {
  list: EmailList;
  guests: Guest[];
  memberGuestIds: Set<string>;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const members = useMemo(
    () => guests.filter((g) => memberGuestIds.has(g.id)),
    [guests, memberGuestIds],
  );

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (normalized === "") return [];
    return guests
      .filter((g) => !memberGuestIds.has(g.id))
      .filter(
        (g) =>
          g.name.toLowerCase().includes(normalized) ||
          g.email?.toLowerCase().includes(normalized),
      )
      .slice(0, 8);
  }, [guests, memberGuestIds, query]);

  function handleAdd(guestId: string) {
    startTransition(async () => {
      await addListMember(list.id, guestId);
    });
  }

  function handleRemove(guestId: string) {
    startTransition(async () => {
      await removeListMember(list.id, guestId);
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg bg-canvas shadow-popover">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-[18px] font-bold text-ink">
            Membros de &ldquo;{list.name}&rdquo;
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

        <div className="flex flex-col gap-4 overflow-y-auto px-6 py-5">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subdued"
              strokeWidth={2}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar hóspede por nome ou email..."
              className={inputClasses}
            />
          </div>

          {results.length > 0 && (
            <div className="flex flex-col gap-1 rounded-md border border-border">
              {results.map((guest) => (
                <button
                  key={guest.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleAdd(guest.id)}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-left text-body hover:bg-surface-1 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="min-w-0 truncate">
                    {guest.name}{" "}
                    <span className="text-ink-subdued">
                      {guest.email ?? "sem email"}
                    </span>
                  </span>
                  <UserPlus
                    className="h-4 w-4 shrink-0 text-action"
                    strokeWidth={2}
                  />
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <p className="text-[12px] font-semibold text-ink-subdued">
              {members.length} membro(s)
            </p>
            {members.length === 0 ? (
              <p className="text-body text-ink-subdued">
                Ainda não adicionaste nenhum hóspede a esta lista.
              </p>
            ) : (
              <div className="flex flex-col gap-1 rounded-md border border-border">
                {members.map((guest) => (
                  <div
                    key={guest.id}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <span className="min-w-0 truncate text-body text-ink">
                      {guest.name}{" "}
                      <span className="text-ink-subdued">
                        {guest.email ?? "sem email"}
                      </span>
                    </span>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleRemove(guest.id)}
                      aria-label="Remover"
                      className="rounded-md p-1.5 text-ink-subdued hover:bg-error/10 hover:text-error disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <UserMinus className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
}
