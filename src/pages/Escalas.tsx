import React from 'react';
import { motion } from 'motion/react';
import { Plus, Save, Users } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import Toast from '../components/ui/Toast';
import type { Schedule } from '../types/domain';

export default function Escalas() {
  const { ministries, schedules, supports, updateSchedule, addSchedule } = useData();
  const [editingSchedule, setEditingSchedule] = React.useState<Schedule | null>(null);
  const [formData, setFormData] = React.useState({
    ministryId: '',
    date: new Date().toISOString().slice(0, 10),
    time: '09:00',
    status: 'Planeamento' as Schedule['status'],
  });
  const [toast, setToast] = React.useState<{ show: boolean; msg: string; type?: 'success' | 'error' | 'info' }>({
    show: false,
    msg: '',
  });

  const handleSubmit = async () => {
    if (!formData.ministryId) return;

    try {
      if (editingSchedule) {
        await updateSchedule(editingSchedule.id, formData);
        setToast({ show: true, msg: 'Escala atualizada com sucesso.', type: 'success' });
      } else {
        await addSchedule({ ...formData, title: '', volunteerIds: [] });
        setToast({ show: true, msg: 'Escala criada com sucesso.', type: 'success' });
      }

      setEditingSchedule(null);
      setFormData({
        ministryId: '',
        date: new Date().toISOString().slice(0, 10),
        time: '09:00',
        status: 'Planeamento',
      });
    } catch (error: any) {
      setToast({ show: true, msg: error?.message ?? 'Não foi possível guardar a escala.', type: 'error' });
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 p-8">
      <Toast
        isVisible={toast.show}
        message={toast.msg}
        type={toast.type}
        onClose={() => setToast((current) => ({ ...current, show: false }))}
      />

      <div>
        <h2 className="text-4xl font-bold tracking-tight text-slate-900">Escalas</h2>
        <p className="font-medium text-slate-500">Gestão real das escalas base já existentes no Supabase.</p>
      </div>

      {!supports.scheduleAssignments && (
        <div className="card-heritage border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          O preenchimento detalhado de vagas depende da tabela `ScheduleAssignment`, já incluída na migration nova.
        </div>
      )}

      <div className="card-heritage space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <select
            value={formData.ministryId}
            onChange={(event) => setFormData((current) => ({ ...current, ministryId: event.target.value }))}
            className="input-heritage"
          >
            <option value="">Selecionar ministério</option>
            {ministries.map((ministry) => (
              <option key={ministry.id} value={ministry.id}>
                {ministry.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={formData.date}
            onChange={(event) => setFormData((current) => ({ ...current, date: event.target.value }))}
            className="input-heritage"
          />
          <input
            type="time"
            value={formData.time}
            onChange={(event) => setFormData((current) => ({ ...current, time: event.target.value }))}
            className="input-heritage"
          />
          <select
            value={formData.status}
            onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value as Schedule['status'] }))}
            className="input-heritage"
          >
            <option value="Planeamento">Planeamento</option>
            <option value="Incompleto">Incompleto</option>
            <option value="Completo">Completo</option>
          </select>
        </div>

        <button onClick={handleSubmit} className="btn-primary-heritage flex items-center gap-2">
          {editingSchedule ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {editingSchedule ? 'Guardar alterações' : 'Nova escala'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {schedules.length === 0 ? (
          <div className="card-heritage col-span-full p-12 text-center text-sm text-slate-400">Nenhuma escala registada.</div>
        ) : (
          schedules.map((schedule) => {
            const ministry = ministries.find((item) => item.id === schedule.ministryId);

            return (
              <div key={schedule.id} className="card-heritage p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <span className="badge-heritage bg-blue-100 text-blue-700">{schedule.status}</span>
                    <h3 className="mt-3 text-xl font-bold text-slate-900">{ministry?.name ?? schedule.title}</h3>
                  </div>
                  <button
                    onClick={() => {
                      setEditingSchedule(schedule);
                      setFormData({
                        ministryId: schedule.ministryId ?? '',
                        date: schedule.date,
                        time: schedule.time,
                        status: schedule.status,
                      });
                    }}
                    className="text-xs font-bold uppercase tracking-widest text-gold hover:underline"
                  >
                    Editar
                  </button>
                </div>

                <p className="text-sm text-slate-500">
                  {schedule.date} · {schedule.time}
                </p>
                <div className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                  <Users className="h-4 w-4" />
                  {schedule.volunteerIds.length} voluntários atribuídos
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
