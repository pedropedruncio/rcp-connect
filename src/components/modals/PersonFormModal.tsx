import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Save, User as UserIcon, X } from 'lucide-react';
import type { Role } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { getRoleLabel } from '../../lib/roleLabels';
import type { Person, PersonInput } from '../../types/domain';

interface PersonFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (name: string) => void;
  initialData?: Person;
}

const ROLE_OPTIONS: Role[] = ['MEMBER', 'LEADER', 'DISCIPLER', 'PASTOR', 'ADMIN'];

export default function PersonFormModal({ isOpen, onClose, onSuccess, initialData }: PersonFormModalProps) {
  const { addPerson, campuses, cells, updatePerson } = useData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<PersonInput>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    status: 'VISITANTE',
    campusId: null,
    cellId: null,
    since: new Date().getFullYear().toString(),
    role: 'MEMBER',
    address: '',
    birthdate: '',
    notes: '',
    avatarUrl: null,
  });

  useEffect(() => {
    if (!isOpen) return;

    setFormData({
      id: initialData?.id,
      firstName: initialData?.firstName ?? '',
      lastName: initialData?.lastName ?? '',
      email: initialData?.email ?? '',
      phone: initialData?.phone ?? '',
      status: initialData?.status ?? 'VISITANTE',
      campusId: initialData?.campusId ?? campuses[0]?.id ?? null,
      cellId: initialData?.cellId ?? null,
      since: initialData?.since ?? new Date().getFullYear().toString(),
      role:
        initialData?.role === 'Líder de Célula'
          ? 'LEADER'
          : initialData?.role === 'Discipulador'
            ? 'DISCIPLER'
            : initialData?.role === 'Pastor'
              ? 'PASTOR'
              : initialData?.role === 'Administrador'
                ? 'ADMIN'
                : 'MEMBER',
      address: initialData?.address ?? '',
      birthdate: initialData?.birthdate ?? '',
      notes: initialData?.notes ?? '',
      avatarUrl: initialData?.avatarUrl ?? null,
    });
  }, [campuses, initialData, isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        notes: formData.notes?.trim() ?? '',
      };

      if (initialData) {
        await updatePerson(initialData.id, payload);
      } else {
        await addPerson(payload);
      }

      onSuccess(`${payload.firstName} ${payload.lastName}`.trim());
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gold/10 p-2">
                  <UserIcon className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{initialData ? 'Editar pessoa' : 'Novo cadastro'}</h3>
                  <p className="text-sm text-slate-500">Dados básicos, eclesiásticos e de contacto.</p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form id="person-form" onSubmit={handleSubmit} className="flex-1 space-y-8 overflow-y-auto p-8">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Primeiro nome</label>
                  <input
                    required
                    type="text"
                    value={formData.firstName}
                    onChange={(event) => setFormData((current) => ({ ...current, firstName: event.target.value }))}
                    className="input-heritage"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Apelido</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(event) => setFormData((current) => ({ ...current, lastName: event.target.value }))}
                    className="input-heritage"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                    className="input-heritage"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Telefone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
                    className="input-heritage"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Campus</label>
                  <select
                    value={formData.campusId ?? ''}
                    onChange={(event) => setFormData((current) => ({ ...current, campusId: event.target.value || null }))}
                    className="input-heritage"
                  >
                    <option value="">Sem campus</option>
                    {campuses.map((campus) => (
                      <option key={campus.id} value={campus.id}>
                        {campus.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Célula</label>
                  <select
                    value={formData.cellId ?? ''}
                    onChange={(event) => setFormData((current) => ({ ...current, cellId: event.target.value || null }))}
                    className="input-heritage"
                  >
                    <option value="">Sem célula</option>
                    {cells.map((cell) => (
                      <option key={cell.id} value={cell.id}>
                        {cell.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Estado</label>
                  <select
                    value={formData.status}
                    onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value as PersonInput['status'] }))}
                    className="input-heritage"
                  >
                    <option value="VISITANTE">Visitante</option>
                    <option value="BATIZADO">Batizado</option>
                    <option value="MEMBRO">Membro</option>
                    <option value="INATIVO">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Papel de acesso</label>
                  <select
                    value={formData.role}
                    onChange={(event) => setFormData((current) => ({ ...current, role: event.target.value as Role }))}
                    className="input-heritage"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {getRoleLabel(role)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Nascimento</label>
                  <input
                    type="date"
                    value={formData.birthdate ?? ''}
                    onChange={(event) => setFormData((current) => ({ ...current, birthdate: event.target.value }))}
                    className="input-heritage"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Observações</label>
                <textarea
                  value={formData.notes ?? ''}
                  onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))}
                  className="input-heritage min-h-[120px] py-3"
                  placeholder="Notas pastorais, contexto de integração ou próximos passos."
                />
              </div>
            </form>

            <div className="flex items-center justify-end gap-3 border-t border-outline-variant bg-surface-container-low p-6">
              <button onClick={onClose} className="rounded-md px-6 py-2.5 text-sm font-bold text-slate-500 transition-all hover:bg-slate-100">
                Cancelar
              </button>
              <button type="submit" form="person-form" disabled={isSubmitting} className="btn-primary-heritage flex items-center gap-2 px-8 disabled:opacity-70">
                <Save className="h-4 w-4" />
                {isSubmitting ? 'A guardar...' : initialData ? 'Guardar alterações' : 'Concluir cadastro'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
