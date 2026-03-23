export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserFormData {
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'user';
  is_active: boolean;
  password?: string;
  password_confirm?: string;
}

export interface UserCreateData {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  password_confirm: string;
  role?: 'admin' | 'user';
}
