import "server-only";
import ical, { type CalendarResponse, type VEvent } from "node-ical";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatISO, todayISO } from "@/lib/date-utils";

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

// Violação da exclusion constraint bookings_no_overlap.
const EXCLUSION_VIOLATION = "23P01";

export type IcalFeed = {
  id: string;
  room_id: string;
  channel: string;
  feed_url: string;
  is_active: boolean;
};

export type SyncResult =
  | {
      success: true;
      created: number;
      updated: number;
      cancelled: number;
      conflicts: number;
    }
  | { success: false; error: string };

// As datas all-day de iCal chegam como Date "à meia-noite UTC" do dia
// pretendido — ler com getters locais desviaria o dia em fusos negativos.
function toISODate(date: Date): string {
  return formatISO(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
}

function summaryText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "val" in value) {
    return String((value as { val: unknown }).val);
  }
  return "";
}

// Booking.com/Airbnb não dão nome, email nem telefone do hóspede via iCal —
// as reservas importadas ficam associadas a um hóspede genérico partilhado
// por canal, criado da primeira vez que é preciso.
async function findOrCreateChannelGuest(
  admin: AdminClient,
  channel: string,
): Promise<string> {
  const name = `${channel} (auto)`;

  const { data: existing } = await admin
    .from("guests")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data: created, error } = await admin
    .from("guests")
    .insert({
      name,
      notes:
        "Hóspede genérico criado automaticamente pela sincronização iCal — a feed externa não dá o nome real do hóspede.",
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error("Não foi possível criar o hóspede genérico do canal.");
  }

  return created.id as string;
}

// Uma reserva externa não coube no calendário: regista-a para ninguém a
// perder de vista. Conflitos já marcados como vistos à mão não voltam a abrir.
async function recordConflict(
  admin: AdminClient,
  feed: IcalFeed,
  event: { uid: string; summary: string },
  checkIn: string,
  checkOut: string,
  ignoreBookingId?: string,
) {
  // Reservas do PMS que ocupam alguma destas noites.
  let query = admin
    .from("bookings")
    .select("id, check_in, check_out")
    .eq("room_id", feed.room_id)
    .neq("status", "cancelada")
    .lt("check_in", checkOut)
    .gt("check_out", checkIn)
    .order("check_in")
    .limit(5);
  if (ignoreBookingId) query = query.neq("id", ignoreBookingId);
  const { data: overlapping } = await query;

  const blocking = overlapping?.[0] ?? null;
  const sameDates = (overlapping ?? []).some(
    (b) => b.check_in === checkIn && b.check_out === checkOut,
  );

  const { data: existing } = await admin
    .from("ical_conflicts")
    .select("id, resolution")
    .eq("feed_id", feed.id)
    .eq("external_uid", event.uid)
    .maybeSingle();

  if (existing) {
    await admin
      .from("ical_conflicts")
      .update({
        last_seen_at: new Date().toISOString(),
        check_in: checkIn,
        check_out: checkOut,
        blocking_booking_id: blocking?.id ?? null,
        same_dates: sameDates,
        // Visto à mão = continua fechado; automático volta a abrir.
        ...(existing.resolution === "manual"
          ? {}
          : { resolved_at: null, resolution: null }),
      })
      .eq("id", existing.id);
    return existing.resolution !== "manual";
  }

  await admin.from("ical_conflicts").insert({
    feed_id: feed.id,
    room_id: feed.room_id,
    external_uid: event.uid,
    summary: event.summary || null,
    check_in: checkIn,
    check_out: checkOut,
    blocking_booking_id: blocking?.id ?? null,
    same_dates: sameDates,
  });
  return true;
}

async function markFeedResult(
  admin: AdminClient,
  feedId: string,
  update: Record<string, unknown>,
) {
  await admin
    .from("ical_feeds")
    .update({ last_synced_at: new Date().toISOString(), ...update })
    .eq("id", feedId);
}

