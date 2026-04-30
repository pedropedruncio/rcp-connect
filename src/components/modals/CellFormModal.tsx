import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Network, Save, X } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import type { CellGroup, CellInput } from '../../types/domain';

interface CellFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: CellGroup | null;
}

const LEADER_ROLES = new Set(['Líder de Célula', 'Discipulador', 'Pastor', 'Administrador']);

export default function CellFormModal({ isOpen, onClose, onSuccess, initialData }: CellFormModalProps) {
  const { user } = useAuth();
  const { addCell, campuses, persons, updateCell } = useData();
  const isLeader = user?.role === 'LEADER' && !['ADMIN', 'PASTOR'].includes(user.role);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CellInput>({
    name: '',
    leaderId: '',
    location: '',
    day: 'Quinta-feira',
    time: '20:00',
    health: 'ESTÁVEL',
    campusId: null,
    traineeLeaderIds: [],
  });

  useEffect(() => {
    if (!isOpen) return;

    setFormData({
      id: initialData?.id,
      name: initialData?.name ?? '',
      leaderId: initialData?.leaderId ?? '',
      location: initialData?.location ?? '',
      day: initialData?.day ?? 'Quinta-feira',
      time: initialData?.time ?? '20:00',
      health: initialData?.health ?? 'ESTÁVEL',
      campusId: initialData?.campusId ?? campuses[0]?.id ?? null,
      traineeLeaderIds: initialData?.traineeLeaderIds ?? [],
    });
  }, [campuses, initialData, isOpen]);

  const leaders = persons.filter((person) => LEADER_ROLES.has(person.role));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (initialData) {
        await updateCell(initialData.id, formData);
      } else {
        await addCell(formData);
      }

      onSuccess();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gold/10 p-2">
                  <Network className="h-5 w-5 text-gold" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{initialData ? 'Editar célula' : 'Nova célula'}</h3>
              </div>
              <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form id="cell-form" onSubmit={handleSubmit} className="space-y-6 p-8">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Nome da célula</label>
                <input
                  required
                  type="text"
                  disabled={isLeader}
                  value={formData.name}
                  onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                  className="input-heritage disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Líder responsável</label>
                  <select
                    required
                    disabled={isLeader}
                    value={formData.leaderId}
                    onChange={(event) => setFormData((current) => ({ ...current, leaderId: event.target.value }))}
                    className="input-heritage disabled:opacity-50"
                  >
                    <option value="">Selecionar...</option>
                    {leaders.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Campus</label>
                  <select
                    disabled={isLeader}
                    value={formData.campusId ?? ''}
                    onChange={(event) => setFormData((current) => ({ ...current, campusId: event.target.value || null }))}
                    className="input-heritage disabled:opacity-50"
                  >
                    <option value="">Sem campus</option>
                    {campuses.map((campus) => (
                      <option key={campus.id} value={campus.id}>
                        {campus.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Dia</label>
                  <select
                    value={formData.day}
                    onChange={(event) => setFormData((current) => ({ ...current, day: event.target.value }))}
                    className="input-heritage"
                  >
                    {['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'].map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Hora</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(event) => setFormData((current) => ({ ...current, time: event.target.value }))}
                    className="input-heritage"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Saúde</label>
                  <select
                    disabled={isLeader}
                    value={formData.health}
                    onChange={(event) => setFormData((current) => ({ ...current, health: event.target.value as CellInput['health'] }))}
                    className="input-heritage disabled:opacity-50"
                  >
                    <option value="EXCELENTE">EXCELENTE</option>
                    <option value="ESTÁVEL">ESTÁVEL</option>
                    <option value="ATENÇÃO">ATENÇÃO</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Localização</label>
                <input
                  required
                  type="text"
                  value={formData.location}
                  onChange={(event) => setFormData((current) => ({ ...current, location: event.target.value }))}
                  className="input-heritage"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Líderes em Treino</label>
                <div className="flex flex-wrap gap-2 p-3 bg-surface-container-high border border-outline-variant rounded-md min-h-[44px]">
                  {persons.filter(p => p.role === 'Líder em Formação').map(person => (
                    <label key={person.id} className="flex items-center gap-2 px-2 py-1 bg-white border border-outline-variant rounded text-xs cursor-pointer hover:border-gold transition-colors">
                      <input 
                        type="checkbox"
                        className="w-3 h-3 accent-gold"
                        checked={formData.traineeLeaderIds?.includes(person.id)}
                        onChange={(e) => {
                          const ids = formData.traineeLeaderIds || [];
                          if (e.target.checked) {
                            setFormData(prev => ({ ...prev, traineeLeaderIds: [...ids, person.id] }));
                          } else {
                            setFormData(prev => ({ ...prev, traineeLeaderIds: ids.filter(id => id !== person.id) }));
                          }
                        }}
                      />
                      {person.name}
                    </label>
                  ))}
                  {persons.filter(p => p.role === 'Líder em Formação').length === 0 && (
                    <p className="text-[10px] text-slate-400 italic">Nenhum líder em formação disponível.</p>
                  )}
                </div>
              </div>
            </form>

            <div className="flex items-center justify-end gap-3 border-t border-outline-variant bg-surface-container-low p-6">
              <button onClick={onClose} className="rounded-md px-6 py-2.5 text-sm font-bold text-slate-500 transition-all hover:bg-slate-100">
                Cancelar
              </button>
              <button type="submit" form="cell-form" disabled={isSubmitting} className="btn-primary-heritage flex items-center gap-2 px-8 disabled:opacity-70">
                <Save className="h-4 w-4" />
                {isSubmitting ? 'A guardar...' : initialData ? 'Guardar alterações' : 'Criar célula'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
