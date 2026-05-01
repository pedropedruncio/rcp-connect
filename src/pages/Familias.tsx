import React from 'react';
import { motion } from 'motion/react';
import { Home, Plus, Save, Users, AlertCircle, Check, X, UserMinus } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import Toast from '../components/ui/Toast';
import type { Family, FamilyRemovalRequest } from '../types/domain';

export default function Familias() {
  const { addFamily, families, supports, updateFamily, familyRemovalRequests, persons, resolveFamilyRemoval, familyMembers, removeFamilyMember } = useData();
  const [editingFamily, setEditingFamily] = React.useState<Family | null>(null);
  const [formValue, setFormValue] = React.useState('');
  const [toast, setToast] = React.useState<{ show: boolean; msg: string; type?: 'success' | 'error' | 'info' }>({
    show: false,
    msg: '',
  });
  const [isResolving, setIsResolving] = React.useState<string | null>(null);

  const pendingRequests = familyRemovalRequests.filter(r => r.status === 'PENDING');

  const handleResolve = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    setIsResolving(requestId);
    try {
      await resolveFamilyRemoval(requestId, status);
      setToast({ show: true, msg: `Pedido ${status === 'APPROVED' ? 'aprovado' : 'rejeitado'} com sucesso.`, type: 'success' });
    } catch (error: any) {
      setToast({ show: true, msg: error?.message ?? 'Erro ao processar pedido.', type: 'error' });
    } finally {
      setIsResolving(null);
    }
  };

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

      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Pedidos de Remoção Pendentes
          </h3>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {pendingRequests.map((request) => {
              const person = persons.find(p => p.id === request.personId);
              const requester = persons.find(p => p.id === request.requestedByPersonId);
              const family = families.find(f => f.id === request.familyId);
              
              return (
                <div key={request.id} className="card-heritage flex items-center justify-between p-4 border-l-4 border-amber-400">
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900">
                      {person ? `${person.firstName} ${person.lastName}` : 'Membro desconhecido'}
                    </p>
                    <p className="text-sm text-slate-500">
                      Família: <span className="font-medium text-slate-700">{family?.name || 'Desconhecida'}</span>
                    </p>
                    <p className="text-sm text-slate-500">
                      Solicitado por: <span className="font-medium text-slate-700">{requester ? `${requester.firstName} ${requester.lastName}` : 'Desconhecido'}</span>
                    </p>
                    {request.reason && (
                      <p className="mt-2 rounded bg-slate-50 p-2 text-xs italic text-slate-600">
                        "{request.reason}"
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={isResolving === request.id}
                      onClick={() => handleResolve(request.id, 'REJECTED')}
                      className="rounded-full p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Rejeitar pedido"
                    >
                      <X className="h-5 w-5" />
                    </button>
                    <button
                      disabled={isResolving === request.id}
                      onClick={() => handleResolve(request.id, 'APPROVED')}
                      className="rounded-full p-2 text-slate-400 hover:bg-green-50 hover:text-green-600 transition-colors"
                      title="Aprovar remoção"
                    >
                      <Check className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
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
              
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                  <Users className="h-4 w-4" />
                  {familyMembers.filter(m => m.familyId === family.id && m.status === 'ACCEPTED').length} membros associados
                </div>
                
                <div className="space-y-2">
                  {familyMembers
                    .filter(m => m.familyId === family.id && m.status === 'ACCEPTED')
                    .map(member => {
                      const person = persons.find(p => p.id === member.personId);
                      return (
                        <div key={member.id} className="flex items-center justify-between rounded bg-slate-50 p-2 text-sm">
                          <span className="font-medium text-slate-700">
                            {person ? `${person.firstName} ${person.lastName}` : 'Desconhecido'}
                          </span>
                          <button
                            onClick={async () => {
                              if (confirm(`Remover ${person?.firstName || 'este membro'} da família ${family.name}?`)) {
                                try {
                                  await removeFamilyMember(member.id);
                                  setToast({ show: true, msg: 'Membro removido com sucesso.', type: 'success' });
                                } catch (err: any) {
                                  setToast({ show: true, msg: err.message ?? 'Erro ao remover membro.', type: 'error' });
                                }
                              }
                            }}
                            className="text-slate-400 hover:text-red-600 transition-colors"
                            title="Remover diretamente"
                          >
                            <UserMinus className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })
                  }
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
