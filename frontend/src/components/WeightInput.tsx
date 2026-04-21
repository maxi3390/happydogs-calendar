'use client';

import { useEffect, useMemo, useState } from 'react';

interface WeightInputProps {
  /** Current value in kilograms (or `null` when unset). */
  value: number | null;
  /** Emits `null` when the internal cents counter reaches zero so the form preserves its "unset" semantic. */
  onChange: (kgOrNull: number | null) => void;
  id?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  /** Hard ceiling in cents. Defaults to 999_999 (= 9999.99 kg) to match the backend's `DecimalField(max_digits=6, decimal_places=2)`. */
  maxCents?: number;
}

const DEFAULT_MAX_CENTS = 999_999;

// Track cents (kg * 100) internally so every digit operation is exact integer
// arithmetic. The kg <-> cents conversion goes through Math.round so repeated
// round-trips of e.g. 12.34 never drift.
function kgToCents(kg: number | null): number {
  if (kg === null || kg === undefined || Number.isNaN(kg)) return 0;
  return Math.max(0, Math.round(kg * 100));
}

function formatCents(cents: number): string {
  const str = (cents / 100).toFixed(2);        // "6.54"
  const [intPart, decPart] = str.split('.');
  return `${intPart.padStart(2, '0')}.${decPart}`;  // "06.54"
}

export default function WeightInput({
  value,
  onChange,
  id,
  label,
  disabled = false,
  className = '',
  maxCents = DEFAULT_MAX_CENTS,
}: WeightInputProps) {
  const [cents, setCents] = useState<number>(() => kgToCents(value));

  // Keep the component in sync when the form resets or the edited pet changes.
  // Comparing against the integer centavo value avoids spurious re-syncs from
  // floating-point jitter in the incoming `value` prop.
  useEffect(() => {
    const incoming = kgToCents(value);
    if (incoming !== cents) {
      setCents(incoming);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const display = useMemo(() => formatCents(cents), [cents]);

  // Centralised "apply a digit" logic so onKeyDown and onPaste share it.
  const applyDigit = (digit: number, current: number): number => {
    const next = current * 10 + digit;
    return next > maxCents ? current : next;
  };

  const emit = (newCents: number) => {
    setCents(newCents);
    onChange(newCents === 0 ? null : newCents / 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Let modifier combos through (copy, paste, select-all, devtools, etc.)
    // and let navigation / submit keys do their normal thing.
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (
      e.key === 'Tab' ||
      e.key === 'Enter' ||
      e.key === 'Escape' ||
      e.key.startsWith('Arrow') ||
      e.key === 'Home' ||
      e.key === 'End' ||
      e.key === 'Shift' ||
      e.key === 'Control' ||
      e.key === 'Meta' ||
      e.key === 'Alt'
    ) {
      return;
    }

    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      emit(applyDigit(Number(e.key), cents));
      return;
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      emit(Math.floor(cents / 10));
      return;
    }

    // Anything else — letters, symbols, punctuation — is silently dropped so
    // the visible value always matches `cents`.
    e.preventDefault();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const digits = text.match(/\d/g);
    if (!digits) return;
    let next = cents;
    for (const d of digits) {
      next = applyDigit(Number(d), next);
    }
    emit(next);
  };

  // onChange is required by React for controlled inputs but every real state
  // mutation flows through onKeyDown / onPaste. Make it a no-op so nothing
  // bypasses the sanitisation path.
  const noop = () => {};

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        disabled={disabled}
        value={display}
        onChange={noop}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        aria-label={label}
        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-card text-card-foreground dark:bg-slate-700 text-foreground-100 font-mono tabular-nums text-right"
      />
    </div>
  );
}
