/**
 * The API URL is baked in at build time when VITE_API_URL is set. Otherwise it
 * is derived from the current host, which keeps the app working whether it is
 * opened on localhost or on the machine's LAN address.
 */
export const API_URL =
  import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:1337`;

const TOKEN_KEY = 'tuafe.jwt';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

const request = async (path, { method = 'GET', body, auth = false } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  const token = auth ? getToken() : null;

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.error?.message || payload?.message?.[0]?.messages?.[0]?.message || 'Request failed';
    throw new Error(message);
  }

  return payload;
};

export const login = (identifier, password) =>
  request('/api/auth/local', { method: 'POST', body: { identifier, password } });

export const fetchInvite = (token) => request(`/api/churches/invite/${encodeURIComponent(token)}`);

export const joinChurch = (token, email) =>
  request('/api/churches/join', { method: 'POST', body: { token, email } });

export const fetchMyChurches = () => request('/api/churches/mine', { auth: true });
