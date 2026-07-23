export type RoomRules = {
  id: string;
  room_id: string;
  check_in_from: string | null;
  check_in_until: string | null;
  check_out_until: string | null;
  min_age: number | null;
  smoking_allowed: boolean;
  pets_allowed: boolean;
  parties_allowed: boolean;
  quiet_hours_from: string | null;
  quiet_hours_until: string | null;
  house_rules_notes: string | null;
  cancellation_free_until_days: number | null;
  cancellation_refund_percent: number | null;
  cancellation_notes: string | null;
  created_at: string;
  updated_at: string;
};

// Postgres devolve "HH:MM:SS", os inputs <input type="time"> querem "HH:MM".
export function toTimeInputValue(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 5);
}
