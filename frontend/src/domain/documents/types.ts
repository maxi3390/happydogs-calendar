export interface DocumentItem {
  id: number;
  pet: number | null;
  owner: number | null;
  file: string;
  file_url: string;
  original_filename: string;
  description: string;
  uploaded_at: string;
}
