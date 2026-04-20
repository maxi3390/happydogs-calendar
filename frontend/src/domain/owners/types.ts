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
}

export interface OwnerListItem {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  email: string;
  id_number: string;
}
