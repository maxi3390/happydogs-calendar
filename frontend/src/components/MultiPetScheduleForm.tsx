'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { X, AlertTriangle, CheckCircle, Users } from 'lucide-react';
import { api, Pet, PetListItem, BatchScheduleFormData, BatchScheduleResult, OwnerListItem } from '@/lib/api';
import { useTranslation } from '@/lib/translations';

interface MultiPetScheduleFormProps {
  selectedDate: Date;
  preselectedPetIds?: number[];
  onClose: () => void;
  onSave: () => void;
}

const TIME_OPTIONS = (() => {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hour = h.toString().padStart(2, '0');
      const minute = m.toString().padStart(2, '0');
      options.push(`${hour}:${minute}`);
    }
  }
  return options;
})();

export default function MultiPetScheduleForm({ selectedDate, preselectedPetIds, onClose, onSave }: MultiPetScheduleFormProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [owners, setOwners] = useState<OwnerListItem[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<number | null>(null);
  const [result, setResult] = useState<BatchScheduleResult | null>(null);

  const [formData, setFormData] = useState<BatchScheduleFormData>({
    pet_ids: preselectedPetIds || [],
    start_date: format(selectedDate, 'yyyy-MM-dd'),
    end_date: format(selectedDate, 'yyyy-MM-dd'),
    start_time: '09:00',
    end_time: '17:00',
    status: 'scheduled',
    notes: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [petsData, ownersData] = await Promise.all([
          api.pets.list(),
          api.owners.dropdown()
        ]);
        setPets(petsData);
        setOwners(ownersData);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (preselectedPetIds && preselectedPetIds.length > 0) {
      setFormData(prev => ({ ...prev, pet_ids: preselectedPetIds }));
    }
  }, [preselectedPetIds]);

  const togglePet = (petId: number) => {
    setFormData(prev => ({
      ...prev,
      pet_ids: prev.pet_ids.includes(petId)
        ? prev.pet_ids.filter(id => id !== petId)
        : [...prev.pet_ids, petId]
    }));
  };

  const selectAllPets = () => {
    const petsToSelect = selectedOwner === -1
      ? pets.filter(p => !p.owner).map(p => p.id)
      : selectedOwner
        ? pets.filter(p => p.owner === selectedOwner).map(p => p.id)
        : pets.map(p => p.id);
    setFormData(prev => ({ ...prev, pet_ids: petsToSelect }));
  };

  const filteredPets = selectedOwner === -1
    ? pets.filter(p => !p.owner)
    : selectedOwner
      ? pets.filter(p => p.owner === selectedOwner)
      : pets;

  const clearAllPets = () => {
    setFormData(prev => ({ ...prev, pet_ids: [] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.pet_ids.length === 0) {
      setError(t('errors.selectAtLeastOne'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const batchResult = await api.schedules.batchCreate(formData);
      setResult(batchResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const selectedPets = pets.filter(p => formData.pet_ids.includes(p.id));
  const getOwnerName = (ownerId: number | null) => {
    if (!ownerId) return t('multiPet.noOwner');
    const owner = owners.find(o => o.id === ownerId);
    return owner ? owner.full_name : 'Unknown';
  };

  if (result) {
    return (
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {t('multiPet.schedulesCreatedTitle')}
            </h2>
            <button
              onClick={() => { onSave(); onClose(); }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              <div>
                <div className="font-semibold text-green-800 dark:text-green-200">
                  {t('multiPet.schedulesCreated').replace('{count}', String(result.created_count))}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">
                  {formData.start_date} {formData.start_date !== formData.end_date && `to ${formData.end_date}`}
                </div>
              </div>
            </div>

            {result.warnings && result.warnings.length > 0 && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-medium mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  {t('schedule.conflictsDetected')}
                </div>
                <ul className="space-y-2">
                  {result.warnings.map((warning, i) => (
                    <li key={i} className="text-sm text-amber-700 dark:text-amber-300">
                      <span className="font-medium">{warning.pet_name}</span>:
                      {warning.conflicts.map((c, j) => (
                        <div key={j} className="ml-2 text-amber-600 dark:text-amber-400">
                          • {c.reason} with {c.conflicting_pet}
                        </div>
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
              <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2">{t('multiPet.createdFor')}:</h3>
              <div className="flex flex-wrap gap-2">
                {result.schedules.map(schedule => (
                  <span
                    key={schedule.id}
                    className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 rounded-full text-sm"
                  >
                    {schedule.pet_details.name}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => { onSave(); onClose(); }}
              className="w-full mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              {t('multiPet.done')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {t('multiPet.title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('multiPet.filterByOwner')}
            </label>
            <select
              value={selectedOwner || ''}
              onChange={e => setSelectedOwner(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 mb-4"
            >
              <option value="">{t('multiPet.allOwners')} ({t('multiPet.petsCount').replace('{count}', String(pets.length))})</option>
              {owners.map(owner => (
                <option key={owner.id} value={owner.id}>
                  {owner.full_name} ({pets.filter(p => p.owner === owner.id).length} pets)
                </option>
              ))}
              <option value={-1}>{t('multiPet.noOwner')} ({t('multiPet.petsCount').replace('{count}', String(pets.filter(p => !p.owner).length))})</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('schedule.selectPets')} * ({formData.pet_ids.length} {t('schedule.selected')}{selectedOwner ? ` ${t('multiPet.selectedFrom').replace('{count}', String(filteredPets.length))}` : ''})
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllPets}
                  className="text-xs px-2 py-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded"
                >
                  {selectedOwner ? t('multiPet.selectAllShown') : t('multiPet.selectAll')}
                </button>
                <button
                  type="button"
                  onClick={clearAllPets}
                  className="text-xs px-2 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
                >
                  {t('multiPet.clear')}
                </button>
              </div>
            </div>
            <div className="border border-gray-300 dark:border-slate-600 rounded-lg max-h-48 overflow-y-auto">
              {filteredPets.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  {pets.length === 0 ? t('multiPet.loadingPets') : t('multiPet.noPetsFound')}
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-slate-700">
                  {filteredPets.map(pet => (
                    <label
                      key={pet.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${
                        formData.pet_ids.includes(pet.id) ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.pet_ids.includes(pet.id)}
                        onChange={() => togglePet(pet.id)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 dark:text-gray-200">{pet.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {pet.species} • {pet.temperament} • {t('common.dom')}: {pet.dominance_level}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedPets.length > 0 && (
            <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('multiPet.selectedPets')}:</div>
              <div className="flex flex-wrap gap-2">
                {selectedPets.map(pet => (
                  <span
                    key={pet.id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-600 border border-gray-200 dark:border-slate-500 rounded-full text-sm text-gray-700 dark:text-gray-200"
                  >
                    {pet.name}
                    <button
                      type="button"
                      onClick={() => togglePet(pet.id)}
                      className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('schedule.startDate')} *
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('schedule.endDate')} *
              </label>
              <input
                type="date"
                required
                value={formData.end_date}
                min={formData.start_date}
                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {formData.start_date !== formData.end_date && (
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-sm text-indigo-700 dark:text-indigo-300">
              {t('schedule.multiDay')}: {formData.start_date} to {formData.end_date}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('schedule.dailyStartTime')} *
              </label>
              <select
                required
                value={formData.start_time}
                onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
              >
                {TIME_OPTIONS.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('schedule.dailyEndTime')} *
              </label>
              <select
                required
                value={formData.end_time}
                onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
              >
                {TIME_OPTIONS.filter(t => t > formData.start_time).map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('schedule.status')}
            </label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
            >
              <option value="scheduled">{t('schedule.statuses.scheduled')}</option>
              <option value="checked_in">{t('schedule.statuses.checked_in')}</option>
              <option value="completed">{t('schedule.statuses.completed')}</option>
              <option value="cancelled">{t('schedule.statuses.cancelled')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('multiPet.notesLabel')}
            </label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
              placeholder=""
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || formData.pet_ids.length === 0}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? t('multiPet.creating') : t('schedule.createSchedule')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
