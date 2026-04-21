'use client';

import { useState, useEffect } from 'react';
import { X, Stethoscope, Mail, Phone, MapPin, AlertCircle } from 'lucide-react';
import { api, Vet, VetFormData } from '@/lib/api';
import { useTranslation } from '@/lib/translations';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (vet) {
        await api.vets.update(vet.id, formData);
      } else {
        await api.vets.create(formData);
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
            {vet ? t('vet.editVet') : t('vet.addVet')}
          </h2>
          <Button onClick={onClose} variant="ghost" size="icon" className="text-muted-foreground">
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

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? t('common.saving') : vet ? t('vet.editVet') : t('vet.addVet')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
