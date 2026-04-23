import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck } from 'lucide-react';
import { useData } from '../contexts/DataContext';

interface LeaderEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  leader: any;
}

export default function LeaderEditModal({ isOpen, onClose, onSubmit, leader }: LeaderEditModalProps) {
  const { getPersonById } = useData();
  const [formData, setFormData] = useState({
    role: leader?.role || '',
    area: leader?.area || 'Geral',
    status: leader?.status || 'Ativo',
  });

  // Keep state synced if leader changes
  React.useEffect(() => {
    if (leader) {
      setFormData({
        role: leader.role,
        area: leader.area,
        status: leader.status,
      });
    }
  }, [leader]);

  if (!isOpen) return null;

  const person = leader ? getPersonById(leader.personId) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-outline-variant"
        >
          <div className="flex items-center justify-between p-6 border-b border-outline-variant bg-surface-container-low">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-tertiary/10 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-tertiary" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                {leader ? 'Editar Liderança' : 'Novo Líder'}
              </h3>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-surface">
            {person && (
              <div className="flex items-center gap-4 p-4 bg-surface-container-high rounded-lg border border-outline-variant">
                 <div className="w-12 h-12 rounded-full border-2 border-white bg-gold/10 flex items-center justify-center text-gold font-bold text-lg">
                   {person.name.split(' ').map(n=>n[0]).slice(0,2).join('')}
                 </div>
                 <div>
                    <h4 className="font-bold text-slate-900">{person.name}</h4>
                    <p className="text-xs text-slate-500">{person.email}</p>
                 </div>
              </div>
            )}

            {!person && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Pessoa (Membro)</label>
                <select className="w-full px-4 py-2.5 bg-surface-container-highest border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-gold/50 outline-none">
                   <option>Selecionar Membro...</option>
                   <option>Ana Silva</option>
                   <option>João Costa</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Cargo / Função</label>
              <input
                type="text" required
                value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface-container-highest border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-gold/50 outline-none"
                placeholder="Ex:, Líder de Célula, Discipulador"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Área Ministerial</label>
                  <select
                     value={formData.area} onChange={e => setFormData({ ...formData, area: e.target.value })}
                     className="w-full px-4 py-2.5 bg-surface-container-highest border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-gold/50 outline-none"
                  >
                     <option>Geral</option>
                     <option>Discipulado</option>
                     <option>Células</option>
                     <option>Formação</option>
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Status</label>
                  <select
                     value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
                     className="w-full px-4 py-2.5 bg-surface-container-highest border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-gold/50 outline-none"
                  >
                     <option>Ativo</option>
                     <option>Em Formação</option>
                     <option>Inativo</option>
                  </select>
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
