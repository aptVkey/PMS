export type IcalFeedRow = {
  id: string;
  room_id: string;
  channel: string;
  feed_url: string;
  is_active: boolean;
  last_synced_at: string | null;
  last_sync_status: "success" | "error" | null;
  last_sync_error: string | null;
  created_count: number;
  updated_count: number;
  cancelled_count: number;
  conflict_count: number;
  created_at: string;
  updated_at: string;
};

// Reserva externa que não coube no calendário (possível overbooking).
export type IcalConflictRow = {
  id: string;
  feed_id: string;
  room_id: string;
  summary: string | null;
  check_in: string;
  check_out: string;
  same_dates: boolean;
  detected_at: string;
  feed: { channel: string } | null;
  room: { name: string } | null;
  blocking: {
    booking_number: number;
    check_in: string;
    check_out: string;
    channel: string | null;
    guest: { name: string } | null;
  } | null;
};
