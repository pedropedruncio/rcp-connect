import React from 'react';
import { motion } from 'motion/react';
import { Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

type AgendaItem = {
  id: string;
  title: string;
  type: string;
  date: string;
  time: string;
  location: string;
  color: string;
};

export default function MinhaAgenda() {
  const { user } = useAuth();
  const { discipleshipPairs, events, followUps, getCellByLeaderId, getCellByMemberId } = useData();

  if (!user) return null;

  const myCell = getCellByMemberId(user.id) ?? getCellByLeaderId(user.id);
  const agenda: AgendaItem[] = [
    ...events.map((event) => ({
      id: `event-${event.id}`,
      title: event.name,
      type: event.category,
      date: event.date,
      time: event.time,
      location: event.location || event.campus,
      color: 'bg-gold/10 border-gold/30 text-gold',
    })),
    ...followUps
      .filter((item) => item.personId === user.id || item.responsibleId === user.id)
      .map((item) => ({
        id: `followup-${item.id}`,
        title: `${item.type} pastoral`,
        type: 'Acompanhamento',
        date: item.date,
        time: '18:00',
        location: myCell?.location ?? 'A definir',
        color: 'bg-blue-50 border-blue-200 text-blue-600',
      })),
    ...discipleshipPairs
      .filter((pair) => pair.discipleId === user.id || pair.mentorId === user.id)
      .map((pair) => ({
        id: `pair-${pair.id}`,
        title: `Discipulado · ${pair.course}`,
        type: 'Discipulado',
        date: pair.lastMeeting,
        time: '19:00',
        location: myCell?.location ?? 'A definir',
        color: 'bg-green-50 border-green-200 text-green-600',
      })),
  ]
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(0, 8);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-4xl space-y-8 p-8">
      <div>
        <h2 className="text-4xl font-bold tracking-tight text-slate-900">Minha Agenda</h2>
        <p className="font-medium text-slate-500">Compromissos derivados dos seus eventos, discipulado e acompanhamento.</p>
      </div>

      <div className="card-heritage p-6">
        <div className="mb-6 flex items-center gap-3 border-b border-outline-variant pb-4">
          <div className="rounded-lg bg-surface-container-high p-2.5">
            <CalendarIcon className="h-5 w-5 text-slate-700" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Próximos compromissos</h3>
        </div>

        <div className="space-y-4">
          {agenda.length === 0 ? (
            <div className="rounded-lg border border-dashed border-outline-variant p-8 text-center text-sm text-slate-400">
              Não existem compromissos no seu calendário neste momento.
            </div>
          ) : (
            agenda.map((item) => (
              <div key={item.id} className={`flex flex-col justify-between gap-4 rounded-xl border p-4 transition-all md:flex-row md:items-center ${item.color}`}>
                <div>
                  <span className="rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                    {item.type}
                  </span>
                  <h4 className="mt-2 text-base font-bold">{item.title}</h4>
                </div>
                <div className="space-y-1 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 opacity-70" />
                    <span>{item.date} · {item.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 opacity-70" />
                    <span>{item.location}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
