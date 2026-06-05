import { storage } from '../storage';
import { PENDING_JOIN_STORAGE_KEY } from './constants';

/** 從 URL search 擷取 join token（支援 ?join= 與 ?token=）。 */
export function parseJoinTokenFromSearch(search: string): string | null {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  const join = params.get('join')?.trim();
  if (join) return join;
  const token = params.get('token')?.trim();
  return token || null;
}

export function stashPendingJoinToken(token: string): void {
  storage.set(PENDING_JOIN_STORAGE_KEY, token);
}

export function readPendingJoinToken(): string | null {
  return storage.get<string | null>(PENDING_JOIN_STORAGE_KEY, null);
}

export function clearPendingJoinToken(): void {
  storage.remove(PENDING_JOIN_STORAGE_KEY);
}

/** 從目前 URL 移除 join／token query 參數。 */
export function clearLocationJoinParam(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('join');
  url.searchParams.delete('token');
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, '', next);
}

export function buildInviteUrl(token: string): string {
  if (typeof window === 'undefined') {
    return `/?join=${encodeURIComponent(token)}`;
  }
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('join', token);
  return url.toString();
}

/** 若 URL 含 join token，寫入 storage 並回傳 token。 */
export function captureJoinTokenFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  const token = parseJoinTokenFromSearch(window.location.search);
  if (token) {
    stashPendingJoinToken(token);
  }
  return token;
}
