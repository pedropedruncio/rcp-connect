import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, MessageSquare } from 'lucide-react';

interface PrayerRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export default function PrayerRequestModal({ isOpen, onClose, onSubmit }: PrayerRequestModalProps) {
  const [request, setRequest] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ request, isPrivate });
    setRequest('');
    setIsPrivate(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-outline-variant"
        >
          <div className="flex items-center justify-between p-6 border-b border-outline-variant bg-surface-container-low">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <Heart className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Pedido de Oração</h3>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-surface">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">O seu pedido</label>
              <textarea
                rows={4}
                required
                value={request}
                onChange={e => setRequest(e.target.value)}
                className="w-full p-4 bg-surface-container-highest border border-outline-variant rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-gold/50 resize-none"
                placeholder="Escreva aqui como podemos orar por si..."
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isPrivate ? 'bg-gold border-gold' : 'border-outline-variant group-hover:border-gold'}`}>
                {isPrivate && <X className="w-3 h-3 text-white" />} {/* Simple checkmark alt */}
              </div>
              <input type="checkbox" className="hidden" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} />
              <div>
                <p className="text-sm font-bold text-slate-800">Pedido Confidencial</p>
                <p className="text-xs text-slate-500">Apenas os pastores terão acesso a este pedido.</p>
              </div>
            </label>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-outline-variant">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary-heritage"
                disabled={!request.trim()}
              >
                Enviar Pedido
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
