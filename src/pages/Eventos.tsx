import React from 'react';
import { motion } from 'motion/react';
import { CalendarRange, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import EventFormModal from '../components/modals/EventFormModal';
import ChurchCalendarActions from '../components/ChurchCalendarActions';
import ChurchYearCalendar from '../components/ChurchYearCalendar';
import Toast from '../components/ui/Toast';
import type { EventItem } from '../types/domain';

export default function Eventos() {
  const { user } = useAuth();
  const { events } = useData();
  const [isModalOpen, setModalOpen] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState<EventItem | null>(null);
  const [toast, setToast] = React.useState<{ show: boolean; msg: string }>({ show: false, msg: '' });
  const canManageEvents = user?.role === 'ADMIN' || user?.role === 'PASTOR';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 p-8">
      <Toast
        isVisible={toast.show}
        message={toast.msg}
        onClose={() => setToast((current) => ({ ...current, show: false }))}
      />

      {canManageEvents && (
        <EventFormModal
          isOpen={isModalOpen}
          onClose={() => setModalOpen(false)}
          initialData={selectedEvent}
          onSuccess={(title) => setToast({ show: true, msg: `Evento "${title}" guardado com sucesso.` })}
        />
      )}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">Agenda anual da igreja</h2>
          <p className="font-medium text-slate-500">Visualização completa dos eventos e atividades por ano.</p>
        </div>
        {canManageEvents && (
          <button
            onClick={() => {
              setSelectedEvent(null);
              setModalOpen(true);
            }}
            className="btn-primary-heritage flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Novo evento
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <ChurchYearCalendar 
            events={events} 
            canEdit={canManageEvents} 
            onEdit={(event) => {
              setSelectedEvent(event);
              setModalOpen(true);
            }}
          />
        </div>

        <div className="lg:col-span-4">
          <div className="card-heritage p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-gold/10 p-2.5">
                <CalendarRange className="h-5 w-5 text-gold" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Resumo da Agenda</h3>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-outline-variant bg-surface-container-high p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total de Eventos</p>
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

          <div className="mt-6">
            <ChurchCalendarActions onToast={(msg) => setToast({ show: true, msg })} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
