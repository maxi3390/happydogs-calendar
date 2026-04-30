'use client';

import { Stethoscope, Mail, Phone, MapPin } from 'lucide-react';
import { api, Vet } from '@/lib/api';
import { useTranslation } from '@/lib/translations';
import DetailsModal from '@/components/ui/DetailsModal';

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

  return (
    <DetailsModal<Vet>
      titleId="vet-details-popup-title"
      title={t('vet.detailsPopup.title')}
      entityId={vetId}
      fetcher={api.vets.get}
      loadingMessage={t('vet.detailsPopup.loading')}
      loadFailedFallback={t('vet.detailsPopup.loadFailed')}
      // VetDetailsPopup is the only one that always renders ABOVE another base
      // modal (Pet/OwnerDetailsPopup drill into it); pin the layer so it
      // floats above its parent's z-50 backdrop.
      layer="nested"
      onClose={onClose}
      onEdit={onEdit}
      editLabel={t('vet.editVet')}
    >
      {(vet) => {
        const address = renderAddress(vet);
        return (
          <>
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

            {address && (
              <div className="bg-secondary/20 p-3 rounded-xl">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {t('vet.addressSection')}
                </span>
                <p className="text-sm text-foreground mt-1">{address}</p>
              </div>
            )}

            {vet.notes && (
              <div className="bg-secondary/20 p-3 rounded-xl">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  {t('vet.notes')}
                </span>
                <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{vet.notes}</p>
              </div>
            )}
          </>
        );
      }}
    </DetailsModal>
  );
}
