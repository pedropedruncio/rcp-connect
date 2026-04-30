import React, { useEffect, useState } from 'react';
import { Network, Save } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ModalShell } from '../ui/ModalShell';
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
  const trainees = persons.filter((person) => person.role === 'Líder em Formação');

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
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar célula' : 'Nova célula'}
      description="Defina liderança, encontro, localização e formação."
      icon={<Network className="h-5 w-5" />}
      size="lg"
      footer={(
        <div className="modal-footer-actions">
          <button type="button" onClick={onClose} className="btn-secondary-heritage">
            Cancelar
          </button>
          <button type="submit" form="cell-form" disabled={isSubmitting} className="btn-primary-heritage flex items-center gap-2">
            <Save className="h-4 w-4" />
            {isSubmitting ? 'A guardar...' : initialData ? 'Guardar alterações' : 'Criar célula'}
          </button>
        </div>
      )}
    >
      <form id="cell-form" onSubmit={handleSubmit} className="space-y-5">
        <section className="modal-section">
          <h4 className="modal-section-title">Identificação</h4>
          <div className="modal-field">
            <label className="modal-label">Nome da célula</label>
            <input
              required
              type="text"
              disabled={isLeader}
              value={formData.name}
              onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
              className="input-heritage disabled:opacity-50"
            />
          </div>

          <div className="modal-grid mt-4">
            <div className="modal-field">
              <label className="modal-label">Líder responsável</label>
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

            <div className="modal-field">
              <label className="modal-label">Campus</label>
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
        </section>

        <section className="modal-section">
          <h4 className="modal-section-title">Encontro</h4>
          <div className="modal-grid-3">
            <div className="modal-field">
              <label className="modal-label">Dia</label>
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
            <div className="modal-field">
              <label className="modal-label">Hora</label>
              <input
                type="time"
                value={formData.time}
                onChange={(event) => setFormData((current) => ({ ...current, time: event.target.value }))}
                className="input-heritage"
              />
            </div>
            <div className="modal-field">
              <label className="modal-label">Saúde</label>
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

          <div className="modal-field mt-4">
            <label className="modal-label">Localização</label>
            <input
              required
              type="text"
              value={formData.location}
              onChange={(event) => setFormData((current) => ({ ...current, location: event.target.value }))}
              className="input-heritage"
            />
          </div>
        </section>

        <section className="modal-section">
          <h4 className="modal-section-title">Líderes em treino</h4>
          <div className="flex min-h-[52px] flex-wrap gap-2 rounded-md border border-outline-variant bg-surface-container-low p-3">
            {trainees.map((person) => (
              <label key={person.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-outline-variant bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-gold">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-gold"
                  checked={formData.traineeLeaderIds?.includes(person.id)}
                  onChange={(event) => {
                    const ids = formData.traineeLeaderIds || [];
                    if (event.target.checked) {
                      setFormData((current) => ({ ...current, traineeLeaderIds: [...ids, person.id] }));
                    } else {
                      setFormData((current) => ({ ...current, traineeLeaderIds: ids.filter(id => id !== person.id) }));
                    }
                  }}
                />
                {person.name}
              </label>
            ))}
            {trainees.length === 0 && (
              <p className="text-xs italic text-slate-400">Nenhum líder em formação disponível.</p>
            )}
          </div>
        </section>
      </form>
    </ModalShell>
  );
}
