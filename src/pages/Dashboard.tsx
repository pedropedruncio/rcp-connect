import React from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  Church,
  HeartHandshake,
  Network,
  Plus,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { usePermissions } from '../hooks/usePermissions';
import EventFormModal from '../components/modals/EventFormModal';
import Toast from '../components/ui/Toast';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const permissions = usePermissions();
  const {
    cells,
    discipleshipPairs,
    error,
    events,
    followUps,
    getCellByLeaderId,
    getCellByMemberId,
    isLoading,
    persons,
    familyMembers,
  } = useData();
  const [isEventModalOpen, setEventModalOpen] = React.useState(false);
  const [toast, setToast] = React.useState<{ show: boolean; msg: string }>({ show: false, msg: '' });

  const myCell = user ? getCellByMemberId(user.id) : undefined;
  const ledCell = user ? getCellByLeaderId(user.id) : undefined;
  const scopedCells =
    permissions.isGlobalScope
      ? cells
      : user?.role === 'LEADER'
        ? cells.filter((cell) => cell.leaderId === user.id)
        : user?.role === 'DISCIPLER'
          ? cells.filter((cell) => user.supervisedCellIds.includes(cell.id))
          : myCell
            ? [myCell]
            : [];
  const scopedPeople =
    permissions.isGlobalScope
      ? persons
      : user?.role === 'MEMBER'
        ? persons.filter((person) => person.id === user.id)
        : persons.filter((person) => user?.memberIds.includes(person.id));
  const scopedPairs =
    permissions.isGlobalScope
      ? discipleshipPairs
      : user?.role === 'LEADER'
        ? discipleshipPairs.filter((pair) => pair.mentorId === user.id || pair.discipleId === user.id)
        : user?.role === 'DISCIPLER'
          ? discipleshipPairs.filter((pair) => user.leaderPersonIds.includes(pair.mentorId) || pair.discipleId === user.id)
          : discipleshipPairs.filter((pair) => pair.discipleId === user?.id);
  const scopedFollowUps =
    permissions.isGlobalScope
      ? followUps
      : followUps.filter((item) => item.personId === user?.id || item.responsibleId === user?.id || user?.memberIds.includes(item.personId));
  const upcomingEvents = [...events]
    .filter((event) => new Date(event.date).getTime() >= Date.now() - 86400000)
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(0, 5);

  const myFamilies = familyMembers?.filter(m => m.personId === user?.id && m.status === 'ACCEPTED').map(m => m.familyId) ?? [];
  const myFamilySize = familyMembers?.filter(m => myFamilies.includes(m.familyId) && m.status === 'ACCEPTED').length ?? 0;

  const cards = permissions.isGlobalScope
    ? [
        { label: 'Pessoas ativas', value: persons.filter((person) => person.status === 'MEMBRO').length, icon: Users },
        { label: 'Células registadas', value: cells.length, icon: Network },
        { label: 'Em discipulado', value: discipleshipPairs.length, icon: BookOpen },
        { label: 'Acompanhamentos pendentes', value: followUps.filter((item) => item.status !== 'Concluído').length, icon: HeartHandshake },
      ]
    : user?.role === 'MEMBER'
      ? [
          { label: 'Minha célula', value: myCell?.name ?? 'Sem célula', icon: Network },
          { label: 'Membros da família', value: myFamilySize, icon: Users, onClick: () => navigate('/familia'), actionLabel: 'Gerir' },
          { label: 'Discipulado ativo', value: scopedPairs.length, icon: BookOpen },
          { label: 'Acompanhamentos abertos', value: scopedFollowUps.filter((item) => item.status !== 'Concluído').length, icon: HeartHandshake },
        ]
      : [
          { label: 'Minha célula', value: myCell?.name ?? 'Sem célula', icon: Network },
          { label: 'Pessoas no meu scope', value: scopedPeople.length, icon: Users },
          { label: 'Discipulado ativo', value: scopedPairs.length, icon: BookOpen },
          { label: 'Acompanhamentos abertos', value: scopedFollowUps.filter((item) => item.status !== 'Concluído').length, icon: HeartHandshake },
        ];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 p-8">
      <Toast
        isVisible={toast.show}
        message={toast.msg}
        onClose={() => setToast((current) => ({ ...current, show: false }))}
      />

      <EventFormModal
        isOpen={isEventModalOpen}
        onClose={() => setEventModalOpen(false)}
        onSuccess={(title) => setToast({ show: true, msg: `Evento "${title}" criado com sucesso.` })}
      />

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">
            {permissions.isGlobalScope ? 'Painel ministerial' : `Bem-vindo, ${user?.name}`}
          </h2>
          <p className="font-medium text-slate-500">
            {permissions.isGlobalScope
              ? 'Visão derivada dos dados reais de pessoas, células, eventos e acompanhamento.'
              : 'Resumo do seu âmbito atual dentro do RCP Connect.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/minha-agenda')} className="btn-secondary-heritage flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Agenda
          </button>
          {permissions.canViewEventos && (
            <button onClick={() => setEventModalOpen(true)} className="btn-primary-heritage flex items-center gap-2">
              <Plus className="h-4 w-4" /> Novo evento
            </button>
          )}
        </div>
      </div>

      {error && <div className="card-heritage border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="card-heritage p-6 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-md border border-outline-variant bg-surface p-2">
                  <card.icon className="h-5 w-5 text-gold" />
                </div>
              </div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{card.label}</p>
              <h3 className="text-2xl font-bold text-slate-900">{card.value}</h3>
            </div>
            {card.onClick && (
              <button 
                onClick={card.onClick}
                className="mt-4 text-xs font-semibold text-gold hover:text-gold-light text-left inline-flex items-center gap-1 transition-colors"
              >
                {card.actionLabel} →
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8">
          <div className="card-heritage p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Próximos eventos</h3>
                <p className="text-sm text-slate-500">Calendário vindo do Supabase remoto.</p>
              </div>
              <button onClick={() => navigate('/eventos')} className="text-xs font-bold uppercase tracking-widest text-gold hover:underline">
                Ver tudo
              </button>
            </div>

            {isLoading ? (
              <p className="text-sm text-slate-400">A carregar eventos...</p>
            ) : upcomingEvents.length === 0 ? (
              <div className="rounded-lg border border-dashed border-outline-variant p-8 text-center text-sm text-slate-400">
                Nenhum evento futuro registado.
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => navigate('/eventos')}
                    className="flex w-full items-center justify-between rounded-lg border border-outline-variant bg-surface-container-high p-4 text-left transition-colors hover:bg-surface"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-800">{event.name}</p>
                      <p className="text-xs text-slate-500">
                        {event.date} · {event.time} · {event.location || event.campus}
                      </p>
                    </div>
                    <span className="badge-heritage bg-blue-100 text-blue-700">{event.status}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {user?.role !== 'MEMBER' && (
            <div className="card-heritage p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-lg bg-green-50 p-2.5">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Saúde da rede</h3>
                  <p className="text-sm text-slate-500">Indicadores simples derivados das células atuais.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[
                  { label: 'Células excelentes', value: scopedCells.filter((cell) => cell.health === 'EXCELENTE').length },
                  { label: 'Células estáveis', value: scopedCells.filter((cell) => cell.health === 'ESTÁVEL').length },
                  { label: 'Precisam atenção', value: scopedCells.filter((cell) => cell.health === 'ATENÇÃO').length },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-outline-variant bg-surface-container-high p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-8 lg:col-span-4">
          {user?.role !== 'MEMBER' && (
            <div className="card-heritage p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-lg bg-red-50 p-2.5">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Itens que pedem ação</h3>
                  <p className="text-sm text-slate-500">Pendências reais do seu âmbito.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border border-outline-variant bg-surface-container-high p-4">
                  <p className="text-sm font-bold text-slate-800">Acompanhamentos pendentes</p>
                  <p className="text-xs text-slate-500">{scopedFollowUps.filter((item) => item.status === 'Pendente').length} registos aguardam ação.</p>
                </div>
                <div className="rounded-lg border border-outline-variant bg-surface-container-high p-4">
                  <p className="text-sm font-bold text-slate-800">Pessoas sem célula</p>
                  <p className="text-xs text-slate-500">{scopedPeople.filter((person) => !person.cellId).length} pessoas ainda não estão ligadas a uma célula.</p>
                </div>
                <div className="rounded-lg border border-outline-variant bg-surface-container-high p-4">
                  <p className="text-sm font-bold text-slate-800">Discipulado em curso</p>
                  <p className="text-xs text-slate-500">{scopedPairs.filter((pair) => pair.progress < 100).length} pares precisam de continuidade.</p>
                </div>
              </div>
            </div>
          )}

          <div className="card-heritage p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-gold/10 p-2.5">
                <Church className="h-5 w-5 text-gold" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Atalhos</h3>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Pessoas', action: () => navigate('/pessoas') },
                { label: 'Células', action: () => navigate('/celulas') },
                { label: 'Acompanhamento', action: () => navigate('/acompanhamento') },
                { label: 'Relatórios', action: () => navigate('/relatorios') },
              ]
                .filter((item) => {
                  if (item.label === 'Pessoas') return permissions.canViewPessoas;
                  if (item.label === 'Células') return permissions.canViewCelulas;
                  if (item.label === 'Acompanhamento') return permissions.canViewAcompanhamento;
                  if (item.label === 'Relatórios') return permissions.canViewRelatorios;
                  return true;
                })
                .map((item) => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="w-full rounded-lg border border-outline-variant p-3 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-surface-container-high"
                  >
                    {item.label}
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
