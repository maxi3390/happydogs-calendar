'use client';

import { useState } from 'react';
import {
  User, Mail, Phone, CreditCard, MapPin, Stethoscope, PawPrint,
} from 'lucide-react';
import { api, OwnerWithPets, Vet } from '@/lib/api';
import { useTranslation } from '@/lib/translations';
import { formatIsoDate } from '@/lib/dateLocale';
import { useFeatureFlag } from '@/lib/feature-flags';
import DetailsModal from '@/components/ui/DetailsModal';
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
  // Drill-down: the operator can click the primary or emergency vet line to
  // open the shared VetDetailsPopup on top. We key on the vet id — whichever
  // vet was clicked is the one we fetch.
  const [openVetId, setOpenVetId] = useState<number | null>(null);
  const [editingVet, setEditingVet] = useState<Vet | undefined>();

  // While the nested vet popup or vet form is open, the inner surface owns the
  // Escape key and backdrop click so the user backs out one level at a time.
  const nestedOpen = openVetId !== null || editingVet !== undefined;

  return (
    <>
      <DetailsModal<OwnerWithPets>
        titleId="owner-details-popup-title"
        title={t('owner.detailsPopup.title')}
        entityId={ownerId}
        fetcher={api.owners.get}
        loadingMessage={t('owner.detailsPopup.loading')}
        loadFailedFallback={t('owner.detailsPopup.loadFailed')}
        inert={nestedOpen}
        onClose={onClose}
        onEdit={onEdit}
        editLabel={t('owner.detailsPopup.editOwner')}
      >
        {(owner) => {
          const address = renderAddress(owner);
          return (
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

              {/* Veterinary (flag-gated). Each vet line becomes a button that
                  opens the shared VetDetailsPopup. On older cached payloads
                  that lack the nested *_details block, fall back to the legacy
                  `#<id>` placeholder so the UI degrades silently rather than
                  showing a broken click target. */}
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
          );
        }}
      </DetailsModal>

      {/* Nested VetDetailsPopup — rendered as a sibling so it isn't nested
          inside the owner dialog element. Shared between the primary and
          emergency vet lines; the state slot holds whichever vet id the
          operator clicked. Edit handoff swaps the vet popup for the existing
          VetForm without closing this owner popup underneath. */}
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
