export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: 'admin' | 'user';
  language: 'en' | 'es';
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

/** Filter params for the admin user list. */
export interface UserListFilters {
  role?: 'admin' | 'user';
  is_active?: boolean;
  /** Mutually exclusive with `last_login_never`. Match users whose
   *  last_login is within this many days. */
  last_login_within_days?: number;
  /** Mutually exclusive with `last_login_within_days`. Match users
   *  who never logged in. */
  last_login_never?: boolean;
}

/** Counts returned by `GET /api/users/<id>/deletion_impact/`. The
 *  modal renders these as the deletion side-effect summary. */
export interface DeletionImpact {
  notifications: number;
  audit_log_entries: number;
}
