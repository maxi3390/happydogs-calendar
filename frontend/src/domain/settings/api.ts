import { fetchApi } from '../_http/client';
import { NurserySetting } from './types';

export const nurserySettingsApi = {
  get: () => fetchApi<NurserySetting>('/settings/'),
  update: (data: Partial<NurserySetting>) => fetchApi<NurserySetting>('/settings/update/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
};
