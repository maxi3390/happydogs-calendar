import { fetchApi, uploadFile } from '../_http/client';
import { Pet, PetFormData, PetCompatibilityResult } from './types';

export const petsApi = {
  list: () => fetchApi<Pet[]>('/pets/'),
  get: (id: number) => fetchApi<Pet>(`/pets/${id}/`),
  create: (data: PetFormData) => fetchApi<Pet>('/pets/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  createWithAvatar: (data: PetFormData, profilePicture: File) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      if (key === 'vaccinations') {
        formData.append(key, JSON.stringify(value));
      } else if (typeof value === 'boolean') {
        formData.append(key, value ? 'true' : 'false');
      } else {
        formData.append(key, String(value));
      }
    });
    formData.append('profile_picture', profilePicture);
    return uploadFile<Pet>('/pets/', formData);
  },
  update: (id: number, data: Partial<PetFormData>) => fetchApi<Pet>(`/pets/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => fetchApi<void>(`/pets/${id}/`, { method: 'DELETE' }),
  compatibility: (id: number) => fetchApi<PetCompatibilityResult[]>(`/pets/${id}/compatibility/`),
  uploadProfilePicture: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('profile_picture', file);
    return uploadFile<Pet>(`/pets/${id}/upload_profile_picture/`, formData);
  },
  deleteProfilePicture: (id: number) =>
    fetchApi<void>(`/pets/${id}/delete_profile_picture/`, { method: 'DELETE' }),
};
