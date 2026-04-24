import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type = 'success', isVisible, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className={cn(
            "fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999]",
            "flex items-center gap-3 px-6 py-4 rounded-lg shadow-2xl border min-w-[320px]",
            type === 'success' ? "bg-white border-green-100 text-slate-900" :
            type === 'error' ? "bg-red-50 border-red-100 text-red-900" :
            "bg-blue-50 border-blue-100 text-blue-900"
          )}
        >
          {type === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
          {type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
          {type === 'info' && <AlertCircle className="w-5 h-5 text-blue-500" />}
          
          <p className="text-sm font-bold flex-1">{message}</p>
          
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors" aria-label="Fechar">
            <X className="w-4 h-4 text-slate-400" />
          </button>
          
          {/* Progress Bar */}
          <motion.div 
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: duration / 1000, ease: "linear" }}
            style={{ originX: 0 }}
            className={cn(
              "absolute bottom-0 left-0 right-0 h-1",
              type === 'success' ? "bg-green-500" : type === 'error' ? "bg-red-500" : "bg-blue-500"
            )}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
