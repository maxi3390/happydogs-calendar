/**
 * Logo cache — survives reloads so the first paint matches the
 * operator's chosen shape and uploaded URL.
 *
 * The navigation header and login page render before
 * ``GET /api/settings/`` resolves; without a cache, every load shows
 * the default ``circle`` shape for a frame, then re-clips to whatever
 * the server returns. The cache eliminates that flicker for every
 * visit after the first by hydrating ``useState`` initial values
 * synchronously from ``localStorage``. The fetch still runs and
 * refreshes both state and cache, so a server-side change propagates
 * on the next mount.
 *
 * Both the shape and the URL are cached because the same flicker
 * applies to either: an icon-then-logo transition is just as visible
 * as a circle-then-square one.
 */
import type { LogoShape } from './types';

const STORAGE_KEY = 'nursery_logo_cache';

export interface LogoCache {
  shape: LogoShape;
  url: string | null;
}

const DEFAULT_CACHE: LogoCache = { shape: 'circle', url: null };

function isLogoShape(value: unknown): value is LogoShape {
  return value === 'square' || value === 'circle';
}

/**
 * Read the cached logo shape + url. Falls back to the canonical
 * default when no cache exists, the value is corrupt, or
 * ``localStorage`` is unavailable (SSR, private mode, disabled
 * storage). Never throws.
 */
export function readLogoCache(): LogoCache {
  if (typeof window === 'undefined') return DEFAULT_CACHE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CACHE;
    const parsed = JSON.parse(raw) as Partial<LogoCache>;
    return {
      shape: isLogoShape(parsed.shape) ? parsed.shape : DEFAULT_CACHE.shape,
      url: typeof parsed.url === 'string' ? parsed.url : null,
    };
  } catch {
    return DEFAULT_CACHE;
  }
}

/**
 * Persist the logo shape + url. Called whenever a fresh
 * ``NurserySetting`` payload becomes available — after GET on every
 * surface that loads the settings, and after PATCH / upload / delete
 * on the Settings page.
 *
 * Best-effort: localStorage failures (full quota, disabled) are
 * swallowed because a missed cache write only re-introduces the
 * one-frame flicker on the next mount; it doesn't break correctness.
 */
export function writeLogoCache(cache: { logo_shape: LogoShape; logo_url: string | null }): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: LogoCache = { shape: cache.logo_shape, url: cache.logo_url };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore — cache failure is non-fatal
  }
}
