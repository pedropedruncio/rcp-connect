import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, Check, Plus } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import type { CellGroup } from '../../types/domain';

interface TraineeManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  cell: CellGroup;
}

export default function TraineeManagementModal({ isOpen, onClose, cell }: TraineeManagementModalProps) {
  const { persons, updateCell } = useData();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cellMembers = persons.filter(p => p.cellId === cell.id);
  const traineeIds = cell.traineeLeaderIds || [];

  const handleToggleTrainee = async (personId: string) => {
    setIsSubmitting(true);
    try {
      const newTrainees = traineeIds.includes(personId)
        ? traineeIds.filter(id => id !== personId)
        : [...traineeIds, personId];
      
      await updateCell(cell.id, { traineeLeaderIds: newTrainees });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-outline-variant flex flex-col max-h-[80vh]"
          >
            <div className="flex items-center justify-between p-6 border-b border-outline-variant bg-surface-container-low">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold/10 rounded-lg">
                  <Users className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">Gerir Líderes em Treino</h3>
                  <p className="text-xs text-slate-500">Selecione os membros em formação de liderança.</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {cellMembers.length === 0 ? (
                <p className="text-center py-8 text-sm text-slate-400 italic">Nenhum membro encontrado nesta célula.</p>
              ) : (
                cellMembers.map(member => {
                  const isTrainee = traineeIds.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      disabled={isSubmitting}
                      onClick={() => handleToggleTrainee(member.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                        isTrainee 
                          ? 'border-gold bg-gold/5 text-gold' 
                          : 'border-outline-variant bg-surface hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          isTrainee ? 'bg-gold text-white' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {member.name.split(' ').map(n=>n[0]).slice(0,2).join('')}
                        </div>
                        <span className="text-sm font-bold">{member.name}</span>
                      </div>
                      {isTrainee ? <Check className="w-4 h-4 text-gold" /> : <Plus className="w-4 h-4 text-slate-300" />}
                    </button>
                  );
                })
              )}
            </div>

            <div className="p-6 border-t border-outline-variant bg-surface-container-low flex justify-end">
              <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-slate-900 bg-white border border-outline-variant rounded-lg hover:bg-slate-50 transition-all">
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
