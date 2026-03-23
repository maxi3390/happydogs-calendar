'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { X, AlertTriangle, CheckCircle, Users } from 'lucide-react';
import { api, Pet, PetListItem, Schedule, ScheduleFormData, BatchScheduleFormData, BatchScheduleResult, ConflictCheckResult, DailyCountResult, OwnerListItem } from '@/lib/api';
import { useTranslation } from '@/lib/translations';

interface ScheduleFormBaseProps {
  selectedDate: Date;
  onClose: () => void;
  onSave: () => void;
}

interface SingleModeProps extends ScheduleFormBaseProps {
  mode?: 'single';
  schedule?: Schedule;
  preselectedPetIds?: never;
}

interface MultiModeProps extends ScheduleFormBaseProps {
  mode: 'multi';
  schedule?: never;
  preselectedPetIds?: number[];
}

export type ScheduleFormProps = SingleModeProps | MultiModeProps;

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

export default function ScheduleForm(props: ScheduleFormProps) {
  const { selectedDate, onClose, onSave } = props;
  const isMulti = props.mode === 'multi';
  const schedule = isMulti ? undefined : props.schedule;
  const preselectedPetIds = isMulti ? props.preselectedPetIds : undefined;

  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [dailyCount, setDailyCount] = useState<DailyCountResult | null>(null);
  const [showLimitConfirm, setShowLimitConfirm] = useState(false);

  // Single-mode specific state
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [conflictResult, setConflictResult] = useState<ConflictCheckResult | null>(null);

  // Multi-mode specific state
  const [owners, setOwners] = useState<OwnerListItem[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<number | null>(null);
  const [batchResult, setBatchResult] = useState<BatchScheduleResult | null>(null);

  // Unified form state
  const [singlePetId, setSinglePetId] = useState<number>(schedule?.pet || 0);
  const [multiPetIds, setMultiPetIds] = useState<number[]>(preselectedPetIds || []);
  const [startDate, setStartDate] = useState(schedule?.start_date || format(selectedDate, 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(schedule?.end_date || format(selectedDate, 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState(schedule?.start_time?.slice(0, 5) || '09:00');
  const [endTime, setEndTime] = useState(schedule?.end_time?.slice(0, 5) || '17:00');
  const [status, setStatus] = useState(schedule?.status || 'scheduled');
  const [notes, setNotes] = useState(schedule?.notes || '');

  // Fetch pets (both modes) and owners (multi mode)
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isMulti) {
          const [petsData, ownersData] = await Promise.all([
            api.pets.list(),
            api.owners.dropdown()
          ]);
          setPets(petsData);
          setOwners(ownersData);
        } else {
          const data = await api.pets.list();
          setPets(data);
          if (data.length > 0 && !singlePetId) {
            setSinglePetId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      }
    };
    fetchData();
  }, []);

  // Sync preselectedPetIds (multi mode)
  useEffect(() => {
    if (isMulti && preselectedPetIds && preselectedPetIds.length > 0) {
      setMultiPetIds(preselectedPetIds);
    }
  }, [preselectedPetIds]);

  // Conflict checking (single mode only)
  useEffect(() => {
    if (isMulti) return;

    const checkConflicts = async () => {
      if (!singlePetId || !startDate || !endDate || !startTime || !endTime) {
        setConflictResult(null);
        return;
      }

      setCheckingConflicts(true);
      try {
        const result = await api.schedules.checkConflicts({
          pet_id: singlePetId,
          start_date: startDate,
          end_date: endDate,
          start_time: startTime,
          end_time: endTime,
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
  }, [singlePetId, startDate, endDate, startTime, endTime, schedule?.id, isMulti]);

  // Daily count (both modes)
  useEffect(() => {
    const fetchDailyCount = async () => {
      if (!startDate) {
        setDailyCount(null);
        return;
      }
      try {
        const result = await api.schedules.dailyCount(startDate);
        setDailyCount(result);
      } catch (err) {
        console.error('Failed to fetch daily count:', err);
      }
    };

    const timer = setTimeout(fetchDailyCount, 300);
    return () => clearTimeout(timer);
  }, [startDate]);

  // Multi-mode pet selection helpers
  const togglePet = (petId: number) => {
    setMultiPetIds(prev =>
      prev.includes(petId)
        ? prev.filter(id => id !== petId)
        : [...prev, petId]
    );
  };

  const filteredPets = selectedOwner === -1
    ? pets.filter(p => !p.owner)
    : selectedOwner
      ? pets.filter(p => p.owner === selectedOwner)
      : pets;

  const selectAllPets = () => {
    const petsToSelect = selectedOwner === -1
      ? pets.filter(p => !p.owner).map(p => p.id)
      : selectedOwner
        ? pets.filter(p => p.owner === selectedOwner).map(p => p.id)
        : pets.map(p => p.id);
    setMultiPetIds(petsToSelect);
  };

  const clearAllPets = () => {
    setMultiPetIds([]);
  };

  // Unified submit logic
  const doSubmit = async () => {
    setShowLimitConfirm(false);
    setLoading(true);
    setError(null);

    try {
      if (isMulti) {
        const batchData: BatchScheduleFormData = {
          pet_ids: multiPetIds,
          start_date: startDate,
          end_date: endDate,
          start_time: startTime,
          end_time: endTime,
          status,
          notes,
        };
        const result = await api.schedules.batchCreate(batchData);
        setBatchResult(result);
      } else {
        const singleData: ScheduleFormData = {
          pet: singlePetId,
          start_date: startDate,
          end_date: endDate,
          start_time: startTime,
          end_time: endTime,
          status,
          notes,
        };
        if (schedule) {
          await api.schedules.update(schedule.id, singleData);
        } else {
          await api.schedules.create(singleData);
        }
        onSave();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isMulti && multiPetIds.length === 0) {
      setError(t('errors.selectAtLeastOne'));
      return;
    }

    const shouldCheckLimit = isMulti
      ? dailyCount?.limit_reached
      : !schedule && dailyCount?.limit_reached;

    if (shouldCheckLimit && !showLimitConfirm) {
      setShowLimitConfirm(true);
      return;
    }

    await doSubmit();
  };

  const selectedPet = !isMulti ? pets.find(p => p.id === singlePetId) : undefined;
  const selectedPets = isMulti ? pets.filter(p => multiPetIds.includes(p.id)) : [];
  const getOwnerName = (ownerId: number | null) => {
    if (!ownerId) return t('multiPet.noOwner');
    const owner = owners.find(o => o.id === ownerId);
    return owner ? owner.full_name : 'Unknown';
  };

  // Multi-mode: show result screen after successful batch creation
  if (isMulti && batchResult) {
    return (
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
        <div className="bg-card text-card-foreground rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-border">
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
                  {t('multiPet.schedulesCreated').replace('{count}', String(batchResult.created_count))}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">
                  {startDate} {startDate !== endDate && `to ${endDate}`}
                </div>
              </div>
            </div>

            {batchResult.warnings && batchResult.warnings.length > 0 && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-medium mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  {t('schedule.conflictsDetected')}
                </div>
                <ul className="space-y-2">
                  {batchResult.warnings.map((warning, i) => (
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

            <div className="pt-4 border-t border-border">
              <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2">{t('multiPet.createdFor')}:</h3>
              <div className="flex flex-wrap gap-2">
                {batchResult.schedules.map(s => (
                  <span
                    key={s.id}
                    className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 rounded-full text-sm"
                  >
                    {s.pet_details.name}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => { onSave(); onClose(); }}
              className="w-full mt-4 px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
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
      <div className={`bg-card text-card-foreground rounded-xl shadow-xl ${isMulti ? 'max-w-2xl' : 'max-w-lg'} w-full max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-6 border-b border-border">
          {isMulti ? (
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                {t('multiPet.title')}
              </h2>
            </div>
          ) : (
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {schedule ? t('schedule.editSchedule') : t('schedule.newSchedule')}
            </h2>
          )}
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

          {/* Pet selection: single dropdown or multi checkboxes */}
          {isMulti ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('multiPet.filterByOwner')}
                </label>
                <select
                  value={selectedOwner || ''}
                  onChange={e => setSelectedOwner(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-card text-card-foreground dark:bg-slate-700 text-foreground-100 mb-4"
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
                    {t('schedule.selectPets')} * ({multiPetIds.length} {t('schedule.selected')}{selectedOwner ? ` ${t('multiPet.selectedFrom').replace('{count}', String(filteredPets.length))}` : ''})
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllPets}
                      className="text-xs px-2 py-1 text-primary hover:bg-primary/10 dark:hover:bg-indigo-900/30 rounded"
                    >
                      {selectedOwner ? t('multiPet.selectAllShown') : t('multiPet.selectAll')}
                    </button>
                    <button
                      type="button"
                      onClick={clearAllPets}
                      className="text-xs px-2 py-1 text-muted-foreground hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
                    >
                      {t('multiPet.clear')}
                    </button>
                  </div>
                </div>
                <div className="border border-border rounded-lg max-h-48 overflow-y-auto">
                  {filteredPets.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      {pets.length === 0 ? t('multiPet.loadingPets') : t('multiPet.noPetsFound')}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-slate-700">
                      {filteredPets.map(pet => (
                        <label
                          key={pet.id}
                          className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 dark:hover:bg-slate-700 transition-colors ${
                            multiPetIds.includes(pet.id) ? 'bg-primary/10' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={multiPetIds.includes(pet.id)}
                            onChange={() => togglePet(pet.id)}
                            className="w-4 h-4 text-primary border-border rounded focus:ring-ring"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-800 dark:text-gray-200">{pet.name}</div>
                            <div className="text-xs text-muted-foreground">
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
                <div className="p-3 bg-muted/50 dark:bg-slate-700 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('multiPet.selectedPets')}:</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedPets.map(pet => (
                      <span
                        key={pet.id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-card text-card-foreground dark:bg-slate-600 border border-border dark:border-slate-500 rounded-full text-sm text-gray-700 dark:text-gray-200"
                      >
                        {pet.name}
                        <button
                          type="button"
                          onClick={() => togglePet(pet.id)}
                          className="ml-1 text-gray-400 hover:text-muted-foreground dark:hover:text-gray-200"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('schedule.pet')} *
                </label>
                <select
                  required
                  value={singlePetId}
                  onChange={e => setSinglePetId(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-card text-card-foreground dark:bg-slate-700 text-foreground-100"
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
                <div className="p-3 bg-muted/50 dark:bg-slate-700 rounded-lg text-sm">
                  <div className="font-medium text-gray-800 dark:text-gray-100">{selectedPet.name}</div>
                  <div className="text-muted-foreground mt-1 grid grid-cols-3 gap-2">
                    <span>{t('pet.species')}: {selectedPet.species}</span>
                    <span>{t('pet.temperament')}: {selectedPet.temperament}</span>
                    <span>{t('pet.dominance')}: {selectedPet.dominance_level}/10</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Date fields (shared) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('schedule.startDate')} *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-card text-card-foreground dark:bg-slate-700 text-foreground-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('schedule.endDate')} *
              </label>
              <input
                type="date"
                required
                value={endDate}
                min={startDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-card text-card-foreground dark:bg-slate-700 text-foreground-100"
              />
            </div>
          </div>

          {startDate !== endDate && (
            <div className="p-3 bg-primary/10 rounded-lg text-sm text-indigo-700 dark:text-indigo-300">
              {t('schedule.multiDay')}: {startDate} to {endDate}
            </div>
          )}

          {/* Daily limit warning (shared) */}
          {dailyCount && dailyCount.limit > 0 && (
            <div className={`p-4 rounded-lg border ${
              dailyCount.limit_reached
                ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'
                : 'bg-primary/10 border-blue-200 dark:border-blue-800'
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
                      .replace('{date}', startDate)
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

          {/* Time fields (shared) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('schedule.dailyStartTime')} *
              </label>
              <select
                required
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-card text-card-foreground dark:bg-slate-700 text-foreground-100"
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
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-card text-card-foreground dark:bg-slate-700 text-foreground-100"
              >
                {TIME_OPTIONS.filter(t => t > startTime).map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Conflict result (single mode only) */}
          {!isMulti && conflictResult && (
            <div className={`p-4 rounded-lg ${
              conflictResult.has_conflicts
                ? 'bg-amber-50 border border-amber-200'
                : 'bg-green-50 border border-green-200'
            }`}>
              {checkingConflicts ? (
                <div className="flex items-center gap-2 text-muted-foreground">
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

          {/* Status select (shared) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('schedule.status')}
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-card text-card-foreground dark:bg-slate-700 text-foreground-100"
            >
              <option value="scheduled">{t('schedule.statuses.scheduled')}</option>
              <option value="checked_in">{t('schedule.statuses.checked_in')}</option>
              <option value="completed">{t('schedule.statuses.completed')}</option>
              <option value="cancelled">{t('schedule.statuses.cancelled')}</option>
            </select>
          </div>

          {/* Notes (shared) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isMulti ? t('multiPet.notesLabel') : t('schedule.notes')}
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-card text-card-foreground dark:bg-slate-700 text-foreground-100"
              placeholder={isMulti ? '' : 'Any special instructions for this visit...'}
            />
          </div>

          {/* Footer buttons (shared structure, mode-specific labels) */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              {t('common.cancel')}
            </button>
            {isMulti ? (
              <button
                type="submit"
                disabled={loading || multiPetIds.length === 0}
                className={`px-6 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                  dailyCount?.limit_reached
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-primary hover:bg-primary/90 text-white'
                }`}
              >
                {loading ? t('multiPet.creating') :
                  dailyCount?.limit_reached ? t('schedule.scheduleAnyway') : t('schedule.createSchedule')}
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || !singlePetId}
                className={`px-6 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                  dailyCount?.limit_reached
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : conflictResult?.has_conflicts
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-primary hover:bg-primary/90 text-white'
                }`}
              >
                {loading ? t('common.saving') : schedule ? t('schedule.updateSchedule') :
                  dailyCount?.limit_reached ? t('schedule.scheduleAnyway') :
                  conflictResult?.has_conflicts ? t('schedule.scheduleAnyway') : t('schedule.createSchedule')}
              </button>
            )}
          </div>
        </form>

        {/* Limit confirm dialog (shared) */}
        {showLimitConfirm && (
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center rounded-xl">
            <div className="bg-card text-card-foreground rounded-xl shadow-xl p-6 m-4 max-w-sm">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-bold mb-3">
                <AlertTriangle className="w-6 h-6" />
                {t('schedule.confirmOverLimit')}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                {t('schedule.confirmOverLimitMessage')
                  .replace('{limit}', String(dailyCount?.limit))
                  .replace('{date}', startDate)}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowLimitConfirm(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={doSubmit}
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
