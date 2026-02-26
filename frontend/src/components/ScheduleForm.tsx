'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';
import { api, Pet, Schedule, ScheduleFormData, ConflictCheckResult, DailyCountResult } from '@/lib/api';
import { useTranslation } from '@/lib/translations';

interface ScheduleFormProps {
  schedule?: Schedule;
  selectedDate: Date;
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

export default function ScheduleForm({ schedule, selectedDate, onClose, onSave }: ScheduleFormProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [conflictResult, setConflictResult] = useState<ConflictCheckResult | null>(null);
  const [dailyCount, setDailyCount] = useState<DailyCountResult | null>(null);
  const [showLimitConfirm, setShowLimitConfirm] = useState(false);

  const [formData, setFormData] = useState<ScheduleFormData>({
    pet: schedule?.pet || 0,
    start_date: schedule?.start_date || format(selectedDate, 'yyyy-MM-dd'),
    end_date: schedule?.end_date || format(selectedDate, 'yyyy-MM-dd'),
    start_time: schedule?.start_time?.slice(0, 5) || '09:00',
    end_time: schedule?.end_time?.slice(0, 5) || '17:00',
    status: schedule?.status || 'scheduled',
    notes: schedule?.notes || '',
  });

  useEffect(() => {
    const fetchPets = async () => {
      try {
        const data = await api.pets.list();
        setPets(data);
        if (data.length > 0 && !formData.pet) {
          setFormData(prev => ({ ...prev, pet: data[0].id }));
        }
      } catch (err) {
        console.error('Failed to fetch pets:', err);
      }
    };
    fetchPets();
  }, []);

  useEffect(() => {
    const checkConflicts = async () => {
      if (!formData.pet || !formData.start_date || !formData.end_date || !formData.start_time || !formData.end_time) {
        setConflictResult(null);
        return;
      }

      setCheckingConflicts(true);
      try {
        const result = await api.schedules.checkConflicts({
          pet_id: formData.pet,
          start_date: formData.start_date,
          end_date: formData.end_date,
          start_time: formData.start_time,
          end_time: formData.end_time,
          exclude_schedule_id: schedule?.id,
        });
        setConflictResult(result);
      } catch (err) {
        console.error('Failed to check conflicts:', err);
      } finally {
        setCheckingConflicts(false);
      }
    };

    const timer = setTimeout(checkConflicts, 500);
    return () => clearTimeout(timer);
  }, [formData.pet, formData.start_date, formData.end_date, formData.start_time, formData.end_time, schedule?.id]);

  useEffect(() => {
    const fetchDailyCount = async () => {
      if (!formData.start_date) {
        setDailyCount(null);
        return;
      }
      try {
        const result = await api.schedules.dailyCount(formData.start_date);
        setDailyCount(result);
      } catch (err) {
        console.error('Failed to fetch daily count:', err);
      }
    };

    const timer = setTimeout(fetchDailyCount, 300);
    return () => clearTimeout(timer);
  }, [formData.start_date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!schedule && dailyCount?.limit_reached && !showLimitConfirm) {
      setShowLimitConfirm(true);
      return;
    }

    setShowLimitConfirm(false);
    setLoading(true);
    setError(null);

    try {
      if (schedule) {
        await api.schedules.update(schedule.id, formData);
      } else {
        await api.schedules.create(formData);
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOverLimit = async () => {
    setShowLimitConfirm(false);
    setLoading(true);
    setError(null);

    try {
      if (schedule) {
        await api.schedules.update(schedule.id, formData);
      } else {
        await api.schedules.create(formData);
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const selectedPet = pets.find(p => p.id === formData.pet);

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            {schedule ? t('schedule.editSchedule') : t('schedule.newSchedule')}
          </h2>
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
              {t('schedule.pet')} *
            </label>
            <select
              required
              value={formData.pet}
              onChange={e => setFormData({ ...formData, pet: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">{t('schedule.selectPet')}...</option>
              {pets.map(pet => (
                <option key={pet.id} value={pet.id}>
                  {pet.name} ({pet.species}) - {pet.temperament}, {t('common.dom')}: {pet.dominance_level}
                </option>
              ))}
            </select>
          </div>

          {selectedPet && (
            <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg text-sm">
              <div className="font-medium text-gray-800 dark:text-gray-100">{selectedPet.name}</div>
              <div className="text-gray-600 dark:text-gray-400 mt-1 grid grid-cols-3 gap-2">
                <span>{t('pet.species')}: {selectedPet.species}</span>
                <span>{t('pet.temperament')}: {selectedPet.temperament}</span>
                <span>{t('pet.dominance')}: {selectedPet.dominance_level}/10</span>
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

          {dailyCount && dailyCount.limit > 0 && (
            <div className={`p-4 rounded-lg border ${
              dailyCount.limit_reached
                ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'
                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            }`}>
              {dailyCount.limit_reached ? (
                <div>
                  <div className="flex items-center gap-2 text-red-800 dark:text-red-200 font-medium">
                    <AlertTriangle className="w-5 h-5" />
                    {t('schedule.dailyLimitReached')}
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {t('schedule.dailyLimitReachedDetail')
                      .replace('{count}', String(dailyCount.count))
                      .replace('{date}', formData.start_date)
                      .replace('{limit}', String(dailyCount.limit))}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  {t('schedule.dailyLimitWarningDetail')
                    .replace('{count}', String(dailyCount.count))
                    .replace('{limit}', String(dailyCount.limit))}
                </div>
              )}
            </div>
          )}

          {conflictResult && (
            <div className={`p-4 rounded-lg ${
              conflictResult.has_conflicts
                ? 'bg-amber-50 border border-amber-200'
                : 'bg-green-50 border border-green-200'
            }`}>
              {checkingConflicts ? (
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
                  {t('schedule.checkingConflicts')}
                </div>
              ) : conflictResult.has_conflicts ? (
                <div>
                  <div className="flex items-center gap-2 text-amber-800 font-medium">
                    <AlertTriangle className="w-5 h-5" />
                    {t('schedule.conflictsDetected')}
                  </div>
                  <ul className="mt-2 space-y-2">
                    {conflictResult.conflicts.map((conflict, i) => (
                      <li key={i} className="text-sm text-amber-700">
                        <span className="font-medium">{conflict.conflicting_pet}</span>
                        <span className="text-amber-600"> ({conflict.time_slot})</span>
                        <div className="text-amber-600">{conflict.reason}</div>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-amber-600 mt-2">
                    {t('schedule.conflictsWarning')}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  {t('schedule.noConflicts')}
                  {conflictResult.overlapping_pets_count > 0 && (
                    <span className="text-green-600">
                      ({t('schedule.compatiblePets').replace('{count}', String(conflictResult.overlapping_pets_count))})
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

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
              {t('schedule.notes')}
            </label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
              placeholder="Any special instructions for this visit..."
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
              disabled={loading || !formData.pet}
              className={`px-6 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                dailyCount?.limit_reached
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : conflictResult?.has_conflicts
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {loading ? t('common.saving') : schedule ? t('schedule.updateSchedule') :
                dailyCount?.limit_reached ? t('schedule.scheduleAnyway') :
                conflictResult?.has_conflicts ? t('schedule.scheduleAnyway') : t('schedule.createSchedule')}
            </button>
          </div>
        </form>

        {showLimitConfirm && (
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center rounded-xl">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 m-4 max-w-sm">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-bold mb-3">
                <AlertTriangle className="w-6 h-6" />
                {t('schedule.confirmOverLimit')}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                {t('schedule.confirmOverLimitMessage')
                  .replace('{limit}', String(dailyCount?.limit))
                  .replace('{date}', formData.start_date)}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowLimitConfirm(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleConfirmOverLimit}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  {t('schedule.proceedAnyway')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