export async function syncIcalFeed(
  admin: AdminClient,
  feed: IcalFeed,
): Promise<SyncResult> {
  let icsText: string;
  try {
    const response = await fetch(feed.feed_url, {
      headers: { "User-Agent": "PMS-iCal-Sync/1.0" },
      // Uma feed lenta ou pendurada não pode travar as restantes — a rota
      // que chama syncAllIcalFeeds() processa os feeds um a um.
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(`A feed respondeu com o estado ${response.status}.`);
    }
    icsText = await response.text();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro de rede desconhecido.";
    await markFeedResult(admin, feed.id, {
      last_sync_status: "error",
      last_sync_error: message,
    });
    return { success: false, error: message };
  }

  let parsed: CalendarResponse;
  try {
    parsed = ical.sync.parseICS(icsText);
  } catch {
    const message = "Não foi possível ler o ficheiro iCal (formato inválido).";
    await markFeedResult(admin, feed.id, {
      last_sync_status: "error",
      last_sync_error: message,
    });
    return { success: false, error: message };
  }

  const events = Object.values(parsed).filter(
    (item): item is VEvent => item?.type === "VEVENT",
  );

  let guestId: string;
  try {
    guestId = await findOrCreateChannelGuest(admin, feed.channel);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Erro ao preparar o hóspede genérico.";
    await markFeedResult(admin, feed.id, {
      last_sync_status: "error",
      last_sync_error: message,
    });
    return { success: false, error: message };
  }

  let created = 0;
  let updated = 0;
  let conflicts = 0;
  const today = todayISO();
  const seenUids = new Set<string>();
  // UIDs que colidiram nesta leitura (os restantes conflitos abertos deste
  // feed já não existem e fecham-se sozinhos).
  const conflictedUids = new Set<string>();
  // Erros de escrita que não sejam sobreposição de datas não podem
  // desaparecer silenciosamente — ficam aqui e aparecem no resumo mesmo
  // que o resto da sincronização tenha corrido bem.
  const writeErrors: string[] = [];

  for (const event of events) {
    if (!event.uid || !event.start || !event.end) continue;
    // Um evento cancelado é tratado como "ausente da feed" — cai na
    // limpeza abaixo, que marca a reserva correspondente como cancelada.
    if (event.status === "CANCELLED") continue;

    seenUids.add(event.uid);

    const checkIn = toISODate(event.start);
    const checkOut = toISODate(event.end);
    if (checkOut <= checkIn) continue;

    const { data: existing } = await admin
      .from("bookings")
      .select("id, check_in, check_out, status")
      .eq("ical_feed_id", feed.id)
      .eq("external_uid", event.uid)
      .maybeSingle();

    if (existing) {
      const unchanged =
        existing.check_in === checkIn &&
        existing.check_out === checkOut &&
        existing.status !== "cancelada";

      if (unchanged) continue;

      const { error } = await admin
        .from("bookings")
        .update({
          check_in: checkIn,
          check_out: checkOut,
          status: "confirmada",
        })
        .eq("id", existing.id);

      if (error) {
        if (error.code === EXCLUSION_VIOLATION) {
          conflictedUids.add(event.uid);
          if (
            await recordConflict(
              admin,
              feed,
              { uid: event.uid, summary: summaryText(event.summary) },
              checkIn,
              checkOut,
              existing.id as string,
            )
          ) {
            conflicts += 1;
          }
        } else
          writeErrors.push(`Falha ao atualizar ${event.uid}: ${error.message}`);
        continue;
      }
      updated += 1;
      continue;
    }

    // Reservas que já terminaram não bloqueiam nada: não entram de novo
    // (as plataformas ainda as podem listar durante uns dias).
    if (checkOut < today) continue;

    const { error } = await admin.from("bookings").insert({
      room_id: feed.room_id,
      guest_id: guestId,
      check_in: checkIn,
      check_out: checkOut,
      status: "confirmada",
      total_amount: 0,
      channel: feed.channel,
      notes:
        `Sincronizado via iCal (${feed.channel}). ${summaryText(event.summary)}`.trim(),
      ical_feed_id: feed.id,
      external_uid: event.uid,
    });

    if (error) {
      if (error.code === EXCLUSION_VIOLATION) {
        conflictedUids.add(event.uid);
        if (
          await recordConflict(
            admin,
            feed,
            { uid: event.uid, summary: summaryText(event.summary) },
            checkIn,
            checkOut,
          )
        ) {
          conflicts += 1;
        }
      } else writeErrors.push(`Falha ao criar ${event.uid}: ${error.message}`);
      continue;
    }
    created += 1;
  }

  // Conflitos abertos que já não colidem (a reserva saiu do feed ou a que a
  // bloqueava foi cancelada) fecham-se sozinhos.
  const { data: openConflicts } = await admin
    .from("ical_conflicts")
    .select("id, external_uid")
    .eq("feed_id", feed.id)
    .is("resolved_at", null);
  for (const conflict of openConflicts ?? []) {
    if (!conflictedUids.has(conflict.external_uid as string)) {
      await admin
        .from("ical_conflicts")
        .update({ resolved_at: new Date().toISOString(), resolution: "auto" })
        .eq("id", conflict.id);
    }
  }

  // Reservas deste feed cujo UID já não aparece na feed atual foram
  // canceladas do lado de fora — sincroniza esse estado para cá.
  // Só contam as que ainda não terminaram: as plataformas tiram as estadias
  // passadas do feed e isso NÃO é um cancelamento.
  const { data: staleBookings } = await admin
    .from("bookings")
    .select("id, external_uid")
    .eq("ical_feed_id", feed.id)
    .neq("status", "cancelada")
    .gte("check_out", today)
    .not("external_uid", "is", null);

  const toCancel = (staleBookings ?? []).filter(
    (b) => !seenUids.has(b.external_uid as string),
  );

  // Um feed vazio é suspeito (página de login, erro da plataforma...):
  // cancelar tudo de uma vez deixaria as datas livres nos outros canais.
  let emptyFeedWarning: string | null = null;
  let cancelled = 0;
  if (seenUids.size === 0 && toCancel.length > 0) {
    emptyFeedWarning = `O feed veio vazio e há ${toCancel.length} reserva(s) futuras deste canal. Não foram canceladas por segurança — confirma o link do feed ou cancela à mão.`;
  } else {
    for (const booking of toCancel) {
      const { error } = await admin
        .from("bookings")
        .update({ status: "cancelada" })
        .eq("id", booking.id);
      if (!error) cancelled += 1;
    }
  }

  await markFeedResult(admin, feed.id, {
    last_sync_status: "success",
    last_sync_error:
      writeErrors.length > 0
        ? `${writeErrors.length} evento(s) falharam a gravar: ${writeErrors.slice(0, 3).join("; ")}`
        : emptyFeedWarning,
    created_count: created,
    updated_count: updated,
    cancelled_count: cancelled,
    conflict_count: conflicts,
  });

  return { success: true, created, updated, cancelled, conflicts };
}

export async function syncAllIcalFeeds(): Promise<
  { feedId: string; result: SyncResult }[]
> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data: feeds } = await admin
    .from("ical_feeds")
    .select("*")
    .eq("is_active", true);

  const results: { feedId: string; result: SyncResult }[] = [];
  for (const feed of (feeds ?? []) as IcalFeed[]) {
    const result = await syncIcalFeed(admin, feed);
    results.push({ feedId: feed.id, result });
  }

  return results;
}
