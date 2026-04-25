export interface PetIncompatibility {
  id: number;
  pet1: number;
  pet2: number;
  pet1_name: string;
  pet2_name: string;
  reason: string;
  created_at: string;
  updated_at: string;
}

export interface PetIncompatibilityFormData {
  pet1: number;
  pet2: number;
  reason: string;
}
