'use client';

import { useEffect, useRef, useState } from 'react';
import {
  X, Edit2, AlertCircle, Loader2, User, Mail, Phone, CreditCard, MapPin,
  Stethoscope, PawPrint,
} from 'lucide-react';
import { api, OwnerWithPets, Vet } from '@/lib/api';
import { useTranslation } from '@/lib/translations';
import { formatIsoDate } from '@/lib/dateLocale';
import { useFeatureFlag } from '@/lib/feature-flags';
import { Button } from '@/components/ui/Button';
import VetDetailsPopup from '@/components/VetDetailsPopup';
import VetForm from '@/components/VetForm';

interface OwnerDetailsPopupProps {
  ownerId: number;
  /** Invoked on Edit: parent should close the popup and open its OwnerForm in edit mode. */
  onEdit: (owner: OwnerWithPets) => void;
  onClose: () => void;
}

function renderAddress(o: OwnerWithPets): string | null {
  const parts = [o.street, o.city, o.state, o.province, o.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

export default function OwnerDetailsPopup({ ownerId, onEdit, onClose }: OwnerDetailsPopupProps) {
  const { t } = useTranslation();
  const vetManagementEnabled = useFeatureFlag('vet_management');
  const [owner, setOwner] = useState<OwnerWithPets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  // Drill-down: the operator can click the primary or emergency vet line
  // to open the shared VetDetailsPopup on top. We key on the vet id —
  // whichever vet was clicked is the one we fetch.
  const [openVetId, setOpenVetId] = useState<number | null>(null);
  const [editingVet, setEditingVet] = useState<Vet | undefined>();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.owners.get(ownerId)
      .then(data => { if (!cancelled) setOwner(data); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : t('owner.detailsPopup.loadFailed')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ownerId, t]);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    // If the nested vet popup / vet form is open, that inner surface
    // claims Escape so the user backs out one level at a time.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openVetId === null && !editingVet) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, openVetId, editingVet]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const address = owner ? renderAddress(owner) : null;

  return (
    <>
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="owner-details-popup-title"
      className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50"
      onMouseDown={handleBackdropClick}
    >
      <div className="bg-card text-card-foreground rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto styled-scroll">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2
            id="owner-details-popup-title"
            className="text-xl font-semibold text-gray-800 dark:text-gray-100"
          >
            {t('owner.detailsPopup.title')}
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
              <span className="ml-2 text-sm">{t('owner.detailsPopup.loading')}</span>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {owner && !loading && !error && (
            <>
              {/* Header: avatar + name */}
              <div className="flex items-start gap-4">
                {owner.profile_picture_url ? (
                  <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border border-border/50 shadow-sm">
                    <img src={owner.profile_picture_url} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 border border-primary/20 shadow-inner">
                    <span className="text-xl font-bold">
                      {owner.first_name[0]}{owner.last_name[0]}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0 mt-1">
                  <h3 className="text-lg font-bold text-foreground">
                    {owner.first_name} {owner.last_name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      {owner.email}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      {owner.phone}
                    </span>
                  </div>
                </div>
              </div>

              {/* Identification */}
              {(owner.id_number || owner.birth_date) && (
                <div className="bg-secondary/20 p-3 rounded-xl space-y-1">
                  {owner.id_number && (
                    <p className="text-sm text-foreground flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium">{t('owner.idNumber')}:</span> {owner.id_number}
                    </p>
                  )}
                  {owner.birth_date && (
                    <p className="text-sm text-foreground flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium">{t('owner.birthDate')}:</span> {formatIsoDate(owner.birth_date)}
                    </p>
                  )}
                </div>
              )}

              {/* Address */}
              {address && (
                <div className="bg-secondary/20 p-3 rounded-xl">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {t('owner.addressSection')}
                  </span>
                  <p className="text-sm text-foreground mt-1">{address}</p>
                </div>
              )}

              {/* Emergency contact */}
              {(owner.emergency_contact || owner.emergency_phone) && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl space-y-1">
                  <span className="text-[10px] text-amber-600 dark:text-amber-500 uppercase font-bold tracking-wider">
                    {t('owner.emergencyOptional')}
                  </span>
                  <p className="text-sm text-foreground">
                    {owner.emergency_contact}
                    {owner.emergency_phone && ` · ${owner.emergency_phone}`}
                  </p>
                  {owner.emergency_contact_can_pickup && (
                    <p className="text-xs text-muted-foreground italic">
                      {t('owner.emergencyContactCanPickup')}
                    </p>
                  )}
                </div>
              )}

              {/* Veterinary (flag-gated). Each vet line becomes a button
                  that opens the shared VetDetailsPopup. On older cached
                  payloads that lack the nested *_details block, fall back
                  to the legacy `#<id>` placeholder so the UI degrades
                  silently rather than showing a broken click target. */}
              {vetManagementEnabled && (owner.primary_vet || owner.emergency_vet) && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl space-y-1">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Stethoscope className="w-3 h-3" />
                    {t('owner.veterinarySection')}
                  </span>
                  {owner.primary_vet != null && (
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{t('owner.primaryVet')}:</span>{' '}
                      {owner.primary_vet_details ? (
                        <button
                          type="button"
                          onClick={() => setOpenVetId(owner.primary_vet_details!.id)}
                          className="text-foreground hover:text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/50 rounded"
                        >
                          {owner.primary_vet_details.name}
                        </button>
                      ) : (
                        <>#{owner.primary_vet}</>
                      )}
                    </p>
                  )}
                  {owner.emergency_vet != null && (
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{t('owner.emergencyVet')}:</span>{' '}
                      {owner.emergency_vet_details ? (
                        <button
                          type="button"
                          onClick={() => setOpenVetId(owner.emergency_vet_details!.id)}
                          className="text-foreground hover:text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/50 rounded"
                        >
                          {owner.emergency_vet_details.name}
                        </button>
                      ) : (
                        <>#{owner.emergency_vet}</>
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* Pet count */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-semibold border border-primary/20">
                <PawPrint className="w-4 h-4" />
                {owner.pets?.length ?? 0} {t('common.pets')}
              </div>

              {/* Notes */}
              {owner.notes && (
                <div className="bg-secondary/20 p-3 rounded-xl">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    {t('owner.notes')}
                  </span>
                  <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{owner.notes}</p>
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
            onClick={() => owner && onEdit(owner)}
            variant="primary"
            disabled={!owner || loading}
          >
            <Edit2 className="w-4 h-4 mr-1" />
            {t('owner.detailsPopup.editOwner')}
          </Button>
        </div>
      </div>
    </div>

    {/* Nested VetDetailsPopup — rendered as a sibling so it isn't nested
        inside the owner dialog element. Shared between the primary and
        emergency vet lines; the state slot holds whichever vet id the
        operator clicked. Edit handoff swaps the vet popup for the
        existing VetForm without closing this owner popup underneath. */}
    {openVetId !== null && (
      <VetDetailsPopup
        vetId={openVetId}
        onClose={() => setOpenVetId(null)}
        onEdit={(vet) => {
          setOpenVetId(null);
          setEditingVet(vet);
        }}
      />
    )}
    {editingVet && (
      <VetForm
        vet={editingVet}
        onClose={() => setEditingVet(undefined)}
        onSave={() => setEditingVet(undefined)}
      />
    )}
    </>
  );
}
