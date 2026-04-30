import React, { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, Save } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { ModalShell } from '../ui/ModalShell';
import type { EventInput, EventItem } from '../../types/domain';

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (title: string) => void;
  initialData?: EventItem | null;
  isCellEvent?: boolean;
}

export default function EventFormModal({ isOpen, onClose, onSuccess, initialData, isCellEvent }: EventFormModalProps) {
  const { addEvent, campuses, updateEvent } = useData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<EventInput>({
    name: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    time: '19:00',
    location: '',
    category: isCellEvent ? 'Célula' : 'Igreja',
    campusId: null,
    status: 'Planeamento',
  });

  useEffect(() => {
    if (!isOpen) return;

    setFormData({
      id: initialData?.id,
      name: initialData?.name ?? '',
      description: initialData?.description ?? '',
      date: initialData?.date ?? new Date().toISOString().slice(0, 10),
      time: initialData?.time ?? '19:00',
      location: initialData?.location ?? '',
      category: initialData?.category ?? (isCellEvent ? 'Célula' : 'Igreja'),
      campusId: initialData?.campusId ?? campuses[0]?.id ?? null,
      status: initialData?.status ?? 'Planeamento',
      attendeeIds: initialData?.attendeeIds ?? [],
    });
  }, [campuses, initialData, isCellEvent, isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (initialData) {
        await updateEvent(initialData.id, formData);
      } else {
        await addEvent(formData);
      }

      onSuccess(formData.name || 'Evento');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar evento' : isCellEvent ? 'Novo encontro de célula' : 'Novo evento'}
      description="Registe a atividade com data, local, campus e estado."
      icon={<Calendar className="h-5 w-5" />}
      size="lg"
      footer={(
        <div className="modal-footer-actions">
          <button type="button" onClick={onClose} className="btn-secondary-heritage">
            Cancelar
          </button>
          <button type="submit" form="event-form" disabled={isSubmitting} className="btn-primary-heritage flex items-center gap-2">
            <Save className="h-4 w-4" />
            {isSubmitting ? 'A guardar...' : 'Guardar evento'}
          </button>
        </div>
      )}
    >
      <form id="event-form" onSubmit={handleSubmit} className="space-y-5">
        <section className="modal-section">
          <h4 className="modal-section-title">Identificação</h4>
          <div className="modal-field">
            <label className="modal-label">Título</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
              className="input-heritage"
            />
          </div>
        </section>

        <section className="modal-section">
          <h4 className="modal-section-title">Quando e onde</h4>
          <div className="modal-grid">
            <div className="modal-field">
              <label className="modal-label flex items-center gap-2">
                <Calendar className="h-3 w-3" /> Data
              </label>
              <input
                required
                type="date"
                value={formData.date}
                onChange={(event) => setFormData((current) => ({ ...current, date: event.target.value }))}
                className="input-heritage"
              />
            </div>
            <div className="modal-field">
              <label className="modal-label flex items-center gap-2">
                <Clock className="h-3 w-3" /> Hora
              </label>
              <input
                required
                type="time"
                value={formData.time}
                onChange={(event) => setFormData((current) => ({ ...current, time: event.target.value }))}
                className="input-heritage"
              />
            </div>
            <div className="modal-field">
              <label className="modal-label flex items-center gap-2">
                <MapPin className="h-3 w-3" /> Local
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(event) => setFormData((current) => ({ ...current, location: event.target.value }))}
                className="input-heritage"
              />
            </div>
            <div className="modal-field">
              <label className="modal-label">Campus</label>
              <select
                value={formData.campusId ?? ''}
                onChange={(event) => setFormData((current) => ({ ...current, campusId: event.target.value || null }))}
                className="input-heritage"
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
          <h4 className="modal-section-title">Classificação</h4>
          <div className="modal-grid">
            <div className="modal-field">
              <label className="modal-label">Categoria</label>
              <input
                type="text"
                value={formData.category}
                onChange={(event) => setFormData((current) => ({ ...current, category: event.target.value }))}
                className="input-heritage"
              />
            </div>
            <div className="modal-field">
              <label className="modal-label">Estado</label>
              <select
                value={formData.status}
                onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value as EventInput['status'] }))}
                className="input-heritage"
              >
                <option value="Planeamento">Planeamento</option>
                <option value="Confirmado">Confirmado</option>
                <option value="Concluído">Concluído</option>
              </select>
            </div>
          </div>

          <div className="modal-field mt-4">
            <label className="modal-label">Descrição</label>
            <textarea
              value={formData.description}
              onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
              className="input-heritage"
            />
          </div>
        </section>
      </form>
    </ModalShell>
  );
}
