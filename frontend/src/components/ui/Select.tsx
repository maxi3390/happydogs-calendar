import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  options: { value: string | number; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, fullWidth = true, options, id, ...props }, ref) => {
    // Stable id so the <label htmlFor=...> binds to the <select>. Without
    // this, screen readers announce the field as unlabeled (axe flags it
    // as a critical violation), and ``getByLabel`` test queries miss it.
    // Mirrors the pattern in Input.tsx.
    const generatedId = React.useId();
    const selectId = id ?? generatedId;
    const errorId = `${selectId}-error`;
    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`flex h-10 w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 disabled:cursor-not-allowed disabled:opacity-60 transition-colors ${
            error ? 'border-destructive focus:ring-destructive/50 focus:border-destructive' : ''
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p id={errorId} className="mt-1.5 text-xs text-destructive">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
