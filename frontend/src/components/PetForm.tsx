'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus } from 'lucide-react';
import { api, Pet, PetFormData, OwnerListItem, VaccinationType, Vet } from '@/lib/api';
import { useTranslation } from '@/lib/translations';
import { useFeatureFlag } from '@/lib/feature-flags';
import { useToast } from '@/components/ui/Toast';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';
import DocumentUpload from '@/components/DocumentUpload';
import MedicalNotesSection from '@/components/MedicalNotesSection';
import WeightInput from '@/components/WeightInput';
import { Button } from '@/components/ui/Button';
import FormModal from '@/components/ui/FormModal';

interface PetFormProps {
  pet?: Pet;
  lockedOwnerId?: number;
  onClose: () => void;
  onSave: () => void;
  onSaveAndAnother?: (pet: Pet) => void;
}

const SPECIES_VALUES = ['dog', 'cat', 'bird', 'rabbit', 'other'];
const TEMPERAMENT_VALUES = ['calm', 'playful', 'aggressive', 'anxious', 'friendly'];
const SIZE_VALUES = ['small', 'medium', 'large'];
const SEX_VALUES = ['male', 'female'];

const defaultFormData = (ownerId: number | null): PetFormData => ({
  name: '',
  species: 'dog',
  breed: '',
  age: 1,
  temperament: 'friendly',
  dominance_level: 5,
  size: 'medium',
  neutered: false,
  sex: 'male',
  birth_date: null,
  weight: null,
  last_internal_deworming_date: null,
  last_external_deworming_date: null,
  special_notes: '',
  owner: ownerId,
  vet_override: null,
});

