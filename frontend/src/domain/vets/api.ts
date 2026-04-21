import { fetchApi } from '../_http/client';
import { Vet, VetFormData } from './types';

export const vetsApi = {
  list: () => fetchApi<Vet[]>('/vets/'),
  get: (id: number) => fetchApi<Vet>(`/vets/${id}/`),
  create: (data: VetFormData) => fetchApi<Vet>('/vets/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: Partial<VetFormData>) => fetchApi<Vet>(`/vets/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => fetchApi<void>(`/vets/${id}/`, { method: 'DELETE' }),
};
