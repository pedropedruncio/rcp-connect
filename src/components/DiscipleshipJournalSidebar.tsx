import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BookOpen, Clock, FileText, Send, Loader2 } from 'lucide-react';
import { useData } from '../contexts/DataContext';


interface DiscipleshipJournalSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  pair: any;
}

export default function DiscipleshipJournalSidebar({ isOpen, onClose, pair }: DiscipleshipJournalSidebarProps) {
  const { getPersonById, discipleshipJournals, addDiscipleshipJournal, user } = useData();
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !pair) return null;

  const mentor = getPersonById(pair.mentorId);
  const disciple = getPersonById(pair.discipleId);

  const pairJournals = discipleshipJournals
    .filter(j => j.pairId === pair.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsSubmitting(true);
    try {
      await addDiscipleshipJournal(pair.id, newNote.trim());
      setNewNote('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMentor = user?.id === pair.mentorId;
  const canAddNote = isMentor || user?.role === 'ADMIN' || user?.role === 'PASTOR';

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
                    <div className="w-12 h-12 rounded-full border-2 border-white bg-gold/10 flex items-center justify-center text-gold font-bold overflow-hidden">
                      {mentor?.avatarUrl ? <img src={mentor.avatarUrl} alt="" className="w-full h-full object-cover"/> : mentor?.firstName?.[0]}
                    </div>
                    <div className="w-12 h-12 rounded-full border-2 border-white bg-gold/10 flex items-center justify-center text-gold font-bold overflow-hidden">
                      {disciple?.avatarUrl ? <img src={disciple.avatarUrl} alt="" className="w-full h-full object-cover"/> : disciple?.firstName?.[0]}
                    </div>
                 </div>
                 <h4 className="text-sm font-bold text-slate-900">{mentor?.firstName} {mentor?.lastName} → {disciple?.firstName} {disciple?.lastName}</h4>
                 <p className="text-xs text-slate-500 font-medium">{pair.course}</p>
                 <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mt-4">
                    <div className="h-full bg-gold rounded-full" style={{ width: `${pair.progress}%` }} />
                 </div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{pair.progress}% Concluído</p>
              </div>

              {/* Histórico Real */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Histórico de Encontros</h4>
                <div className="space-y-6">
                  {pairJournals.length > 0 ? (
                    pairJournals.map((journal) => (
                      <div key={journal.id} className="flex gap-4">
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                            <Clock className="w-4 h-4"/>
                          </div>
                          <div className="flex-1 w-px bg-outline-variant my-1" />
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-bold text-slate-900">Nota do Mentor</p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(journal.createdAt))}
                            </p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap shadow-sm">
                            {journal.content}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 px-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <FileText className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-sm text-slate-400">Ainda não há notas registradas neste diário.</p>
                    </div>
                  )}

                  {/* Legacy Initial Event (if pair has startDate) */}
                  {pair.startDate && pairJournals.length === 0 && (
                    <div className="flex gap-4 opacity-50">
                       <div className="flex flex-col items-center gap-1">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"><FileText className="w-4 h-4"/></div>
                       </div>
                       <div>
                          <p className="text-sm font-bold text-slate-900">Início do Discipulado</p>
                          <p className="text-xs text-slate-500">{new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(pair.startDate))}</p>
                       </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {canAddNote && (
              <div className="p-6 border-t border-outline-variant bg-white">
                <div className="relative group">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Escreva uma nota sobre o encontro..."
                    className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gold/20 focus:border-gold outline-none resize-none transition-all min-h-[100px] group-hover:bg-white"
                  />
                  <button 
                    onClick={handleAddNote}
                    disabled={isSubmitting || !newNote.trim()}
                    className="absolute bottom-3 right-3 p-2 bg-gold text-white rounded-lg hover:bg-gold-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-gold/20"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4" />}
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-slate-400 text-center font-medium">
                  Notas são visíveis apenas para mentores e supervisores.
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
