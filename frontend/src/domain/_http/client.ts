const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

function handleAuthError() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_tokens');
    localStorage.removeItem('auth_user');
    window.location.href = '/login';
  }
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  const tokens = localStorage.getItem('auth_tokens');
  if (!tokens) return null;
  try {
    const parsed = JSON.parse(tokens);
    return parsed.access || null;
  } catch {
    return null;
  }
}

function getHeaders(): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      handleAuthError();
    }
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || `API Error: ${res.status}`);
  }

  // Handle 204 No Content responses
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export async function uploadFile<T>(endpoint: string, formData: FormData): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      handleAuthError();
    }
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || error.detail || `Upload Error: ${res.status}`);
  }

  return res.json();
}

/**
 * Authenticated download of a binary/text file. Returns a Blob and the
 * filename suggested by the server (from `Content-Disposition`), so the
 * caller can create an object URL and trigger a native download. Necessary
 * because `<a href>` links cannot carry an Authorization header.
 */
export async function downloadFile(endpoint: string): Promise<{ blob: Blob; filename: string | null }> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      handleAuthError();
    }
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || `Download Error: ${res.status}`);
  }

  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const filename = match ? match[1] : null;

  return { blob: await res.blob(), filename };
}
