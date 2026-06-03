/** Üres = lokális Vite proxy (/api, /hubs). Órán: ngrok URL, pl. https://abc123.ngrok-free.app */
export const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${p}` : p;
}

export function hubUrl(): string {
  return apiUrl('/hubs/game');
}

/** ngrok ingyenes csomag böngészőfigyelmezet — API hívásokhoz */
export const NGROK_HEADERS: HeadersInit =
  API_BASE.includes('ngrok')
    ? { 'ngrok-skip-browser-warning': 'true' }
    : {};
