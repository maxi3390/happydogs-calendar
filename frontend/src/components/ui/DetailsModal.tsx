'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Edit2, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/translations';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

export interface DetailsModalProps<T> {
  /** Stable id wired to ``aria-labelledby`` on the dialog. */
  titleId: string;
  /** Header text (already translated). */
  title: string;
  /** Identifier passed to ``fetcher`` and used as the fetch dependency. */
  entityId: number;
  /** Fetcher invoked on mount / when ``entityId`` changes. */
  fetcher: (id: number) => Promise<T>;
  /** Optional override for the loading body. Falls back to a generic spinner. */
  loadingMessage?: string;
  /** Fallback error message used when the fetcher throws a non-Error. */
  loadFailedFallback: string;
  /** When true, Escape and backdrop click are ignored. Consumers flip this when
   * a nested modal is owning the input. */
  inert?: boolean;
  /** Stacking tier — see ``Modal.tsx``. */
  layer?: 'base' | 'nested';
  onClose: () => void;
  /** Edit handler. When provided, an Edit button is rendered in the footer and
   * receives the loaded entity. */
  onEdit?: (data: T) => void;
  /** Edit button label (already translated). Required when ``onEdit`` is set. */
  editLabel?: string;
  /** Render-prop receiving the loaded entity. */
  children: (data: T) => React.ReactNode;
}

/**
 * Read-only details popup: fetches an entity by id and renders the body via a
 * render-prop, with a standard Close / Edit footer. The shell + focus
 * management live in ``Modal``; this layer adds the data-fetch lifecycle that
 * Pet/Owner/Vet popups all reimplemented identically.
 */
export default function DetailsModal<T>({
  titleId,
  title,
  entityId,
  fetcher,
  loadingMessage,
  loadFailedFallback,
  inert,
  layer,
  onClose,
  onEdit,
  editLabel,
  children,
}: DetailsModalProps<T>) {
  const { t } = useTranslation();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher(entityId)
      .then(result => { if (!cancelled) setData(result); })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : loadFailedFallback);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [entityId, fetcher, loadFailedFallback]);

  return (
    <Modal
      titleId={titleId}
      title={title}
      inert={inert}
      layer={layer}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} variant="ghost">
            {t('common.close')}
          </Button>
          {onEdit && (
            <Button
              onClick={() => data && onEdit(data)}
              variant="primary"
              disabled={!data || loading}
            >
              <Edit2 className="w-4 h-4 mr-1" />
              {editLabel}
            </Button>
          )}
        </>
      }
    >
      {loading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2 text-sm">{loadingMessage ?? t('common.loading')}</span>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {data && !loading && !error && children(data)}
    </Modal>
  );
}
