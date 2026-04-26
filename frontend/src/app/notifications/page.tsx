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
              data-testid="mark-all-read"
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              {t('notifications.page.markAllRead')}
            </Button>
            <Button
              variant="secondary"
              onClick={handleDismissAll}
              data-testid="dismiss-all"
            >
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
  const isForwarded = !!notification.forwarded_at;

  return (
    <Card
      className={isUnread ? 'border-primary/40' : ''}
      data-testid="notification-row"
      data-kind={notification.kind}
      data-unread={isUnread ? 'true' : 'false'}
      data-forwarded={isForwarded ? 'true' : 'false'}
    >
      <CardContent className="py-4 flex items-start gap-3">
        <div className={`mt-1 w-2 h-2 rounded-full ${isUnread ? 'bg-primary' : 'bg-transparent'}`} aria-hidden="true" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium">{headline}</p>
            <div className="flex items-center gap-2 whitespace-nowrap">
              {isForwarded && (
                <span
                  data-testid="forwarded-pill"
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                >
                  <Check className="w-3 h-3" />
                  {t('notifications.page.forwardedPill')}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {notification.event_date}
              </span>
            </div>
          </div>

          {notification.forward && (
            <ForwardActions
              notificationId={notification.id}
              forward={notification.forward}
              forwardedAt={notification.forwarded_at}
            />
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
  notificationId: number;
  forward: NonNullable<Notification['forward']>;
  forwardedAt: string | null;
}

function ForwardActions({ notificationId, forward, forwardedAt }: ForwardActionsProps) {
  const { t } = useTranslation();
  const mailto = forward.email.to
    ? `mailto:${encodeURIComponent(forward.email.to)}`
      + `?subject=${encodeURIComponent(forward.email.subject)}`
      + `&body=${encodeURIComponent(forward.email.body)}`
    : null;
  // ``api.whatsapp.com/send`` instead of ``wa.me`` — the latter mangles
  // some emoji glyphs on iOS / older WhatsApp clients; the official
  // click-to-chat endpoint preserves them verbatim.
  const wa = forward.whatsapp.phone
    ? `https://api.whatsapp.com/send`
      + `?phone=${forward.whatsapp.phone.replace(/[^\d]/g, '')}`
      + `&text=${encodeURIComponent(forward.whatsapp.text)}`
    : null;

  // Fire-and-forget tracking on click. Order matters: dispatch the
  // tracking POST first, then let the anchor's default navigation
  // hand control over to the OS / browser. We do NOT await — a slow
  // network must not block the deep-link open. Failures are silent;
  // the user-visible action is still the deep link.
  const trackForward = () => {
    api.notifications.forward(notificationId).catch(() => {});
  };

  const tooltip = forwardedAt
    ? t('notifications.page.alreadyForwardedTooltip', {
        when: new Date(forwardedAt).toLocaleString(),
      })
    : undefined;
  const mutedClass = forwardedAt
    ? 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary/30 hover:bg-secondary/60 rounded-lg transition-colors text-muted-foreground'
    : 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary/50 hover:bg-secondary rounded-lg transition-colors';

  return (
    <div className="flex flex-wrap gap-2">
      {mailto ? (
        <a
          href={mailto}
          data-testid="forward-email"
          title={tooltip}
          onClick={trackForward}
          className={mutedClass}
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
          data-testid="forward-whatsapp"
          target="_blank"
          rel="noopener noreferrer"
          title={tooltip}
          onClick={trackForward}
          className={mutedClass}
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
