import React, { useState, useMemo } from 'react';
import { 
  HeartHandshake, Plus, Search, Filter, Phone, 
  MessageCircle, MapPin, Calendar, Clock, MoreVertical, X 
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { useData } from '../contexts/DataContext';
import FollowUpModal from '../components/FollowUpModal';
import Toast from '../components/ui/Toast';

const PRIORITY_COLORS: Record<string, string> = {
  'Alta':  'bg-red-100 text-red-700 border-red-200',
  'Média': 'bg-amber-100 text-amber-700 border-amber-200',
  'Baixa': 'bg-slate-100 text-slate-700 border-slate-200',
};

const STATUS_COLORS: Record<string, string> = {
  'Pendente':  'bg-amber-100 text-amber-700',
  'Agendado':  'bg-blue-100 text-blue-700',
  'Concluído': 'bg-green-100 text-green-700',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  'Visita':   <MapPin className="w-3.5 h-3.5" />,
  'Chamada':  <Phone className="w-3.5 h-3.5" />,
  'Mensagem': <MessageCircle className="w-3.5 h-3.5" />,
};

export default function Acompanhamento() {
  const { user } = useAuth();
  const p = usePermissions();

  // ── Scope ────────────────────────────────────────────────────────────────
  const { persons, cells, followUps, addFollowUp, updateFollowUp, getCellByMemberId, getPersonById } = useData();
  const [toast, setToast] = useState<{show: boolean, msg: string}>({ show: false, msg: '' });

  // ── Scope ────────────────────────────────────────────────────────────────
  const scopedFollowUps = useMemo(() => {
    if (!user) return [];
    if (p.isGlobalScope) return followUps;

    const supervisedCellIds = user.supervisedCellIds || [];
    
    // Leader scope: cells led by user + supervised cells
    const leaderCellIds = cells
      .filter(c => c.leaderId === user.id || supervisedCellIds.includes(c.id))
      .map(c => c.id);

    // Discipulador ou Líder: acompanhamentos das suas células ou sob sua responsabilidade directa
    if (user.role === 'DISCIPLER' || user.role === 'LEADER') {
      return followUps.filter(fu => 
        (fu.cellId && leaderCellIds.includes(fu.cellId)) || 
        fu.responsibleId === user.id
      );
    }

    return [];
  }, [user, p.isGlobalScope, followUps, cells]);

  // Filtros
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('Todos');
  const [priority, setPriority] = useState('Todos');

  const filtered = useMemo(() => scopedFollowUps.filter(f => {
    const person = persons.find(p => p.id === f.personId);
    const resp   = persons.find(p => p.id === f.responsibleId);
    
    const query = search.toLowerCase();
    const matchSearch = 
      (person && person.name.toLowerCase().includes(query)) ||
      (resp && resp.name.toLowerCase().includes(query)) ||
      (f.notes && f.notes.toLowerCase().includes(query));

    const matchStatus   = status === 'Todos' || f.status === status;
    const matchPriority = priority === 'Todos' || f.priority === priority;

    return matchSearch && matchStatus && matchPriority;
  }), [scopedFollowUps, search, status, priority, persons]);

  const hasFilters = search || status !== 'Todos' || priority !== 'Todos';
  const clearFilters = () => { setSearch(''); setStatus('Todos'); setPriority('Todos'); };

  const urgentCount = scopedFollowUps.filter(f => f.priority === 'Alta' && f.status !== 'Concluído').length;
  const pendingCount = scopedFollowUps.filter(f => f.status === 'Pendente').length;

  const [isModalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const handleOpenNew = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleSave = async (data: any) => {
    try {
      if (editingItem) {
        await updateFollowUp(editingItem.id, data);
        setToast({ show: true, msg: 'Registo atualizado com sucesso!' });
      } else {
        await addFollowUp(data);
        setToast({ show: true, msg: 'Novo acompanhamento registado!' });
      }
      setModalOpen(false);
    } catch (error: any) {
      setToast({ show: true, msg: error?.message ?? 'Não foi possível guardar o acompanhamento.' });
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 space-y-8">
      
      <FollowUpModal 
        isOpen={isModalOpen} 
        onClose={() => setModalOpen(false)} 
        onSubmit={handleSave} 
        initialData={editingItem} 
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-bold text-slate-900 tracking-tight">Acompanhamento Pastoral</h2>
          <p className="text-slate-500 font-medium">
            {p.isGlobalScope
              ? 'Gestão global de visitas, chamadas e aconselhamentos.'
              : user?.role === 'DISCIPLER'
                ? 'Acompanhamentos a decorrer nas células que supervisiona.'
                : 'Acompanhamentos dos membros da sua célula.'}
          </p>
        </div>
        {p.canAddFollowUp && (
          <button onClick={handleOpenNew} className="btn-primary-heritage flex items-center gap-2">
            <Plus className="w-4 h-4" /> Novo Registo
          </button>
        )}
      </div>

      {/* KPIs & Filtros integrados */}
      <div className="grid lg:grid-cols-12 gap-6">
        
        {/* KPIs */}
        <div className="lg:col-span-8 flex flex-col sm:flex-row gap-4">
          <div className="card-heritage p-5 flex-1 flex items-center gap-4 border-l-4 border-l-red-500">
            <div className="p-3 bg-red-50 rounded-lg">
              <HeartHandshake className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Prioridade Alta</p>
              <h3 className="text-2xl font-bold text-slate-900">{urgentCount}</h3>
            </div>
          </div>
          <div className="card-heritage p-5 flex-1 flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-lg">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Pendentes</p>
              <h3 className="text-2xl font-bold text-slate-900">{pendingCount}</h3>
            </div>
          </div>
        </div>

        {/* Action / Mini Filters */}
        <div className="lg:col-span-4 card-heritage p-5 flex flex-col justify-center space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar..." 
              className="w-full pl-9 pr-3 py-2 bg-surface-container-high border border-outline-variant rounded-md text-sm focus:ring-2 focus:ring-gold/20 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <select value={status} onChange={e => setStatus(e.target.value)} className="flex-1 bg-surface-container-high border border-outline-variant rounded-md text-xs px-2 py-2 outline-none">
              <option>Todos</option>
              <option>Pendente</option>
              <option>Agendado</option>
              <option>Concluído</option>
            </select>
            <select value={priority} onChange={e => setPriority(e.target.value)} className="flex-1 bg-surface-container-high border border-outline-variant rounded-md text-xs px-2 py-2 outline-none">
              <option>Todos</option>
              <option>Alta</option>
              <option>Média</option>
              <option>Baixa</option>
            </select>
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="text-[10px] font-bold text-gold uppercase tracking-widest text-right mt-1 hover:underline">
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Lista de Acompanhamentos */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="card-heritage p-16 text-center text-slate-400">
            <HeartHandshake className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum registo de acompanhamento encontrado.</p>
          </div>
        ) : (
          filtered.map(item => {
            const person = getPersonById(item.personId);
            const resp   = getPersonById(item.responsibleId);
            const cell   = getCellByMemberId(item.personId);
            const TypeIcon = TYPE_ICONS[item.type];
            const isCompleted = item.status === 'Concluído';

            return (
              <div 
                key={item.id} 
                className={cn(
                  "card-heritage p-5 transition-all flex flex-col md:flex-row gap-4 border-l-4",
                  item.priority === 'Alta' && !isCompleted ? 'border-l-red-500' : 
                  item.priority === 'Média' && !isCompleted ? 'border-l-amber-400' : 'border-l-slate-200',
                  isCompleted && 'opacity-60 grayscale'
                )}
              >
                {/* Info do Membro */}
                <div className="flex items-center gap-4 md:w-1/3">
                  <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-gold text-sm font-bold flex-shrink-0 border border-gold/20">
                    {person?.name.split(' ').map(n=>n[0]).slice(0,2).join('')}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{person?.name}</h3>
                    <p className="text-[11px] text-slate-500">{cell?.name ?? 'Sem Célula'} • {person?.status}</p>
                  </div>
                </div>

                {/* Tipo e Notas */}
                <div className="md:w-1/3 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-surface-container-high px-2 py-1 rounded">
                      {TypeIcon} {item.type}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {item.date}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2">{item.notes}</p>
                </div>

                {/* Status & Responsável */}
                <div className="md:w-1/3 flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-outline-variant pt-4 md:pt-0">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Responsável</p>
                    <p className="text-sm font-bold text-slate-800">{resp?.name ?? '—'}</p>
                    <p className="text-[11px] text-slate-500">{resp?.role ?? ''}</p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <span className={cn('badge-heritage capitalize', STATUS_COLORS[item.status])}>
                      {item.status}
                    </span>
                    <button 
                      onClick={() => handleEdit(item)}
                      className="text-slate-400 hover:text-slate-900 border border-transparent hover:border-outline-variant p-1.5 rounded transition-all"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Toast 
        isVisible={toast.show}
        message={toast.msg}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </motion.div>
  );
}
