import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Phone, MapPin } from 'lucide-react';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: any; // Using any for mock, realistically type Person
  onSave: (data: any) => void;
}

export default function ProfileEditModal({ isOpen, onClose, person, onSave }: ProfileEditModalProps) {
  const [formData, setFormData] = useState({
    phone: person?.phone || '',
    address: person?.address || '',
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
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
              <div className="p-2 bg-gold/10 rounded-lg">
                <User className="w-5 h-5 text-gold" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Atualizar Dados</h3>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-surface">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Telemóvel</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-container-highest border border-outline-variant rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-gold/50"
                    placeholder="+351 912 345 678"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Morada</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-container-highest border border-outline-variant rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-gold/50"
                    placeholder="Rua da Esperança, 123"
                  />
                </div>
              </div>
            </div>

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
              >
                Guardar Alterações
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
