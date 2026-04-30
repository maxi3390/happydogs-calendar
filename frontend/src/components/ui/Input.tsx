import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, fullWidth = true, icon, endIcon, id, ...props }, ref) => {
    // Generate a stable id when one isn't supplied so the <label> can
    // bind to the <input> via htmlFor. Without this binding, screen
    // readers don't connect the label and `getByLabel` queries fall
    // through, which forces tests to use brittle structural selectors.
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    // Companion id for the error <p>, wired to the input via
    // ``aria-describedby`` so screen readers announce the error message
    // when the field gains focus. Only emitted when ``error`` is set.
    const errorId = `${inputId}-error`;
    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center pointer-events-none z-10">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={`flex h-10 w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 disabled:cursor-not-allowed disabled:opacity-60 transition-colors ${
              icon ? 'pl-10' : ''
            } ${
              endIcon ? 'pr-10' : ''
            } ${
              error ? 'border-destructive focus:ring-destructive/50 focus:border-destructive' : ''
            } ${className}`}
            {...props}
          />
          {endIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center z-10">
              {endIcon}
            </div>
          )}
        </div>
        {error && <p id={errorId} className="mt-1.5 text-xs text-destructive">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
