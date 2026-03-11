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
  }>;
  profile_picture_url?: string | null;
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
