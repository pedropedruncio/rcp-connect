import React from 'react';
import { motion } from 'motion/react';
import { CalendarRange, Plus } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import EventFormModal from '../components/modals/EventFormModal';
import Toast from '../components/ui/Toast';
import type { EventItem } from '../types/domain';

export default function Eventos() {
  const { events } = useData();
  const [isModalOpen, setModalOpen] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState<EventItem | null>(null);
  const [toast, setToast] = React.useState<{ show: boolean; msg: string }>({ show: false, msg: '' });

  const sortedEvents = [...events].sort((left, right) => left.date.localeCompare(right.date));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 p-8">
      <Toast
        isVisible={toast.show}
        message={toast.msg}
        onClose={() => setToast((current) => ({ ...current, show: false }))}
      />

      <EventFormModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        initialData={selectedEvent}
        onSuccess={(title) => setToast({ show: true, msg: `Evento "${title}" guardado com sucesso.` })}
      />

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">Eventos</h2>
          <p className="font-medium text-slate-500">Calendário ligado ao Supabase remoto e pronto para CRUD real.</p>
        </div>
        <button
          onClick={() => {
            setSelectedEvent(null);
            setModalOpen(true);
          }}
          className="btn-primary-heritage flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Novo evento
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          {sortedEvents.length === 0 ? (
            <div className="card-heritage p-12 text-center text-sm text-slate-400">Nenhum evento registado.</div>
          ) : (
            sortedEvents.map((event) => (
              <div key={event.id} className="card-heritage p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="badge-heritage bg-blue-100 text-blue-700">{event.status}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{event.category}</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">{event.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{event.description || 'Sem descrição.'}</p>
                    <p className="mt-3 text-xs text-slate-500">
                      {event.date} · {event.time} · {event.location || event.campus}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedEvent(event);
                      setModalOpen(true);
                    }}
                    className="text-xs font-bold uppercase tracking-widest text-gold hover:underline"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="lg:col-span-4">
          <div className="card-heritage p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-gold/10 p-2.5">
                <CalendarRange className="h-5 w-5 text-gold" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Resumo</h3>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-outline-variant bg-surface-container-high p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{events.length}</p>
              </div>
              <div className="rounded-lg border border-outline-variant bg-surface-container-high p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Confirmados</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{events.filter((event) => event.status === 'Confirmado').length}</p>
              </div>
              <div className="rounded-lg border border-outline-variant bg-surface-container-high p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Concluídos</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{events.filter((event) => event.status === 'Concluído').length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
