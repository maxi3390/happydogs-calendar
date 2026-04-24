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
  special_notes: string;
  owner: number | null;
  vet_override: number | null;
  owner_details?: OwnerListItem;
  /** Compact projection of the overridden vet (id + name + contact + city).
   *  Populated by the backend when `vet_override` is set; `null` otherwise.
   *  Missing on older cached payloads — callers should degrade gracefully. */
  vet_override_details?: VetListItem | null;
  /** The vet actually responsible for this pet, resolved server-side via
   *  `Pet.effective_vet`: override → owner's primary vet → `null`. The
   *  pet list accordion renders this as the "Vet" row for quick emergency
   *  access regardless of which field holds the value. */
  effective_vet_details?: VetListItem | null;
  /** The pet's emergency vet, sourced from the pet's owner's
   *  `emergency_vet`. `null` when the pet has no owner or the owner has
   *  no emergency vet recorded. */
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
