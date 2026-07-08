import { fetchApi, fetchList } from '../_http/client';
import { VaccinationType } from './types';

export const vaccinationTypesApi = {
  list: () => fetchList<VaccinationType>('/vaccination-types/'),
  create: (data: Omit<VaccinationType, 'id'>) => fetchApi<VaccinationType>('/vaccination-types/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: Partial<VaccinationType>) =>
    fetchApi<VaccinationType>(`/vaccination-types/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: number) => fetchApi<void>(`/vaccination-types/${id}/`, { method: 'DELETE' }),
};
