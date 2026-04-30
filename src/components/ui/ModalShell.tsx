import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const MODAL_SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
};

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  iconClassName?: string;
  size?: ModalSize;
  zIndexClassName?: string;
  bodyClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
  closeLabel?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function ModalShell({
  isOpen,
  onClose,
  title,
  description,
  icon,
  iconClassName,
  size = 'md',
  zIndexClassName = 'z-[100]',
  bodyClassName,
  contentClassName,
  footerClassName,
  closeLabel = 'Fechar',
  children,
  footer,
}: ModalShellProps) {
  const titleId = React.useId();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={cn('fixed inset-0 flex items-center justify-center p-3 sm:p-4', zIndexClassName)}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
            className={cn(
              'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-lg border border-outline-variant bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]',
              MODAL_SIZE_CLASSES[size],
              contentClassName,
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-outline-variant bg-surface-container-low px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex min-w-0 items-start gap-3">
                {icon && (
                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gold/10 text-gold', iconClassName)}>
                    {icon}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 id={titleId} className="text-xl font-bold leading-tight text-slate-900">
                    {title}
                  </h3>
                  {description && (
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      {description}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-gold/35"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className={cn('flex-1 overflow-y-auto bg-surface px-5 py-5 sm:px-6 sm:py-6', bodyClassName)}>
              {children}
            </div>

            {footer && (
              <div className={cn('border-t border-outline-variant bg-surface-container-low px-5 py-4 sm:px-6', footerClassName)}>
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
