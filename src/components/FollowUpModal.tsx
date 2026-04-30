import React, { useEffect, useState } from 'react';
import { HeartHandshake } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { ModalShell } from './ui/ModalShell';
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
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar acompanhamento' : 'Novo acompanhamento'}
      description="Organize a pessoa, responsável, prioridade e próximos passos."
      icon={<HeartHandshake className="h-5 w-5" />}
      iconClassName="bg-red-50 text-red-500"
      size="lg"
      footer={(
        <div className="modal-footer-actions">
          <button type="button" onClick={onClose} className="btn-secondary-heritage">
            Cancelar
          </button>
          <button type="submit" form="follow-up-form" disabled={isSubmitting} className="btn-primary-heritage">
            {isSubmitting ? 'A guardar...' : initialData ? 'Guardar' : 'Criar registo'}
          </button>
        </div>
      )}
    >
      <form id="follow-up-form" onSubmit={handleSubmit} className="space-y-5">
        <section className="modal-section">
          <h4 className="modal-section-title">Responsáveis</h4>
          <div className="modal-grid">
            <div className="modal-field">
              <label className="modal-label">Pessoa acompanhada</label>
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

            <div className="modal-field">
              <label className="modal-label">Responsável</label>
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
        </section>

        <section className="modal-section">
          <h4 className="modal-section-title">Detalhes do contacto</h4>
          <div className="modal-grid">
            <div className="modal-field">
              <label className="modal-label">Tipo</label>
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

            <div className="modal-field">
              <label className="modal-label">Data agendada</label>
              <input
                required
                type="date"
                value={formData.date}
                onChange={(event) => setFormData((current) => ({ ...current, date: event.target.value }))}
                className="input-heritage"
              />
            </div>

            <div className="modal-field">
              <label className="modal-label">Prioridade</label>
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

            <div className="modal-field">
              <label className="modal-label">Estado</label>
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
        </section>

        <section className="modal-section">
          <div className="modal-field">
            <label className="modal-label">Notas</label>
            <textarea
              required
              rows={4}
              value={formData.notes}
              onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))}
              className="input-heritage"
              placeholder="Registe contexto, próximos passos e observações."
            />
          </div>
        </section>
      </form>
    </ModalShell>
  );
}
