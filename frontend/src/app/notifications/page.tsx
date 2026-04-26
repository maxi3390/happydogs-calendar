'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, Check, CheckCheck, Mail, MessageCircle, Trash2, X } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useTranslation } from '@/lib/translations';
import { withAuth } from '@/lib/withAuth';
import { useFeatureFlag } from '@/lib/feature-flags';
import { api } from '@/lib/api';
import { Notification, NotificationKind } from '@/domain/notifications/types';

function NotificationsPage() {
  const { t } = useTranslation();
  const enabled = useFeatureFlag('notifications');
  const [rows, setRows] = useState<Notification[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api.notifications.list({ unreadOnly }));
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload]);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => (a.event_date < b.event_date ? 1 : -1)),
    [rows],
  );

  const handleMarkRead = async (n: Notification) => {
    await api.notifications.markRead(n.id);
    reload();
  };
  const handleDismiss = async (n: Notification) => {
    await api.notifications.dismiss(n.id);
    reload();
  };
  const handleMarkAllRead = async () => {
    await api.notifications.markAllRead();
    reload();
  };
  const handleDismissAll = async () => {
    await api.notifications.dismissAll();
    reload();
  };

  const hasUnread = rows.some(r => !r.read_at);

  if (!enabled) {
    return (
      <>
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {t('featureFlags.empty')}
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6" />
            {t('notifications.page.title')}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={unreadOnly ? 'primary' : 'secondary'}
              onClick={() => setUnreadOnly(v => !v)}
            >
              {t('notifications.page.filterUnread')}
            </Button>
            <Button
              variant="secondary"
              onClick={handleMarkAllRead}
              disabled={!hasUnread}
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              {t('notifications.page.markAllRead')}
            </Button>
            <Button variant="secondary" onClick={handleDismissAll}>
              <Trash2 className="w-4 h-4 mr-1" />
              {t('notifications.page.dismissAll')}
            </Button>
          </div>
        </div>

        {loading && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              ...
            </CardContent>
          </Card>
        )}

        {!loading && sorted.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {t('notifications.page.empty')}
            </CardContent>
          </Card>
        )}

        {!loading && sorted.map(n => (
          <NotificationRow
            key={n.id}
            notification={n}
            onMarkRead={() => handleMarkRead(n)}
            onDismiss={() => handleDismiss(n)}
          />
        ))}
      </main>
    </>
  );
}

interface RowProps {
  notification: Notification;
  onMarkRead: () => void;
  onDismiss: () => void;
}

function NotificationRow({ notification, onMarkRead, onDismiss }: RowProps) {
  const { t } = useTranslation();
  const headline = renderKind(t, notification.kind, notification.payload);
  const isUnread = !notification.read_at;

  return (
    <Card className={isUnread ? 'border-primary/40' : ''}>
      <CardContent className="py-4 flex items-start gap-3">
        <div className={`mt-1 w-2 h-2 rounded-full ${isUnread ? 'bg-primary' : 'bg-transparent'}`} aria-hidden="true" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium">{headline}</p>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {notification.event_date}
            </span>
          </div>

          {notification.forward && (
            <ForwardActions forward={notification.forward} />
          )}
        </div>
        <div className="flex flex-col gap-1">
          {isUnread && (
            <button
              type="button"
              onClick={onMarkRead}
              aria-label="mark read"
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            aria-label="dismiss"
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

interface ForwardActionsProps {
  forward: NonNullable<Notification['forward']>;
}

function ForwardActions({ forward }: ForwardActionsProps) {
  const { t } = useTranslation();
  const mailto = forward.email.to
    ? `mailto:${encodeURIComponent(forward.email.to)}`
      + `?subject=${encodeURIComponent(forward.email.subject)}`
      + `&body=${encodeURIComponent(forward.email.body)}`
    : null;
  const wa = forward.whatsapp.phone
    ? `https://wa.me/${forward.whatsapp.phone.replace(/[^\d]/g, '')}`
      + `?text=${encodeURIComponent(forward.whatsapp.text)}`
    : null;

  return (
    <div className="flex flex-wrap gap-2">
      {mailto ? (
        <a
          href={mailto}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary/50 hover:bg-secondary rounded-lg transition-colors"
        >
          <Mail className="w-3.5 h-3.5" />
          {t('notifications.page.forwardEmail')}
        </a>
      ) : (
        <span className="text-xs text-muted-foreground">{t('notifications.page.noOwnerEmail')}</span>
      )}
      {wa ? (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary/50 hover:bg-secondary rounded-lg transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          {t('notifications.page.forwardWhatsApp')}
        </a>
      ) : (
        <span className="text-xs text-muted-foreground">{t('notifications.page.noOwnerPhone')}</span>
      )}
    </div>
  );
}

/** Renders a localised one-liner for the notification's kind, falling
 * back to the kind itself if a translation is missing. The translation
 * lookup goes through the regular ``t()`` so payload placeholders
 * ({pet_name}, {age_years}, …) are substituted. */
function renderKind(
  t: (key: string, vars?: Record<string, string | number>) => string,
  kind: NotificationKind,
  payload: Record<string, string | number>,
): string {
  return t(`notifications.kind.${kind}`, payload);
}

export default withAuth(NotificationsPage);
