export const BOOKING_STATUSES = [
  "pendente",
  "confirmada",
  "em_curso",
  "concluida",
  "cancelada",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pendente: "Pendente",
  confirmada: "Confirmada",
  em_curso: "Em curso",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const BOOKING_STATUS_STYLES: Record<BookingStatus, string> = {
  pendente: "bg-highlight text-highlight-ink",
  confirmada: "bg-surface-2 text-primary",
  em_curso: "bg-action/10 text-action",
  concluida: "bg-success/10 text-success",
  cancelada: "bg-error/10 text-error",
};

export const PAYMENT_METHODS = [
  "dinheiro",
  "cartao",
  "transferencia",
  "mb_way",
  "outro",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  transferencia: "Transferência",
  mb_way: "MB WAY",
  outro: "Outro",
};

export const CHANNEL_SUGGESTIONS = [
  "Direto",
  "Booking.com",
  "Airbnb",
  "Expedia",
] as const;

export type Payment = {
  id: string;
  booking_id: string;
  amount: number;
  method: PaymentMethod;
  paid_at: string;
  notes: string | null;
  created_at: string;
};

export function formatBookingCode(bookingNumber: number): string {
  return `RES-${String(bookingNumber).padStart(4, "0")}`;
}

export type Booking = {
  id: string;
  booking_number: number;
  room_id: string;
  guest_id: string;
  check_in: string;
  check_out: string;
  num_adults: number;
  num_children: number;
  num_infants: number;
  status: BookingStatus;
  total_amount: number;
  channel: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  room?: { name: string } | null;
  guest?: { name: string } | null;
  payments?: Payment[];
};
