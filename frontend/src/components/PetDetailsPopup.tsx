'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Edit2, AlertCircle, Loader2, Dog, Cat, Bird, Rabbit, HelpCircle, Stethoscope } from 'lucide-react';
import { api, Pet, Vet } from '@/lib/api';
import { useTranslation } from '@/lib/translations';
import { useFeatureFlag } from '@/lib/feature-flags';
import { formatIsoDate } from '@/lib/dateLocale';
import { translateSpecies } from '@/domain/pets/labels';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import VetDetailsPopup from '@/components/VetDetailsPopup';
import VetForm from '@/components/VetForm';

interface PetDetailsPopupProps {
  petId: number;
  /** Invoked on Edit: parent should close the popup and open its PetForm in edit mode. */
  onEdit: (pet: Pet) => void;
  onClose: () => void;
}

const speciesIcons: Record<string, React.ReactNode> = {
  dog: <Dog className="w-6 h-6" />,
  cat: <Cat className="w-6 h-6" />,
  bird: <Bird className="w-6 h-6" />,
  rabbit: <Rabbit className="w-6 h-6" />,
  other: <HelpCircle className="w-6 h-6" />,
};

const temperamentColors: Record<string, string> = {
  calm: 'bg-blue-100 text-blue-800',
  playful: 'bg-green-100 text-green-800',
  aggressive: 'bg-red-100 text-red-800',
  anxious: 'bg-purple-100 text-purple-800',
  friendly: 'bg-emerald-100 text-emerald-800',
};

function formatWeight(weight: number | null | undefined): string | null {
  if (weight === null || weight === undefined) return null;
  // Mirror the WeightInput display format (padStart to NN.NN).
  const s = weight.toFixed(2);
  const [intPart, decPart] = s.split('.');
  return `${intPart.padStart(2, '0')}.${decPart} kg`;
}

