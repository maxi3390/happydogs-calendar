export interface ImportSummary {
  counts: {
    nursery_settings: number;
    vaccination_types: number;
    vets: number;
    owners: number;
    pets: number;
    vaccinations: number;
    medical_notes: number;
    schedules: number;
  };
  version: number;
}

export type ImportFormat = 'json' | 'csv';
