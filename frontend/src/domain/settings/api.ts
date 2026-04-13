import { fetchApi, uploadFile } from '../_http/client';
import { NurserySetting } from './types';

export const nurserySettingsApi = {
  get: () => fetchApi<NurserySetting>('/settings/'),
  update: (data: Partial<NurserySetting>) => fetchApi<NurserySetting>('/settings/update/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    return uploadFile<NurserySetting>('/settings/upload_logo/', formData);
  },
  deleteLogo: () => fetchApi<void>('/settings/delete_logo/', { method: 'DELETE' }),
};
