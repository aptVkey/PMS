"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Users } from "lucide-react";
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, type Guest } from "@/lib/guests";
import type { CrmTag, GuestStats } from "@/lib/crm";
import { EMPTY_STATS } from "@/lib/crm";
import type { GuestBooking } from "./page";
import { GuestRow } from "./guest-row";
import { GuestFormModal } from "./guest-form-modal";

const selectClasses =
  "min-h-11 rounded-md border border-border bg-canvas px-3 text-body text-ink focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";

export function GuestsTab({
  guests,
  bookings,
  statsByGuest,
  tags,
  tagIdsByGuest,
  onOpen,
}: {
  guests: Guest[];
  bookings: GuestBooking[];
  statsByGuest: Map<string, GuestStats>;
  tags: CrmTag[];
  tagIdsByGuest: Map<string, string[]>;
  onOpen: (guestId: string) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [nationalityFilter, setNationalityFilter] = useState("");
  const [documentTypeFilter, setDocumentTypeFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  const tagsById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  const nationalities = useMemo(() => {
    const values = new Set(
      guests.map((g) => g.nationality).filter((n): n is string => !!n),
    );
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [guests]);

  const filteredGuests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return guests.filter((guest) => {
      const matchesQuery =
        normalizedQuery === "" ||
        guest.name.toLowerCase().includes(normalizedQuery) ||
        guest.email?.toLowerCase().includes(normalizedQuery) ||
        guest.phone?.toLowerCase().includes(normalizedQuery);

      const matchesNationality =
        nationalityFilter === "" || guest.nationality === nationalityFilter;

      const matchesDocumentType =
        documentTypeFilter === "" || guest.document_type === documentTypeFilter;

      const matchesTag =
        tagFilter === "" ||
        (tagIdsByGuest.get(guest.id) ?? []).includes(tagFilter);

      return (
        matchesQuery && matchesNationality && matchesDocumentType && matchesTag
      );
    });
  }, [
    guests,
    query,
    nationalityFilter,
    documentTypeFilter,
    tagFilter,
    tagIdsByGuest,
  ]);

  const hasFilters =
    query !== "" ||
    nationalityFilter !== "" ||
    documentTypeFilter !== "" ||
    tagFilter !== "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 lg:flex-row">
        {guests.length > 0 && (
          <>
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subdued"
                strokeWidth={2}
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar por nome, email ou telefone..."
                className={`${selectClasses} w-full pl-9`}
              />
            </div>
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              aria-label="Filtrar por etiqueta"
              className={selectClasses}
            >
              <option value="">Todas as etiquetas</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
            <select
              value={nationalityFilter}
              onChange={(e) => setNationalityFilter(e.target.value)}
              className={selectClasses}
            >
              <option value="">Todas as nacionalidades</option>
              {nationalities.map((nationality) => (
                <option key={nationality} value={nationality}>
                  {nationality}
                </option>
              ))}
            </select>
            <select
              value={documentTypeFilter}
              onChange={(e) => setDocumentTypeFilter(e.target.value)}
              className={selectClasses}
            >
              <option value="">Todos os documentos</option>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {DOCUMENT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </>
        )}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Adicionar hóspede
        </button>
      </div>

      {guests.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-canvas py-16 text-center">
          <Users className="h-8 w-8 text-ink-subdued" strokeWidth={1.5} />
          <p className="text-body font-semibold text-ink">
            Ainda não tens hóspedes
          </p>
          <p className="max-w-sm text-body text-ink-subdued">
            Adiciona o primeiro hóspede para começares a construir o teu CRM.
          </p>
        </div>
      ) : filteredGuests.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-canvas py-16 text-center">
          <Search className="h-8 w-8 text-ink-subdued" strokeWidth={1.5} />
          <p className="text-body font-semibold text-ink">
            Nenhum hóspede encontrado
          </p>
          <p className="max-w-sm text-body text-ink-subdued">
            {hasFilters
              ? "Tenta ajustar a pesquisa ou os filtros."
              : "Adiciona hóspedes para os veres aqui."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-canvas shadow-card">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-surface-1 text-[12px] font-semibold uppercase tracking-wide text-ink-subdued">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3 text-center">Estadias</th>
                <th className="px-4 py-3">Última estadia</th>
                <th className="px-4 py-3">Próxima</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredGuests.map((guest) => (
                <GuestRow
                  key={guest.id}
                  guest={guest}
                  bookings={bookings.filter((b) => b.guest_id === guest.id)}
                  stats={statsByGuest.get(guest.id) ?? EMPTY_STATS}
                  tags={(tagIdsByGuest.get(guest.id) ?? [])
                    .map((id) => tagsById.get(id))
                    .filter((t): t is CrmTag => !!t)}
                  onOpen={() => onOpen(guest.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && <GuestFormModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
