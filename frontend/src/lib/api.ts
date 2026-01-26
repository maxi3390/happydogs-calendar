const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface Pet {
  id: number;
  name: string;
  species: string;
  breed: string;
  age: number;
  temperament: string;
  dominance_level: number;
  size: string;
  special_notes: string;
  owner_name: string;
  owner_phone: string;
  created_at: string;
  updated_at: string;
}

export interface PetFormData {
  name: string;
  species: string;
  breed: string;
  age: number;
  temperament: string;
  dominance_level: number;
  size: string;
  special_notes: string;
  owner_name: string;
  owner_phone: string;
}

export interface Schedule {
  id: number;
  pet: number;
  pet_details: {
    id: number;
    name: string;
    species: string;
    temperament: string;
    dominance_level: number;
    size: string;
  };
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string;
  conflicts: Conflict[];
  created_at: string;
  updated_at: string;
}

export interface ScheduleFormData {
  pet: number;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string;
}

export interface Conflict {
  conflicting_pet: string;
  conflicting_schedule_id: number;
  reason: string;
  time_slot: string;
}

export interface ConflictCheckResult {
  has_conflicts: boolean;
  conflicts: Conflict[];
  overlapping_pets_count: number;
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || `API Error: ${res.status}`);
  }

  return res.json();
}

export const api = {
  pets: {
    list: () => fetchApi<Pet[]>('/pets/'),
    get: (id: number) => fetchApi<Pet>(`/pets/${id}/`),
    create: (data: PetFormData) => fetchApi<Pet>('/pets/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: number, data: Partial<PetFormData>) => fetchApi<Pet>(`/pets/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    delete: (id: number) => fetchApi<void>(`/pets/${id}/`, { method: 'DELETE' }),
    compatibility: (id: number) => fetchApi<Array<{
      pet_id: number;
      pet_name: string;
      is_compatible: boolean;
      reason: string;
    }>>(`/pets/${id}/compatibility/`),
  },

  schedules: {
    list: (params?: { date?: string; start_date?: string; end_date?: string; pet_id?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.date) searchParams.set('date', params.date);
      if (params?.start_date) searchParams.set('start_date', params.start_date);
      if (params?.end_date) searchParams.set('end_date', params.end_date);
      if (params?.pet_id) searchParams.set('pet_id', params.pet_id.toString());
      const query = searchParams.toString();
      return fetchApi<Schedule[]>(`/schedules/${query ? `?${query}` : ''}`);
    },
    get: (id: number) => fetchApi<Schedule>(`/schedules/${id}/`),
    create: (data: ScheduleFormData) => fetchApi<Schedule & { warnings?: Conflict[] }>('/schedules/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: number, data: Partial<ScheduleFormData>) => fetchApi<Schedule>(`/schedules/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    delete: (id: number) => fetchApi<void>(`/schedules/${id}/`, { method: 'DELETE' }),
    checkConflicts: (data: {
      pet_id: number;
      date: string;
      start_time: string;
      end_time: string;
      exclude_schedule_id?: number;
    }) => fetchApi<ConflictCheckResult>('/schedules/check_conflicts/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    dailySummary: (date: string) => fetchApi<{
      date: string;
      total_schedules: number;
      by_status: Record<string, number>;
      schedules: Schedule[];
    }>(`/schedules/daily_summary/?date=${date}`),
  },
};
