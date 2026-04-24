'use client';

import { useEffect, useRef, useState } from 'react';
import {
  X, Edit2, AlertCircle, Loader2, Stethoscope, Mail, Phone, MapPin,
} from 'lucide-react';
import { api, Vet } from '@/lib/api';
import { useTranslation } from '@/lib/translations';
import { Button } from '@/components/ui/Button';

interface VetDetailsPopupProps {
  vetId: number;
  /** Invoked on Edit: parent should close the popup and open its VetForm in edit mode. */
  onEdit: (vet: Vet) => void;
  onClose: () => void;
}

function renderAddress(v: Vet): string | null {
  const parts = [v.street, v.city, v.state, v.province, v.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

export default function VetDetailsPopup({ vetId, onEdit, onClose }: VetDetailsPopupProps) {
  const { t } = useTranslation();
  const [vet, setVet] = useState<Vet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.vets.get(vetId)
      .then(data => { if (!cancelled) setVet(data); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : t('vet.detailsPopup.loadFailed')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [vetId, t]);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const address = vet ? renderAddress(vet) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="vet-details-popup-title"
      className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-[60]"
      onMouseDown={handleBackdropClick}
    >
      <div className="bg-card text-card-foreground rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto styled-scroll">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2
            id="vet-details-popup-title"
            className="text-xl font-semibold text-gray-800 dark:text-gray-100"
          >
            {t('vet.detailsPopup.title')}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="p-2 rounded-xl hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2 text-sm">{t('vet.detailsPopup.loading')}</span>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {vet && !loading && !error && (
            <>
              {/* Header: icon + name */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0 border border-emerald-500/20">
                  <Stethoscope className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0 mt-1">
                  <h3 className="text-lg font-bold text-foreground">{vet.name}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                    {vet.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {vet.phone}
                      </span>
                    )}
                    {vet.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {vet.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Address */}
              {address && (
                <div className="bg-secondary/20 p-3 rounded-xl">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {t('vet.addressSection')}
                  </span>
                  <p className="text-sm text-foreground mt-1">{address}</p>
                </div>
              )}

              {/* Notes */}
              {vet.notes && (
                <div className="bg-secondary/20 p-3 rounded-xl">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    {t('vet.notes')}
                  </span>
                  <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{vet.notes}</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-border">
          <Button onClick={onClose} variant="ghost">
            {t('common.close')}
          </Button>
          <Button
            onClick={() => vet && onEdit(vet)}
            variant="primary"
            disabled={!vet || loading}
          >
            <Edit2 className="w-4 h-4 mr-1" />
            {t('vet.editVet')}
          </Button>
        </div>
      </div>
    </div>
  );
}
