export interface Vaccination {
  id: number;
  vax_type: string;
  date: string;
  created_at: string;
}

export interface VaccinationType {
  id: number;
  name: string;
  label: string;
  enabled: boolean;
  order: number;
}
