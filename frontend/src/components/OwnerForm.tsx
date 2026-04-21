'use client';

import { useState, useEffect } from 'react';
import { X, User, Mail, Phone, MapPin, AlertCircle, CreditCard, Stethoscope } from 'lucide-react';
import { api, Owner, OwnerFormData, Vet } from '@/lib/api';
import { useTranslation } from '@/lib/translations';
import { useFeatureFlag } from '@/lib/feature-flags';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';
import DocumentUpload from '@/components/DocumentUpload';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface OwnerFormProps {
  owner?: Owner;
  onClose: () => void;
  onSave: () => void;
}

export default function OwnerForm({ owner, onClose, onSave }: OwnerFormProps) {
  const { t } = useTranslation();
  const vetManagementEnabled = useFeatureFlag('vet_management');
  const [formData, setFormData] = useState<OwnerFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    id_number: '',
    street: '',
    city: '',
    state: '',
    province: '',
    country: '',
    birth_date: null,
    emergency_contact: '',
    emergency_phone: '',
    emergency_contact_can_pickup: false,
    notes: '',
    primary_vet: null,
    emergency_vet: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(owner?.profile_picture_url || null);
  const [pendingProfilePicture, setPendingProfilePicture] = useState<File | null>(null);
  const [vets, setVets] = useState<Vet[]>([]);

  useEffect(() => {
    api.vets.list()
      .then(setVets)
      .catch(err => console.error('Failed to load vets:', err));
  }, []);

  useEffect(() => {
    if (owner) {
      setFormData({
        first_name: owner.first_name,
        last_name: owner.last_name,
        email: owner.email,
        phone: owner.phone,
        id_number: owner.id_number || '',
        street: owner.street || '',
        city: owner.city || '',
        state: owner.state || '',
        province: owner.province || '',
        country: owner.country || '',
        birth_date: owner.birth_date || null,
        emergency_contact: owner.emergency_contact || '',
        emergency_phone: owner.emergency_phone || '',
        emergency_contact_can_pickup: owner.emergency_contact_can_pickup || false,
        notes: owner.notes || '',
        primary_vet: owner.primary_vet ?? null,
        emergency_vet: owner.emergency_vet ?? null,
      });
      setProfilePictureUrl(owner.profile_picture_url || null);
    }
  }, [owner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (owner) {
        await api.owners.update(owner.id, formData);
      } else {
        await api.owners.create(formData);
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-card text-card-foreground rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto styled-scroll">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            {owner ? t('owner.editOwner') : t('owner.addOwner')}
          </h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {owner ? (
            <div className="flex flex-col items-center mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('owner.profilePicture')}
              </h3>
              <ProfilePictureUpload
                currentUrl={profilePictureUrl}
                initials={`${formData.first_name?.[0] || ''}${formData.last_name?.[0] || ''}`}
                onUpload={async (file) => {
                  const updated = await api.owners.uploadProfilePicture(owner.id, file);
                  setProfilePictureUrl(updated.profile_picture_url || null);
                }}
                onDelete={async () => {
                  await api.owners.deleteProfilePicture(owner.id);
                  setProfilePictureUrl(null);
                }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('owner.profilePicture')}
              </h3>
              <ProfilePictureUpload
                currentUrl={pendingProfilePicture ? URL.createObjectURL(pendingProfilePicture) : null}
                initials={`${formData.first_name?.[0] || ''}${formData.last_name?.[0] || ''}`}
                onUpload={async (file) => {
                  setPendingProfilePicture(file);
                }}
                onDelete={async () => {
                  setPendingProfilePicture(null);
                }}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={`${t('owner.firstName')} *`}
              icon={<User className="w-4 h-4" />}
              type="text"
              required
              value={formData.first_name}
              onChange={e => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
              placeholder="John"
            />
            <Input
              label={`${t('owner.lastName')} *`}
              type="text"
              required
              value={formData.last_name}
              onChange={e => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
              placeholder="Doe"
            />
          </div>

          <Input
            label={`${t('owner.email')} *`}
            icon={<Mail className="w-4 h-4" />}
            type="email"
            required
            value={formData.email}
            onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder={t('owner.emailPlaceholder')}
          />

          <Input
            label={`${t('owner.phone')} *`}
            icon={<Phone className="w-4 h-4" />}
            type="tel"
            required
            value={formData.phone}
            onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder={t('owner.phonePlaceholder')}
          />

          <Input
            label={t('owner.idNumber')}
            icon={<CreditCard className="w-4 h-4" />}
            type="text"
            value={formData.id_number}
            onChange={e => setFormData(prev => ({ ...prev, id_number: e.target.value }))}
            placeholder={t('owner.idNumberPlaceholder')}
          />

          <Input
            label={t('owner.birthDate')}
            type="date"
            value={formData.birth_date || ''}
            onChange={e => setFormData(prev => ({ ...prev, birth_date: e.target.value || null }))}
          />

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {t('owner.addressSection') || 'Address'}
            </h3>
            <div className="space-y-4">
              <Input
                label={t('owner.street')}
                type="text"
                value={formData.street}
                onChange={e => setFormData(prev => ({ ...prev, street: e.target.value }))}
                placeholder={t('owner.streetPlaceholder') || 'e.g. Av. Cabildo 1234'}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={t('owner.city')}
                  type="text"
                  value={formData.city}
                  onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                />
                <Input
                  label={t('owner.state')}
                  type="text"
                  value={formData.state}
                  onChange={e => setFormData(prev => ({ ...prev, state: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={t('owner.province')}
                  type="text"
                  value={formData.province}
                  onChange={e => setFormData(prev => ({ ...prev, province: e.target.value }))}
                />
                <Input
                  label={t('owner.country')}
                  type="text"
                  value={formData.country}
                  onChange={e => setFormData(prev => ({ ...prev, country: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('owner.emergencyOptional')}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('owner.contactName')}
                type="text"
                value={formData.emergency_contact}
                onChange={e => setFormData(prev => ({ ...prev, emergency_contact: e.target.value }))}
                placeholder="Jane Doe"
              />
              <Input
                label={t('owner.contactPhone')}
                type="tel"
                value={formData.emergency_phone}
                onChange={e => setFormData(prev => ({ ...prev, emergency_phone: e.target.value }))}
                placeholder="+1 (555) 987-6543"
              />
            </div>
            <div className="mt-3">
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.emergency_contact_can_pickup}
                  onChange={e => setFormData(prev => ({ ...prev, emergency_contact_can_pickup: e.target.checked }))}
                  className="w-4 h-4 text-primary border-border rounded focus:ring-ring"
                />
                {t('owner.emergencyContactCanPickup')}
              </label>
            </div>
          </div>

          {vetManagementEnabled && (
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Stethoscope className="w-4 h-4" />
                {t('owner.veterinarySection')}
              </h3>
              {vets.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {t('owner.noVetsHint')}
                </p>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('owner.primaryVet')}
                  </label>
                  <select
                    value={formData.primary_vet ?? ''}
                    onChange={e => setFormData(prev => ({ ...prev, primary_vet: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-card text-card-foreground dark:bg-slate-700 text-foreground-100"
                  >
                    <option value="">{t('owner.noVetSelected')}</option>
                    {vets.map(vet => (
                      <option key={vet.id} value={vet.id}>{vet.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('owner.emergencyVet')}
                  </label>
                  <select
                    value={formData.emergency_vet ?? ''}
                    onChange={e => setFormData(prev => ({ ...prev, emergency_vet: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-card text-card-foreground dark:bg-slate-700 text-foreground-100"
                  >
                    <option value="">{t('owner.noVetSelected')}</option>
                    {vets.map(vet => (
                      <option key={vet.id} value={vet.id}>{vet.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('owner.notes')}
            </label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg bg-card text-card-foreground dark:bg-slate-700 text-foreground-100 focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
              placeholder={t('owner.notesPlaceholder')}
            />
          </div>

          {owner && (
            <div className="border-t border-border pt-4">
              <DocumentUpload ownerId={owner.id} />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? t('common.saving') : owner ? t('owner.editOwner') : t('owner.addOwner')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
