export type NotificationKind =
  | 'vaccination_due'
  | 'pet_arriving_today'
  | 'pet_arriving_tomorrow'
  | 'pet_egress_today'
  | 'pet_egress_tomorrow'
  | 'pet_birthday'
  | 'deworming_internal_due'
  | 'deworming_external_due';

export interface NotificationPet {
  id: number;
  name: string;
}

/** Pre-rendered owner-forwarding payload. ``null`` for internal-only
 * kinds (arrivals / egress). Within the email/whatsapp blocks, ``to`` /
 * ``phone`` are ``null`` when the owner has no email / phone on file —
 * the UI hides the corresponding button in that case. */
export interface NotificationForward {
  email: {
    subject: string;
    body: string;
    to: string | null;
  };
  whatsapp: {
    text: string;
    phone: string | null;
  };
}

export interface Notification {
  id: number;
  kind: NotificationKind;
  pet: NotificationPet;
  event_date: string;
  payload: Record<string, string | number>;
  created_at: string;
  read_at: string | null;
  dismissed_at: string | null;
  forward: NotificationForward | null;
}

export interface NotificationPreference {
  email_enabled: boolean;
  updated_at: string;
}

export type NotificationTemplateScope = 'treatment_due' | 'pet_birthday';

export interface NotificationTemplate {
  scope: NotificationTemplateScope;
  email_subject: string;
  email_body: string;
  whatsapp_text: string;
  updated_at: string;
}
