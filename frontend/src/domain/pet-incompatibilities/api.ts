import { fetchApi, fetchList } from '../_http/client';
import { PetIncompatibility, PetIncompatibilityFormData } from './types';

export const petIncompatibilitiesApi = {
  list: () => fetchList<PetIncompatibility>('/pet-incompatibilities/'),
  create: (data: PetIncompatibilityFormData) =>
    fetchApi<PetIncompatibility>('/pet-incompatibilities/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<PetIncompatibilityFormData>) =>
    fetchApi<PetIncompatibility>(`/pet-incompatibilities/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchApi<void>(`/pet-incompatibilities/${id}/`, { method: 'DELETE' }),
};
