import { useMemo, useState } from 'react';

export interface UseSearchableListResult<T> {
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  filtered: T[];
}

/**
 * Client-side text search over a list. Maintains the search-term state and
 * memoises the filtered result so consumers don't re-filter on every render.
 *
 * The case-insensitive substring match runs against the strings returned by
 * ``searchFields(item)`` — usually a small array of fields like
 * ``[item.name, item.email]``. Returning multiple strings is cheaper than
 * pre-concatenating them because we don't have to lower-case until each
 * field is compared, and an empty / nullish field can be skipped.
 *
 * Used by VetList and the Owners page for their identical name/email/phone
 * searches. PetList intentionally uses its own filter state because its UI
 * is a multi-axis filter (species + temperament + size + sex + neutered)
 * with the search term embedded in the filter struct — this hook would
 * fight that shape.
 */
export function useSearchableList<T>(
  items: T[],
  searchFields: (item: T) => Array<string | null | undefined>,
): UseSearchableListResult<T> {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(item =>
      searchFields(item).some(field =>
        typeof field === 'string' && field.toLowerCase().includes(needle),
      ),
    );
    // ``searchFields`` is a fresh closure each render; we treat it as
    // referentially-fluid (callers usually inline it) and re-run on every
    // ``items`` or ``searchTerm`` change. Including it would force consumers
    // to ``useCallback`` with no real benefit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, searchTerm]);

  return { searchTerm, setSearchTerm, filtered };
}
