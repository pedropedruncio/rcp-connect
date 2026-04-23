import React from 'react';
import { motion } from 'motion/react';
import { Home, Plus, Save, Users } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import Toast from '../components/ui/Toast';
import type { Family } from '../types/domain';

export default function Familias() {
  const { addFamily, families, supports, updateFamily } = useData();
  const [editingFamily, setEditingFamily] = React.useState<Family | null>(null);
  const [formValue, setFormValue] = React.useState('');
  const [toast, setToast] = React.useState<{ show: boolean; msg: string; type?: 'success' | 'error' | 'info' }>({
    show: false,
    msg: '',
  });

  const handleSubmit = async () => {
    if (!formValue.trim()) return;

    try {
      if (editingFamily) {
        await updateFamily(editingFamily.id, { name: formValue.trim() });
        setToast({ show: true, msg: 'Família atualizada com sucesso.', type: 'success' });
      } else {
        await addFamily({ name: formValue.trim(), campusId: null, notes: '', memberIds: [] });
        setToast({ show: true, msg: 'Família criada com sucesso.', type: 'success' });
      }

      setEditingFamily(null);
      setFormValue('');
    } catch (error: any) {
      setToast({ show: true, msg: error?.message ?? 'Não foi possível guardar a família.', type: 'error' });
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
        <h2 className="text-4xl font-bold tracking-tight text-slate-900">Famílias</h2>
        <p className="font-medium text-slate-500">CRUD real da entidade familiar no Supabase remoto.</p>
      </div>

      {!supports.familyMembers && (
        <div className="card-heritage border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          A associação detalhada de pessoas por família depende da tabela `FamilyMember`, já prevista na migration do repositório.
        </div>
      )}

      <div className="card-heritage p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
          <input
            type="text"
            value={formValue}
            onChange={(event) => setFormValue(event.target.value)}
            placeholder="Nome da família"
            className="input-heritage"
          />
          <button onClick={handleSubmit} className="btn-primary-heritage flex items-center gap-2">
            {editingFamily ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editingFamily ? 'Guardar' : 'Nova família'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {families.length === 0 ? (
          <div className="card-heritage col-span-full p-12 text-center text-sm text-slate-400">Nenhuma família registada.</div>
        ) : (
          families.map((family) => (
            <div key={family.id} className="card-heritage p-6">
              <div className="mb-6 flex items-center justify-between">
                <div className="rounded-lg bg-surface p-3">
                  <Home className="h-6 w-6 text-gold" />
                </div>
                <button
                  onClick={() => {
                    setEditingFamily(family);
                    setFormValue(family.name);
                  }}
                  className="text-xs font-bold uppercase tracking-widest text-gold hover:underline"
                >
                  Editar
                </button>
              </div>
              <h3 className="text-xl font-bold text-slate-900">{family.name}</h3>
              <p className="mt-2 text-sm text-slate-500">Campus: {family.campus}</p>
              <div className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                <Users className="h-4 w-4" />
                {family.memberIds.length} membros associados
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
