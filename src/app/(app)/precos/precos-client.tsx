"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  BedDouble,
  CalendarRange,
  Coins,
  Pencil,
  Plus,
  Tag,
  Trash2,
} from "lucide-react";
import { saveBaseRate, type PricingFormState } from "./actions";
import { RatePeriodFormModal } from "./rate-period-form-modal";
import { ConfirmDeletePeriodModal } from "./confirm-delete-period-modal";
import { PriceCalendar } from "./price-calendar";
import { PriceSuggestions } from "./price-suggestions";
import type { Room } from "@/lib/rooms";
import {
  resolveNightlyRate,
  type RoomDailyPrice,
  type RoomRatePeriod,
} from "@/lib/pricing";
import type { Booking } from "@/lib/bookings";
import { formatDateLabel, todayISO } from "@/lib/date-utils";

const initialState: PricingFormState = undefined;

const inputClasses =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";
const labelClasses = "text-body font-semibold text-ink";
const sectionClasses =
  "flex flex-col gap-5 rounded-lg border border-border bg-canvas p-5 shadow-card";

function SavedIndicator() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timeout);
  }, []);

  if (!visible) return null;
  return (
    <p aria-live="polite" className="text-body font-semibold text-success">
      Alterações guardadas
    </p>
  );
}

// O preço que serve de base a tudo o resto. No rodapé mostra-se o que daí
// resulta para hoje — a definição e o seu efeito no mesmo cartão.
function BaseRateForm({
  room,
  periods,
  dailyPrices,
}: {
  room: Room;
  periods: RoomRatePeriod[];
  dailyPrices: RoomDailyPrice[];
}) {
  const [state, formAction, pending] = useActionState(
    saveBaseRate,
    initialState,
  );

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("pt-PT", {
        style: "currency",
        currency: room.currency,
      }),
    [room.currency],
  );

  const hasBasePrice = room.base_price > 0;
  const todayRate = useMemo(
    () => resolveNightlyRate(todayISO(), room.base_price, periods, dailyPrices),
    [room.base_price, periods, dailyPrices],
  );

  return (
    <form action={formAction} className={sectionClasses}>
      <input type="hidden" name="roomId" value={room.id} />

      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-primary">
          <Tag className="h-4 w-4" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <p className="text-body font-bold text-ink">Preço base</p>
          <p className="text-[12px] text-ink-subdued">
            Usado quando não há período sazonal nem preço de dia.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="basePrice" className={labelClasses}>
            Preço por noite ({room.currency})
          </label>
          <input
            id="basePrice"
            name="basePrice"
            type="number"
            min={0}
            step="0.01"
            defaultValue={room.base_price || ""}
            placeholder="Ex: 200"
            className={inputClasses}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="minStayNights" className={labelClasses}>
            Estadia mínima (noites)
          </label>
          <input
            id="minStayNights"
            name="minStayNights"
            type="number"
            min={1}
            max={365}
            defaultValue={room.min_stay_nights ?? ""}
            placeholder="Opcional"
            className={inputClasses}
          />
        </div>
      </div>

      {state && "error" in state && (
        <p aria-live="polite" className="text-body text-error">
          {state.error}
        </p>
      )}

      {/* Rodapé: o valor que resulta à esquerda, a ação à direita. O mt-auto
          encosta-o ao fundo para alinhar com o cartão ao lado. */}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-primary">
            <Coins className="h-4 w-4" strokeWidth={2} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-subdued">
              Preço hoje
            </p>
            <p
              className={`text-[24px] font-bold leading-tight ${hasBasePrice ? "text-ink" : "text-ink-subdued"}`}
            >
              {hasBasePrice ? currencyFormatter.format(todayRate) : "—"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!pending && state && "success" in state && <SavedIndicator />}
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "A guardar..." : "Guardar"}
          </button>
        </div>
      </div>
    </form>
  );
}

function RateChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-md bg-surface-1 px-2 py-1 text-[12px] text-ink-subdued">
      {label} <span className="font-bold text-ink">{value}</span>
    </span>
  );
}

