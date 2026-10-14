"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";

// Violação da exclusion constraint room_rate_periods_no_overlap.
const EXCLUSION_VIOLATION = "23P01";
import { formatISO, todayISO } from "@/lib/date-utils";
import {
  calculateMonthOccupancy,
  resolveNightlyRate,
  suggestPriceAdjustment,
  type RoomRatePeriod,
} from "@/lib/pricing";

const BaseRateSchema = z.object({
  roomId: z.string().min(1),
  basePrice: z.coerce.number().min(0, { error: "Indica um valor válido." }),
  minStayNights: z.coerce.number().int().min(1).max(365).optional(),
});

export type PricingFormState =
  { error: string } | { success: true } | undefined;

export async function saveBaseRate(
  _prevState: PricingFormState,
  formData: FormData,
): Promise<PricingFormState> {
  const denied = await requirePermission("quartos");
  if (denied) return denied;

  const parsed = BaseRateSchema.safeParse({
    roomId: formData.get("roomId"),
    basePrice: formData.get("basePrice"),
    minStayNights: formData.get("minStayNights") || undefined,
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Verifica os campos assinalados.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("rooms")
    .update({
      base_price: parsed.data.basePrice,
      min_stay_nights: parsed.data.minStayNights ?? null,
    })
    .eq("id", parsed.data.roomId);

  if (error) {
    return { error: "Não foi possível guardar o preço base. Tenta novamente." };
  }

  revalidatePath("/alojamentos/[id]", "layout");
  revalidatePath("/alojamentos");
  return { success: true };
}

const RatePeriodSchema = z
  .object({
    id: z.string().optional(),
    roomId: z.string().min(1),
    label: z.string().min(1, { error: "Indica um nome para o período." }),
    startDate: z.string().min(1, { error: "Indica a data de início." }),
    endDate: z.string().min(1, { error: "Indica a data de fim." }),
    sundayRate: z.coerce.number().min(0, { error: "Indica um valor válido." }),
    weekdayRate: z.coerce.number().min(0, { error: "Indica um valor válido." }),
    weekendRate: z.coerce.number().min(0, { error: "Indica um valor válido." }),
    minStayNights: z.coerce.number().int().min(1).max(365).optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    error: "A data de fim deve ser igual ou depois da data de início.",
    path: ["endDate"],
  });

export async function saveRatePeriod(
  _prevState: PricingFormState,
  formData: FormData,
): Promise<PricingFormState> {
  const denied = await requirePermission("quartos");
  if (denied) return denied;

  const parsed = RatePeriodSchema.safeParse({
    id: formData.get("id") || undefined,
    roomId: formData.get("roomId"),
    label: formData.get("label"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    sundayRate: formData.get("sundayRate"),
    weekdayRate: formData.get("weekdayRate"),
    weekendRate: formData.get("weekendRate"),
    minStayNights: formData.get("minStayNights") || undefined,
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Verifica os campos assinalados.",
    };
  }

  const supabase = await createClient();

  let overlapQuery = supabase
    .from("room_rate_periods")
    .select("id")
    .eq("room_id", parsed.data.roomId)
    .lte("start_date", parsed.data.endDate)
    .gte("end_date", parsed.data.startDate);

  if (parsed.data.id) {
    overlapQuery = overlapQuery.neq("id", parsed.data.id);
  }

  const { data: overlaps, error: overlapError } = await overlapQuery;

  if (overlapError) {
    return { error: "Não foi possível validar o período. Tenta novamente." };
  }

  if (overlaps && overlaps.length > 0) {
    return {
      error:
        "Já existe um período com tarifa definida que sobrepõe estas datas.",
    };
  }

  const payload = {
    room_id: parsed.data.roomId,
    label: parsed.data.label,
    start_date: parsed.data.startDate,
    end_date: parsed.data.endDate,
    sunday_rate: parsed.data.sundayRate,
    weekday_rate: parsed.data.weekdayRate,
    weekend_rate: parsed.data.weekendRate,
    min_stay_nights: parsed.data.minStayNights ?? null,
  };

  const { error } = parsed.data.id
    ? await supabase
        .from("room_rate_periods")
        .update(payload)
        .eq("id", parsed.data.id)
    : await supabase.from("room_rate_periods").insert(payload);

  if (error) {
    if (error.code === EXCLUSION_VIOLATION) {
      return {
        error:
          "Já existe um período com tarifa definida que sobrepõe estas datas.",
      };
    }
    return { error: "Não foi possível guardar o período. Tenta novamente." };
  }

  revalidatePath("/alojamentos/[id]", "layout");
  revalidatePath("/reservas");
  return { success: true };
}

export async function deleteRatePeriod(
  periodId: string,
): Promise<{ error: string } | { success: true }> {
  const denied = await requirePermission("quartos");
  if (denied) return denied;

  const supabase = await createClient();
  const { error } = await supabase
    .from("room_rate_periods")
    .delete()
    .eq("id", periodId);

  if (error) {
    return { error: "Não foi possível remover o período. Tenta novamente." };
  }

  revalidatePath("/alojamentos/[id]", "layout");
  revalidatePath("/reservas");
  return { success: true };
}

// Edição em bloco das exceções de dia. `undefined` num campo significa
// "não mexer", `null` significa "remover a exceção desse campo" — é o que
// permite limpar só o preço e manter a estadia mínima, ou vice-versa.
const BulkDailySchema = z.object({
  roomId: z.string().min(1),
  dates: z
    .array(z.string().min(1))
    .min(1, { error: "Seleciona pelo menos um dia." }),
  nightlyRate: z.union([z.coerce.number().min(0), z.null()]).optional(),
  minStayNights: z
    .union([z.coerce.number().int().min(1).max(365), z.null()])
    .optional(),
});

export type BulkDailyInput = {
  nightlyRate?: number | null;
  minStayNights?: number | null;
};

export async function saveBulkDailyPrices(
  roomId: string,
  dates: string[],
  values: BulkDailyInput,
): Promise<
  { error: string } | { success: true; updated: number; removed: number }
> {
  const denied = await requirePermission("quartos");
  if (denied) return denied;

  const parsed = BulkDailySchema.safeParse({ roomId, dates, ...values });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Verifica os valores indicados.",
    };
  }

  if (values.nightlyRate === undefined && values.minStayNights === undefined) {
    return { error: "Indica um preço ou uma estadia mínima para aplicar." };
  }

  const supabase = await createClient();

  // Precisamos do que já lá está para saber o que fica quando só um dos
  // campos é alterado.
  const { data: existing, error: readError } = await supabase
    .from("room_daily_prices")
    .select("date, nightly_rate, min_stay_nights")
    .eq("room_id", parsed.data.roomId)
    .in("date", parsed.data.dates);

  if (readError) {
    return { error: "Não foi possível ler os preços atuais. Tenta novamente." };
  }

  const atuais = new Map(
    (existing ?? []).map((row) => [row.date as string, row]),
  );

  const paraGravar: {
    room_id: string;
    date: string;
    nightly_rate: number | null;
    min_stay_nights: number | null;
  }[] = [];
  const paraApagar: string[] = [];

  for (const date of parsed.data.dates) {
    const atual = atuais.get(date);
    const nightlyRate =
      values.nightlyRate === undefined
        ? (atual?.nightly_rate ?? null)
        : values.nightlyRate;
    const minStayNights =
      values.minStayNights === undefined
        ? (atual?.min_stay_nights ?? null)
        : values.minStayNights;

    // Sem preço nem estadia mínima a exceção deixa de ter conteúdo — a linha
    // sai, e o dia volta a herdar o período sazonal ou o preço base.
    if (nightlyRate === null && minStayNights === null) {
      if (atual) paraApagar.push(date);
      continue;
    }

    paraGravar.push({
      room_id: parsed.data.roomId,
      date,
      nightly_rate: nightlyRate,
      min_stay_nights: minStayNights,
    });
  }

  if (paraGravar.length > 0) {
    const { error } = await supabase
      .from("room_daily_prices")
      .upsert(paraGravar, { onConflict: "room_id,date" });

    if (error) {
      return { error: "Não foi possível guardar os dias. Tenta novamente." };
    }
  }

  if (paraApagar.length > 0) {
    const { error } = await supabase
      .from("room_daily_prices")
      .delete()
      .eq("room_id", parsed.data.roomId)
      .in("date", paraApagar);

    if (error) {
      return {
        error: "Não foi possível remover as exceções. Tenta novamente.",
      };
    }
  }

  revalidatePath("/alojamentos/[id]", "layout");
  revalidatePath("/reservas");
  return {
    success: true,
    updated: paraGravar.length,
    removed: paraApagar.length,
  };
}

export async function applyMonthlySuggestion(
  roomId: string,
  year: number,
  month: number,
): Promise<{ error: string } | { success: true; updated: number }> {
  const denied = await requirePermission("quartos");
  if (denied) return denied;

  const supabase = await createClient();

  const { data: room } = await supabase
    .from("rooms")
    .select("base_price")
    .eq("id", roomId)
    .maybeSingle();

  if (!room) {
    return { error: "Quarto não encontrado." };
  }

  const [{ data: periods }, { data: dailyPrices }, { data: bookings }] =
    await Promise.all([
      supabase.from("room_rate_periods").select("*").eq("room_id", roomId),
      supabase.from("room_daily_prices").select("*").eq("room_id", roomId),
      supabase
        .from("bookings")
        .select("room_id, check_in, check_out, status")
        .eq("room_id", roomId),
    ]);

  const occupancy = calculateMonthOccupancy(
    bookings ?? [],
    roomId,
    year,
    month,
  );
  const { adjustmentPercent } = suggestPriceAdjustment(occupancy);

  if (adjustmentPercent === 0) {
    return { error: "Não há sugestão de ajuste para este mês." };
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const today = todayISO();
  const existingDates = new Set(
    (dailyPrices ?? [])
      .filter((d) => d.nightly_rate !== null)
      .map((d) => d.date),
  );
  const rows: { room_id: string; date: string; nightly_rate: number }[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = formatISO(year, month - 1, day);
    if (date < today || existingDates.has(date)) continue;
    const current = resolveNightlyRate(
      date,
      room.base_price,
      (periods as RoomRatePeriod[]) ?? [],
    );
    rows.push({
      room_id: roomId,
      date,
      nightly_rate: Math.round(current * (1 + adjustmentPercent)),
    });
  }

  if (rows.length === 0) {
    return { error: "Não há dias futuros por definir este mês." };
  }

  const { error } = await supabase
    .from("room_daily_prices")
    .upsert(rows, { onConflict: "room_id,date" });

  if (error) {
    return { error: "Não foi possível aplicar a sugestão. Tenta novamente." };
  }

  revalidatePath("/alojamentos/[id]", "layout");
  revalidatePath("/reservas");
  return { success: true, updated: rows.length };
}
