import { fetchApi, uploadFile } from '../_http/client';
import { DocumentItem } from './types';

export const documentsApi = {
  list: (params?: { pet_id?: number; owner_id?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.pet_id) searchParams.set('pet_id', params.pet_id.toString());
    if (params?.owner_id) searchParams.set('owner_id', params.owner_id.toString());
    const query = searchParams.toString();
    return fetchApi<DocumentItem[]>(`/documents/${query ? `?${query}` : ''}`);
  },
  upload: (file: File, data: { pet?: number; owner?: number; description?: string }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (data.pet) formData.append('pet', data.pet.toString());
    if (data.owner) formData.append('owner', data.owner.toString());
    if (data.description) formData.append('description', data.description);
    return uploadFile<DocumentItem>('/documents/', formData);
  },
  delete: (id: number) => fetchApi<void>(`/documents/${id}/`, { method: 'DELETE' }),
};
