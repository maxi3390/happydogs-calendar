'use client';

import { X, Clock, Calendar, User, Phone, AlertTriangle, FileText } from 'lucide-react';
import { Schedule } from '@/lib/api';
import { useTranslation } from '@/lib/translations';

interface ScheduleDetailsPopupProps {
  schedule: Schedule;
  onClose: () => void;
}

export default function ScheduleDetailsPopup({ schedule, onClose }: ScheduleDetailsPopupProps) {
  const { t } = useTranslation();
  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
    checked_in: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
    completed: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
    cancelled: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              schedule.conflicts?.length ? 'bg-amber-500' : 'bg-emerald-500'
            }`} />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              {schedule.pet_details.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('schedule.status')}</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[schedule.status]}`}>
              {schedule.status.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('schedule.date')}</p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {schedule.start_date === schedule.end_date
                    ? schedule.start_date
                    : `${schedule.start_date} - ${schedule.end_date}`}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('schedule.time')}</p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-slate-700 pt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('schedule.petDetails')}</p>
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t('pet.species')}</span>
                <span className="text-gray-800 dark:text-gray-200 capitalize">{schedule.pet_details.species}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t('pet.temperament')}</span>
                <span className="text-gray-800 dark:text-gray-200 capitalize">{schedule.pet_details.temperament}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t('pet.size')}</span>
                <span className="text-gray-800 dark:text-gray-200 capitalize">{schedule.pet_details.size}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t('pet.dominance')}</span>
                <span className="text-gray-800 dark:text-gray-200">{schedule.pet_details.dominance_level}/10</span>
              </div>
            </div>
          </div>

          {schedule.conflicts && schedule.conflicts.length > 0 && (
            <div className="border-t border-gray-100 dark:border-slate-700 pt-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  {schedule.conflicts.length} {t('schedule.conflicts')}
                </p>
              </div>
              <div className="space-y-2">
                {schedule.conflicts.map((conflict, i) => (
                  <div key={i} className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-2 text-sm">
                    <p className="font-medium text-amber-800 dark:text-amber-200">{conflict.conflicting_pet}</p>
                    <p className="text-amber-600 dark:text-amber-300 text-xs">{conflict.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {schedule.notes && (
            <div className="border-t border-gray-100 dark:border-slate-700 pt-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('schedule.notes')}</p>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
                {schedule.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
