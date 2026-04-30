'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '@/lib/translations';

export interface ModalProps {
  /** Stable id rendered on the title element; consumers wire it to ``aria-labelledby``. */
  titleId: string;
  /** Header title text (already translated). */
  title: string;
  /** When true, Escape and backdrop click are ignored — the consumer owns those keys
   * (e.g. a nested modal is up and should claim the input). */
  inert?: boolean;
  /** Stacking tier. ``base`` = z-50 (default modal); ``nested`` = z-60, used when
   * this modal renders ABOVE another base modal (e.g. VetDetailsPopup on top of
   * OwnerDetailsPopup). */
  layer?: 'base' | 'nested';
  /** Dialog max width. ``md`` (default) = max-w-lg with p-4 padding (Pet/Owner/Vet
   * details, Vet/Owner forms). ``lg`` = max-w-2xl with p-6 padding (PetForm,
   * which has wider field grids). */
  size?: 'md' | 'lg';
  onClose: () => void;
  /** Body content. Renders in a scrolling container. */
  children: React.ReactNode;
  /** Footer content (typically a row of Buttons). Rendered inside a ``border-t`` band. */
  footer?: React.ReactNode;
  /** Optional wrapper around the body + footer regions. Lets ``FormModal``
   * render a single ``<form>`` that contains BOTH the fields (in the body)
   * and the Cancel/Save buttons (in the footer), so a ``form.getByRole``
   * Playwright query still finds the submit button — and so the
   * surrounding form is the only element responsible for the submit
   * semantics, no ``form="<id>"`` indirection. The wrapper receives the
   * body + footer as its children and is responsible for rendering them
   * both (typically passing through). Defaults to a passthrough fragment
   * for the read-only details modal. */
  bodyAndFooterWrapper?: (children: React.ReactNode) => React.ReactNode;
}

/**
 * Shared dialog shell: backdrop + ``role="dialog"`` container + header (title + X
 * close) + scrolling body + optional footer band. Owns focus-on-mount, Escape,
 * and backdrop-click. Used as the foundation for ``DetailsModal`` and
 * ``FormModal`` so the three popup / four form components stop reimplementing
 * the same JSX.
 */
export default function Modal({
  titleId,
  title,
  inert = false,
  layer = 'base',
  size = 'md',
  onClose,
  children,
  footer,
  bodyAndFooterWrapper,
}: ModalProps) {
  const { t } = useTranslation();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (inert) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inert, onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (inert) return;
    if (e.target === e.currentTarget) onClose();
  };

  const zIndex = layer === 'nested' ? 'z-[60]' : 'z-50';
  const maxWidth = size === 'lg' ? 'max-w-2xl' : 'max-w-lg';
  const padding = size === 'lg' ? 'p-6' : 'p-4';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className={`fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 ${zIndex}`}
      onMouseDown={handleBackdropClick}
    >
      <div className={`bg-card text-card-foreground rounded-xl shadow-xl ${maxWidth} w-full max-h-[90vh] overflow-y-auto styled-scroll`}>
        <div className={`flex items-center justify-between ${padding} border-b border-border`}>
          <h2
            id={titleId}
            className="text-xl font-semibold text-gray-800 dark:text-gray-100"
          >
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="p-2 rounded-xl hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {(() => {
          const body = (
            <div className={`${padding} ${size === 'lg' ? 'space-y-6' : 'space-y-4'}`}>
              {children}
            </div>
          );
          const footerNode = footer && (
            <div className={`flex justify-end gap-3 ${padding} border-t border-border`}>
              {footer}
            </div>
          );
          const inner = (
            <>
              {body}
              {footerNode}
            </>
          );
          return bodyAndFooterWrapper ? bodyAndFooterWrapper(inner) : inner;
        })()}
      </div>
    </div>
  );
}
