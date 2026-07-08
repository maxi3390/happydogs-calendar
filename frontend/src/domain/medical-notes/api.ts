import { fetchApi, fetchList } from '../_http/client';
import { MedicalNote, MedicalNoteFormData } from './types';

export const medicalNotesApi = {
  list: (petId?: number) => {
    const query = petId ? `?pet_id=${petId}` : '';
    return fetchList<MedicalNote>(`/medical-notes/${query}`);
  },
  create: (data: MedicalNoteFormData) => fetchApi<MedicalNote>('/medical-notes/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: Partial<MedicalNoteFormData>) => fetchApi<MedicalNote>(`/medical-notes/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => fetchApi<void>(`/medical-notes/${id}/`, { method: 'DELETE' }),
};
