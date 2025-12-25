import { Fragment, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import CloseIcon from '@mui/icons-material/Close';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4'
};

export function Dialog({
  open,
  onClose,
  children,
  title,
  description,
  className,
  size = 'md'
}: DialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <Fragment>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          
          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className={cn(
                "relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl",
                "border border-gray-200 dark:border-gray-700",
                "w-full overflow-hidden",
                sizeClasses[size],
                className
              )}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              {/* Header */}
              {(title || description) && (
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between">
                    <div>
                      {title && (
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {title}
                        </h2>
                      )}
                      {description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={onClose}
                      className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <CloseIcon sx={{ fontSize: 20 }} />
                    </button>
                  </div>
                </div>
              )}
              
              {/* Content */}
              <div className="px-6 py-4">
                {children}
              </div>
            </motion.div>
          </div>
        </Fragment>
      )}
    </AnimatePresence>
  );
}

// Dialog subcomponents for better composition
export function DialogHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mb-4", className)}>{children}</div>;
}

export function DialogTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn("text-xl font-semibold text-gray-900 dark:text-white", className)}>
      {children}
    </h2>
  );
}

export function DialogDescription({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-sm text-gray-500 dark:text-gray-400 mt-1", className)}>
      {children}
    </p>
  );
}

export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-end gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700", className)}>
      {children}
    </div>
  );
}
