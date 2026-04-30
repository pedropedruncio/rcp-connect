import React, { useEffect, useState } from 'react';
import { BookOpen, Save } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { ModalShell } from '../ui/ModalShell';
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
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar discipulado' : 'Novo discipulado'}
      description="Defina mentor, discípulo, curso e progresso do percurso."
      icon={<BookOpen className="h-5 w-5" />}
      iconClassName="bg-blue-50 text-blue-600"
      size="lg"
      footer={(
        <div className="modal-footer-actions">
          <button type="button" onClick={onClose} className="btn-secondary-heritage">
            Cancelar
          </button>
          <button type="submit" form="discipleship-form" disabled={isSubmitting} className="btn-primary-heritage flex items-center gap-2">
            <Save className="h-4 w-4" />
            {isSubmitting ? 'A guardar...' : 'Guardar'}
          </button>
        </div>
      )}
    >
      <form id="discipleship-form" onSubmit={handleSubmit} className="space-y-5">
        <section className="modal-section">
          <h4 className="modal-section-title">Participantes</h4>
          <div className="modal-grid">
            <div className="modal-field">
              <label className="modal-label">Mentor</label>
              <select
                required
                value={formData.mentorId}
                onChange={(event) => setFormData((current) => ({ ...current, mentorId: event.target.value }))}
                className="input-heritage"
              >
                <option value="">Selecionar...</option>
                {selectablePersons.filter(person => MENTOR_ROLES.has(person.role)).map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-field">
              <label className="modal-label">Discípulo</label>
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
        </section>

        <section className="modal-section">
          <h4 className="modal-section-title">Percurso</h4>
          <div className="modal-field">
            <label className="modal-label">Curso</label>
            <input
              type="text"
              value={formData.course}
              onChange={(event) => setFormData((current) => ({ ...current, course: event.target.value }))}
              className="input-heritage"
            />
          </div>

          <div className="modal-grid-3 mt-4">
            <div className="modal-field">
              <label className="modal-label">Progresso</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(event) => setFormData((current) => ({ ...current, progress: Number(event.target.value) }))}
                className="input-heritage"
              />
            </div>
            <div className="modal-field">
              <label className="modal-label">Último encontro</label>
              <input
                type="date"
                value={formData.lastMeeting}
                onChange={(event) => setFormData((current) => ({ ...current, lastMeeting: event.target.value }))}
                className="input-heritage"
              />
            </div>
            <div className="modal-field">
              <label className="modal-label">Início</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(event) => setFormData((current) => ({ ...current, startDate: event.target.value }))}
                className="input-heritage"
              />
            </div>
          </div>
        </section>
      </form>
    </ModalShell>
  );
}
