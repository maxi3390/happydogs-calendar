const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || `API Error: ${res.status}`);
  }

  return res.json();
}

export async function uploadFile<T>(endpoint: string, formData: FormData): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || error.detail || `Upload Error: ${res.status}`);
  }

  return res.json();
}
