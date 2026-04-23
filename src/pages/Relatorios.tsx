import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, Download, Network, Printer, Users } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import Toast from '../components/ui/Toast';

export default function Relatorios() {
  const { cells, discipleshipPairs, events, followUps, persons } = useData();
  const [toast, setToast] = React.useState<{ show: boolean; msg: string }>({ show: false, msg: '' });

  const cards = [
    { label: 'Pessoas registadas', value: persons.length, icon: Users },
    { label: 'Células ativas', value: cells.length, icon: Network },
    { label: 'Pares de discipulado', value: discipleshipPairs.length, icon: BookOpen },
    { label: 'Acompanhamentos abertos', value: followUps.filter((item) => item.status !== 'Concluído').length, icon: Download },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 p-8">
      <Toast
        isVisible={toast.show}
        message={toast.msg}
        onClose={() => setToast((current) => ({ ...current, show: false }))}
      />

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">Relatórios</h2>
          <p className="font-medium text-slate-500">Visão derivada dos dados reais já disponíveis na aplicação.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => window.print()} className="btn-secondary-heritage flex items-center gap-2">
            <Printer className="h-4 w-4" /> Imprimir
          </button>
          <button onClick={() => setToast({ show: true, msg: 'Use a impressão para exportar esta visão enquanto o PDF dedicado é implementado.' })} className="btn-primary-heritage flex items-center gap-2">
            <Download className="h-4 w-4" /> Exportar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="card-heritage p-6">
            <div className="mb-3 rounded-md bg-surface p-2 w-fit">
              <card.icon className="h-5 w-5 text-gold" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="card-heritage p-6">
          <h3 className="mb-5 text-lg font-bold text-slate-900">Saúde por célula</h3>
          <div className="space-y-3">
            {cells.length === 0 ? (
              <p className="text-sm text-slate-400">Sem células registadas.</p>
            ) : (
              cells.map((cell) => (
                <div key={cell.id} className="rounded-lg border border-outline-variant bg-surface-container-high p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-800">{cell.name}</p>
                    <span className="badge-heritage bg-slate-100 text-slate-700">{cell.health}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{cell.memberIds.length} membros · {cell.day}, {cell.time}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card-heritage p-6">
          <h3 className="mb-5 text-lg font-bold text-slate-900">Eventos e acompanhamento</h3>
          <div className="space-y-3">
            <div className="rounded-lg border border-outline-variant bg-surface-container-high p-4">
              <p className="text-sm font-bold text-slate-800">Eventos totais</p>
              <p className="mt-2 text-xs text-slate-500">{events.length} registos no calendário.</p>
            </div>
            <div className="rounded-lg border border-outline-variant bg-surface-container-high p-4">
              <p className="text-sm font-bold text-slate-800">Concluídos</p>
              <p className="mt-2 text-xs text-slate-500">{followUps.filter((item) => item.status === 'Concluído').length} acompanhamentos concluídos.</p>
            </div>
            <div className="rounded-lg border border-outline-variant bg-surface-container-high p-4">
              <p className="text-sm font-bold text-slate-800">Em progresso</p>
              <p className="mt-2 text-xs text-slate-500">{discipleshipPairs.filter((pair) => pair.progress < 100).length} pares de discipulado em curso.</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
