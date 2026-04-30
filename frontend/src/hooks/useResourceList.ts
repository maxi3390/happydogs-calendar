import { useEffect, useState } from 'react';

export interface UseResourceListResult<T> {
  items: T[];
  loading: boolean;
  /** Optimistic mutator for the items array. Used for after-delete /
   * after-update updates that don't need to re-fetch. */
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
}

/**
 * Captures the ``setLoading(true) -> fetch -> setItems / log error ->
 * setLoading(false)`` pattern that PetList, VetList, Calendar, WeekView,
 * and DaySchedule all reimplemented identically. The effect fires on
 * mount and whenever any value in ``deps`` changes; in-flight requests
 * are cancelled (via a flag) on dep change or unmount so a slow request
 * can't overwrite a newer one.
 *
 * Errors are logged to console (matching every caller's existing
 * behaviour) and items stay at their previous value. If you need
 * error UI surface, wrap the fetcher in your own try/catch and call
 * ``setItems`` directly.
 *
 * The fetcher itself is intentionally NOT in the deps list — it would
 * be a fresh closure on every render and would loop the fetch forever.
 * Put the values the fetcher closes over (date ranges, ids,
 * ``refreshTrigger``, …) in ``deps`` instead.
 */
export function useResourceList<T>(
  fetcher: () => Promise<T[]>,
  deps: React.DependencyList,
): UseResourceListResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetcher()
      .then(data => { if (!cancelled) setItems(data); })
      .catch(err => {
        if (!cancelled) console.error('useResourceList fetch failed:', err);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { items, loading, setItems };
}
