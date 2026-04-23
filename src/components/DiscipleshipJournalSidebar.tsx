import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BookOpen, Clock, FileText } from 'lucide-react';
import { useData } from '../contexts/DataContext';

interface DiscipleshipJournalSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  pair: any;
}

export default function DiscipleshipJournalSidebar({ isOpen, onClose, pair }: DiscipleshipJournalSidebarProps) {
  const { getPersonById } = useData();
  if (!isOpen || !pair) return null;

  const mentor = getPersonById(pair.mentorId);
  const disciple = getPersonById(pair.discipleId);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />
          <motion.div 
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[110] flex flex-col border-l border-outline-variant"
          >
            <div className="flex items-center justify-between p-6 border-b border-outline-variant bg-surface-container-low">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Diário de Discipulado</h3>
              </div>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-surface">
              {/* Header Info */}
              <div className="flex flex-col gap-1 text-center items-center justify-center p-6 bg-surface-container-high rounded-xl border border-outline-variant">
                 <div className="flex -space-x-3 mb-2">
                    <div className="w-12 h-12 rounded-full border-2 border-white bg-gold/10 flex items-center justify-center text-gold font-bold">{mentor?.name?.[0]}</div>
                    <div className="w-12 h-12 rounded-full border-2 border-white bg-gold/10 flex items-center justify-center text-gold font-bold">{disciple?.name?.[0]}</div>
                 </div>
                 <h4 className="text-sm font-bold text-slate-900">{mentor?.name} → {disciple?.name}</h4>
                 <p className="text-xs text-slate-500 font-medium">{pair.course}</p>
                 <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mt-4">
                    <div className="h-full bg-gold rounded-full" style={{ width: `${pair.progress}%` }} />
                 </div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{pair.progress}% Concluído</p>
              </div>

              {/* Histórico Simulado */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Histórico de Encontros</h4>
                <div className="space-y-4">
                   <div className="flex gap-4">
                      <div className="flex flex-col items-center gap-1">
                         <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center"><Clock className="w-4 h-4"/></div>
                         <div className="flex-1 w-px bg-outline-variant my-1" />
                      </div>
                      <div className="pb-4">
                         <p className="text-sm font-bold text-slate-900">Encontro de Avaliação</p>
                         <p className="text-xs text-slate-500 mb-2">{pair.lastMeeting}</p>
                         <div className="p-3 bg-surface-container-highest rounded-lg border border-outline-variant text-sm text-slate-700">
                           O discípulo demonstrou crescimento na sua disciplina diária. Entregou os exercícios do módulo concluídos.
                         </div>
                      </div>
                   </div>

                   <div className="flex gap-4">
                      <div className="flex flex-col items-center gap-1">
                         <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"><FileText className="w-4 h-4"/></div>
                      </div>
                      <div>
                         <p className="text-sm font-bold text-slate-900">Início do Módulo</p>
                         <p className="text-xs text-slate-500 mb-2">Há 2 semanas</p>
                         <div className="p-3 bg-surface-container-highest rounded-lg border border-outline-variant text-sm text-slate-700">
                           Apresentação do material. Definimos horários quinzenais.
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-outline-variant bg-surface-container-high">
              <button disabled className="w-full btn-primary-heritage opacity-50 cursor-not-allowed">
                Adicionar Nota (Em Breve)
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
