export type Envelope<T> = {
  event_id: string;
  event_type: string;
  tenant_id: string;
  timestamp_utc: string;
  source: string;
  version: "1.0";
  payload: T;
};

export type MomentDetected = {
  match_id: string;
  sport: string;
  league: string;
  season_context: {
    tournament: string;
    stage: "league" | "playoffs" | "final";
    must_win: boolean;
    points_pressure: number;
    rivalry: "low" | "med" | "high";
  };
  live_context: {
    clock: string;
    win_probability: number;
    swing: number;
  };
  moment: {
    type: "player_success" | "player_failure" | "team_success" | "team_failure" | "turning_point";
    entity_id: string;
    intensity: number;
    window_sec: number;
  };
};

export type FanActivity = {
  fan_id: string;
  activity_type:
    | "watch_minutes" | "content_complete"
    | "ticket_purchase" | "merch_purchase" | "subscription_purchase"
    | "social_share" | "referral_signup" | "event_attendance";
  idempotency_key: string;
  metadata: Record<string, any>;
};
