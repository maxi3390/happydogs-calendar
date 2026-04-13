import { fetchApi, uploadFile } from '../_http/client';
import { Owner, OwnerWithPets, OwnerFormData, OwnerListItem } from './types';

export const ownersApi = {
  list: () => fetchApi<Owner[]>('/owners/'),
  get: (id: number) => fetchApi<OwnerWithPets>(`/owners/${id}/`),
  create: (data: OwnerFormData) => fetchApi<Owner>('/owners/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  createWithAvatar: (data: OwnerFormData, profilePicture: File) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      if (typeof value === 'boolean') {
        formData.append(key, value ? 'true' : 'false');
      } else {
        formData.append(key, String(value));
      }
    });
    formData.append('profile_picture', profilePicture);
    return uploadFile<Owner>('/owners/', formData);
  },
  update: (id: number, data: Partial<OwnerFormData>) => fetchApi<Owner>(`/owners/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => fetchApi<void>(`/owners/${id}/`, { method: 'DELETE' }),
  dropdown: () => fetchApi<OwnerListItem[]>('/owners/dropdown/'),
  uploadProfilePicture: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('profile_picture', file);
    return uploadFile<Owner>(`/owners/${id}/upload_profile_picture/`, formData);
  },
  deleteProfilePicture: (id: number) =>
    fetchApi<void>(`/owners/${id}/delete_profile_picture/`, { method: 'DELETE' }),
};
