const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface AuthUser {
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

const TOKEN_KEY = 'aria_token';
const USER_KEY  = 'aria_user';

// ── Token storage ─────────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function authFetch<T>(path: string, body?: object): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: body !== undefined ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || json.error || `HTTP ${res.status}`);
  return json as T;
}

// ── Auth API calls ────────────────────────────────────────────────────────────

export async function checkAuthStatus(): Promise<{ hasAccount: boolean }> {
  return authFetch<{ hasAccount: boolean }>('/auth/status');
}

export async function signUp(email: string, password: string, name: string): Promise<AuthResponse> {
  return authFetch<AuthResponse>('/auth/signup', { email, password, name });
}

export async function signIn(email: string, password: string): Promise<AuthResponse> {
  return authFetch<AuthResponse>('/auth/signin', { email, password });
}

export async function forgotPassword(email: string): Promise<{ ok: boolean; message: string; _devToken?: string }> {
  return authFetch('/auth/forgot-password', { email });
}

export async function resetPassword(token: string, password: string): Promise<{ ok: boolean }> {
  return authFetch('/auth/reset-password', { token, password });
}
