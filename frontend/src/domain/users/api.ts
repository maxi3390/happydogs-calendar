import { fetchApi } from '../_http/client';
import { User, UserFormData, UserCreateData } from './types';

export const usersApi = {
  list: () => fetchApi<User[]>('/users/'),
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
};
