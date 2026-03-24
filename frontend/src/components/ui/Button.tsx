import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  const baseClasses = "inline-flex items-center justify-center font-medium transition-all rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";
  
  const variants = {
    primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
    secondary: "bg-secondary text-foreground shadow-sm hover:bg-secondary/80 border border-border/50",
    danger: "bg-destructive/10 text-destructive hover:bg-destructive/20 shadow-sm transition-colors",
    ghost: "hover:bg-secondary/50 text-foreground/80 hover:text-foreground",
    outline: "border border-border/50 bg-transparent hover:bg-secondary/50 text-foreground"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-6 py-3 text-base gap-2.5",
    icon: "p-2 min-w-8 min-h-8 flex-shrink-0"
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
