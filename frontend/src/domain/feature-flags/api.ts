import { fetchApi } from '../_http/client';
import { FeatureFlag } from './types';

export const featureFlagsApi = {
  list: () => fetchApi<FeatureFlag[]>('/feature-flags/'),
  toggle: (key: string, enabled: boolean) =>
    fetchApi<FeatureFlag>(`/feature-flags/${encodeURIComponent(key)}/`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    }),
};
