import React, { useMemo } from 'react';
import { 
  BookOpen, Plus, MoreVertical, ChevronRight,
  GraduationCap, Users, CheckCircle2, Clock
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { useData } from '../contexts/DataContext';
import DiscipleshipFormModal from '../components/modals/DiscipleshipFormModal';
import Toast from '../components/ui/Toast';
import DiscipleshipJournalSidebar from '../components/DiscipleshipJournalSidebar';

export default function Discipulado() {
  const { user } = useAuth();
  const p = usePermissions();
  
  const { cells, discipleshipPairs, getPersonById } = useData();
  const [journalOpen, setJournalOpen] = React.useState(false);
  const [isFormOpen, setFormOpen] = React.useState(false);
  const [selectedPair, setSelectedPair] = React.useState<any>(null);
  const [toast, setToast] = React.useState<{show: boolean, msg: string}>({ show: false, msg: '' });

  const handleOpenJournal = (pair: any) => {
    setSelectedPair(pair);
    setJournalOpen(true);
  };

  // ── Scope ────────────────────────────────────────────────────────────────
  const scopedPairs = useMemo(() => {
    if (!user) return [];
    if (p.isGlobalScope) return discipleshipPairs;

    const supervisedCellIds = user.supervisedCellIds || [];

    if (user.role === 'DISCIPLER') {
      const supervisedLeaderIds = cells
        .filter(c => supervisedCellIds.includes(c.id))
        .map(c => c.leaderId);
      return discipleshipPairs.filter(dp => supervisedLeaderIds.includes(dp.mentorId));
    }

    if (user.role === 'LEADER') {
      return discipleshipPairs.filter(dp => dp.mentorId === user.id);
    }

    return [];
  }, [cells, discipleshipPairs, p.isGlobalScope, user]);

  const completedCount = scopedPairs.filter(dp => dp.progress >= 100).length;
  const avgProgress    = scopedPairs.length
    ? Math.round(scopedPairs.reduce((s, dp) => s + dp.progress, 0) / scopedPairs.length)
    : 0;

  const scopeSubtitle = p.isGlobalScope
    ? 'Visão global de todos os pares de discipulado da rede.'
    : user?.role === 'DISCIPLER'
      ? 'Pares de discipulado nas células que supervisiona.'
      : 'Os seus discípulos actuais.';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-bold text-slate-900 tracking-tight">Discipulado</h2>
          <p className="text-slate-500 font-medium">{scopeSubtitle}</p>
        </div>
        {p.canAddDiscipleship && (
          <button 
            onClick={() => {
              setSelectedPair(null);
              setFormOpen(true);
            }}
            className="btn-primary-heritage flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Novo Par de Discipulado
          </button>
        )}
      </div>

      <DiscipleshipJournalSidebar 
        isOpen={journalOpen} 
        onClose={() => setJournalOpen(false)} 
        pair={selectedPair} 
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: <Users           className="w-5 h-5 text-blue-600"  />, bg: 'bg-blue-50',   label: 'Pares Ativos',    value: scopedPairs.length,                 sub: 'no seu scope' },
          { icon: <GraduationCap  className="w-5 h-5 text-amber-600" />, bg: 'bg-amber-50',  label: 'Progresso Médio', value: `${avgProgress}%`,                 sub: 'de conclusão' },
          { icon: <CheckCircle2   className="w-5 h-5 text-green-600" />, bg: 'bg-green-50',  label: 'Concluídos',      value: completedCount,                    sub: 'desde o início' },
        ].map((item, i) => (
          <div key={i} className="card-heritage p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className={cn('p-2 rounded-md', item.bg)}>{item.icon}</div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</p>
            </div>
            <h3 className="text-3xl font-bold text-slate-900">{item.value}</h3>
            <p className="text-xs text-slate-500 font-medium mt-2">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Pares */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-900">
            {user?.role === 'LEADER' ? 'Os Meus Discípulos' : 'Pares de Discipulado'}
          </h3>
          {p.isGlobalScope && (
            <button className="text-xs font-bold text-gold hover:underline uppercase tracking-widest">Ver Todos</button>
          )}
        </div>

        {scopedPairs.length === 0 ? (
          <div className="card-heritage p-16 text-center text-slate-400">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Não há pares de discipulado no seu scope.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {scopedPairs.map(pair => {
              const mentor  = getPersonById(pair.mentorId);
              const disciple = getPersonById(pair.discipleId);
              return (
                <div key={pair.id} className="card-heritage p-6 hover:border-gold/30 transition-all group">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-4">
                      {/* Avatar stack */}
                      <div className="flex -space-x-3">
                        {[mentor, disciple].map((pData, i) => (
                          <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gold/10 flex items-center justify-center text-gold text-xs font-bold overflow-hidden">
                            {pData?.avatar ? (
                                <img src={pData.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                                pData?.name.split(' ').map(n => n[0]).slice(0,2).join('') ?? '?'
                            )}
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {mentor?.name ?? '—'} → {disciple?.name ?? '—'}
                        </p>
                        <p className="text-xs text-slate-500">{pair.course}</p>
                      </div>
                    </div>
                    {p.canEditMember && (
                      <button 
                        onClick={() => {
                          setSelectedPair(pair);
                          setFormOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-slate-900 border border-transparent hover:border-outline-variant hover:bg-surface-container-high rounded-full transition-all"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {/* Barra de progresso */}
                  <div className="space-y-1.5 mb-5">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>Progresso</span><span>{pair.progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gold rounded-full transition-all"
                        style={{ width: `${pair.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-outline-variant">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="w-3 h-3" /> Último: {pair.lastMeeting}
                    </div>
                    <button 
                      onClick={() => handleOpenJournal(pair)}
                      className="text-xs font-bold text-gold hover:underline uppercase tracking-widest"
                    >
                      Ver Diário <ChevronRight className="w-3 h-3 inline" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
