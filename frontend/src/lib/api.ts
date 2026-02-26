const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface Owner {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  emergency_contact: string;
  emergency_phone: string;
  notes: string;
  pet_count?: number;
  created_at: string;
  updated_at: string;
}

export interface OwnerWithPets extends Owner {
  pets: PetListItem[];
}

export interface OwnerFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  notes?: string;
}

export interface OwnerListItem {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  email: string;
}

export interface PetListItem {
  id: number;
  name: string;
  species: string;
  temperament: string;
  dominance_level: number;
  size: string;
  owner: number | null;
}

export interface Vaccination {
  id: number;
  vax_type: string;
  date: string;
  created_at: string;
}

export interface Pet {
  id: number;
  name: string;
  species: string;
  breed: string;
  age: number;
  temperament: string;
  dominance_level: number;
  size: string;
  neutered: boolean;
  sex: string;
  birth_date: string | null;
  special_notes: string;
  owner: number | null;
  owner_details?: OwnerListItem;
  vaccinations: Vaccination[];
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
  neutered: boolean;
  sex: string;
  birth_date: string | null;
  special_notes: string;
  owner?: number | null;
  vaccinations?: Array<{ vax_type: string; date: string }>;
}

export interface VaccinationType {
  id: number;
  name: string;
  label: string;
  enabled: boolean;
  order: number;
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
  start_date: string;
  end_date: string;
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
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string;
}

export interface Conflict {
  conflicting_pet: string;
  conflicting_schedule_id: number;
  reason: string;
  date_range?: string;
  time_slot: string;
}

export interface ConflictCheckResult {
  has_conflicts: boolean;
  conflicts: Conflict[];
  overlapping_pets_count: number;
}

export interface BatchScheduleFormData {
  pet_ids: number[];
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string;
}

export interface NurserySetting {
  daily_booking_limit: number;
  updated_at: string;
}

export interface DailyCountResult {
  date: string;
  count: number;
  limit: number;
  limit_reached: boolean;
  limit_exceeded: boolean;
}

export interface BatchScheduleResult {
  created_count: number;
  schedules: Schedule[];
  warnings?: Array<{
    pet_id: number;
    pet_name: string;
    schedule_id: number;
    conflicts: Conflict[];
  }>;
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
  owners: {
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
  },

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

  vaccinationTypes: {
    list: () => fetchApi<VaccinationType[]>('/vaccination-types/'),
    create: (data: Omit<VaccinationType, 'id'>) => fetchApi<VaccinationType>('/vaccination-types/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: number, data: Partial<VaccinationType>) => fetchApi<VaccinationType>(`/vaccination-types/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    delete: (id: number) => fetchApi<void>(`/vaccination-types/${id}/`, { method: 'DELETE' }),
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
      start_date: string;
      end_date: string;
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
    batchCreate: (data: BatchScheduleFormData) => fetchApi<BatchScheduleResult>('/schedules/batch_create/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    dailyCount: (date: string) => fetchApi<DailyCountResult>(`/schedules/daily_count/?date=${date}`),
  },

  nurserySettings: {
    get: () => fetchApi<NurserySetting>('/settings/'),
    update: (data: Partial<NurserySetting>) => fetchApi<NurserySetting>('/settings/update/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  },
};
