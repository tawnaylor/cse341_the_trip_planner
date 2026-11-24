export const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

export async function api(path, { body, ...options } = {}) {
  const res = await fetch(API_BASE + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || (data.errors && data.errors[0].msg) || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}
