import { useCallback, useState } from 'react';
import { useTranslation } from '@/lib/translations';

interface UseFormSubmitResult {
  /** True while ``submit()`` is awaiting its operation. Bind to the Save button's
   * ``disabled`` and to the saving-label switch. */
  loading: boolean;
  /** Captured error message, or empty string when there is no error. Bind to the
   * form's error block. */
  error: string;
  /** Wraps an async operation in the standard ``setLoading(true) -> try ->
   * setError on throw -> setLoading(false)`` cycle. Caller is responsible for
   * any post-success side effects (usually ``onSave()``); those run inside
   * the operation itself, so a thrown error short-circuits them. */
  submit: (operation: () => Promise<void>) => Promise<void>;
  /** Manually clear the error (useful when resetting between save attempts —
   * e.g. PetForm's "Save and add another" path). */
  clearError: () => void;
}

/**
 * Captures the loading + error state machine that PetForm, OwnerForm, and
 * VetForm reimplemented identically. ``submit(op)`` runs ``op`` inside the
 * standard try/catch; on throw it formats the error via the same ``err
 * instanceof Error ? err.message : t('errors.saveFailed')`` shape every form
 * used.
 */
export function useFormSubmit(): UseFormSubmitResult {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = useCallback(async (operation: () => Promise<void>) => {
    setLoading(true);
    setError('');
    try {
      await operation();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.saveFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const clearError = useCallback(() => setError(''), []);

  return { loading, error, submit, clearError };
}
