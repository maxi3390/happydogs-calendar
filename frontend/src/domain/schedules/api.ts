import { fetchApi, fetchList } from '../_http/client';
import {
  Schedule,
  ScheduleFormData,
  Conflict,
  ConflictCheckResult,
  BatchScheduleFormData,
  BatchScheduleResult,
  DailyCountResult,
} from './types';

export const schedulesApi = {
  list: (params?: { date?: string; start_date?: string; end_date?: string; pet_id?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.date) searchParams.set('date', params.date);
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.pet_id) searchParams.set('pet_id', params.pet_id.toString());
    const query = searchParams.toString();
    // fetchList follows pagination `next`, so the calendar still receives
    // every schedule in the requested range.
    return fetchList<Schedule>(`/schedules/${query ? `?${query}` : ''}`);
  },
  get: (id: number) => fetchApi<Schedule>(`/schedules/${id}/`),
  create: (data: ScheduleFormData) =>
    fetchApi<Schedule & { warnings?: Conflict[] }>('/schedules/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<ScheduleFormData>) =>
    fetchApi<Schedule>(`/schedules/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: number) => fetchApi<void>(`/schedules/${id}/`, { method: 'DELETE' }),
  checkConflicts: (data: {
    pet_id: number;
    start_date: string;
    end_date: string;
    start_time: string;
    end_time: string;
    exclude_schedule_id?: number;
  }) => fetchApi<ConflictCheckResult>('/schedules/check_conflicts/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  dailySummary: (date: string) => fetchApi<{
    date: string;
    total_schedules: number;
    by_status: Record<string, number>;
    schedules: Schedule[];
  }>(`/schedules/daily_summary/?date=${date}`),
  batchCreate: (data: BatchScheduleFormData) =>
    fetchApi<BatchScheduleResult>('/schedules/batch_create/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  dailyCount: (date: string) =>
    fetchApi<DailyCountResult>(`/schedules/daily_count/?date=${date}`),
};
