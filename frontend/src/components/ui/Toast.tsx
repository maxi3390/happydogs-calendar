'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error';

export interface ToastOptions {
  variant?: ToastVariant;
  duration?: number;
}

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastContextValue {
  toast: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 4000;

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const toast = useCallback((message: string, options: ToastOptions = {}) => {
    idRef.current += 1;
    const next: ToastItem = {
      id: idRef.current,
      message,
      variant: options.variant ?? 'success',
      duration: options.duration ?? DEFAULT_DURATION,
    };
    setItems(prev => [...prev, next]);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="fixed top-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none"
      >
        {items.map(item => (
          <ToastItemView key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

interface ToastItemViewProps {
  item: ToastItem;
  onDismiss: (id: number) => void;
}

function ToastItemView({ item, onDismiss }: ToastItemViewProps) {
  useEffect(() => {
    const handle = setTimeout(() => onDismiss(item.id), item.duration);
    return () => clearTimeout(handle);
  }, [item.id, item.duration, onDismiss]);

  const accent =
    item.variant === 'success'
      ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
      : 'border-destructive/40 text-destructive';

  const Icon = item.variant === 'success' ? CheckCircle2 : AlertCircle;

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 min-w-[260px] max-w-sm rounded-xl border bg-card text-card-foreground shadow-lg px-4 py-3 ${accent}`}
      data-testid={`toast-${item.variant}`}
    >
      <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
      <p className="flex-1 text-sm text-foreground">{item.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Close notification"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
