import { fetchApi } from '../_http/client';
import {
  Notification,
  NotificationPreference,
  NotificationTemplate,
} from './types';

export const notificationsApi = {
  list: (opts?: { unreadOnly?: boolean }) => {
    const qs = opts?.unreadOnly ? '?unread_only=1' : '';
    return fetchApi<Notification[]>(`/notifications/${qs}`);
  },
  markRead: (id: number) =>
    fetchApi<Notification>(`/notifications/${id}/mark_read/`, { method: 'POST' }),
  dismiss: (id: number) =>
    fetchApi<Notification>(`/notifications/${id}/dismiss/`, { method: 'POST' }),
  dismissAll: () =>
    fetchApi<{ dismissed: number }>('/notifications/dismiss_all/', { method: 'POST' }),

  getPreferences: () =>
    fetchApi<NotificationPreference>('/notifications/preferences/'),
  updatePreferences: (data: Partial<Pick<NotificationPreference, 'email_enabled'>>) =>
    fetchApi<NotificationPreference>('/notifications/preferences/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  listTemplates: () =>
    fetchApi<NotificationTemplate[]>('/notification-templates/'),
  updateTemplate: (
    scope: string,
    data: Partial<Pick<NotificationTemplate, 'email_subject' | 'email_body' | 'whatsapp_text'>>,
  ) =>
    fetchApi<NotificationTemplate>(`/notification-templates/${encodeURIComponent(scope)}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};
