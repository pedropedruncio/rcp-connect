import React, { useState } from 'react';
import { Save, ShieldCheck } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { ModalShell } from './ui/ModalShell';

interface LeaderEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  leader: any;
}

export default function LeaderEditModal({ isOpen, onClose, onSubmit, leader }: LeaderEditModalProps) {
  const { getPersonById } = useData();
  const [formData, setFormData] = useState({
    role: leader?.role || '',
    area: leader?.area || 'Geral',
    status: leader?.status || 'Ativo',
  });

  React.useEffect(() => {
    if (leader) {
      setFormData({
        role: leader.role,
        area: leader.area,
        status: leader.status,
      });
    }
  }, [leader]);

  const person = leader ? getPersonById(leader.personId) : null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(formData);
    onClose();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={leader ? 'Editar liderança' : 'Novo líder'}
      description="Ajuste função, área ministerial e estado da liderança."
      icon={<ShieldCheck className="h-5 w-5" />}
      iconClassName="bg-tertiary/10 text-tertiary"
      size="md"
      footer={(
        <div className="modal-footer-actions">
          <button type="button" onClick={onClose} className="btn-secondary-heritage">
            Cancelar
          </button>
          <button type="submit" form="leader-edit-form" className="btn-primary-heritage flex items-center gap-2">
            <Save className="h-4 w-4" />
            Guardar alterações
          </button>
        </div>
      )}
    >
      <form id="leader-edit-form" onSubmit={handleSubmit} className="space-y-5">
        <section className="modal-section">
          {person ? (
            <div className="flex items-center gap-4 rounded-md border border-outline-variant bg-surface-container-low p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white bg-gold/10 text-lg font-bold text-gold">
                {person.name.split(' ').map((name) => name[0]).slice(0, 2).join('')}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-slate-900">{person.name}</h4>
                <p className="truncate text-xs text-slate-500">{person.email}</p>
              </div>
            </div>
          ) : (
            <div className="modal-field">
              <label className="modal-label">Pessoa (membro)</label>
              <select className="input-heritage">
                <option>Selecionar membro...</option>
                <option>Ana Silva</option>
                <option>João Costa</option>
              </select>
            </div>
          )}
        </section>

        <section className="modal-section">
          <h4 className="modal-section-title">Função</h4>
          <div className="modal-field">
            <label className="modal-label">Cargo / função</label>
            <input
              type="text"
              required
              value={formData.role}
              onChange={(event) => setFormData({ ...formData, role: event.target.value })}
              className="input-heritage"
              placeholder="Ex: Líder de Célula, Discipulador"
            />
          </div>

          <div className="modal-grid mt-4">
            <div className="modal-field">
              <label className="modal-label">Área ministerial</label>
              <select
                value={formData.area}
                onChange={(event) => setFormData({ ...formData, area: event.target.value })}
                className="input-heritage"
              >
                <option>Geral</option>
                <option>Discipulado</option>
                <option>Células</option>
                <option>Formação</option>
              </select>
            </div>
            <div className="modal-field">
              <label className="modal-label">Status</label>
              <select
                value={formData.status}
                onChange={(event) => setFormData({ ...formData, status: event.target.value })}
                className="input-heritage"
              >
                <option>Ativo</option>
                <option>Em Formação</option>
                <option>Inativo</option>
              </select>
            </div>
          </div>
        </section>
      </form>
    </ModalShell>
  );
}
