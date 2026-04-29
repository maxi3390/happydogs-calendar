import { fetchApi } from '../_http/client';
import { ActivityFilters, ActivityResponse } from './types';

function buildQuery(filters?: ActivityFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.entity_type) params.set('entity_type', filters.entity_type);
  if (filters.action) params.set('action', filters.action);
  if (filters.user !== undefined) params.set('user', String(filters.user));
  if (filters.since) params.set('since', filters.since);
  if (filters.until) params.set('until', filters.until);
  if (filters.limit !== undefined) params.set('limit', String(filters.limit));
  if (filters.offset !== undefined) params.set('offset', String(filters.offset));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const auditLogApi = {
  /** Cross-entity activity feed for /admin/activity. Admin-only. */
  activity: (filters?: ActivityFilters) =>
    fetchApi<ActivityResponse>(`/audit-log/activity/${buildQuery(filters)}`),
};
