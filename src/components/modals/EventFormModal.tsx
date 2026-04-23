import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Calendar, Clock, MapPin, Save, X } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
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
            className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gold/10 p-2">
                  <Calendar className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{initialData ? 'Editar evento' : isCellEvent ? 'Novo encontro de célula' : 'Novo evento'}</h3>
                  <p className="text-sm text-slate-500">Registe a atividade com data, local e campus.</p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form id="event-form" onSubmit={handleSubmit} className="space-y-6 overflow-y-auto p-8">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Título</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                  className="input-heritage"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
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
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
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
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                    <MapPin className="h-3 w-3" /> Local
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(event) => setFormData((current) => ({ ...current, location: event.target.value }))}
                    className="input-heritage"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Campus</label>
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

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Categoria</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(event) => setFormData((current) => ({ ...current, category: event.target.value }))}
                    className="input-heritage"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Estado</label>
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

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                  className="input-heritage min-h-[120px] py-3"
                />
              </div>
            </form>

            <div className="flex items-center justify-end gap-3 border-t border-outline-variant bg-surface-container-low p-6">
              <button onClick={onClose} className="rounded-md px-6 py-2.5 text-sm font-bold text-slate-500 transition-all hover:bg-slate-100">
                Cancelar
              </button>
              <button type="submit" form="event-form" disabled={isSubmitting} className="btn-primary-heritage flex items-center gap-2 px-8 disabled:opacity-70">
                <Save className="h-4 w-4" />
                {isSubmitting ? 'A guardar...' : 'Guardar evento'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
