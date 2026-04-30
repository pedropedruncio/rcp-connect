import React from 'react';
import { motion } from 'motion/react';
import { Plus, ShieldCheck, Star, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { usePermissions } from '../hooks/usePermissions';
import { getInitials } from '../lib/domain';
import PersonFormModal from '../components/modals/PersonFormModal';
import Toast from '../components/ui/Toast';
import type { Person } from '../types/domain';

const LEADERSHIP_ROLES = new Set(['Líder de Célula', 'Discipulador', 'Pastor', 'Administrador']);

export default function Lideranca() {
  const { user } = useAuth();
  const permissions = usePermissions();
  const { cells, getCellByLeaderId, persons } = useData();
  const [isModalOpen, setModalOpen] = React.useState(false);
  const [selectedLeader, setSelectedLeader] = React.useState<Person | undefined>(undefined);
  const [toast, setToast] = React.useState<{ show: boolean; msg: string }>({ show: false, msg: '' });

  const leaders = persons.filter((person) => LEADERSHIP_ROLES.has(person.role));
  const scopedLeaders = permissions.isGlobal
    ? leaders
    : leaders.filter((person) => {
        const ledCell = getCellByLeaderId(person.id);
        if (!ledCell) return user?.leaderPersonIds.includes(person.id) ?? false;
        return user?.supervisedCellIds.includes(ledCell.id) ?? false;
      });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 p-8">
      <Toast
        isVisible={toast.show}
        message={toast.msg}
        onClose={() => setToast((current) => ({ ...current, show: false }))}
      />

      <PersonFormModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        initialData={selectedLeader}
        onSuccess={(name) => setToast({ show: true, msg: `${name} guardado com sucesso.` })}
      />

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">Liderança</h2>
          <p className="font-medium text-slate-500">
            {permissions.isGlobal
              ? 'Visão global de líderes, discipuladores e cobertura atual.'
              : `Liderança visível no seu âmbito atual (${scopedLeaders.length})`}
          </p>
        </div>
        {permissions.canAddLeader && (
          <button
            onClick={() => {
              setSelectedLeader(undefined);
              setModalOpen(true);
            }}
            className="btn-primary-heritage flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Novo líder
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'Liderança ativa', value: scopedLeaders.length, icon: ShieldCheck },
          { label: 'Líderes com célula', value: scopedLeaders.filter((person) => cells.some((cell) => cell.leaderId === person.id)).length, icon: Star },
          { label: 'Células cobertas', value: permissions.isGlobal ? cells.length : user?.supervisedCellIds.length ?? 0, icon: Users },
        ].map((item) => (
          <div key={item.label} className="card-heritage p-5">
            <div className="mb-3 rounded-md bg-surface p-2 w-fit">
              <item.icon className="h-5 w-5 text-gold" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="card-heritage overflow-hidden">
        <table className="w-full text-left">
          <thead className="border-b border-outline-variant bg-surface-container-high">
            <tr>
              <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Pessoa</th>
              <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Papel</th>
              <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Célula</th>
              <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Campus</th>
              {permissions.canAddLeader && <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {scopedLeaders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-8 py-16 text-center text-sm text-slate-400">
                  Nenhuma liderança encontrada no seu âmbito.
                </td>
              </tr>
            ) : (
              scopedLeaders.map((leader) => {
                const ledCell = cells.find((cell) => cell.leaderId === leader.id);

                return (
                  <tr key={leader.id} className="transition-colors hover:bg-surface-container-high/40">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant bg-gold/10 text-sm font-bold text-gold">
                          {getInitials(leader.name)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{leader.name}</p>
                          <p className="text-[11px] text-slate-400">{leader.email || 'Sem email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-sm font-medium text-slate-700">{leader.role}</td>
                    <td className="px-8 py-4 text-sm text-slate-600">{ledCell?.name ?? 'Cobertura sem célula direta'}</td>
                    <td className="px-8 py-4 text-sm text-slate-600">{leader.campus}</td>
                    {permissions.canAddLeader && (
                      <td className="px-8 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedLeader(leader);
                            setModalOpen(true);
                          }}
                          className="text-xs font-bold uppercase tracking-widest text-gold hover:underline"
                        >
                          Editar
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
