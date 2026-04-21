'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { featureFlagsApi } from '@/domain/feature-flags/api';
import type { FeatureFlag, FeatureFlagsMap } from '@/domain/feature-flags/types';
import { useAuth } from '@/lib/auth';

interface FeatureFlagsContextValue {
  /** Full list from the API, including label/description/updated_at. */
  flags: FeatureFlag[];
  /** Cheap lookup map from `key` → `enabled`. */
  map: FeatureFlagsMap;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Optimistically flip a flag after a successful PATCH on the admin page. */
  applyChange: (flag: FeatureFlag) => void;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | undefined>(undefined);

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await featureFlagsApi.list();
      setFlags(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feature flags');
      // Don't clobber previously-successful fetches on a transient error.
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch once the auth state has resolved and the user is logged in.
  // Unauthenticated pages (e.g. /login) don't need the flags and the
  // endpoint would 401 anyway — skipping the call keeps the console clean.
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setFlags([]);
      setLoading(false);
      return;
    }
    refresh();
  }, [isAuthenticated, authLoading, refresh]);

  const map = useMemo<FeatureFlagsMap>(() => {
    return Object.fromEntries(flags.map(f => [f.key, f.enabled]));
  }, [flags]);

  const applyChange = useCallback((updated: FeatureFlag) => {
    setFlags(prev => prev.map(f => (f.key === updated.key ? updated : f)));
  }, []);

  const value = useMemo<FeatureFlagsContextValue>(
    () => ({ flags, map, loading, error, refresh, applyChange }),
    [flags, map, loading, error, refresh, applyChange],
  );

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

function useContextOrThrow(): FeatureFlagsContextValue {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) {
    throw new Error('useFeatureFlag(s) must be used inside a <FeatureFlagsProvider>');
  }
  return ctx;
}

/**
 * Returns the current enabled state for `key`. Fails closed: any unknown
 * key (not yet loaded, typo, removed flag) is treated as `false`.
 */
export function useFeatureFlag(key: string): boolean {
  const { map } = useContextOrThrow();
  return Boolean(map[key]);
}

/** Returns the whole context value (flags list + refresh). Used by the admin page. */
export function useFeatureFlags(): FeatureFlagsContextValue {
  return useContextOrThrow();
}
