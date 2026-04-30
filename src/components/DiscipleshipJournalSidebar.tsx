import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BookOpen, Clock, FileText, Send, Loader2 } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';


interface DiscipleshipJournalSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  pair: any;
}

export default function DiscipleshipJournalSidebar({ isOpen, onClose, pair }: DiscipleshipJournalSidebarProps) {
  const { user } = useAuth();
  const { getPersonById, discipleshipJournals, addDiscipleshipJournal } = useData();
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
            className="fixed right-0 top-0 z-[110] flex h-full w-full max-w-lg flex-col border-l border-outline-variant bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-outline-variant bg-surface-container-low px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-50">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold leading-tight text-slate-900">Diário de Discipulado</h3>
                  <p className="mt-1 text-sm leading-5 text-slate-500">Histórico de encontros e notas pastorais.</p>
                </div>
              </div>
              <button onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-gold/35">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-surface px-5 py-5 sm:px-6 sm:py-6 space-y-5">
              {/* Header Info */}
              <div className="modal-section flex flex-col gap-1 text-center items-center justify-center">
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
              <div className="modal-section">
                <h4 className="modal-section-title">Histórico de encontros</h4>
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
                          <div className="p-3 bg-slate-50 rounded-md border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap shadow-sm">
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
              <div className="border-t border-outline-variant bg-surface-container-low px-5 py-4 sm:px-6">
                <div className="relative group">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Escreva uma nota sobre o encontro..."
                    className="input-heritage min-h-[104px] pr-12"
                  />
                  <button 
                    onClick={handleAddNote}
                    disabled={isSubmitting || !newNote.trim()}
                    className="absolute bottom-3 right-3 rounded-md bg-gold p-2 text-white shadow-md shadow-gold/20 transition-all hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50"
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
