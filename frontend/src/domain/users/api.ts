import { fetchApi } from '../_http/client';
import { User, UserFormData, UserCreateData } from './types';
import { changeOwnPassword, setUserPassword } from './passwordApi';

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
  setLanguage: (language: 'en' | 'es') => fetchApi<User>('/users/me/language/', {
    method: 'PATCH',
    body: JSON.stringify({ language }),
  }),
  // Password helpers — see ./passwordApi.ts. Their result type is
  // `PasswordResult` (not the user shape) because the forms need
  // field-level errors that fetchApi swallows.
  changeOwnPassword,
  setPassword: setUserPassword,
};
