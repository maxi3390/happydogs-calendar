'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';
import { api, Pet, Schedule, ScheduleFormData, ConflictCheckResult } from '@/lib/api';

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
  const [loading, setLoading] = useState(false);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [conflictResult, setConflictResult] = useState<ConflictCheckResult | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setError(err instanceof Error ? err.message : 'Failed to save schedule');
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
            {schedule ? 'Edit Schedule' : 'New Schedule'}
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
              Pet *
            </label>
            <select
              required
              value={formData.pet}
              onChange={e => setFormData({ ...formData, pet: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select a pet...</option>
              {pets.map(pet => (
                <option key={pet.id} value={pet.id}>
                  {pet.name} ({pet.species}) - {pet.temperament}, Dom: {pet.dominance_level}
                </option>
              ))}
            </select>
          </div>

          {selectedPet && (
            <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg text-sm">
              <div className="font-medium text-gray-800 dark:text-gray-100">{selectedPet.name}</div>
              <div className="text-gray-600 dark:text-gray-400 mt-1 grid grid-cols-3 gap-2">
                <span>Species: {selectedPet.species}</span>
                <span>Temperament: {selectedPet.temperament}</span>
                <span>Dominance: {selectedPet.dominance_level}/10</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date *
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
                End Date *
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
              Multi-day schedule: {formData.start_date} to {formData.end_date}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Daily Start Time *
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
                Daily End Time *
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

          {conflictResult && (
            <div className={`p-4 rounded-lg ${
              conflictResult.has_conflicts
                ? 'bg-amber-50 border border-amber-200'
                : 'bg-green-50 border border-green-200'
            }`}>
              {checkingConflicts ? (
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
                  Checking conflicts...
                </div>
              ) : conflictResult.has_conflicts ? (
                <div>
                  <div className="flex items-center gap-2 text-amber-800 font-medium">
                    <AlertTriangle className="w-5 h-5" />
                    Conflicts Detected!
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
                    You can still create this schedule, but be aware of the potential conflicts.
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  No conflicts detected
                  {conflictResult.overlapping_pets_count > 0 && (
                    <span className="text-green-600">
                      ({conflictResult.overlapping_pets_count} compatible pets at this time)
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
            >
              <option value="scheduled">Scheduled</option>
              <option value="checked_in">Checked In</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.pet}
              className={`px-6 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                conflictResult?.has_conflicts
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {loading ? 'Saving...' : schedule ? 'Update Schedule' :
                conflictResult?.has_conflicts ? 'Schedule Anyway' : 'Create Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
