"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckSquare, Filter, Inbox, Users } from "lucide-react";
import type { Guest } from "@/lib/guests";
import {
  EMPTY_STATS,
  computeGuestStats,
  metricAverages,
  ruleMatches,
  type CrmLead,
  type CrmSegment,
  type CrmTag,
  type CrmTagRule,
  type CrmTask,
  type GuestStats,
} from "@/lib/crm";
import { todayISO } from "@/lib/date-utils";
import type { GuestBooking } from "./page";
import { GuestsTab } from "./guests-tab";
import { GuestProfileDrawer } from "./guest-profile-drawer";
import { SegmentsTab } from "./segments-tab";
import { TasksTab } from "./tasks-tab";
import { LeadsTab } from "./leads-tab";

type Tab = "hospedes" | "segmentos" | "tarefas" | "leads";

export type StaffOption = { id: string; name: string };

export function HospedesClient({
  currentUserId,
  guests,
  bookings,
  tags,
  guestTags,
  tasks,
  leads,
  segments,
  tagRules,
  segmentsWithList,
  staff,
}: {
  currentUserId: string;
  guests: Guest[];
  bookings: GuestBooking[];
  tags: CrmTag[];
  guestTags: { guest_id: string; tag_id: string }[];
  tasks: CrmTask[];
  leads: CrmLead[];
  segments: CrmSegment[];
  tagRules: CrmTagRule[];
  // Segmentos que já têm uma lista de email ligada.
  segmentsWithList: string[];
  staff: StaffOption[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("hospedes");
  const [openGuestId, setOpenGuestId] = useState<string | null>(null);
  const today = todayISO();

  // Tempo real: quando entra, muda ou sai uma reserva, a média e as etiquetas
  // por regra mudam — por isso a página recarrega os dados sozinha.
  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel("crm-bookings-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          clearTimeout(timer);
          timer = setTimeout(() => router.refresh(), 800);
        },
      )
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [router]);

  const statsByGuest = useMemo(() => {
    const grouped = new Map<string, GuestBooking[]>();
    for (const booking of bookings) {
      grouped.set(booking.guest_id, [
        ...(grouped.get(booking.guest_id) ?? []),
        booking,
      ]);
    }
    const result = new Map<string, GuestStats>();
    for (const [guestId, list] of grouped) {
      result.set(guestId, computeGuestStats(list, today));
    }
    return result;
  }, [bookings, today]);

  // Etiquetas manuais atribuídas a cada hóspede.
  const manualTagIdsByGuest = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const row of guestTags) {
      map.set(row.guest_id, [...(map.get(row.guest_id) ?? []), row.tag_id]);
    }
    return map;
  }, [guestTags]);

  // Médias de cada métrica entre todos os hóspedes (para as regras "acima /
  // abaixo da média").
  const averages = useMemo(
    () => metricAverages(Array.from(statsByGuest.values()), today),
    [statsByGuest, today],
  );

  // Regras automáticas: as etiquetas são calculadas aqui, sempre com os dados
  // atuais — nunca ficam desatualizadas.
  const ruleTags = useMemo<CrmTag[]>(
    () =>
      tagRules.map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        auto: true,
      })),
    [tagRules],
  );
  const ruleIdsByGuest = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const guest of guests) {
      const stats = statsByGuest.get(guest.id) ?? EMPTY_STATS;
      const matched = tagRules
        .filter((rule) => ruleMatches(rule, stats, averages, today))
        .map((rule) => rule.id);
      if (matched.length > 0) map.set(guest.id, matched);
    }
    return map;
  }, [guests, statsByGuest, tagRules, averages, today]);

  // Manuais + automáticas, para filtros, segmentos e listas.
  const allTags = useMemo(() => [...tags, ...ruleTags], [tags, ruleTags]);
  const tagIdsByGuest = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const guest of guests) {
      const ids = [
        ...(manualTagIdsByGuest.get(guest.id) ?? []),
        ...(ruleIdsByGuest.get(guest.id) ?? []),
      ];
      if (ids.length > 0) map.set(guest.id, ids);
    }
    return map;
  }, [guests, manualTagIdsByGuest, ruleIdsByGuest]);

  const overdueTasks = tasks.filter(
    (t) => !t.done && t.due_date && t.due_date <= today,
  ).length;
  const newLeads = leads.filter((l) => l.status === "novo").length;

  const openGuest = openGuestId
    ? (guests.find((g) => g.id === openGuestId) ?? null)
    : null;

  const TABS: {
    key: Tab;
    label: string;
    icon: typeof Users;
    badge?: number;
  }[] = [
    { key: "hospedes", label: "Hóspedes", icon: Users },
    { key: "segmentos", label: "Segmentos", icon: Filter },
    {
      key: "tarefas",
      label: "Tarefas",
      icon: CheckSquare,
      badge: overdueTasks,
    },
    { key: "leads", label: "Leads", icon: Inbox, badge: newLeads },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[24px] font-bold text-ink">Hóspedes / CRM</h1>
        <p className="mt-1 text-body text-ink-muted">
          Conhece os teus hóspedes, segmenta, acompanha contactos e pedidos.
        </p>
      </div>

      <div className="flex flex-wrap rounded-md border border-border bg-canvas p-0.5 sm:w-fit">
        {TABS.map(({ key, label, icon: Icon, badge }) => (
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
            {badge ? (
              <span className="rounded-pill bg-error px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
                {badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "hospedes" && (
        <GuestsTab
          guests={guests}
          bookings={bookings}
          statsByGuest={statsByGuest}
          tags={allTags}
          tagIdsByGuest={tagIdsByGuest}
          onOpen={setOpenGuestId}
        />
      )}
      {tab === "segmentos" && (
        <SegmentsTab
          guests={guests}
          statsByGuest={statsByGuest}
          tags={allTags}
          manualTags={tags}
          tagRules={tagRules}
          averages={averages}
          tagIdsByGuest={tagIdsByGuest}
          segments={segments}
          segmentsWithList={segmentsWithList}
          today={today}
          onOpenGuest={setOpenGuestId}
        />
      )}
      {tab === "tarefas" && (
        <TasksTab
          tasks={tasks}
          guests={guests}
          staff={staff}
          currentUserId={currentUserId}
          today={today}
          onOpenGuest={setOpenGuestId}
        />
      )}
      {tab === "leads" && (
        <LeadsTab leads={leads} staff={staff} onOpenGuest={setOpenGuestId} />
      )}

      {openGuest && (
        <GuestProfileDrawer
          key={openGuest.id}
          guest={openGuest}
          bookings={bookings.filter((b) => b.guest_id === openGuest.id)}
          stats={statsByGuest.get(openGuest.id) ?? EMPTY_STATS}
          tags={tags}
          guestTagIds={manualTagIdsByGuest.get(openGuest.id) ?? []}
          autoTags={ruleTags.filter((t) =>
            (ruleIdsByGuest.get(openGuest.id) ?? []).includes(t.id),
          )}
          tasks={tasks.filter((t) => t.guest_id === openGuest.id)}
          staff={staff}
          today={today}
          onClose={() => setOpenGuestId(null)}
        />
      )}
    </div>
  );
}
