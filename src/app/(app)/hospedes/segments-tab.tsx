"use client";

import { useMemo, useState, useTransition } from "react";
import { ListPlus, Plus, Save, Trash2, Users } from "lucide-react";
import type { Guest } from "@/lib/guests";
import {
  EMPTY_STATS,
  TAG_COLORS,
  TAG_COLOR_LABELS,
  describeSegment,
  matchesSegment,
  type CrmSegment,
  type CrmTag,
  type CrmTagRule,
  type GuestStats,
  type RuleMetric,
  type SegmentFilter,
  type TagColor,
} from "@/lib/crm";
import {
  createEmailListFromSegment,
  createTag,
  deleteSegment,
  deleteTag,
  saveSegment,
} from "./crm-actions";
import { TagRulesManager } from "./tag-rules-manager";
import {
  TagChip,
  inputClasses,
  labelClasses,
  primaryButton,
  secondaryButton,
} from "./crm-ui";

const PRESETS: { label: string; filter: SegmentFilter }[] = [
  { label: "Recorrentes (2+ estadias)", filter: { minStays: 2 } },
  { label: "Sem estadia há 12 meses", filter: { inactiveDays: 365 } },
  { label: "Com reserva futura", filter: { hasUpcoming: true } },
];

export function SegmentsTab({
  guests,
  statsByGuest,
  tags,
  manualTags,
  tagRules,
  averages,
  tagIdsByGuest,
  segments,
  segmentsWithList,
  today,
  onOpenGuest,
}: {
  guests: Guest[];
  statsByGuest: Map<string, GuestStats>;
  // Todas as etiquetas (manuais + automáticas), para filtros e segmentos.
  tags: CrmTag[];
  manualTags: CrmTag[];
  tagRules: CrmTagRule[];
  averages: Record<RuleMetric, number | null>;
  tagIdsByGuest: Map<string, string[]>;
  segments: CrmSegment[];
  segmentsWithList: string[];
  today: string;
  onOpenGuest: (guestId: string) => void;
}) {
  const nationalities = useMemo(
    () =>
      Array.from(
        new Set(
          guests.map((g) => g.nationality).filter((n): n is string => !!n),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [guests],
  );

  const membersOf = useMemo(
    () => (filter: SegmentFilter) =>
      guests.filter((g) =>
        matchesSegment(
          g,
          statsByGuest.get(g.id) ?? EMPTY_STATS,
          tagIdsByGuest.get(g.id) ?? [],
          filter,
          today,
        ),
      ),
    [guests, statsByGuest, tagIdsByGuest, today],
  );

  // Quantos hóspedes cada regra apanha neste momento.
  const matchCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ids of tagIdsByGuest.values()) {
      for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [tagIdsByGuest]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
      <div className="flex flex-col gap-6">
        <SegmentBuilder
          tags={tags}
          nationalities={nationalities}
          membersOf={membersOf}
        />

        <section className="flex flex-col gap-3">
          <h2 className="text-[16px] font-bold text-ink">
            Segmentos guardados
          </h2>
          {segments.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-canvas p-8 text-center text-body text-ink-subdued">
              Ainda não guardaste segmentos. Cria um acima.
            </p>
          ) : (
            segments.map((segment) => (
              <SegmentCard
                key={segment.id}
                segment={segment}
                tags={tags}
                members={membersOf(segment.filter)}
                hasList={segmentsWithList.includes(segment.id)}
                onOpenGuest={onOpenGuest}
              />
            ))
          )}
        </section>
      </div>

      <div className="flex flex-col gap-6">
        <TagRulesManager
          rules={tagRules}
          averages={averages}
          matchCounts={matchCounts}
        />
        <TagsManager tags={manualTags} tagIdsByGuest={tagIdsByGuest} />
      </div>
    </div>
  );
}

// ---------- Construtor ----------