function SeasonalPeriods({
  room,
  periods,
}: {
  room: Room;
  periods: RoomRatePeriod[];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<
    RoomRatePeriod | undefined
  >(undefined);
  const [deletingPeriod, setDeletingPeriod] = useState<RoomRatePeriod | null>(
    null,
  );

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("pt-PT", {
        style: "currency",
        currency: room.currency,
      }),
    [room.currency],
  );

  function openCreateModal() {
    setEditingPeriod(undefined);
    setModalOpen(true);
  }

  function openEditModal(period: RoomRatePeriod) {
    setEditingPeriod(period);
    setModalOpen(true);
  }

  return (
    <div className={sectionClasses}>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-primary">
          <CalendarRange className="h-4 w-4" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <p className="text-body font-bold text-ink">Períodos sazonais</p>
          <p className="text-[12px] text-ink-subdued">
            Tarifas diferentes para datas específicas, como época alta.
          </p>
        </div>
      </div>

      {periods.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border px-4 py-8 text-center">
          <CalendarRange
            className="h-7 w-7 text-ink-subdued"
            strokeWidth={1.5}
          />
          <p className="text-[12px] text-ink-subdued">
            Sem períodos definidos. Todas as datas usam o preço base.
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-md border border-border">
          {periods.map((period) => {
            const sameRateAllWeek =
              period.sunday_rate === period.weekday_rate &&
              period.weekday_rate === period.weekend_rate;

            return (
              <div key={period.id} className="flex flex-col gap-2.5 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-body font-semibold text-ink">
                      {period.label}
                    </p>
                    <p className="text-[12px] text-ink-subdued">
                      {formatDateLabel(period.start_date)} —{" "}
                      {formatDateLabel(period.end_date)}
                      {period.min_stay_nights
                        ? ` · Mínimo ${period.min_stay_nights} noites`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(period)}
                      aria-label="Editar período"
                      className="flex h-9 w-9 items-center justify-center rounded-md text-ink-subdued transition-colors duration-fast ease-standard hover:bg-surface-1 hover:text-ink"
                    >
                      <Pencil className="h-4 w-4" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingPeriod(period)}
                      aria-label="Eliminar período"
                      className="flex h-9 w-9 items-center justify-center rounded-md text-ink-subdued transition-colors duration-fast ease-standard hover:bg-error/10 hover:text-error"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>
                </div>

                {sameRateAllWeek ? (
                  <p className="text-body font-bold text-ink">
                    {currencyFormatter.format(period.weekday_rate)}
                    <span className="ml-1 text-[12px] font-normal text-ink-subdued">
                      /noite todos os dias
                    </span>
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    <RateChip
                      label="Dom"
                      value={currencyFormatter.format(period.sunday_rate)}
                    />
                    <RateChip
                      label="Seg-Qui"
                      value={currencyFormatter.format(period.weekday_rate)}
                    />
                    <RateChip
                      label="Sex-Sáb"
                      value={currencyFormatter.format(period.weekend_rate)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={openCreateModal}
        className="mt-auto flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-canvas text-body font-semibold text-ink transition-colors duration-fast ease-standard hover:bg-surface-1"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        Novo período
      </button>

      {modalOpen && (
        <RatePeriodFormModal
          roomId={room.id}
          currency={room.currency}
          period={editingPeriod}
          onClose={() => setModalOpen(false)}
        />
      )}

      {deletingPeriod && (
        <ConfirmDeletePeriodModal
          period={deletingPeriod}
          onClose={() => setDeletingPeriod(null)}
        />
      )}
    </div>
  );
}

export function PrecosClient({
  rooms,
  periods,
  dailyPrices,
  bookings,
  hideHeader = false,
}: {
  rooms: Room[];
  periods: RoomRatePeriod[];
  dailyPrices: RoomDailyPrice[];
  bookings: Pick<Booking, "room_id" | "check_in" | "check_out" | "status">[];
  hideHeader?: boolean;
}) {
  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.id ?? "");

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId],
  );

  const selectedRoomPeriods = useMemo(
    () => periods.filter((p) => p.room_id === selectedRoomId),
    [periods, selectedRoomId],
  );

  const selectedRoomDailyPrices = useMemo(
    () => dailyPrices.filter((d) => d.room_id === selectedRoomId),
    [dailyPrices, selectedRoomId],
  );

  return (
    <div className="flex flex-col gap-6">
      {hideHeader ? (
        rooms.length > 0 &&
        selectedRoom && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-1 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <BedDouble
                className="h-4 w-4 shrink-0 text-ink-muted"
                strokeWidth={2}
              />
              <label
                htmlFor="roomSelect"
                className="text-body font-semibold text-ink"
              >
                Quarto
              </label>
              <select
                id="roomSelect"
                aria-label="Quarto"
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className={`${inputClasses} sm:min-w-[200px]`}
              >
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-bold text-ink">Preços e tarifas</h1>
            <p className="mt-1 max-w-xl text-body text-ink-muted">
              Define o preço base e tarifas sazonais para cada quarto. As
              reservas usam automaticamente a tarifa correta para as datas
              escolhidas.
            </p>
          </div>

          {rooms.length > 0 && selectedRoom && (
            <select
              aria-label="Quarto"
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className={`${inputClasses} sm:min-w-[220px]`}
            >
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {rooms.length === 0 || !selectedRoom ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-canvas py-16 text-center">
          <BedDouble className="h-8 w-8 text-ink-subdued" strokeWidth={1.5} />
          <p className="text-body font-semibold text-ink">
            Ainda não tens quartos
          </p>
          <p className="max-w-sm text-body text-ink-subdued">
            Adiciona quartos em Alojamentos para definires os preços de cada um.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <BaseRateForm
              key={selectedRoom.id}
              room={selectedRoom}
              periods={selectedRoomPeriods}
              dailyPrices={selectedRoomDailyPrices}
            />

            <SeasonalPeriods
              room={selectedRoom}
              periods={selectedRoomPeriods}
            />
          </div>

          <PriceCalendar
            room={selectedRoom}
            periods={selectedRoomPeriods}
            dailyPrices={selectedRoomDailyPrices}
          />

          <PriceSuggestions room={selectedRoom} bookings={bookings} />
        </div>
      )}
    </div>
  );
}
