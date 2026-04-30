import React, { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, Plus, MoreVertical, Mail, Phone, MapPin,
  ChevronLeft, ChevronRight, Download, UserPlus, X, Users,
  User, Edit, ExternalLink, Droplets, HeartHandshake, BookOpen
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { useData } from '../contexts/DataContext';
import PersonFormModal from '../components/modals/PersonFormModal';
import FollowUpModal from '../components/FollowUpModal';
import DiscipleshipFormModal from '../components/modals/DiscipleshipFormModal';
import Toast from '../components/ui/Toast';
import type { Person, FollowUpInput } from '../types/domain';
import { buildGoogleMapsSearchUrl } from '../lib/address';

const STATUS_COLORS: Record<string, string> = {
  MEMBRO:    'bg-green-100 text-green-700',
  VISITANTE: 'bg-amber-100 text-amber-700',
  INATIVO:   'bg-slate-100 text-slate-500',
};

const PER_PAGE = 8;
const ACTION_MENU_WIDTH = 224;
const ACTION_MENU_ESTIMATED_HEIGHT = 288;
const ACTION_MENU_GAP = 8;
const ACTION_MENU_VIEWPORT_MARGIN = 8;

type ActionMenuAnchorRect = Pick<DOMRect, 'top' | 'right' | 'bottom' | 'left' | 'width' | 'height'>;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getActionMenuPosition(
  anchorRect: ActionMenuAnchorRect,
  menuWidth = ACTION_MENU_WIDTH,
  menuHeight = ACTION_MENU_ESTIMATED_HEIGHT,
) {
  if (typeof window === 'undefined') {
    return {
      top: anchorRect.bottom + ACTION_MENU_GAP,
      left: anchorRect.left,
      maxHeight: ACTION_MENU_ESTIMATED_HEIGHT,
      transformOrigin: 'top right',
    };
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const spaceBelow = viewportHeight - anchorRect.bottom - ACTION_MENU_GAP - ACTION_MENU_VIEWPORT_MARGIN;
  const spaceAbove = anchorRect.top - ACTION_MENU_GAP - ACTION_MENU_VIEWPORT_MARGIN;
  const opensUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;
  const availableHeight = Math.max(
    96,
    Math.min(opensUp ? spaceAbove : spaceBelow, viewportHeight - ACTION_MENU_VIEWPORT_MARGIN * 2),
  );
  const renderedHeight = Math.min(menuHeight, availableHeight);

  const preferredLeft =
    anchorRect.left + menuWidth > viewportWidth - ACTION_MENU_VIEWPORT_MARGIN
      ? anchorRect.right - menuWidth
      : anchorRect.left;
  const maxLeft = Math.max(ACTION_MENU_VIEWPORT_MARGIN, viewportWidth - menuWidth - ACTION_MENU_VIEWPORT_MARGIN);
  const left = clamp(preferredLeft, ACTION_MENU_VIEWPORT_MARGIN, maxLeft);

  const preferredTop = opensUp
    ? anchorRect.top - ACTION_MENU_GAP - renderedHeight
    : anchorRect.bottom + ACTION_MENU_GAP;
  const maxTop = Math.max(ACTION_MENU_VIEWPORT_MARGIN, viewportHeight - renderedHeight - ACTION_MENU_VIEWPORT_MARGIN);
  const top = clamp(preferredTop, ACTION_MENU_VIEWPORT_MARGIN, maxTop);

  return {
    top,
    left,
    maxHeight: availableHeight,
    transformOrigin: opensUp ? 'bottom right' : 'top right',
  };
}

function ActionDropdownPortal({
  anchorRect,
  menuId,
  onClose,
  children,
}: {
  anchorRect: ActionMenuAnchorRect;
  menuId: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(() => getActionMenuPosition(anchorRect));

  useLayoutEffect(() => {
    const menu = menuRef.current;
    setPosition(getActionMenuPosition(
      anchorRect,
      menu?.offsetWidth ?? ACTION_MENU_WIDTH,
      menu?.offsetHeight ?? ACTION_MENU_ESTIMATED_HEIGHT,
    ));
  }, [anchorRect]);

  useEffect(() => {
    const handleWindowClick = () => onClose();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const handleScroll = (event: Event) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      onClose();
    };

    window.addEventListener('click', handleWindowClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', onClose);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('click', handleWindowClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      ref={menuRef}
      id={menuId}
      role="menu"
      initial={{ opacity: 0, scale: 0.96, y: position.transformOrigin.startsWith('bottom') ? 6 : -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: position.transformOrigin.startsWith('bottom') ? 6 : -6 }}
      transition={{ duration: 0.12 }}
      style={{
        top: position.top,
        left: position.left,
        maxHeight: position.maxHeight,
        transformOrigin: position.transformOrigin,
      }}
      className="fixed w-56 bg-white border border-outline-variant rounded-lg shadow-xl z-[1000] py-1 overflow-y-auto"
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </motion.div>,
    document.body,
  );
}

export default function Pessoas() {
  const { user } = useAuth();
  const p = usePermissions();
  const navigate = useNavigate();

  const { persons, cells, addFollowUp, addDiscipleshipPair, error, isLoading } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | undefined>(undefined);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isDiscipleshipModalOpen, setIsDiscipleshipModalOpen] = useState(false);
  const [followUpTarget, setFollowUpTarget] = useState<Person | null>(null);
  const [discipleshipTarget, setDiscipleshipTarget] = useState<Person | null>(null);
  const [toast, setToast] = useState<{show: boolean, msg: string}>({ show: false, msg: '' });
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [actionsAnchorRect, setActionsAnchorRect] = useState<ActionMenuAnchorRect | null>(null);

  // ── Scope: quais pessoas este utilizador pode ver ─────────────────────────
  const scopedPeople = useMemo(() => {
    if (!user) return [];
    if (p.isGlobal) return persons;

    const supervisedCellIds = user.supervisedCellIds || [];

    if (user.role === 'DISCIPLER' || user.role === 'LEADER') {
      const leaderCellIds = cells
        .filter(c => c.leaderId === user.id || supervisedCellIds.includes(c.id))
        .map(c => c.id);

      const memberIds = new Set(
        cells
          .filter(c => leaderCellIds.includes(c.id))
          .flatMap(c => c.memberIds)
      );
      return persons.filter(per => memberIds.has(per.id));
    }
    if (user.role === 'MEMBER') {
      return persons.filter((person) => person.id === user.id);
    }

    return [];
  }, [user, p.isGlobal, persons, cells]);

  // ── Filtros client-side ──────────────────────────────────────────────────
  const [search, setSearch]         = useState('');
  const [campusFilter, setCampus]   = useState('Todos');
  const [statusFilter, setStatus]   = useState('Todos');
  const [baptismFilter, setBaptism] = useState('Todos');
  const [page, setPage]             = useState(1);

  const campuses = useMemo(() =>
    ['Todos', ...Array.from(new Set(scopedPeople.map(per => per.campus)))],
    [scopedPeople]
  );

  const filtered = useMemo(() => scopedPeople.filter(person => {
    const q = search.toLowerCase();
    const matchSearch = person.name.toLowerCase().includes(q) || (person.email && person.email.toLowerCase().includes(q));
    const matchCampus = campusFilter === 'Todos' || person.campus === campusFilter;
    const matchStatus = statusFilter === 'Todos' || person.status === statusFilter;
    const matchBaptism = baptismFilter === 'Todos' 
      ? true 
      : baptismFilter === 'Batizados' 
        ? !!person.baptismDate 
        : !person.baptismDate;

    return matchSearch && matchCampus && matchStatus && matchBaptism;
  }), [scopedPeople, search, campusFilter, statusFilter, baptismFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const hasFilters = search || campusFilter !== 'Todos' || statusFilter !== 'Todos' || baptismFilter !== 'Todos';

  const clear = () => { 
    setSearch(''); 
    setCampus('Todos'); 
    setStatus('Todos'); 
    setBaptism('Todos');
    setPage(1); 
  };

  const ambitoLabel = useMemo(() => {
    if (p.isGlobal)      return `${persons.length} pessoas — toda a congregação`;
    if (user?.role === 'DISCIPLER') return `${scopedPeople.length} pessoas — no seu âmbito de supervisão`;
    if (user?.role === 'LEADER')    return `${scopedPeople.length} pessoas — na sua célula`;
    return '';
  }, [p.isGlobal, user, scopedPeople, persons.length]);

  const closeActionsMenu = () => {
    setOpenActionsId(null);
    setActionsAnchorRect(null);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-bold text-slate-900 tracking-tight">Pessoas</h2>
          <p className="text-slate-500 font-medium">{ambitoLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          {p.canExportData && (
            <button className="btn-secondary-heritage flex items-center gap-2">
              <Download className="w-4 h-4" /> Exportar
            </button>
          )}
          {p.canAddMember && (
            <button 
              onClick={() => {
                setEditingPerson(undefined);
                setIsModalOpen(true);
              }}
              className="btn-primary-heritage flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" /> 
              {user?.role === 'LEADER' ? 'Adicionar à Célula' : 'Novo Cadastro'}
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="card-heritage p-4 flex flex-col lg:flex-row items-center gap-3">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Pesquisar por nome ou e-mail..."
            className="w-full pl-11 pr-4 py-3 bg-surface-container-high border border-outline-variant rounded-md text-sm focus:ring-2 focus:ring-gold/20 outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {campuses.length > 2 && (
            <select value={campusFilter} onChange={e => { setCampus(e.target.value); setPage(1); }}
              className="px-4 py-3 bg-surface-container-high border border-outline-variant rounded-md text-sm outline-none">
              {campuses.map(c => <option key={c}>{c}</option>)}
            </select>
          )}
          <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="px-4 py-3 bg-surface-container-high border border-outline-variant rounded-md text-sm outline-none">
            <option>Todos os Estados</option>
            <option>MEMBRO</option>
            <option>VISITANTE</option>
            <option>INATIVO</option>
          </select>
          <select value={baptismFilter} onChange={e => { setBaptism(e.target.value); setPage(1); }}
            className="px-4 py-3 bg-surface-container-high border border-outline-variant rounded-md text-sm outline-none">
            <option value="Todos">Batismo: Todos</option>
            <option value="Batizados">Batizados</option>
            <option value="Não Batizados">Não Batizados</option>
          </select>
          {hasFilters && (
            <button onClick={clear} className="flex items-center gap-1.5 text-xs font-bold text-gold px-3 py-3 whitespace-nowrap hover:underline">
              <X className="w-3.5 h-3.5" /> Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="card-heritage overflow-hidden">
        {error && (
          <div className="border-b border-outline-variant bg-red-50 px-8 py-4 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-high border-b border-outline-variant">
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pessoa</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contacto</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Célula</th>
                {p.isGlobal && <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Campus</th>}
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center text-sm text-slate-400">
                    A carregar pessoas...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center">
                    <Users className="w-10 h-10 mx-auto text-slate-200 mb-3" />
                    <p className="text-slate-400 text-sm">Nenhuma pessoa encontrada.</p>
                  </td>
                </tr>
              ) : paginated.map(person => (
                <tr key={person.id} className="hover:bg-surface-container-high/40 transition-colors group">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-gold/10 border border-outline-variant flex items-center justify-center text-gold font-bold text-sm flex-shrink-0 overflow-hidden">
                        {person.avatarUrl ? (
                          <img src={person.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          person.name.split(' ').map(n => n[0]).slice(0, 2).join('')
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link to={`/pessoas/${person.id}`} className="font-bold text-slate-900 hover:text-gold transition-colors text-sm">
                            {person.name}
                          </Link>
                          {person.baptismDate && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-bold uppercase tracking-tighter">
                              <Droplets className="w-2.5 h-2.5" /> Batizado
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">Membro desde {person.since}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Mail className="w-3 h-3 text-slate-400" /> {person.email || '—'}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Phone className="w-3 h-3 text-slate-400" /> {person.phone || '—'}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-sm text-slate-600 font-medium">
                    {person.cellId ? cells.find(c => c.id === person.cellId)?.name || person.cellId : 'Sem célula'}
                  </td>
                  {p.isGlobal && (
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-gold" />
                        <span className="text-sm font-medium text-slate-700">{person.campus}</span>
                      </div>
                    </td>
                  )}
                  <td className="px-8 py-4">
                    <span className={cn('badge-heritage', STATUS_COLORS[person.status] ?? 'bg-slate-100 text-slate-600')}>
                      {person.status}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (openActionsId === person.id) {
                          closeActionsMenu();
                          return;
                        }

                        const rect = e.currentTarget.getBoundingClientRect();
                        setActionsAnchorRect({
                          top: rect.top,
                          right: rect.right,
                          bottom: rect.bottom,
                          left: rect.left,
                          width: rect.width,
                          height: rect.height,
                        });
                        setOpenActionsId(person.id);
                      }}
                      aria-haspopup="menu"
                      aria-expanded={openActionsId === person.id}
                      aria-controls={openActionsId === person.id ? `person-actions-${person.id}` : undefined}
                      aria-label={`Abrir ações de ${person.name}`}
                      className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-surface-container-high rounded-md transition-all"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    <AnimatePresence>
                      {openActionsId === person.id && actionsAnchorRect && (
                        <ActionDropdownPortal
                          anchorRect={actionsAnchorRect}
                          menuId={`person-actions-${person.id}`}
                          onClose={closeActionsMenu}
                        >
                          <button
                            role="menuitem"
                            onClick={() => {
                              closeActionsMenu();
                              navigate(`/pessoas/${person.id}`);
                            }}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <User className="w-4 h-4 text-slate-400" /> Ver perfil
                          </button>
                          
                          {p.canEditMember && (
                            <button
                              role="menuitem"
                              onClick={() => {
                                setEditingPerson(person);
                                setIsModalOpen(true);
                                closeActionsMenu();
                              }}
                              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              <Edit className="w-4 h-4 text-slate-400" /> Editar pessoa
                            </button>
                          )}

                          {person.email && (
                            <a
                              role="menuitem"
                              href={`mailto:${person.email}`}
                              onClick={closeActionsMenu}
                              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              <Mail className="w-4 h-4 text-slate-400" /> Enviar email
                            </a>
                          )}

                          {person.address && (
                            <a
                              role="menuitem"
                              href={buildGoogleMapsSearchUrl(person.address)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={closeActionsMenu}
                              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4 text-slate-400" /> Ver no Maps
                            </a>
                          )}

                          {p.canAddFollowUp && (
                            <button
                              role="menuitem"
                              onClick={() => {
                                setFollowUpTarget(person);
                                setIsFollowUpModalOpen(true);
                                closeActionsMenu();
                              }}
                              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
                            >
                              <HeartHandshake className="w-4 h-4 text-gold" /> Registrar acompanhamento
                            </button>
                          )}

                          {p.canAddDiscipleship && (
                            <button
                              role="menuitem"
                              onClick={() => {
                                setDiscipleshipTarget(person);
                                setIsDiscipleshipModalOpen(true);
                                closeActionsMenu();
                              }}
                              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
                            >
                              <BookOpen className="w-4 h-4 text-blue-500" /> Iniciar discipulado
                            </button>
                          )}
                        </ActionDropdownPortal>
                      )}
                    </AnimatePresence>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="px-8 py-4 bg-surface-container-high border-t border-outline-variant flex items-center justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {filtered.length === 0
              ? 'Sem resultados'
              : `${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, filtered.length)} de ${filtered.length}`}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 text-slate-400 hover:text-slate-900 disabled:opacity-30">
              <ChevronLeft className="w-5 h-5" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
              <button key={pg} onClick={() => setPage(pg)}
                className={cn('w-8 h-8 flex items-center justify-center rounded-md text-xs font-bold transition-all',
                  pg === page ? 'bg-gold text-white shadow-md shadow-gold/20' : 'text-slate-500 hover:bg-slate-100')}>
                {pg}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="p-1.5 text-slate-400 hover:text-slate-900 disabled:opacity-30">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <PersonFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={editingPerson}
        onSuccess={(name) => setToast({ show: true, msg: `${name} processado com sucesso!` })}
      />

      {isFollowUpModalOpen && (
        <FollowUpModal
          isOpen={isFollowUpModalOpen}
          onClose={() => {
            setIsFollowUpModalOpen(false);
            setFollowUpTarget(null);
          }}
          initialData={followUpTarget ? { personId: followUpTarget.id } as any : null}
          onSubmit={async (data: FollowUpInput) => {
            await addFollowUp(data);
            setToast({ show: true, msg: 'Acompanhamento registrado com sucesso!' });
          }}
        />
      )}

      {isDiscipleshipModalOpen && (
        <DiscipleshipFormModal
          isOpen={isDiscipleshipModalOpen}
          onClose={() => {
            setIsDiscipleshipModalOpen(false);
            setDiscipleshipTarget(null);
          }}
          initialData={discipleshipTarget ? { discipleId: discipleshipTarget.id } as any : null}
          onSuccess={() => {
            setToast({ show: true, msg: 'Discipulado iniciado com sucesso!' });
          }}
        />
      )}

      <Toast 
        isVisible={toast.show}
        message={toast.msg}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </motion.div>
  );
}
