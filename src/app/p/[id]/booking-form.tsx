"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, X } from "lucide-react";
import type { Room } from "@/lib/rooms";
import type { Booking } from "@/lib/bookings";
import {
  calculateStayTotal,
  type RoomDailyPrice,
  type RoomRatePeriod,
} from "@/lib/pricing";
import { addDaysISO, formatDateLabel } from "@/lib/date-utils";
import { requestDirectBooking, type DirectBookingState } from "./actions";
import { BookingDatePicker } from "./booking-date-picker";

const initialState: DirectBookingState = undefined;

const fieldClasses =
  "w-full bg-transparent text-body text-ink placeholder:text-ink-subdued focus:outline-none";
const microLabel = "text-[10px] font-bold uppercase tracking-wide text-ink";
const contactInput =
  "min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body text-ink placeholder:text-ink-subdued focus:border-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2";

// Só em desktop: passar o rato pelo total mostra a conta num popup, em vez
// de a teres sempre visível a ocupar espaço no cartão. Em mobile não há
// hover — essa versão usa o popup por toque que já existe na barra fixa.
function PriceHoverDetails({
  nights,
  estimate,
  format,
  paymentsEnabled,
}: {
  nights: number;
  estimate: number;
  format: Intl.NumberFormat;
  paymentsEnabled: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative hidden w-fit lg:block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <p className="cursor-default text-body text-ink-muted">
        Total:{" "}
        <span className="font-bold text-ink underline decoration-ink-subdued underline-offset-2">
          {format.format(estimate)}
        </span>
      </p>

      <div
        className={`absolute left-0 top-full z-20 mt-2 w-72 origin-top-left rounded-lg border border-border bg-canvas p-4 shadow-popover transition duration-base ease-standard ${
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-1 scale-95 opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Fechar"
          tabIndex={open ? 0 : -1}
          className="absolute right-3 top-3 rounded-md p-1 text-ink-subdued hover:bg-surface-1"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>

        <p className="pr-6 text-body font-bold text-ink">Detalhes do preço</p>

        <div className="mt-3 flex flex-col gap-2 text-body">
          <div className="flex items-center justify-between text-ink-muted">
            <span>
              {nights} {nights === 1 ? "noite" : "noites"} ×{" "}
              {format.format(estimate / nights)}
            </span>
            <span>{format.format(estimate)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3 font-bold text-ink">
            <span>Total</span>
            <span>{format.format(estimate)}</span>
          </div>
        </div>

        <p className="mt-3 text-[12px] text-ink-subdued">
          {paymentsEnabled
            ? "Pago no momento da reserva."
            : "Ainda não será cobrado."}
        </p>
      </div>
    </div>
  );
}

export function DirectBookingForm({
  propertyId,
  rooms,
  ratePeriods,
  dailyPrices,
  bookings,
  paymentsEnabled,
  fromPrice,
}: {
  propertyId: string;
  rooms: Room[];
  ratePeriods: RoomRatePeriod[];
  dailyPrices: RoomDailyPrice[];
  bookings: Pick<Booking, "room_id" | "check_in" | "check_out">[];
  paymentsEnabled: boolean;
  fromPrice: number | null;
}) {
  const [state, formAction, pending] = useActionState(
    requestDirectBooking,
    initialState,
  );

  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  // O cartão fica compacto até haver datas: os dados de contacto só aparecem
  // no segundo passo, como nos sites de reserva.
  const [step, setStep] = useState<"datas" | "contacto">("datas");
  const [localError, setLocalError] = useState<string | null>(null);
  // Em ecrãs estreitos o formulário vive numa folha de ecrã inteiro, à parte
  // — só a barra com o preço e o CTA ficam sempre visíveis, fixos no fundo.
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  // Tocar no preço da barra abre só a conta — mais leve do que a folha toda,
  // com atalho para mudar as datas ou avançar direto para reservar.
  const [priceDetailsOpen, setPriceDetailsOpen] = useState(false);

  const room = rooms.find((r) => r.id === roomId);

  // Cada noite ocupada por uma reserva ativa deste quarto, para o calendário
  // as bloquear como o da Airbnb. A noite do checkout não entra: é aí que
  // pode começar a estadia seguinte.
  const occupiedDates = useMemo(() => {
    const set = new Set<string>();
    for (const booking of bookings) {
      if (booking.room_id !== roomId) continue;
      let cursor = booking.check_in;
      while (cursor < booking.check_out) {
        set.add(cursor);
        cursor = addDaysISO(cursor, 1);
      }
    }
    return set;
  }, [bookings, roomId]);

  const isSuccess = Boolean(state && "success" in state);
  const checkoutUrl =
    state && "success" in state ? state.checkoutUrl : undefined;

  useEffect(() => {
    if (checkoutUrl) window.location.href = checkoutUrl;
  }, [checkoutUrl]);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut || checkOut <= checkIn) return 0;
    return Math.round(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000,
    );
  }, [checkIn, checkOut]);

  // Estimativa para o visitante ver antes de submeter. O valor que conta é o
  // que o servidor recalcula — este é só indicativo.
  const estimate = useMemo(() => {
    if (!room || nights === 0) return 0;
    return calculateStayTotal(
      checkIn,
      checkOut,
      room.base_price,
      ratePeriods.filter((p) => p.room_id === room.id),
      dailyPrices.filter((d) => d.room_id === room.id),
    );
  }, [room, checkIn, checkOut, nights, ratePeriods, dailyPrices]);

  const currency = room?.currency ?? "EUR";
  const format = useMemo(
    () =>
      new Intl.NumberFormat("pt-PT", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }),
    [currency],
  );

  const maxGuests = room
    ? room.capacity_adults + room.capacity_children
    : undefined;

  function goToContact() {
    if (nights === 0) {
      setLocalError("Escolhe as datas de chegada e partida.");
      return;
    }
    setLocalError(null);
    setStep("contacto");
  }

  // Reaparece em cima do botão nos dois passos: o CTA fica sempre por
  // último, com a conta a fechar mesmo antes dele. Só em mobile — em
  // desktop a mesma conta já está disponível ao passar o rato pelo total.
  const priceBreakdown =
    nights > 0 ? (
      <div className="flex flex-col gap-2 border-t border-border pt-4 text-body lg:hidden">
        <div className="flex items-center justify-between text-ink-muted">
          <span className="underline">
            {format.format(estimate / nights)} × {nights}{" "}
            {nights === 1 ? "noite" : "noites"}
          </span>
          <span>{format.format(estimate)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3 font-bold text-ink">
          <span>Total</span>
          <span>{format.format(estimate)}</span>
        </div>
      </div>
    ) : null;

  return (
    <>
      {/* Barra fixa no fundo do ecrã — só em mobile. É o que fica sempre à
          vista sem ocupar o espaço todo, como nos sites de reserva. */}
      {!isSuccess && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t border-border bg-canvas p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-elevated lg:hidden">
          {nights > 0 ? (
            <button
              type="button"
              onClick={() => setPriceDetailsOpen(true)}
              className="min-w-0 text-left"
            >
              <p className="text-body font-bold text-ink underline decoration-ink-subdued underline-offset-2">
                {format.format(estimate)}{" "}
                <span className="font-normal text-ink-muted no-underline">
                  total
                </span>
              </p>
              <p className="text-[12px] text-ink-subdued">
                {nights} {nights === 1 ? "noite" : "noites"}
              </p>
            </button>
          ) : (
            // Sem datas o preço-base ainda não é o preço real da estadia —
            // varia por época. Mais honesto mostrar "?" do que sugerir um
            // valor que pode não se confirmar.
            <div className="min-w-0">
              <p className="text-body font-bold text-ink">
                <span aria-hidden="true">?</span>
                <span className="sr-only">Preço por definir</span>{" "}
                <span className="font-normal text-ink-muted">/ noite</span>
              </p>
              <p className="text-[12px] text-ink-subdued">Escolhe as datas</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setStep("datas");
              setMobileSheetOpen(true);
            }}
            className="min-h-12 shrink-0 rounded-full bg-action px-6 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover"
          >
            {nights > 0 ? "Reservar" : "Selecionar datas"}
          </button>
        </div>
      )}

      {/* Popup de detalhes do preço — abre ao tocar no total da barra. Mais
          leve do que a folha inteira: só a conta, as datas e um atalho para
          as alterar ou avançar direto para reservar. */}
      {nights > 0 && (
        <div
          // Fica sempre montado (mesmo fechado) para o fecho poder animar
          // também — com montagem condicional, o "hidden" corta a transição
          // a meio.
          aria-hidden={!priceDetailsOpen}
          className={`fixed inset-0 z-50 lg:hidden ${priceDetailsOpen ? "" : "pointer-events-none"}`}
        >
          <button
            type="button"
            aria-label="Fechar"
            tabIndex={priceDetailsOpen ? 0 : -1}
            onClick={() => setPriceDetailsOpen(false)}
            className={`absolute inset-0 bg-black/40 transition-opacity duration-base ease-standard ${
              priceDetailsOpen ? "opacity-100" : "opacity-0"
            }`}
          />
          <div
            className={`absolute inset-x-0 bottom-0 flex flex-col gap-5 rounded-t-2xl bg-canvas p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-elevated transition-transform duration-base ease-standard ${
              priceDetailsOpen ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[18px] font-bold text-ink">
                Detalhes do preço
              </p>
              <button
                type="button"
                onClick={() => setPriceDetailsOpen(false)}
                aria-label="Fechar"
                className="rounded-md p-1 text-ink-subdued hover:bg-surface-1"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>

            <div className="flex flex-col gap-2 text-body">
              <div className="flex items-center justify-between text-ink-muted">
                <span>
                  {format.format(estimate / nights)} × {nights}{" "}
                  {nights === 1 ? "noite" : "noites"}
                </span>
                <span>{format.format(estimate)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3 text-[16px] font-bold text-ink">
                <span>Total</span>
                <span>{format.format(estimate)}</span>
              </div>
              <p className="text-[12px] text-ink-subdued">
                {paymentsEnabled
                  ? "Pago no momento da reserva."
                  : "Ainda não será cobrado."}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
              <div className="min-w-0">
                <p className="text-body font-semibold text-ink">Datas</p>
                <p className="truncate text-[13px] text-ink-subdued">
                  {formatDateLabel(checkIn)} – {formatDateLabel(checkOut)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPriceDetailsOpen(false);
                  setLocalError(null);
                  setStep("datas");
                  setMobileSheetOpen(true);
                }}
                className="min-h-9 shrink-0 rounded-md border border-border px-3 text-[13px] font-semibold text-ink transition-colors duration-fast ease-standard hover:bg-surface-1"
              >
                Alterar
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setPriceDetailsOpen(false);
                goToContact();
                setMobileSheetOpen(true);
              }}
              className="min-h-12 rounded-full bg-action px-6 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover"
            >
              {paymentsEnabled ? "Reservar" : "Pedir reserva"}
            </button>
          </div>
        </div>
      )}

      {/* Em mobile isto é uma folha de ecrã inteiro que só aparece ao tocar
          na barra, deslizando de baixo para cima; em lg: volta a ser o
          cartão fixo do costume, sempre visível e sem transformação. Fica
          sempre montada (não "hidden") para o fecho também poder animar. */}
      <div
        aria-hidden={!mobileSheetOpen}
        className={`fixed inset-0 z-50 flex flex-col gap-4 overflow-y-auto bg-canvas p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] transition-transform duration-base ease-standard ${
          mobileSheetOpen
            ? "translate-y-0"
            : "translate-y-full pointer-events-none"
        } lg:static lg:z-auto lg:translate-y-0 lg:overflow-visible lg:rounded-lg lg:border lg:border-border lg:p-6 lg:shadow-elevated lg:pointer-events-auto`}
      >
        <div className="flex items-center justify-between lg:hidden">
          <p className="text-body font-bold text-ink">Reservar</p>
          <button
            type="button"
            onClick={() => setMobileSheetOpen(false)}
            aria-label="Fechar"
            className="rounded-md p-1 text-ink-subdued hover:bg-surface-1"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {state && "success" in state ? (
          checkoutUrl ? (
            <p className="text-body font-semibold text-ink">
              A encaminhar para o pagamento seguro...
            </p>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-success bg-success/5 p-8 text-center">
              <CheckCircle2
                className="h-9 w-9 text-success"
                strokeWidth={1.5}
              />
              <p className="text-[18px] font-bold text-ink">Pedido enviado</p>
              <p className="text-body text-ink-muted">
                Recebemos o teu pedido de {state.nights}{" "}
                {state.nights === 1 ? "noite" : "noites"}, no valor de{" "}
                <strong className="text-ink">
                  {new Intl.NumberFormat("pt-PT", {
                    style: "currency",
                    currency: state.currency,
                  }).format(state.total)}
                </strong>
                . A reserva fica pendente até ser confirmada, e o anfitrião
                entra em contacto contigo.
              </p>
            </div>
          )
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="propertyId" value={propertyId} />
            <input type="hidden" name="roomId" value={roomId} />
            <input type="hidden" name="numAdults" value={guests} />
            <input type="hidden" name="numChildren" value={0} />
            <input type="hidden" name="numInfants" value={0} />

            {nights > 0 ? (
              <>
                {/* Mobile: texto simples — a conta já está sempre visível
                    mais abaixo, e o toque na barra fixa abre os detalhes. */}
                <p className="text-body text-ink-muted lg:hidden">
                  <span className="text-[22px] font-bold text-ink">
                    {format.format(estimate)}
                  </span>{" "}
                  total
                </p>
                {/* Desktop: gatilho de hover em vez de texto simples. */}
                <PriceHoverDetails
                  nights={nights}
                  estimate={estimate}
                  format={format}
                  paymentsEnabled={paymentsEnabled}
                />
              </>
            ) : fromPrice ? (
              <p className="text-body text-ink-muted">
                <span className="text-[22px] font-bold text-ink">
                  {format.format(fromPrice)}
                </span>{" "}
                por noite
              </p>
            ) : (
              <p className="text-body text-ink-muted">
                <span className="text-[18px] font-bold text-ink">
                  Adiciona datas para ver o preço
                </span>
              </p>
            )}

            {step === "datas" ? (
              <>
                <div className="rounded-md border border-border">
                  <BookingDatePicker
                    checkIn={checkIn}
                    checkOut={checkOut}
                    onChange={(nextCheckIn, nextCheckOut) => {
                      setCheckIn(nextCheckIn);
                      setCheckOut(nextCheckOut);
                    }}
                    occupiedDates={occupiedDates}
                  />

                  <label className="flex cursor-pointer flex-col gap-0.5 border-t border-border px-3 py-2">
                    <span className={microLabel}>Hóspedes</span>
                    <select
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value))}
                      className={fieldClasses}
                    >
                      {Array.from(
                        { length: maxGuests ?? 8 },
                        (_, i) => i + 1,
                      ).map((n) => (
                        <option key={n} value={n}>
                          {n} {n === 1 ? "hóspede" : "hóspedes"}
                        </option>
                      ))}
                    </select>
                  </label>

                  {rooms.length > 1 && (
                    <label className="flex cursor-pointer flex-col gap-0.5 border-t border-border px-3 py-2">
                      <span className={microLabel}>Unidade</span>
                      <select
                        value={roomId}
                        onChange={(e) => {
                          // A ocupação é por quarto — as datas escolhidas
                          // podem já não ser válidas para a unidade
                          // recém-selecionada.
                          setRoomId(e.target.value);
                          setCheckIn("");
                          setCheckOut("");
                        }}
                        className={fieldClasses}
                      >
                        {rooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>

                {localError && (
                  <p aria-live="polite" className="text-body text-error">
                    {localError}
                  </p>
                )}

                {priceBreakdown}

                <button
                  type="button"
                  onClick={goToContact}
                  className="min-h-12 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover"
                >
                  {paymentsEnabled ? "Reservar" : "Pedir reserva"}
                </button>

                <p className="text-center text-[13px] text-ink-subdued">
                  Ainda não será cobrado
                </p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep("datas")}
                  className="flex w-fit items-center gap-1.5 text-[13px] font-semibold text-ink-muted hover:text-ink"
                >
                  <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
                  Alterar datas
                </button>

                <input type="hidden" name="checkIn" value={checkIn} />
                <input type="hidden" name="checkOut" value={checkOut} />

                <div className="flex flex-col gap-3">
                  <input
                    name="name"
                    required
                    placeholder="Nome completo"
                    className={contactInput}
                  />
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="Email"
                    className={contactInput}
                  />
                  <input
                    name="phone"
                    placeholder="Telefone (opcional)"
                    className={contactInput}
                  />
                  <textarea
                    name="notes"
                    rows={2}
                    placeholder="Mensagem para o anfitrião (opcional)"
                    className={`${contactInput} min-h-0 py-2`}
                  />
                </div>

                {state && "error" in state && (
                  <p aria-live="polite" className="text-body text-error">
                    {state.error}
                  </p>
                )}

                {priceBreakdown}

                <button
                  type="submit"
                  disabled={pending}
                  className="min-h-12 rounded-md bg-action px-4 text-body font-semibold text-on-primary transition-colors duration-fast ease-standard hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending
                    ? "A processar..."
                    : paymentsEnabled
                      ? "Confirmar e pagar"
                      : "Enviar pedido"}
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </>
  );
}