function SegmentBuilder({
  tags,
  nationalities,
  membersOf,
}: {
  tags: CrmTag[];
  nationalities: string[];
  membersOf: (filter: SegmentFilter) => Guest[];
}) {
  const [name, setName] = useState("");
  const [filter, setFilter] = useState<SegmentFilter>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const count = membersOf(filter).length;
  const hasCriteria = Object.values(filter).some(
    (v) =>
      v !== undefined && v !== false && !(Array.isArray(v) && v.length === 0),
  );

  function patch(next: Partial<SegmentFilter>) {
    setFilter((prev) => {
      const merged = { ...prev, ...next };
      // Remove chaves vazias para o filtro guardado ficar limpo.
      for (const key of Object.keys(merged) as (keyof SegmentFilter)[]) {
        const v = merged[key];
        if (v === undefined || v === false || v === "" || Number.isNaN(v)) {
          delete merged[key];
        }
      }
      return merged;
    });
  }

  function toggleTag(tagId: string) {
    const current = filter.tagIds ?? [];
    patch({
      tagIds: current.includes(tagId)
        ? current.filter((t) => t !== tagId)
        : [...current, tagId],
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveSegment(name, filter);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setName("");
      setFilter({});
    });
  }

  const numberValue = (v: number | undefined) =>
    v === undefined ? "" : String(v);

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-canvas p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[16px] font-bold text-ink">Novo segmento</h2>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setFilter(preset.filter)}
              className="rounded-pill border border-border px-3 py-1 text-[12px] font-semibold text-ink-muted hover:bg-surface-1"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="seg-nat" className={labelClasses}>
            Nacionalidade
          </label>
          <select
            id="seg-nat"
            value={filter.nationality ?? ""}
            onChange={(e) =>
              patch({ nationality: e.target.value || undefined })
            }
            className={inputClasses}
          >
            <option value="">Qualquer</option>
            {nationalities.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="seg-stays" className={labelClasses}>
            Mínimo de estadias
          </label>
          <input
            id="seg-stays"
            type="number"
            min={1}
            value={numberValue(filter.minStays)}
            onChange={(e) =>
              patch({
                minStays: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className={inputClasses}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="seg-value" className={labelClasses}>
            Valor mínimo em reservas (€)
          </label>
          <input
            id="seg-value"
            type="number"
            min={0}
            value={numberValue(filter.minValue)}
            onChange={(e) =>
              patch({
                minValue: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className={inputClasses}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="seg-inactive" className={labelClasses}>
            Sem estadia há (dias)
          </label>
          <input
            id="seg-inactive"
            type="number"
            min={1}
            value={numberValue(filter.inactiveDays)}
            onChange={(e) =>
              patch({
                inactiveDays: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
            className={inputClasses}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <label className="flex items-center gap-2 text-body text-ink">
          <input
            type="checkbox"
            checked={filter.hasUpcoming ?? false}
            onChange={(e) => patch({ hasUpcoming: e.target.checked })}
            className="h-4 w-4 accent-[var(--color-action)]"
          />
          Com reserva futura
        </label>
        <label className="flex items-center gap-2 text-body text-ink">
          <input
            type="checkbox"
            checked={filter.hasEmail ?? false}
            onChange={(e) => patch({ hasEmail: e.target.checked })}
            className="h-4 w-4 accent-[var(--color-action)]"
          />
          Só com email
        </label>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className={labelClasses}>Etiquetas (qualquer uma)</span>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => {
              const on = filter.tagIds?.includes(tag.id) ?? false;
              return (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleTag(tag.id)}
                  className={`rounded-pill ring-2 ${on ? "ring-action" : "ring-transparent opacity-70"}`}
                >
                  <TagChip tag={tag} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border pt-4">
        <p className="flex items-center gap-2 text-body text-ink-muted">
          <Users className="h-4 w-4" strokeWidth={2} />
          <strong className="text-ink">{count}</strong> hóspede(s) neste
          segmento
        </p>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do segmento"
            aria-label="Nome do segmento"
            maxLength={80}
            className={`${inputClasses} min-h-10 max-w-60`}
          />
          <button
            type="button"
            onClick={save}
            disabled={isPending || !name.trim() || !hasCriteria}
            className={primaryButton}
          >
            <Save className="h-4 w-4" strokeWidth={2} />
            Guardar
          </button>
        </div>
      </div>
      {error && <p className="text-body text-error">{error}</p>}
    </section>
  );
}

// ---------- Cartão de segmento ----------

function SegmentCard({
  segment,
  tags,
  members,
  hasList,
  onOpenGuest,
}: {
  segment: CrmSegment;
  tags: CrmTag[];
  members: Guest[];
  hasList: boolean;
  onOpenGuest: (guestId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const criteria = describeSegment(segment.filter, tags);
  const withEmail = members.filter((m) => m.email).length;

  function createList() {
    setMessage(null);
    startTransition(async () => {
      const result = await createEmailListFromSegment(segment.id);
      setMessage(
        "error" in result
          ? { ok: false, text: result.error }
          : {
              ok: true,
              text: "Lista dinâmica criada no Email marketing: acompanha este segmento a cada envio.",
            },
      );
    });
  }

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border bg-canvas p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-body font-bold text-ink">{segment.name}</h3>
          <p className="text-[12px] text-ink-subdued">
            {members.length} hóspede(s) · {withEmail} com email
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={`${secondaryButton} min-h-9`}
          >
            {expanded ? "Esconder" : "Ver hóspedes"}
          </button>
          <button
            type="button"
            onClick={createList}
            disabled={isPending || hasList}
            title={
              hasList
                ? "Já existe uma lista de email ligada a este segmento"
                : "Cria uma lista no Email marketing que acompanha este segmento: quem entra ou sai atualiza-se sozinho a cada envio"
            }
            className={`${secondaryButton} min-h-9`}
          >
            <ListPlus className="h-4 w-4" strokeWidth={2} />
            {hasList ? "Lista de email ligada" : "Criar lista dinâmica"}
          </button>
          <button
            type="button"
            onClick={() =>
              startTransition(async () => {
                await deleteSegment(segment.id);
              })
            }
            aria-label="Remover segmento"
            className="rounded-md p-2 text-ink-subdued hover:bg-error/10 hover:text-error"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {criteria.map((c) => (
          <span
            key={c}
            className="rounded-pill bg-surface-1 px-2.5 py-0.5 text-[12px] font-medium text-ink-muted"
          >
            {c}
          </span>
        ))}
      </div>

      {message && (
        <p
          aria-live="polite"
          className={`text-body ${message.ok ? "font-semibold text-success" : "text-error"}`}
        >
          {message.text}
        </p>
      )}

      {expanded && (
        <ul className="grid max-h-64 gap-1 overflow-y-auto rounded-md bg-surface-1 p-2 sm:grid-cols-2">
          {members.slice(0, 100).map((g) => (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => onOpenGuest(g.id)}
                className="w-full truncate rounded px-2 py-1 text-left text-body text-action hover:bg-canvas hover:underline"
              >
                {g.name}
              </button>
            </li>
          ))}
          {members.length > 100 && (
            <li className="px-2 py-1 text-[12px] text-ink-subdued">
              + {members.length - 100} não mostrados
            </li>
          )}
          {members.length === 0 && (
            <li className="px-2 py-1 text-[12px] text-ink-subdued">
              Ninguém cumpre estes critérios agora.
            </li>
          )}
        </ul>
      )}
    </article>
  );
}

// ---------- Gestão de etiquetas ----------

function TagsManager({
  tags,
  tagIdsByGuest,
}: {
  tags: CrmTag[];
  tagIdsByGuest: Map<string, string[]>;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<TagColor>("blue");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const ids of tagIdsByGuest.values()) {
      for (const id of ids) map.set(id, (map.get(id) ?? 0) + 1);
    }
    return map;
  }, [tagIdsByGuest]);

  function create() {
    setError(null);
    startTransition(async () => {
      const result = await createTag(name, color);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setName("");
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-canvas p-5 shadow-card">
      <h2 className="text-[16px] font-bold text-ink">Etiquetas</h2>
      <p className="text-[12px] text-ink-subdued">
        Atribui-as na ficha de cada hóspede.
      </p>

      {tags.length === 0 ? (
        <p className="text-body text-ink-subdued">Ainda sem etiquetas.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tags.map((tag) => (
            <li
              key={tag.id}
              className="flex items-center justify-between gap-2"
            >
              <span className="flex items-center gap-2">
                <TagChip tag={tag} />
                <span className="text-[12px] text-ink-subdued">
                  {counts.get(tag.id) ?? 0}
                </span>
              </span>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteTag(tag.id);
                    if ("error" in result) setError(result.error);
                  })
                }
                aria-label={`Remover etiqueta ${tag.name}`}
                className="rounded p-1 text-ink-subdued hover:bg-error/10 hover:text-error"
              >
                <Trash2 className="h-4 w-4" strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nova etiqueta"
          aria-label="Nome da etiqueta"
          maxLength={40}
          className={`${inputClasses} min-h-10`}
        />
        <div className="flex gap-2">
          <select
            value={color}
            onChange={(e) => setColor(e.target.value as TagColor)}
            aria-label="Cor"
            className={`${inputClasses} min-h-10 flex-1`}
          >
            {TAG_COLORS.map((c) => (
              <option key={c} value={c}>
                {TAG_COLOR_LABELS[c]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={create}
            disabled={isPending || !name.trim()}
            className={`${primaryButton} min-h-10`}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Criar
          </button>
        </div>
        {error && <p className="text-body text-error">{error}</p>}
      </div>
    </section>
  );
}
