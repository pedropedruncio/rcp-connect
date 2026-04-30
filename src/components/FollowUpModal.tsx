import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { HeartHandshake, X } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import type { FollowUp, FollowUpInput } from '../types/domain';

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FollowUpInput) => Promise<void> | void;
  initialData?: FollowUp | null;
}

const RESPONSIBLE_ROLES = new Set(['Líder de Célula', 'Discipulador', 'Pastor', 'Administrador']);

export default function FollowUpModal({ isOpen, onClose, onSubmit, initialData }: FollowUpModalProps) {
  const { user } = useAuth();
  const p = usePermissions();
  const { persons, cells } = useData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // ── Scoped Persons for Selection ─────────────────────────────────────────
  const selectablePersons = React.useMemo(() => {
    if (!user) return [];
    if (p.isGlobal) return persons;

    const supervisedCellIds = user.supervisedCellIds || [];
    const leaderCellIds = cells
      .filter(c => c.leaderId === user.id || supervisedCellIds.includes(c.id))
      .map(c => c.id);

    if (user.role === 'DISCIPLER' || user.role === 'LEADER') {
      const memberIds = new Set(
        cells
          .filter(c => leaderCellIds.includes(c.id))
          .flatMap(c => c.memberIds)
      );
      return persons.filter(per => memberIds.has(per.id));
    }
    
    return persons.filter(per => per.id === user.id);
  }, [user, p.isGlobal, persons, cells]);

  const [formData, setFormData] = useState<FollowUpInput>({
    personId: '',
    responsibleId: '',
    type: 'Visita',
    priority: 'Alta',
    status: 'Pendente',
    notes: '',
    date: new Date().toISOString().slice(0, 10),
    cellId: null,
  });

  useEffect(() => {
    if (!isOpen) return;

    setFormData({
      id: initialData?.id,
      personId: initialData?.personId ?? '',
      responsibleId: initialData?.responsibleId ?? '',
      type: initialData?.type ?? 'Visita',
      priority: initialData?.priority ?? 'Alta',
      status: initialData?.status ?? 'Pendente',
      notes: initialData?.notes ?? '',
      date: initialData?.date ?? new Date().toISOString().slice(0, 10),
      cellId: initialData?.cellId ?? null,
    });
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const responsibles = persons.filter((person) => RESPONSIBLE_ROLES.has(person.role));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit(formData);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-lg overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-50 p-2">
                <HeartHandshake className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-slate-900">
                {initialData ? 'Editar acompanhamento' : 'Novo acompanhamento'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="max-h-[75vh] space-y-5 overflow-y-auto bg-surface p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Pessoa acompanhada</label>
                <select
                  required
                  value={formData.personId}
                  onChange={(event) => setFormData((current) => ({ ...current, personId: event.target.value }))}
                  className="input-heritage"
                >
                  <option value="">Selecionar...</option>
                  {selectablePersons.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Responsável</label>
                <select
                  required
                  value={formData.responsibleId}
                  onChange={(event) => setFormData((current) => ({ ...current, responsibleId: event.target.value }))}
                  className="input-heritage"
                >
                  <option value="">Selecionar...</option>
                  {responsibles.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Tipo</label>
                <select
                  value={formData.type}
                  onChange={(event) => setFormData((current) => ({ ...current, type: event.target.value as FollowUp['type'] }))}
                  className="input-heritage"
                >
                  <option value="Visita">Visita</option>
                  <option value="Chamada">Chamada</option>
                  <option value="Mensagem">Mensagem</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Data agendada</label>
                <input
                  required
                  type="date"
                  value={formData.date}
                  onChange={(event) => setFormData((current) => ({ ...current, date: event.target.value }))}
                  className="input-heritage"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Prioridade</label>
                <select
                  value={formData.priority}
                  onChange={(event) => setFormData((current) => ({ ...current, priority: event.target.value as FollowUp['priority'] }))}
                  className="input-heritage"
                >
                  <option value="Alta">Alta</option>
                  <option value="Média">Média</option>
                  <option value="Baixa">Baixa</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Estado</label>
                <select
                  value={formData.status}
                  onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value as FollowUp['status'] }))}
                  className="input-heritage"
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Agendado">Agendado</option>
                  <option value="Concluído">Concluído</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Notas</label>
              <textarea
                required
                rows={4}
                value={formData.notes}
                onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))}
                className="input-heritage min-h-[120px] py-3"
                placeholder="Registe contexto, próximos passos e observações."
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-outline-variant pt-6">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-5 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button type="submit" disabled={isSubmitting} className="btn-primary-heritage disabled:opacity-70">
                {isSubmitting ? 'A guardar...' : initialData ? 'Guardar' : 'Criar registo'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
