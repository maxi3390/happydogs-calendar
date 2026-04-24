import { VetListItem } from '../vets/types';

export interface Owner {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  id_number: string;
  street: string;
  city: string;
  state: string;
  province: string;
  country: string;
  birth_date: string | null;
  emergency_contact: string;
  emergency_phone: string;
  emergency_contact_can_pickup: boolean;
  notes: string;
  primary_vet: number | null;
  emergency_vet: number | null;
  /** Compact projections of the referenced vets (id + name + contact + city).
   *  Populated by the backend when the corresponding FK is set; `null`
   *  otherwise. Missing on older cached payloads — callers should degrade
   *  gracefully (fall back to the legacy `#<id>` placeholder). */
  primary_vet_details?: VetListItem | null;
  emergency_vet_details?: VetListItem | null;
  pet_count?: number;
  profile_picture_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OwnerWithPets extends Owner {
  pets: Array<{
    id: number;
    name: string;
    species: string;
    temperament: string;
    dominance_level: number;
    size: string;
    owner: number | null;
    profile_picture_url?: string | null;
  }>;
  profile_picture_url?: string | null;
}

export interface OwnerFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  id_number?: string;
  street?: string;
  city?: string;
  state?: string;
  province?: string;
  country?: string;
  birth_date?: string | null;
  emergency_contact?: string;
  emergency_phone?: string;
  emergency_contact_can_pickup?: boolean;
  notes?: string;
  primary_vet?: number | null;
  emergency_vet?: number | null;
}

export interface OwnerListItem {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  email: string;
  id_number: string;
  profile_picture_url?: string | null;
}
