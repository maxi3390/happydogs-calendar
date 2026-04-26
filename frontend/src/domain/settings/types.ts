export interface NurserySetting {
  daily_booking_limit: number;
  logo_url: string | null;
  notifications_run_time: string;
  deworming_default_due_days: number;
  notifications_vaccination_enabled: boolean;
  notifications_arrivals_enabled: boolean;
  notifications_egress_enabled: boolean;
  notifications_birthdays_enabled: boolean;
  notifications_deworming_enabled: boolean;
  notification_recipient_lookback_days: number;
  updated_at: string;
}
