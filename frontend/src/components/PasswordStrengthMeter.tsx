'use client';

import { useTranslation } from '@/lib/translations';

/**
 * Hand-rolled strength scorer keyed on length + character-class
 * diversity. Score 0 (empty) → meter not rendered. Scores 1..5 map
 * to the labels in `password.strength.*`. Server-side validators
 * (Django ``AUTH_PASSWORD_VALIDATORS``) remain the source of truth;
 * the meter is advisory UX. See
 * ``openspec/changes/archive/<date>-password-strength-meter/design.md``.
 */
export function scorePassword(value: string): number {
  if (!value) return 0;
  if (value.length < 8) return 1;
  let classes = 0;
  if (/[a-z]/.test(value)) classes++;
  if (/[A-Z]/.test(value)) classes++;
  if (/\d/.test(value)) classes++;
  if (/[^A-Za-z0-9]/.test(value)) classes++;
  if (classes === 1) return 2;
  if (classes === 2) return 3;
  // 3 classes: strong; 4 classes + ≥12 chars: very strong; otherwise still strong.
  if (classes === 3) return 4;
  return value.length >= 12 ? 5 : 4;
}

interface PasswordStrengthMeterProps {
  value: string;
  /** Optional `id` of the input being scored — used to associate the
   *  meter with its input via aria-describedby on the consumer side. */
  inputId?: string;
  /** Test id forwarded to the wrapper for selectors. */
  testId?: string;
}

const LABEL_KEYS: Record<number, string> = {
  1: 'password.strength.veryWeak',
  2: 'password.strength.weak',
  3: 'password.strength.fair',
  4: 'password.strength.strong',
  5: 'password.strength.veryStrong',
};

const SEGMENT_BG: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-orange-500',
  3: 'bg-yellow-500',
  4: 'bg-emerald-500',
  5: 'bg-green-600',
};

const LABEL_COLOR: Record<number, string> = {
  1: 'text-red-600 dark:text-red-400',
  2: 'text-orange-600 dark:text-orange-400',
  3: 'text-yellow-700 dark:text-yellow-400',
  4: 'text-emerald-600 dark:text-emerald-400',
  5: 'text-green-700 dark:text-green-400',
};

export default function PasswordStrengthMeter({ value, inputId, testId = 'password-strength-meter' }: PasswordStrengthMeterProps) {
  const { t } = useTranslation();
  const score = scorePassword(value);
  if (score === 0) return null;

  const segmentColor = SEGMENT_BG[score];
  const labelColor = LABEL_COLOR[score];
  const labelText = t(LABEL_KEYS[score]) || LABEL_KEYS[score];

  return (
    <div
      className="mt-1.5 flex flex-col gap-1"
      data-testid={testId}
      data-strength-score={score}
      // Consumers can wire ``aria-describedby={inputId + '-strength'}``
      // on their input; we mirror the id here so the descriptor is
      // associated for assistive tech.
      id={inputId ? `${inputId}-strength` : undefined}
    >
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((segment) => (
          <div
            key={segment}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              segment <= score ? segmentColor : 'bg-muted/40'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${labelColor}`}>
        {t('password.strength.label') || 'Strength:'} {labelText}
      </p>
    </div>
  );
}
