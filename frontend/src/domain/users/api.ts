import { fetchApi } from '../_http/client';
import { User, UserFormData, UserCreateData, UserListFilters, DeletionImpact } from './types';
import { changeOwnPassword, setUserPassword } from './passwordApi';

function buildListQuery(filters?: UserListFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.role) params.set('role', filters.role);
  if (filters.is_active !== undefined) params.set('is_active', String(filters.is_active));
  if (filters.last_login_within_days !== undefined) {
    params.set('last_login_within_days', String(filters.last_login_within_days));
  } else if (filters.last_login_never) {
    params.set('last_login_never', 'true');
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const usersApi = {
  list: (filters?: UserListFilters) => fetchApi<User[]>(`/users/${buildListQuery(filters)}`),
  get: (id: number) => fetchApi<User>(`/users/${id}/`),
  create: (data: UserCreateData) => fetchApi<User>('/users/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: Partial<UserFormData>) => fetchApi<User>(`/users/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => fetchApi<void>(`/users/${id}/`, { method: 'DELETE' }),
  me: () => fetchApi<User>('/users/me/'),
  setLanguage: (language: 'en' | 'es') => fetchApi<User>('/users/me/language/', {
    method: 'PATCH',
    body: JSON.stringify({ language }),
  }),

  // ── Per-user state actions ──────────────────────────────────────
  // Returned `User` reflects the post-mutation state so callers can
  // patch the row in place without a list refetch.
  deactivate: (id: number) => fetchApi<User>(`/users/${id}/deactivate/`, { method: 'POST' }),
  activate: (id: number) => fetchApi<User>(`/users/${id}/activate/`, { method: 'POST' }),
  promote: (id: number) => fetchApi<User>(`/users/${id}/promote/`, { method: 'POST' }),
  demote: (id: number) => fetchApi<User>(`/users/${id}/demote/`, { method: 'POST' }),

  /** Counts what will be discarded / anonymized when the user is deleted. */
  deletionImpact: (id: number) => fetchApi<DeletionImpact>(`/users/${id}/deletion_impact/`),

  // ── Bulk actions ────────────────────────────────────────────────
  // Each accepts the selected ids and returns `{updated|deleted: N}`.
  // The page re-fetches the list after a successful bulk action.
  bulkDeactivate: (ids: number[]) => fetchApi<{ updated: number }>('/users/bulk_deactivate/', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  }),
  bulkActivate: (ids: number[]) => fetchApi<{ updated: number }>('/users/bulk_activate/', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  }),
  bulkDelete: (ids: number[]) => fetchApi<{ deleted: number }>('/users/bulk_delete/', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  }),
  bulkSetRole: (ids: number[], role: 'admin' | 'user') => fetchApi<{ updated: number }>('/users/bulk_set_role/', {
    method: 'POST',
    body: JSON.stringify({ ids, role }),
  }),

  // Password helpers — see ./passwordApi.ts. Their result type is
  // `PasswordResult` (not the user shape) because the forms need
  // field-level errors that fetchApi swallows.
  changeOwnPassword,
  setPassword: setUserPassword,
};
