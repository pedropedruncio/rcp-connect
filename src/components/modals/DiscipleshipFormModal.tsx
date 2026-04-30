import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, Save, X } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import type { DiscipleshipPair, DiscipleshipPairInput } from '../../types/domain';

interface DiscipleshipFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: DiscipleshipPair | null;
}

const MENTOR_ROLES = new Set(['Líder de Célula', 'Discipulador', 'Pastor', 'Administrador']);

export default function DiscipleshipFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: DiscipleshipFormModalProps) {
  const { user } = useAuth();
  const p = usePermissions();
  const { addDiscipleshipPair, persons, cells, updateDiscipleshipPair } = useData();
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

  const [formData, setFormData] = useState<DiscipleshipPairInput>({
    mentorId: '',
    discipleId: '',
    course: 'Fundamentos da Fé',
    progress: 0,
    lastMeeting: new Date().toISOString().slice(0, 10),
    startDate: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (!isOpen) return;

    setFormData({
      id: initialData?.id,
      mentorId: initialData?.mentorId ?? '',
      discipleId: initialData?.discipleId ?? '',
      course: initialData?.course ?? 'Fundamentos da Fé',
      progress: initialData?.progress ?? 0,
      lastMeeting: initialData?.lastMeeting ?? new Date().toISOString().slice(0, 10),
      startDate: initialData?.startDate ?? new Date().toISOString().slice(0, 10),
    });
  }, [initialData, isOpen]);


  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (initialData) {
        await updateDiscipleshipPair(initialData.id, formData);
      } else {
        await addDiscipleshipPair(formData);
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
                <div className="rounded-lg bg-blue-50 p-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{initialData ? 'Editar discipulado' : 'Novo discipulado'}</h3>
              </div>
              <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form id="discipleship-form" onSubmit={handleSubmit} className="space-y-6 p-8">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Mentor</label>
                  <select
                    required
                    value={formData.mentorId}
                    onChange={(event) => setFormData((current) => ({ ...current, mentorId: event.target.value }))}
                    className="input-heritage"
                  >
                    <option value="">Selecionar...</option>
                    {selectablePersons.filter(p => MENTOR_ROLES.has(p.role)).map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Discípulo</label>
                  <select
                    required
                    value={formData.discipleId}
                    onChange={(event) => setFormData((current) => ({ ...current, discipleId: event.target.value }))}
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
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Curso</label>
                <input
                  type="text"
                  value={formData.course}
                  onChange={(event) => setFormData((current) => ({ ...current, course: event.target.value }))}
                  className="input-heritage"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Progresso</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress}
                    onChange={(event) => setFormData((current) => ({ ...current, progress: Number(event.target.value) }))}
                    className="input-heritage"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Último encontro</label>
                  <input
                    type="date"
                    value={formData.lastMeeting}
                    onChange={(event) => setFormData((current) => ({ ...current, lastMeeting: event.target.value }))}
                    className="input-heritage"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Início</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(event) => setFormData((current) => ({ ...current, startDate: event.target.value }))}
                    className="input-heritage"
                  />
                </div>
              </div>
            </form>

            <div className="flex items-center justify-end gap-3 border-t border-outline-variant bg-surface-container-low p-6">
              <button onClick={onClose} className="rounded-md px-6 py-2.5 text-sm font-bold text-slate-500 transition-all hover:bg-slate-100">
                Cancelar
              </button>
              <button type="submit" form="discipleship-form" disabled={isSubmitting} className="btn-primary-heritage flex items-center gap-2 px-8 disabled:opacity-70">
                <Save className="h-4 w-4" />
                {isSubmitting ? 'A guardar...' : 'Guardar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