export default function PetForm({ pet, lockedOwnerId, onClose, onSave, onSaveAndAnother }: PetFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const vetManagementEnabled = useFeatureFlag('vet_management');
  const medicalNotesEnabled = useFeatureFlag('medical_notes');
  const customSpeciesEnabled = useFeatureFlag('custom_pet_species');
  const dewormingTrackingEnabled = useFeatureFlag('deworming_tracking');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { loading, error, submit, clearError } = useFormSubmit();
  const [owners, setOwners] = useState<OwnerListItem[]>([]);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(pet?.profile_picture_url || null);
  const [pendingProfilePicture, setPendingProfilePicture] = useState<File | null>(null);
  const [vaxTypes, setVaxTypes] = useState<VaccinationType[]>([]);
  const [vets, setVets] = useState<Vet[]>([]);
  const [vaccinations, setVaccinations] = useState<Array<{ vax_type: string; date: string }>>([
    ...(pet?.vaccinations?.map(v => ({ vax_type: v.vax_type, date: v.date })) || []),
  ]);
  const [formData, setFormData] = useState<PetFormData>({
    name: pet?.name || '',
    species: pet?.species || 'dog',
    breed: pet?.breed || '',
    age: pet?.age || 1,
    temperament: pet?.temperament || 'friendly',
    dominance_level: pet?.dominance_level || 5,
    size: pet?.size || 'medium',
    neutered: pet?.neutered || false,
    sex: pet?.sex || 'male',
    birth_date: pet?.birth_date || null,
    weight: pet?.weight ?? null,
    last_internal_deworming_date: pet?.last_internal_deworming_date || null,
    last_external_deworming_date: pet?.last_external_deworming_date || null,
    special_notes: pet?.special_notes || '',
    owner: pet?.owner ?? lockedOwnerId ?? null,
    vet_override: pet?.vet_override ?? null,
  });

  const isEditing = Boolean(pet);
  const isOwnerLocked = !isEditing && typeof lockedOwnerId === 'number';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ownersData, vaxTypesData, vetsData] = await Promise.all([
          isOwnerLocked ? Promise.resolve<OwnerListItem[]>([]) : api.owners.dropdown(),
          api.vaccinationTypes.list(),
          api.vets.list(),
        ]);
        setOwners(ownersData);
        setVaxTypes(vaxTypesData);
        setVets(vetsData);
      } catch (err) {
        console.error('Failed to fetch form data:', err);
      }
    };
    fetchData();
  }, [isOwnerLocked]);

  const enabledVaxTypes = vaxTypes.filter(v => v.enabled);
  const isOwnerSelected = isOwnerLocked || Boolean(formData.owner);

  const [customSpecies, setCustomSpecies] = useState<string>(
    pet && !SPECIES_VALUES.includes(pet.species) ? pet.species : '',
  );

  const submitPet = async (): Promise<Pet> => {
    const validVaccinations = vaccinations.filter(v => v.date);
    const speciesOverride = customSpeciesEnabled && customSpecies.trim();
    const speciesValue = speciesOverride ? customSpecies.trim() : formData.species;
    const submitData = {
      ...formData,
      species: speciesValue,
      vaccinations: validVaccinations,
    };
    if (pet) {
      return api.pets.update(pet.id, submitData);
    }
    if (pendingProfilePicture) {
      return api.pets.createWithAvatar(submitData, pendingProfilePicture);
    }
    return api.pets.create(submitData);
  };

  const resetForNextPet = () => {
    setFormData(defaultFormData(lockedOwnerId ?? null));
    setVaccinations([]);
    setPendingProfilePicture(null);
    setProfilePictureUrl(null);
    clearError();
    nameInputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(async () => {
      const saved = await submitPet();
      if (!isEditing) {
        toast(t('pet.addedSuccessfully', { name: saved.name }), { variant: 'success' });
      }
      onSave();
    });
  };

  const handleSaveAndAddAnother = () => {
    if (isEditing) return;
    submit(async () => {
      const saved = await submitPet();
      toast(t('pet.addedSuccessfully', { name: saved.name }), { variant: 'success' });
      onSaveAndAnother?.(saved);
      resetForNextPet();
    });
  };

  return (
    <FormModal
      titleId="pet-form-title"
      title={pet ? t('pet.editPet') : t('pet.addPet')}
      formId="pet-form"
      onSubmit={handleSubmit}
      submitLabel={pet ? t('pet.editPet') : t('pet.addPet')}
      loading={loading}
      error={error}
      submitDisabled={!isOwnerSelected}
      size="lg"
      extraActions={
        // Save & Add Another: only in create mode, only when the parent passes
        // a handler. Lets staff register a litter of pets for the same owner
        // without round-tripping through the modal each time.
        !isEditing && onSaveAndAnother && (
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveAndAddAnother}
            disabled={loading || !isOwnerSelected}
          >
            {t('pet.saveAndAddAnother')}
          </Button>
        )
      }
      onClose={onClose}
    >
      {pet ? (
        <div className="flex flex-col items-center">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('pet.profilePicture')}
          </h3>
          <ProfilePictureUpload
            currentUrl={profilePictureUrl}
            initials={formData.name?.[0]?.toUpperCase() || '?'}
            onUpload={async (file) => {
              const updated = await api.pets.uploadProfilePicture(pet.id, file);
              setProfilePictureUrl(updated.profile_picture_url || null);
            }}
            onDelete={async () => {
              await api.pets.deleteProfilePicture(pet.id);
              setProfilePictureUrl(null);
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('pet.profilePicture')}
          </h3>
          <ProfilePictureUpload
            currentUrl={pendingProfilePicture ? URL.createObjectURL(pendingProfilePicture) : null}
            initials={formData.name?.[0]?.toUpperCase() || '?'}
            onUpload={async (file) => {
              setPendingProfilePicture(file);
            }}
            onDelete={async () => {
              setPendingProfilePicture(null);
            }}
          />
        </div>
      )}

      {!isOwnerLocked && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('pet.owner')} *
          </label>
          <select
            required
            value={formData.owner || ''}
            onChange={e => setFormData({ ...formData, owner: e.target.value ? Number(e.target.value) : null })}
            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-card text-card-foreground dark:bg-slate-700 text-foreground-100"
          >
            <option value="">{t('pet.noOwner')}</option>
            {owners.map(owner => (
              <option key={owner.id} value={owner.id}>
                {owner.full_name} ({owner.id_number})
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            {t('pet.assignOwnerHint')}
          </p>
        </div>
      )}

      <fieldset disabled={!isOwnerSelected} className="space-y-6">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('pet.name')} *
            </label>
            <input
              type="text"
              required
              ref={nameInputRef}
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-card text-card-foreground dark:bg-slate-700 text-foreground-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('pet.species')} *
            </label>
            <select
              required
              value={formData.species}
              onChange={e => setFormData({ ...formData, species: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-card text-card-foreground dark:bg-slate-700 text-foreground-100"
            >
              {SPECIES_VALUES.map(val => (
                <option key={val} value={val}>{t(`pet.speciesOptions.${val}`)}</option>
              ))}
            </select>
            {customSpeciesEnabled && (
              <div className="mt-2">
                <input
                  type="text"
                  value={customSpecies}
                  onChange={e => setCustomSpecies(e.target.value)}
                  placeholder={t('pet.customSpeciesPlaceholder')}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-card text-card-foreground dark:bg-slate-700 text-foreground-100 text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('pet.customSpeciesHint')}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('pet.breed')}
            </label>
            <input
              type="text"
              value={formData.breed}
              onChange={e => setFormData({ ...formData, breed: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-card text-card-foreground dark:bg-slate-700 text-foreground-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('pet.age')} ({t('common.years')}) *
            </label>
            <input
              type="number"
              required
              min="0"
              value={formData.age}
              onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-card text-card-foreground dark:bg-slate-700 text-foreground-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('pet.temperament')} *
            </label>
            <select
              required
              value={formData.temperament}
              onChange={e => setFormData({ ...formData, temperament: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-card text-card-foreground dark:bg-slate-700 text-foreground-100"
            >
              {TEMPERAMENT_VALUES.map(val => (
                <option key={val} value={val}>{t(`pet.temperamentOptions.${val}`)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('pet.dominance')} (1-10) *
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="10"
                value={formData.dominance_level}
                onChange={e => setFormData({ ...formData, dominance_level: parseInt(e.target.value) })}
                className="flex-1"
              />
              <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${
                formData.dominance_level <= 3 ? 'bg-green-100 text-green-700' :
                formData.dominance_level <= 6 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {formData.dominance_level}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('pet.dominanceHint')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('pet.size')} *
            </label>
            <select
              required
              value={formData.size}
              onChange={e => setFormData({ ...formData, size: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-card text-card-foreground dark:bg-slate-700 text-foreground-100"
            >
              {SIZE_VALUES.map(val => (
                <option key={val} value={val}>{t(`pet.sizeOptions.${val}`)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('pet.sex')} *
            </label>
            <select
              required
              value={formData.sex}
              onChange={e => setFormData({ ...formData, sex: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-card text-card-foreground dark:bg-slate-700 text-foreground-100"
            >
              {SEX_VALUES.map(val => (
                <option key={val} value={val}>{t(`pet.sexOptions.${val}`)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('pet.birthDate')}
            </label>
            <input
              type="date"
              value={formData.birth_date || ''}
              onChange={e => {
                const newBirthDate = e.target.value || null;
                const newAge = newBirthDate
                  ? Math.max(0, new Date().getFullYear() - new Date(newBirthDate).getFullYear() -
                      (new Date().getMonth() < new Date(newBirthDate).getMonth() ||
                      (new Date().getMonth() === new Date(newBirthDate).getMonth() &&
                       new Date().getDate() < new Date(newBirthDate).getDate()) ? 1 : 0))
                  : formData.age;
                setFormData({ ...formData, birth_date: newBirthDate, age: newAge });
              }}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-card text-card-foreground dark:bg-slate-700 text-foreground-100"
            />
          </div>

          <WeightInput
            label={`${t('pet.weight')} (${t('common.kg')})`}
            value={formData.weight}
            onChange={kg => setFormData({ ...formData, weight: kg })}
          />

          {dewormingTrackingEnabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('pet.lastInternalDewormingDate')}
                </label>
                <input
                  type="date"
                  value={formData.last_internal_deworming_date || ''}
                  onChange={e => setFormData({
                    ...formData,
                    last_internal_deworming_date: e.target.value || null,
                  })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-card text-card-foreground dark:bg-slate-700 text-foreground-100"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('pet.lastInternalDewormingHint')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('pet.lastExternalDewormingDate')}
                </label>
                <input
                  type="date"
                  value={formData.last_external_deworming_date || ''}
                  onChange={e => setFormData({
                    ...formData,
                    last_external_deworming_date: e.target.value || null,
                  })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-card text-card-foreground dark:bg-slate-700 text-foreground-100"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('pet.lastExternalDewormingHint')}
                </p>
              </div>
            </>
          )}

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.neutered}
                onChange={e => setFormData({ ...formData, neutered: e.target.checked })}
                className="w-4 h-4 text-primary border-border rounded focus:ring-ring"
              />
              {t('pet.neutered')}
            </label>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('pet.vaccinations')}
            </label>
            <Button
              type="button"
              onClick={() => setVaccinations([...vaccinations, { vax_type: enabledVaxTypes[0]?.name || '', date: '' }])}
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary"
            >
              <Plus className="w-4 h-4" />
              {t('pet.addVaccination')}
            </Button>
          </div>
          {vaccinations.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-muted-foreground italic">{t('pet.noVaccinations')}</p>
          ) : (
            <div className="space-y-2">
              {vaccinations.map((vax, index) => (
                <div key={index} className="flex items-center gap-2">
                  <select
                    value={vax.vax_type}
                    onChange={e => {
                      const updated = [...vaccinations];
                      updated[index] = { ...updated[index], vax_type: e.target.value };
                      setVaccinations(updated);
                    }}
                    className="flex-1 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-card text-card-foreground dark:bg-slate-700 text-foreground-100 text-sm"
                  >
                    {enabledVaxTypes.map(vt => (
                      <option key={vt.name} value={vt.name}>{vt.label}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    required
                    value={vax.date}
                    onChange={e => {
                      const updated = [...vaccinations];
                      updated[index] = { ...updated[index], date: e.target.value };
                      setVaccinations(updated);
                    }}
                    className="flex-1 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-card text-card-foreground dark:bg-slate-700 text-foreground-100 text-sm"
                  />
                  <Button
                    type="button"
                    onClick={() => setVaccinations(vaccinations.filter((_, i) => i !== index))}
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('pet.specialNotes')}
          </label>
          <textarea
            value={formData.special_notes}
            onChange={e => setFormData({ ...formData, special_notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-card text-card-foreground dark:bg-slate-700 text-foreground-100"
            placeholder={t('pet.specialNotesPlaceholder')}
          />
        </div>

        {vetManagementEnabled && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('pet.vetOverride')}
            </label>
            <select
              value={formData.vet_override ?? ''}
              onChange={e => setFormData({ ...formData, vet_override: e.target.value ? Number(e.target.value) : null })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-card text-card-foreground dark:bg-slate-700 text-foreground-100"
            >
              <option value="">{t('pet.noVetOverride')}</option>
              {vets.map(vet => (
                <option key={vet.id} value={vet.id}>{vet.name}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {t('pet.vetOverrideHint')}
            </p>
          </div>
        )}

        {pet && (
          <div className="border-t border-border pt-4">
            {medicalNotesEnabled && (
              <div className="mb-4">
                <MedicalNotesSection petId={pet.id} />
              </div>
            )}
            <DocumentUpload petId={pet.id} />
          </div>
        )}
      </fieldset>
    </FormModal>
  );
}