export default function PetDetailsPopup({ petId, onEdit, onClose }: PetDetailsPopupProps) {
  const { t } = useTranslation();
  const vetManagementEnabled = useFeatureFlag('vet_management');
  const dewormingTrackingEnabled = useFeatureFlag('deworming_tracking');
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  // Drill-down: show the overridden vet on top of this popup. The nested
  // popup is owned by THIS component so the enclosing page doesn't need
  // to know about the vet drill-down.
  const [openVetId, setOpenVetId] = useState<number | null>(null);
  const [editingVet, setEditingVet] = useState<Vet | undefined>();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.pets.get(petId)
      .then(data => { if (!cancelled) setPet(data); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : t('pet.detailsPopup.loadFailed')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [petId, t]);

  // Focus the close button on mount so keyboard users aren't stranded in the
  // backdrop.
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // Escape closes the popup — but if a nested vet popup / vet form is open,
  // that inner surface claims the key so the user can back out one level
  // at a time.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openVetId === null && !editingVet) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, openVetId, editingVet]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <>
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pet-details-popup-title"
      className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50"
      onMouseDown={handleBackdropClick}
    >
      <div className="bg-card text-card-foreground rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto styled-scroll">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2
            id="pet-details-popup-title"
            className="text-xl font-semibold text-gray-800 dark:text-gray-100"
          >
            {t('pet.detailsPopup.title')}
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
              <span className="ml-2 text-sm">{t('pet.detailsPopup.loading')}</span>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {pet && !loading && !error && (
            <>
              {/* Header: avatar, name, quick facts */}
              <div className="flex items-start gap-4">
                {pet.profile_picture_url ? (
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-border/50 shadow-sm">
                    <img src={pet.profile_picture_url} alt={pet.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 flex items-center justify-center bg-primary/10 text-primary rounded-xl flex-shrink-0 border border-primary/20">
                    {speciesIcons[pet.species] || speciesIcons.other}
                  </div>
                )}
                <div className="flex-1 min-w-0 mt-1">
                  <h3 className="text-lg font-bold text-foreground">{pet.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {pet.breed || translateSpecies(t, pet.species)} • {pet.age} {t('common.years')}
                  </p>
                </div>
              </div>

              {/* Traits */}
              <div>
                <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  {t('pet.traits')}
                </h5>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={temperamentColors[pet.temperament] ? 'secondary' : 'default'}
                    className={temperamentColors[pet.temperament]}
                  >
                    {t(`pet.temperamentOptions.${pet.temperament}`)}
                  </Badge>
                  <Badge variant={pet.dominance_level <= 3 ? 'success' : pet.dominance_level <= 6 ? 'warning' : 'danger'}>
                    {t('common.dom')}: {pet.dominance_level}/10
                  </Badge>
                  <Badge variant="secondary">
                    {t(`pet.sizeOptions.${pet.size}`)}
                  </Badge>
                </div>
              </div>

              {/* Profile grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-secondary/30 p-3 rounded-xl">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t('pet.sex')}</span>
                  <p className="font-semibold text-sm text-foreground mt-0.5 capitalize">
                    {pet.sex ? t(`pet.sexOptions.${pet.sex}`) : '-'}
                  </p>
                </div>
                <div className="bg-secondary/30 p-3 rounded-xl">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t('pet.neutered')}</span>
                  <p className="font-semibold text-sm text-foreground mt-0.5">
                    {pet.neutered ? t('common.yes') : t('common.no')}
                  </p>
                </div>
                <div className="bg-secondary/30 p-3 rounded-xl">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t('pet.weight')}</span>
                  <p className="font-semibold text-sm text-foreground mt-0.5 font-mono tabular-nums">
                    {formatWeight(pet.weight) ?? '—'}
                  </p>
                </div>
              </div>

              {/* Owner */}
              <div className="bg-secondary/20 p-3 rounded-xl">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t('pet.owner')}</span>
                {pet.owner_details ? (
                  <div className="flex items-center gap-2 mt-1">
                    {pet.owner_details.profile_picture_url ? (
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-border/50">
                        <img
                          src={pet.owner_details.profile_picture_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 border border-primary/20 text-xs font-bold">
                        {pet.owner_details.first_name[0]}
                        {pet.owner_details.last_name[0]}
                      </div>
                    )}
                    <p className="text-sm text-foreground">{pet.owner_details.full_name}</p>
                  </div>
                ) : (
                  <p className="text-sm text-foreground mt-0.5">{t('pet.noOwner')}</p>
                )}
              </div>

              {/* Vet override (flag-gated). The vet name is a button that
                  opens the nested VetDetailsPopup. On older cached payloads
                  that lack the nested `vet_override_details` block, fall
                  back to the legacy `#<id>` placeholder so the UI degrades
                  silently rather than showing nothing. */}
              {vetManagementEnabled && pet.vet_override && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Stethoscope className="w-3 h-3" />
                    {t('pet.vetOverride')}
                  </span>
                  {pet.vet_override_details ? (
                    <button
                      type="button"
                      onClick={() => setOpenVetId(pet.vet_override_details!.id)}
                      className="mt-0.5 inline-flex items-baseline text-sm text-foreground hover:text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/50 rounded"
                    >
                      {pet.vet_override_details.name}
                    </button>
                  ) : (
                    <p className="text-sm text-foreground mt-0.5">#{pet.vet_override}</p>
                  )}
                </div>
              )}

              {/* Deworming dates (flag-gated). Each cell renders even
                  when its date is null so the absence is informative
                  ("not recorded yet") rather than the section
                  collapsing entirely. */}
              {dewormingTrackingEnabled && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-secondary/30 p-3 rounded-xl">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                      {t('pet.lastInternalDewormingDate')}
                    </span>
                    <p className="font-semibold text-sm text-foreground mt-0.5">
                      {pet.last_internal_deworming_date
                        ? formatIsoDate(pet.last_internal_deworming_date)
                        : '—'}
                    </p>
                  </div>
                  <div className="bg-secondary/30 p-3 rounded-xl">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                      {t('pet.lastExternalDewormingDate')}
                    </span>
                    <p className="font-semibold text-sm text-foreground mt-0.5">
                      {pet.last_external_deworming_date
                        ? formatIsoDate(pet.last_external_deworming_date)
                        : '—'}
                    </p>
                  </div>
                </div>
              )}

              {/* Special notes */}
              {pet.special_notes && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                  <span className="text-[10px] text-amber-600 dark:text-amber-500 uppercase font-bold tracking-wider">
                    {t('pet.specialNotes')}
                  </span>
                  <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap">{pet.special_notes}</p>
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
            onClick={() => pet && onEdit(pet)}
            variant="primary"
            disabled={!pet || loading}
          >
            <Edit2 className="w-4 h-4 mr-1" />
            {t('pet.detailsPopup.editPet')}
          </Button>
        </div>
      </div>
    </div>

    {/* Nested VetDetailsPopup — rendered as a sibling so it isn't nested
        inside the pet dialog element. Opens on top of the pet popup when
        the operator clicks the vet override name. Edit handoff swaps the
        vet popup for the existing VetForm without closing this pet popup
        underneath. */}
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
