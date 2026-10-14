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
