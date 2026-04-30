import React, { useEffect, useState } from 'react';
import { Save, User as UserIcon } from 'lucide-react';
import type { Role } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { getRoleLabel } from '../../lib/roleLabels';
import { normalizeInternationalPhone, PHONE_PLACEHOLDER, PHONE_HELP_TEXT } from '../../lib/phone';
import { ModalShell } from '../ui/ModalShell';
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
    baptismDate: '',
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
      baptismDate: initialData?.baptismDate ?? '',
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
        phone: normalizeInternationalPhone(formData.phone),
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
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar pessoa' : 'Novo cadastro'}
      description="Dados básicos, contacto, integração e acesso."
      icon={<UserIcon className="h-5 w-5" />}
      size="xl"
      footer={(
        <div className="modal-footer-actions">
          <button type="button" onClick={onClose} className="btn-secondary-heritage">
            Cancelar
          </button>
          <button type="submit" form="person-form" disabled={isSubmitting} className="btn-primary-heritage flex items-center gap-2">
            <Save className="h-4 w-4" />
            {isSubmitting ? 'A guardar...' : initialData ? 'Guardar alterações' : 'Concluir cadastro'}
          </button>
        </div>
      )}
    >
      <form id="person-form" onSubmit={handleSubmit} className="space-y-5">
        <section className="modal-section">
          <h4 className="modal-section-title">Identificação e contacto</h4>
          <div className="modal-grid">
            <div className="modal-field">
              <label className="modal-label">Primeiro nome</label>
              <input
                required
                type="text"
                value={formData.firstName}
                onChange={(event) => setFormData((current) => ({ ...current, firstName: event.target.value }))}
                className="input-heritage"
              />
            </div>
            <div className="modal-field">
              <label className="modal-label">Apelido</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(event) => setFormData((current) => ({ ...current, lastName: event.target.value }))}
                className="input-heritage"
              />
            </div>
            <div className="modal-field">
              <label className="modal-label">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                className="input-heritage"
              />
            </div>
            <div className="modal-field">
              <label className="modal-label">Telefone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
                placeholder={PHONE_PLACEHOLDER}
                className="input-heritage"
              />
              <p className="modal-help">{PHONE_HELP_TEXT}</p>
            </div>
          </div>

          <div className="modal-field mt-4">
            <label className="modal-label">Endereço / Morada</label>
            <input
              type="text"
              value={formData.address ?? ''}
              onChange={(event) => setFormData((current) => ({ ...current, address: event.target.value }))}
              placeholder="Rua, Número, Andar, Código Postal, Cidade"
              className="input-heritage"
            />
          </div>
        </section>

        <section className="modal-section">
          <h4 className="modal-section-title">Comunidade e acesso</h4>
          <div className="modal-grid-3">
            <div className="modal-field">
              <label className="modal-label">Campus</label>
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
            <div className="modal-field">
              <label className="modal-label">Célula</label>
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
            <div className="modal-field">
              <label className="modal-label">Estado</label>
              <select
                value={formData.status}
                onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value as PersonInput['status'] }))}
                className="input-heritage"
              >
                <option value="VISITANTE">Visitante</option>
                <option value="MEMBRO">Membro</option>
                <option value="INATIVO">Inativo</option>
              </select>
            </div>
          </div>

          <div className="modal-grid mt-4">
            <div className="modal-field">
              <label className="modal-label">Papel de acesso</label>
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
            <div className="modal-field">
              <label className="modal-label">Membro desde</label>
              <input
                type="text"
                value={formData.since ?? ''}
                onChange={(event) => setFormData((current) => ({ ...current, since: event.target.value }))}
                className="input-heritage"
              />
            </div>
          </div>
        </section>

        <section className="modal-section">
          <h4 className="modal-section-title">Datas e observações</h4>
          <div className="modal-grid">
            <div className="modal-field">
              <label className="modal-label">Nascimento</label>
              <input
                type="date"
                value={formData.birthdate ?? ''}
                onChange={(event) => setFormData((current) => ({ ...current, birthdate: event.target.value }))}
                className="input-heritage"
              />
            </div>
            <div className="modal-field">
              <label className="modal-label">Batismo</label>
              <input
                type="date"
                value={formData.baptismDate ?? ''}
                onChange={(event) => setFormData((current) => ({ ...current, baptismDate: event.target.value }))}
                className="input-heritage"
              />
            </div>
          </div>

          <div className="modal-field mt-4">
            <label className="modal-label">Observações</label>
            <textarea
              value={formData.notes ?? ''}
              onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))}
              className="input-heritage"
              placeholder="Notas pastorais, contexto de integração ou próximos passos."
            />
          </div>
        </section>
      </form>
    </ModalShell>
  );
}
