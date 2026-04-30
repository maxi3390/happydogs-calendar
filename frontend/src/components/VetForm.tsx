'use client';

import { useState, useEffect } from 'react';
import { Stethoscope, Mail, Phone, MapPin } from 'lucide-react';
import { api, Vet, VetFormData } from '@/lib/api';
import { useTranslation } from '@/lib/translations';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import { Input } from '@/components/ui/Input';
import FormModal from '@/components/ui/FormModal';

interface VetFormProps {
  vet?: Vet;
  onClose: () => void;
  onSave: () => void;
}

const emptyFormData = (): VetFormData => ({
  name: '',
  phone: '',
  email: '',
  street: '',
  city: '',
  state: '',
  province: '',
  country: '',
  notes: '',
});

export default function VetForm({ vet, onClose, onSave }: VetFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<VetFormData>(emptyFormData);
  const { loading, error, submit } = useFormSubmit();

  useEffect(() => {
    if (vet) {
      setFormData({
        name: vet.name,
        phone: vet.phone || '',
        email: vet.email || '',
        street: vet.street || '',
        city: vet.city || '',
        state: vet.state || '',
        province: vet.province || '',
        country: vet.country || '',
        notes: vet.notes || '',
      });
    }
  }, [vet]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(async () => {
      if (vet) {
        await api.vets.update(vet.id, formData);
      } else {
        await api.vets.create(formData);
      }
      onSave();
    });
  };

  return (
    <FormModal
      titleId="vet-form-title"
      title={vet ? t('vet.editVet') : t('vet.addVet')}
      onSubmit={handleSubmit}
      submitLabel={vet ? t('vet.editVet') : t('vet.addVet')}
      loading={loading}
      error={error}
      onClose={onClose}
    >
      <Input
        label={`${t('vet.name')} *`}
        icon={<Stethoscope className="w-4 h-4" />}
        type="text"
        required
        value={formData.name}
        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
        placeholder={t('vet.namePlaceholder')}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label={t('vet.phone')}
          icon={<Phone className="w-4 h-4" />}
          type="tel"
          value={formData.phone}
          onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
        />
        <Input
          label={t('vet.email')}
          icon={<Mail className="w-4 h-4" />}
          type="email"
          value={formData.email}
          onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
        />
      </div>

      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          {t('vet.addressSection')}
        </h3>
        <div className="space-y-4">
          <Input
            label={t('vet.street')}
            type="text"
            value={formData.street}
            onChange={e => setFormData(prev => ({ ...prev, street: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('vet.city')}
              type="text"
              value={formData.city}
              onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
            />
            <Input
              label={t('vet.state')}
              type="text"
              value={formData.state}
              onChange={e => setFormData(prev => ({ ...prev, state: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('vet.province')}
              type="text"
              value={formData.province}
              onChange={e => setFormData(prev => ({ ...prev, province: e.target.value }))}
            />
            <Input
              label={t('vet.country')}
              type="text"
              value={formData.country}
              onChange={e => setFormData(prev => ({ ...prev, country: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('vet.notes')}
        </label>
        <textarea
          value={formData.notes}
          onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 border border-border rounded-lg bg-card text-card-foreground dark:bg-slate-700 text-foreground-100 focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
          placeholder={t('vet.notesPlaceholder')}
        />
      </div>
    </FormModal>
  );
}
