export interface MedicalNote {
  id: number;
  pet: number;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface MedicalNoteFormData {
  pet: number;
  title: string;
  description?: string;
}
