import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Clock, Tag, Info } from 'lucide-react';
import type { EventItem } from '../types/domain';
import { cn } from '../lib/utils';
import { formatDateLabel } from '../lib/domain';

interface ChurchYearCalendarProps {
  events: EventItem[];
  canEdit?: boolean;
  onEdit?: (event: EventItem) => void;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const DAYS_OF_WEEK = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export default function ChurchYearCalendar({ events, canEdit, onEdit }: ChurchYearCalendarProps) {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  // Group events by date key (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map: Record<string, EventItem[]> = {};
    events.forEach(event => {
      const key = event.date; // Assuming YYYY-MM-DD
      if (!map[key]) map[key] = [];
      map[key].push(event);
    });
    return map;
  }, [events]);

  const selectedEvents = selectedDateKey ? eventsByDate[selectedDateKey] || [] : [];

  const changeYear = (delta: number) => {
    setCurrentYear(prev => prev + delta);
    setSelectedDateKey(null);
  };

  const renderMonth = (monthIndex: number) => {
    const firstDay = new Date(currentYear, monthIndex, 1);
    const lastDay = new Date(currentYear, monthIndex + 1, 0);
    
    // JS getDay(): 0=Sun, 1=Mon, ..., 6=Sat
    // Target: 0=Mon, ..., 6=Sun
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7;
    const daysInMonth = lastDay.getDate();
    
    const days = [];
    // Empty days at start
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<div key={`empty-start-${i}`} className="h-8 w-full" />);
    }
    
    // Month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${currentYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = eventsByDate[dateKey] || [];
      const hasEvents = dayEvents.length > 0;
      const isSelected = selectedDateKey === dateKey;
      const isToday = new Date().toISOString().split('T')[0] === dateKey;

      days.push(
        <button
          key={day}
          onClick={() => setSelectedDateKey(dateKey)}
          className={cn(
            "relative h-8 w-full flex items-center justify-center text-xs font-medium rounded-full transition-all",
            isSelected 
              ? "bg-gold text-white shadow-md z-10" 
              : hasEvents 
                ? "bg-gold/10 text-gold hover:bg-gold/20" 
                : "text-slate-600 hover:bg-slate-100",
            isToday && !isSelected && "ring-1 ring-gold ring-offset-1"
          )}
        >
          {day}
          {hasEvents && !isSelected && (
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
              {dayEvents.slice(0, 3).map((_, i) => (
                <span key={i} className="w-1 h-1 rounded-full bg-gold" />
              ))}
            </span>
          )}
        </button>
      );
    }

    return (
      <div key={monthIndex} className="card-heritage p-4 flex flex-col h-full">
        <h4 className="text-sm font-bold text-slate-900 mb-3 text-center">{MONTHS[monthIndex]}</h4>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS_OF_WEEK.map(d => (
            <div key={d} className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-tighter">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Year Navigation */}
      <div className="flex items-center justify-center gap-6 bg-white p-4 rounded-2xl border border-outline-variant shadow-sm">
        <button 
          onClick={() => changeYear(-1)}
          className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-gold"
          title="Ano Anterior"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="text-2xl font-bold text-slate-900 tracking-tight min-w-[80px] text-center">
          {currentYear}
        </span>
        <button 
          onClick={() => changeYear(1)}
          className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-gold"
          title="Próximo Ano"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {MONTHS.map((_, index) => renderMonth(index))}
      </div>

      {/* Selection Details */}
      <div className="min-h-[100px]">
        {selectedDateKey && (
          <div className="card-heritage p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-6 border-b border-outline-variant pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold/10 rounded-lg">
                  <CalendarIcon className="w-5 h-5 text-gold" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  {formatDateLabel(selectedDateKey)}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedDateKey(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest"
              >
                Fechar
              </button>
            </div>

            {selectedEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <Info className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">Nenhum evento registado para este dia.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedEvents.map((event) => (
                  <div key={event.id} className="p-4 rounded-xl border border-outline-variant bg-surface hover:border-gold/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn(
                        "badge-heritage",
                        event.status === 'Confirmado' ? "bg-emerald-100 text-emerald-700" :
                        event.status === 'Concluído' ? "bg-slate-100 text-slate-600" :
                        "bg-amber-100 text-amber-700"
                      )}>
                        {event.status}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {event.category}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 mb-2">{event.name}</h4>
                    <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                      {event.description || 'Sem descrição.'}
                    </p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-gold" />
                        <span>{event.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-gold" />
                        <span>{event.location || event.campus}</span>
                      </div>
                    </div>

                    {canEdit && (
                      <button 
                        onClick={() => onEdit?.(event)}
                        className="mt-4 w-full py-2 bg-white border border-outline text-xs font-bold uppercase tracking-widest text-slate-600 rounded-lg hover:bg-slate-50 hover:border-gold/50 hover:text-gold transition-all"
                      >
                        Editar Evento
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {events.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-400 italic">Nenhum evento registado na agenda anual da igreja para este ano.</p>
        </div>
      )}
    </div>
  );
}
