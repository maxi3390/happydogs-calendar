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

export interface DailyCountResult {
  date: string;
  count: number;
  limit: number;
  limit_reached: boolean;
  limit_exceeded: boolean;
}
