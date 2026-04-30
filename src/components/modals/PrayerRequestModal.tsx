import React, { useState } from 'react';
import { X, Send, Heart, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

interface PrayerRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export default function PrayerRequestModal({ isOpen, onClose, onSuccess }: PrayerRequestModalProps) {
  const { user } = useAuth();
  const { addPrayerRequest } = useData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    wantsContact: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      await addPrayerRequest({
        personId: user.id,
        request: `[${formData.subject}] ${formData.description}${formData.wantsContact ? ' (Solicita contacto)' : ''}`,
        status: 'PENDING'
      });
      onSuccess('Pedido de oração enviado com sucesso!');
      onClose();
      setFormData({ subject: '', description: '', wantsContact: false });
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold/10 rounded-lg">
                  <Heart className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Pedido de Oração</h3>
                  <p className="text-sm text-slate-500">A sua igreja está aqui para orar por si.</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="prayer-form" onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Assunto / Motivo</label>
                <input 
                  required type="text" 
                  value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})}
                  className="input-heritage" placeholder="Ex: Saúde, Família, Trabalho..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Descrição do Pedido</label>
                <textarea 
                  required
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  className="input-heritage min-h-[120px] py-3 text-sm" placeholder="Escreva aqui o seu motivo de oração detalhado..."
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-outline-variant">
                <input 
                  type="checkbox" id="contact"
                  checked={formData.wantsContact} onChange={e => setFormData({...formData, wantsContact: e.target.checked})}
                  className="w-4 h-4 text-gold border-outline-variant rounded focus:ring-gold"
                />
                <label htmlFor="contact" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" /> Desejo ser contactado por um Pastor / Líder.
                </label>
              </div>
            </form>

            <div className="p-6 border-t border-outline-variant flex items-center justify-end gap-3 bg-surface-container-low">
              <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-md transition-all">
                Cancelar
              </button>
              <button type="submit" form="prayer-form" disabled={isSubmitting} className="btn-primary-heritage px-8 flex items-center gap-2 disabled:opacity-50">
                <Send className="w-4 h-4" /> 
                {isSubmitting ? 'A enviar...' : 'Enviar Pedido'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
