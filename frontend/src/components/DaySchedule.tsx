'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock, AlertTriangle, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { api, Schedule } from '@/lib/api';
import { useTranslation } from '@/lib/translations';
import { getDateLocale } from '@/lib/dateLocale';
import { Button } from '@/components/ui/Button';

interface DayScheduleProps {
  date: Date;
  onEditSchedule: (schedule: Schedule) => void;
  refreshTrigger: number;
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  checked_in: 'bg-green-100 text-green-800 border-green-200',
  completed: 'bg-gray-100 text-gray-800 border-border',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

const statusIcons: Record<string, React.ReactNode> = {
  scheduled: <Clock className="w-4 h-4" />,
  checked_in: <CheckCircle className="w-4 h-4" />,
  completed: <CheckCircle className="w-4 h-4" />,
  cancelled: <XCircle className="w-4 h-4" />,
};

export default function DaySchedule({ date, onEditSchedule, refreshTrigger }: DayScheduleProps) {
  const { t, language } = useTranslation();
  const dateLocale = getDateLocale(language);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const data = await api.schedules.list({ date: dateStr });
      setSchedules(data.sort((a, b) => a.start_time.localeCompare(b.start_time)));
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [date, refreshTrigger]);

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmations.deleteSchedule'))) {
      return;
    }

    setDeletingId(id);
    try {
      await api.schedules.delete(id);
      setSchedules(schedules.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      alert(t('errors.deleteFailed'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (schedule: Schedule, newStatus: string) => {
    try {
      await api.schedules.update(schedule.id, { status: newStatus });
      setSchedules(schedules.map(s =>
        s.id === schedule.id ? { ...s, status: newStatus } : s
      ));
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-card text-card-foreground rounded-xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-24 bg-gray-100 dark:bg-slate-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card text-card-foreground rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 border-b border-indigo-400 dark:border-indigo-600 bg-background">
        <h3 className="font-semibold text-white">
          {format(date, 'EEEE, MMMM d, yyyy')}
        </h3>
        <p className="text-indigo-100 text-sm">
          {schedules.length} {schedules.length === 1 ? t('schedule.title') : t('schedule.title')}
        </p>
      </div>

      {schedules.length === 0 ? (
        <div className="p-8 text-center">
          <Clock className="w-12 h-12 mx-auto text-gray-300 dark:text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{t('schedule.noSchedules')}</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-slate-700 max-h-[400px] overflow-y-auto">
          {schedules.map(schedule => (
            <div
              key={schedule.id}
              className={`p-4 ${schedule.conflicts?.length ? 'bg-amber-50 dark:bg-amber-900/20' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-800 dark:text-gray-100">
                      {schedule.pet_details.name}
                    </h4>
                    {schedule.conflicts?.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" />
                        {schedule.conflicts.length} {t('schedule.conflicts')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                    {schedule.start_date !== schedule.end_date && (
                      <span className="ml-2 text-primary">
                        ({schedule.start_date} to {schedule.end_date})
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <select
                      value={schedule.status}
                      onChange={e => handleStatusChange(schedule, e.target.value)}
                      className={`text-xs px-2 py-1 rounded-full border cursor-pointer ${statusColors[schedule.status]}`}
                    >
                      <option value="scheduled">{t('schedule.statuses.scheduled')}</option>
                      <option value="checked_in">{t('schedule.statuses.checked_in')}</option>
                      <option value="completed">{t('schedule.statuses.completed')}</option>
                      <option value="cancelled">{t('schedule.statuses.cancelled')}</option>
                    </select>
                    <span className="text-xs text-muted-foreground">
                      {schedule.pet_details.species} • {schedule.pet_details.temperament}
                    </span>
                  </div>

                  {schedule.conflicts?.length > 0 && (
                    <div className="mt-3 p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                      <p className="text-xs font-medium text-amber-800 dark:text-amber-200">{t('schedule.conflicts')}:</p>
                      {schedule.conflicts.map((conflict, i) => (
                        <p key={i} className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                          • {conflict.conflicting_pet}: {conflict.reason}
                        </p>
                      ))}
                    </div>
                  )}

                  {schedule.notes && (
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      {t('common.note')}: {schedule.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 ml-4">
                  <Button
                    onClick={() => onEditSchedule(schedule)}
                    variant="ghost"
                    size="icon"
                  >
                    <Edit2 className="w-4 h-4 text-primary" />
                  </Button>
                  <Button
                    onClick={() => handleDelete(schedule.id)}
                    disabled={deletingId === schedule.id}
                    variant="ghost"
                    size="icon"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
