import React from 'react';
import { motion } from 'motion/react';
import { Church, Plus, Save, Users } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import Toast from '../components/ui/Toast';
import type { Ministry } from '../types/domain';

export default function Ministerios() {
  const { addMinistry, ministries, supports, updateMinistry } = useData();
  const [editingMinistry, setEditingMinistry] = React.useState<Ministry | null>(null);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [toast, setToast] = React.useState<{ show: boolean; msg: string; type?: 'success' | 'error' | 'info' }>({
    show: false,
    msg: '',
  });

  const handleSubmit = async () => {
    if (!name.trim()) return;

    try {
      if (editingMinistry) {
        await updateMinistry(editingMinistry.id, { name: name.trim(), description: description.trim() });
        setToast({ show: true, msg: 'Ministério atualizado com sucesso.', type: 'success' });
      } else {
        await addMinistry({
          name: name.trim(),
          description: description.trim(),
          leaderId: null,
          campusId: null,
          status: 'ATIVO',
          memberIds: [],
        });
        setToast({ show: true, msg: 'Ministério criado com sucesso.', type: 'success' });
      }

      setEditingMinistry(null);
      setName('');
      setDescription('');
    } catch (error: any) {
      setToast({ show: true, msg: error?.message ?? 'Não foi possível guardar o ministério.', type: 'error' });
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
        <h2 className="text-4xl font-bold tracking-tight text-slate-900">Ministérios</h2>
        <p className="font-medium text-slate-500">CRUD real da estrutura ministerial em produção.</p>
      </div>

      {!supports.ministryMembers && (
        <div className="card-heritage border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          A associação de voluntários por ministério depende da tabela `MinistryMember`, já prevista na migration versionada.
        </div>
      )}

      <div className="card-heritage space-y-4 p-6">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nome do ministério"
          className="input-heritage"
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Descrição do ministério"
          className="input-heritage min-h-[120px] py-3"
        />
        <button onClick={handleSubmit} className="btn-primary-heritage flex items-center gap-2">
          {editingMinistry ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {editingMinistry ? 'Guardar alterações' : 'Novo ministério'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {ministries.length === 0 ? (
          <div className="card-heritage col-span-full p-12 text-center text-sm text-slate-400">Nenhum ministério registado.</div>
        ) : (
          ministries.map((ministry) => (
            <div key={ministry.id} className="card-heritage p-6">
              <div className="mb-6 flex items-center justify-between">
                <div className="rounded-lg bg-surface p-3">
                  <Church className="h-6 w-6 text-gold" />
                </div>
                <button
                  onClick={() => {
                    setEditingMinistry(ministry);
                    setName(ministry.name);
                    setDescription(ministry.description);
                  }}
                  className="text-xs font-bold uppercase tracking-widest text-gold hover:underline"
                >
                  Editar
                </button>
              </div>
              <h3 className="text-xl font-bold text-slate-900">{ministry.name}</h3>
              <p className="mt-2 text-sm text-slate-500">{ministry.description || 'Sem descrição.'}</p>
              <div className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                <Users className="h-4 w-4" />
                {ministry.memberIds.length} voluntários associados
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
