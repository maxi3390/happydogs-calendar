import { OwnerListItem } from '../owners/types';
import { Vaccination } from '../vaccinations/types';
import { VetListItem } from '../vets/types';

export interface PetListItem {
  id: number;
  name: string;
  species: string;
  temperament: string;
  dominance_level: number;
  size: string;
  owner: number | null;
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
  weight: number | null;
  last_internal_deworming_date: string | null;
  last_external_deworming_date: string | null;
  special_notes: string;
  owner: number | null;
  vet_override: number | null;
  owner_details?: OwnerListItem;
  vet_override_details?: VetListItem | null;
  effective_vet_details?: VetListItem | null;
  emergency_vet_details?: VetListItem | null;
  vaccinations: Vaccination[];
  medical_notes_count?: number;
  profile_picture_url?: string | null;
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
  weight: number | null;
  last_internal_deworming_date: string | null;
  last_external_deworming_date: string | null;
  special_notes: string;
  owner?: number | null;
  vet_override?: number | null;
  vaccinations?: Array<{ vax_type: string; date: string }>;
}

export interface PetCompatibilityResult {
  pet_id: number;
  pet_name: string;
  is_compatible: boolean;
  reason: string;
}
