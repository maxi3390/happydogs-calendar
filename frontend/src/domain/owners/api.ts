import { fetchApi, uploadFile } from '../_http/client';
import { Owner, OwnerWithPets, OwnerFormData, OwnerListItem } from './types';

export const ownersApi = {
  list: () => fetchApi<Owner[]>('/owners/'),
  get: (id: number) => fetchApi<OwnerWithPets>(`/owners/${id}/`),
  create: (data: OwnerFormData) => fetchApi<Owner>('/owners/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
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
