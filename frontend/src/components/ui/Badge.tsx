import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'outline' | 'secondary';
}

export function Badge({ className = '', variant = 'default', ...props }: BadgeProps) {
  const baseClasses = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold transition-colors";
  
  const variants = {
    default: "bg-primary/10 text-primary border border-primary/20",
    secondary: "bg-secondary text-foreground border border-border/50",
    success: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
    warning: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
    danger: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800",
    outline: "text-foreground border border-border"
  };

  return (
    <div className={`${baseClasses} ${variants[variant]} ${className}`} {...props} />
  );
}
