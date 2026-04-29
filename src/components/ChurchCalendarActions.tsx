import React from 'react';
import { CalendarPlus, Copy, Download, ExternalLink } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface ChurchCalendarActionsProps {
  compact?: boolean;
  onToast?: (message: string) => void;
}

function getCalendarFeedUrl() {
  if (typeof window === 'undefined') return '/api/calendar/church.ics';
  return `${window.location.origin}/api/calendar/church.ics`;
}

export default function ChurchCalendarActions({ compact = false, onToast }: ChurchCalendarActionsProps) {
  const calendarFeedUrl = React.useMemo(() => getCalendarFeedUrl(), []);
  const isLocalhost = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
  const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(calendarFeedUrl)}`;
  const outlookUrl = `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(calendarFeedUrl)}&name=${encodeURIComponent('Agenda da Igreja RCP')}`;
  const appleUrl = calendarFeedUrl.replace(/^https?:\/\//, 'webcal://');

  const copyFeedUrl = async () => {
    await navigator.clipboard.writeText(calendarFeedUrl);
    onToast?.('Link iCal copiado.');
  };

  return (
    <div className={cn('rounded-lg border border-outline-variant bg-surface-container-high p-4', compact && 'p-3')}>
      <div className="mb-3 flex items-start gap-3">
        <div className="rounded-md bg-gold/10 p-2">
          <CalendarPlus className="h-4 w-4 text-gold" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900">Adicionar agenda da igreja</h4>
          <p className="text-xs text-slate-500">Subscreva ou transfira o calendário público em iCal/ICS.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copyFeedUrl} className="btn-secondary-heritage flex items-center gap-2 px-3 py-2 text-xs">
          <Copy className="h-3.5 w-3.5" /> Copiar link iCal
        </button>
        <a href={calendarFeedUrl} download="agenda-igreja-rcp.ics" className="btn-secondary-heritage flex items-center gap-2 px-3 py-2 text-xs">
          <Download className="h-3.5 w-3.5" /> Transferir .ics
        </a>
        <a href={googleUrl} target="_blank" rel="noreferrer" className="btn-secondary-heritage flex items-center gap-2 px-3 py-2 text-xs">
          <ExternalLink className="h-3.5 w-3.5" /> Google
        </a>
        <a href={outlookUrl} target="_blank" rel="noreferrer" className="btn-secondary-heritage flex items-center gap-2 px-3 py-2 text-xs">
          <ExternalLink className="h-3.5 w-3.5" /> Outlook
        </a>
        <a href={appleUrl} className="btn-secondary-heritage flex items-center gap-2 px-3 py-2 text-xs">
          <ExternalLink className="h-3.5 w-3.5" /> Apple
        </a>
      </div>

      {isLocalhost && (
        <p className="mt-3 text-xs text-amber-700">
          Para subscrever automaticamente, use o link da versão publicada em produção.
        </p>
      )}
    </div>
  );
}
