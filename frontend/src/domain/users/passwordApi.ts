/**
 * Password change / reset API helpers.
 *
 * These don't go through `fetchApi` because that helper throws on
 * non-2xx and discards the structured error body — the two password
 * forms specifically need field-level errors (`{ old_password: [...] }`,
 * etc.) so they can highlight the matching input. We talk to fetch
 * directly here and surface the original response shape.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

/** A normalized DRF-style validation error: each key maps to a list of
 *  human-readable strings. `_global_` carries `non_field_errors` /
 *  `detail` style messages so the form can show a top-of-form banner.
 */
export type FieldErrors = Record<string, string[]>;

export type PasswordResult =
  | { ok: true }
  | { ok: false; fieldErrors: FieldErrors };


function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('auth_tokens');
  if (!raw) return null;
  try {
    return JSON.parse(raw).access || null;
  } catch {
    return null;
  }
}


function normalizeErrors(body: unknown): FieldErrors {
  // DRF returns either { field: ["msg"] } or { detail: "msg" } or
  // { non_field_errors: ["msg"] }. Coerce all three into a single
  // FieldErrors shape; the global bucket is `_global_`.
  if (!body || typeof body !== 'object') {
    return { _global_: ['An unexpected error occurred.'] };
  }
  const out: FieldErrors = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    const target = key === 'detail' || key === 'non_field_errors' ? '_global_' : key;
    if (Array.isArray(value)) {
      out[target] = (out[target] || []).concat(value.map(String));
    } else if (typeof value === 'string') {
      out[target] = (out[target] || []).concat([value]);
    }
  }
  if (Object.keys(out).length === 0) {
    out._global_ = ['Request failed.'];
  }
  return out;
}


async function submit(
  url: string,
  method: 'PUT' | 'POST',
  body: Record<string, string>,
): Promise<PasswordResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers,
    body: JSON.stringify(body),
  });

  if (res.ok) return { ok: true };

  let parsed: unknown;
  try { parsed = await res.json(); } catch { parsed = null; }
  return { ok: false, fieldErrors: normalizeErrors(parsed) };
}


/** Self-service password change. Verifies the caller's current password. */
export function changeOwnPassword(
  oldPassword: string,
  newPassword: string,
  newPasswordConfirm: string,
): Promise<PasswordResult> {
  return submit('/auth/change-password/', 'PUT', {
    old_password: oldPassword,
    new_password: newPassword,
    new_password_confirm: newPasswordConfirm,
  });
}


/** Admin-override password reset. No old-password required. */
export function setUserPassword(
  userId: number,
  newPassword: string,
  newPasswordConfirm: string,
): Promise<PasswordResult> {
  return submit(`/users/${userId}/set_password/`, 'POST', {
    new_password: newPassword,
    new_password_confirm: newPasswordConfirm,
  });
}
