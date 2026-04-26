'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useFeatureFlag } from '@/lib/feature-flags';
import { useTranslation } from '@/lib/translations';

const POLL_INTERVAL_MS = 60_000;

/**
 * Lightweight bell icon + unread badge in the navigation bar. Polls the
 * notifications endpoint for unread rows once per minute and links to
 * the full ``/notifications`` page on click.
 *
 * Returns ``null`` when the master notifications flag is off, so the
 * bell only appears on nurseries that have opted in.
 */
export default function NotificationBell() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const enabled = useFeatureFlag('notifications');
  const [unread, setUnread] = useState<number>(0);

  useEffect(() => {
    if (!enabled || !isAuthenticated) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const rows = await api.notifications.list({ unreadOnly: true });
        if (!cancelled) setUnread(rows.length);
      } catch {
        // Silent: bell shows whatever count we last had.
      }
    };
    tick();
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled, isAuthenticated]);

  if (!enabled || !isAuthenticated) return null;

  return (
    <Link
      href="/notifications"
      aria-label={t('notifications.page.title')}
      title={t('notifications.page.title')}
      data-testid="notification-bell"
      data-unread-count={unread}
      className="relative flex items-center justify-center p-2 text-foreground/70 hover:text-foreground hover:bg-secondary/50 rounded-xl transition-colors"
    >
      <Bell className="w-4 h-4" />
      {unread > 0 && (
        <span
          data-testid="notification-bell-badge"
          className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 inline-flex items-center justify-center text-[10px] font-bold rounded-full bg-destructive text-white"
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  );
}
