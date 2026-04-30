'use client';

import { AlertCircle } from 'lucide-react';
import { useTranslation } from '@/lib/translations';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

export interface FormModalProps {
  /** Stable id wired to ``aria-labelledby`` on the dialog. */
  titleId: string;
  /** Header title (already translated). */
  title: string;
  /** Submit handler. Receives the form event; FormModal does NOT call
   * ``preventDefault`` for you (consumers usually do their own validation
   * before kicking off the async operation). */
  onSubmit: (e: React.FormEvent) => void;
  /** Save button label (already translated). */
  submitLabel: string;
  /** Saving label that replaces ``submitLabel`` while the operation is in flight.
   * Defaults to ``t('common.saving')``. */
  savingLabel?: string;
  /** ``true`` while the parent's ``useFormSubmit`` operation is running. Disables
   * Cancel + Save and swaps the Save button to ``savingLabel``. */
  loading: boolean;
  /** Captured error message; empty string for no error. */
  error: string;
  /** Optional extra disable condition on the Save button (combined with
   * ``loading``). PetForm uses this to gate Save until an owner is selected. */
  submitDisabled?: boolean;
  /** Modal width — see ``Modal.tsx``. ``md`` matches the Vet/Owner forms,
   * ``lg`` matches PetForm's wider field grid. */
  size?: 'md' | 'lg';
  /** Optional buttons rendered between Cancel and the primary Save. PetForm
   * uses this for its ``Save and add another`` action. */
  extraActions?: React.ReactNode;
  onClose: () => void;
  /** Form fields. Wrapped in a ``<form>`` with the supplied ``formId``. */
  children: React.ReactNode;
}

/**
 * Modal that wraps its body + footer in a single ``<form>`` and renders a
 * standard Cancel + Save footer. The form spans both regions via Modal's
 * ``bodyAndFooterWrapper`` prop, so the submit button is genuinely a
 * descendant of the form — no ``form="<id>"`` indirection — which means
 * the existing ``form.getByRole('button', { name: 'Save' })`` Playwright
 * selectors keep working.
 *
 * Pair with ``useFormSubmit`` from ``src/hooks/useFormSubmit`` for the
 * loading/error state management.
 */
export default function FormModal({
  titleId,
  title,
  onSubmit,
  submitLabel,
  savingLabel,
  loading,
  error,
  submitDisabled = false,
  size = 'md',
  extraActions,
  onClose,
  children,
}: FormModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      titleId={titleId}
      title={title}
      size={size}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          {extraActions}
          <Button type="submit" variant="primary" disabled={loading || submitDisabled}>
            {loading ? (savingLabel ?? t('common.saving')) : submitLabel}
          </Button>
        </>
      }
      bodyAndFooterWrapper={(inner) => (
        <form onSubmit={onSubmit}>{inner}</form>
      )}
    >
      {error && (
        // ``role="alert"`` makes screen readers announce the message
        // when it appears (and when it changes between submit attempts);
        // without it, the user has to manually navigate to the error
        // div to discover the form failed.
        <div
          role="alert"
          className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      {children}
    </Modal>
  );
}
