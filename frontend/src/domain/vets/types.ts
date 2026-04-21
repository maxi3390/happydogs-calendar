export interface Vet {
  id: number;
  name: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
  province: string;
  country: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface VetFormData {
  name: string;
  phone?: string;
  email?: string;
  street?: string;
  city?: string;
  state?: string;
  province?: string;
  country?: string;
  notes?: string;
}

export interface VetListItem {
  id: number;
  name: string;
  phone: string;
  email: string;
  city: string;
}
