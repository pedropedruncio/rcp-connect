import React, { useState, useMemo } from 'react';
import { 
  Network, Search, Plus, MoreVertical, Users, MapPin, Clock,
  ChevronRight, TrendingUp, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { useData } from '../contexts/DataContext';
import CellFormModal from '../components/modals/CellFormModal';
import Toast from '../components/ui/Toast';
import type { CellGroup } from '../types/domain';

// Fake detail view embedded
import { ArrowLeft, Calendar, FileText } from 'lucide-react';

const HEALTH_CONFIG = {
  EXCELENTE: { color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  ESTÁVEL:   { color: 'bg-amber-100 text-amber-700', icon: <TrendingUp   className="w-3.5 h-3.5" /> },
  ATENÇÃO:   { color: 'bg-red-100 text-red-700',    icon: <AlertTriangle className="w-3.5 h-3.5" /> },
};

export default function Celulas() {
  const { user } = useAuth();
  const p = usePermissions();

  const { persons, cells, getPersonById } = useData();
  const [selectedCell, setSelectedCell] = useState<CellGroup | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<any>(null);
  const [toast, setToast] = useState<{show: boolean, msg: string}>({ show: false, msg: '' });

  // ── Scope ────────────────────────────────────────────────────────────────
  const scopedCells = useMemo((): CellGroup[] => {
    if (!user) return [];
    if (p.isGlobalScope) return cells;

    const supervisedCellIds = user.supervisedCellIds || [];

    if (user.role === 'DISCIPLER') {
      return cells.filter(c => supervisedCellIds.includes(c.id));
    }
    if (user.role === 'LEADER') {
      return cells.filter(c => c.leaderId === user.id);
    }
    return [];
  }, [user, p.isGlobalScope, cells]);

  const [search, setSearch] = useState('');
  const filtered = useMemo(() =>
    scopedCells.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (persons.find(p => p.id === c.leaderId)?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      c.location.toLowerCase().includes(search.toLowerCase())
    ), [scopedCells, search, persons]
  );

  const totalMembers    = scopedCells.reduce((s, c) => s + c.memberIds.length, 0);
  const totalTrainees   = scopedCells.reduce((s, c) => s + c.traineeLeaderIds.length, 0);
  const needsAttention  = scopedCells.filter(c => c.health === 'ATENÇÃO').length;

  const isLeaderOnly = user?.role === 'LEADER';

  if (selectedCell) {
    const leader = getPersonById(selectedCell.leaderId);
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 space-y-6">
        <button 
          onClick={() => setSelectedCell(null)}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-gold transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-4xl font-bold text-slate-900 tracking-tight">{selectedCell.name}</h2>
            <p className="text-slate-500 font-medium">{selectedCell.location} · {selectedCell.day}, {selectedCell.time}</p>
          </div>
          <button 
            onClick={() => {
              window.print();
              setToast({ show: true, msg: 'Vista preparada para impressão em PDF.' });
            }} 
            className="btn-primary-heritage flex items-center gap-2 print:hidden"
          >
            <FileText className="w-4 h-4" /> Gerar Relatório PDF
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card-heritage p-6 lg:col-span-2">
             <h3 className="text-lg font-bold mb-4">Agenda da Célula</h3>
             <div className="space-y-3">
                <div className="p-4 bg-surface-container-high rounded-md flex justify-between items-center border border-outline-variant">
                  <div className="flex items-center gap-3"><Calendar className="w-4 h-4 text-gold"/> <span className="text-sm font-bold text-slate-800">Próximo Encontro</span></div>
                  <span className="text-xs text-slate-500">Nesta quinta-feira às 20:00</span>
                </div>
                <div className="p-4 bg-surface-container-high rounded-md flex justify-between items-center border border-outline-variant">
                  <div className="flex items-center gap-3"><Users className="w-4 h-4 text-gold"/> <span className="text-sm font-bold text-slate-800">Membros Associados</span></div>
                  <span className="text-xs text-slate-500">{selectedCell.memberIds.length} Pessoas</span>
                </div>
             </div>
             
             <h3 className="text-lg font-bold mt-8 mb-4">Pedidos de Oração Recentes</h3>
             <p className="text-sm text-slate-500">Nenhum pedido aberto da célula de momento.</p>
          </div>

          <div className="card-heritage p-6">
            <h3 className="text-lg font-bold mb-4">Liderança</h3>
             <div className="bg-surface-container-high p-4 rounded-md border border-outline-variant mb-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Líder Principal</p>
                <p className="text-sm font-bold text-slate-800">{leader?.name ?? '—'}</p>
             </div>
             <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Líderes em Treino</p>
                {selectedCell.traineeLeaderIds.length > 0 ? (
                  <ul className="text-sm text-slate-600 space-y-2">
                    {selectedCell.traineeLeaderIds.map(id => {
                       const p = getPersonById(id);
                       return <li key={id}>• {p?.name ?? 'Desconhecido'}</li>
                    })}
                  </ul>
                ) : <p className="text-xs text-slate-500 mt-0.5">Sem líderes em treino no momento.</p>}
             </div>
          </div>
        </div>
      </motion.div>
    );
  }

  const handleOpenNew = () => {
    setEditingCell(null);
    setModalOpen(true);
  };

  const handleEdit = (cell: CellGroup) => {
    setEditingCell(cell);
    setModalOpen(true);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 space-y-8 print:hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-bold text-slate-900 tracking-tight">
            {isLeaderOnly ? 'Minha Célula' : 'Células'}
          </h2>
          <p className="text-slate-500 font-medium">
            {isLeaderOnly
              ? 'Informações e membros do seu grupo.'
              : p.isGlobalScope
                ? 'Visão global de todos os pequenos grupos.'
                : `Células sob a sua supervisão (${scopedCells.length})`
            }
          </p>
        </div>
        {p.canAddCell && (
          <button onClick={handleOpenNew} className="btn-primary-heritage flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nova Célula
          </button>
        )}
      </div>

      {/* KPIs (apenas para DISCIPLER+) */}
      {!isLeaderOnly && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Células',          value: scopedCells.length, sub: 'no seu scope' },
            { label: 'Membros',          value: totalMembers,       sub: 'em grupos' },
            { label: 'Em Formação',      value: totalTrainees,      sub: 'líderes candidatos' },
            { label: 'Requerem Atenção', value: needsAttention,     sub: 'a monitorizar' },
          ].map((kpi, i) => (
            <div key={i} className="card-heritage p-5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
              <h3 className="text-3xl font-bold text-slate-900">{kpi.value}</h3>
              <p className="text-xs text-slate-400 mt-1">{kpi.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pesquisa (só quando há mais de 1 célula) */}
      {!isLeaderOnly && (
        <div className="card-heritage p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar por célula, líder ou localização..."
              className="w-full pl-11 pr-4 py-3 bg-surface-container-high border border-outline-variant rounded-md text-sm focus:ring-2 focus:ring-gold/20 outline-none"
            />
          </div>
        </div>
      )}

      {/* Cards */}
      <div className={cn(
        'grid gap-6',
        isLeaderOnly ? 'grid-cols-1 max-w-xl' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
      )}>
        {filtered.map(cell => {
          const health  = HEALTH_CONFIG[cell.health] ?? HEALTH_CONFIG.ESTÁVEL;
          const leader  = getPersonById(cell.leaderId);

          return (
            <div key={cell.id} className="card-heritage p-6 hover:border-gold/40 transition-all group flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center text-gold group-hover:bg-gold/20 transition-all">
                    <Network className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{cell.name}</h3>
                    <p className="text-[11px] text-slate-400">
                      Líder: <span className="font-semibold">{leader?.name ?? '—'}</span>
                    </p>
                  </div>
                </div>
                {p.canAddCell && (
                  <button 
                    onClick={() => handleEdit(cell)}
                    className="p-1.5 text-slate-300 hover:text-slate-700 rounded-md hover:bg-surface-container-high transition-all"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className={cn('badge-heritage flex items-center gap-1', health.color)}>
                  {health.icon} {cell.health}
                </span>
                <span className="text-[11px] text-slate-400">Última reunião: {cell.lastMeeting}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Users  className="w-3.5 h-3.5 text-slate-400" />
                  <span><strong>{cell.memberIds.length}</strong> membros</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Clock  className="w-3.5 h-3.5 text-slate-400" />
                  <span>{cell.day}, {cell.time}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600 col-span-2">
                  <MapPin className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                  <span>{cell.location}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-outline-variant mt-auto">
                <div className="flex -space-x-2">
                  {Array.from({ length: Math.min(4, cell.memberIds.length) }, (_, i) => (
                    <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-gold/20 flex items-center justify-center text-[10px] font-bold text-gold">
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                  {cell.memberIds.length > 4 && (
                    <div className="w-7 h-7 rounded-full border-2 border-white bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-slate-500">
                      +{cell.memberIds.length - 4}
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setSelectedCell(cell)}
                  className="flex items-center gap-1 text-[11px] font-bold text-gold hover:text-gold/80 uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Ver Detalhe <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-slate-400">
          <Network className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhuma célula encontrada.</p>
        </div>
      )}

      <CellFormModal 
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        initialData={editingCell}
        onSuccess={() => setToast({ show: true, msg: 'Operação realizada com sucesso!' })}
      />

      <Toast 
        isVisible={toast.show}
        message={toast.msg}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </motion.div>
  );
}
