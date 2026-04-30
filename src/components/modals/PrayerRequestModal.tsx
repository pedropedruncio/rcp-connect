import React, { useState } from 'react';
import { Heart, Send, User } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ModalShell } from '../ui/ModalShell';

interface PrayerRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export default function PrayerRequestModal({ isOpen, onClose, onSuccess }: PrayerRequestModalProps) {
  const { user } = useAuth();
  const { addPrayerRequest } = useData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    wantsContact: false
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      await addPrayerRequest({
        personId: user.id,
        request: `[${formData.subject}] ${formData.description}${formData.wantsContact ? ' (Solicita contacto)' : ''}`,
        status: 'PENDING'
      });
      onSuccess('Pedido de oração enviado com sucesso!');
      onClose();
      setFormData({ subject: '', description: '', wantsContact: false });
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Pedido de oração"
      description="A sua igreja está aqui para orar por si."
      icon={<Heart className="h-5 w-5" />}
      size="md"
      footer={(
        <div className="modal-footer-actions">
          <button type="button" onClick={onClose} className="btn-secondary-heritage">
            Cancelar
          </button>
          <button type="submit" form="prayer-form" disabled={isSubmitting} className="btn-primary-heritage flex items-center gap-2">
            <Send className="h-4 w-4" />
            {isSubmitting ? 'A enviar...' : 'Enviar pedido'}
          </button>
        </div>
      )}
    >
      <form id="prayer-form" onSubmit={handleSubmit} className="space-y-5">
        <section className="modal-section">
          <div className="modal-field">
            <label className="modal-label">Assunto / motivo</label>
            <input
              required
              type="text"
              value={formData.subject}
              onChange={(event) => setFormData({ ...formData, subject: event.target.value })}
              className="input-heritage"
              placeholder="Ex: Saúde, Família, Trabalho..."
            />
          </div>

          <div className="modal-field mt-4">
            <label className="modal-label">Descrição do pedido</label>
            <textarea
              required
              value={formData.description}
              onChange={(event) => setFormData({ ...formData, description: event.target.value })}
              className="input-heritage"
              placeholder="Escreva aqui o seu motivo de oração detalhado..."
            />
          </div>
        </section>

        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-outline-variant bg-white p-4 transition-colors hover:border-gold">
          <input
            type="checkbox"
            checked={formData.wantsContact}
            onChange={(event) => setFormData({ ...formData, wantsContact: event.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-outline-variant text-gold focus:ring-gold"
          />
          <span className="min-w-0">
            <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <User className="h-4 w-4 text-slate-400" /> Desejo ser contactado
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Um pastor ou líder pode entrar em contacto para acompanhar este pedido.
            </span>
          </span>
        </label>
      </form>
    </ModalShell>
  );
}
