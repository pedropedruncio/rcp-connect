import React, { useState } from 'react';
import { Heart, Send, Shield } from 'lucide-react';
import { ModalShell } from './ui/ModalShell';

interface PrayerRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export default function PrayerRequestModal({ isOpen, onClose, onSubmit }: PrayerRequestModalProps) {
  const [request, setRequest] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({ request, isPrivate });
    setRequest('');
    setIsPrivate(false);
    onClose();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Pedido de oração"
      description="Partilhe como podemos orar por si."
      icon={<Heart className="h-5 w-5" />}
      iconClassName="bg-red-50 text-red-500"
      size="md"
      footer={(
        <div className="modal-footer-actions">
          <button type="button" onClick={onClose} className="btn-secondary-heritage">
            Cancelar
          </button>
          <button type="submit" form="profile-prayer-form" className="btn-primary-heritage flex items-center gap-2" disabled={!request.trim()}>
            <Send className="h-4 w-4" />
            Enviar pedido
          </button>
        </div>
      )}
    >
      <form id="profile-prayer-form" onSubmit={handleSubmit} className="space-y-5">
        <section className="modal-section">
          <div className="modal-field">
            <label className="modal-label">O seu pedido</label>
            <textarea
              rows={4}
              required
              value={request}
              onChange={(event) => setRequest(event.target.value)}
              className="input-heritage"
              placeholder="Escreva aqui como podemos orar por si..."
            />
          </div>
        </section>

        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-outline-variant bg-white p-4 transition-colors hover:border-gold">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-outline-variant text-gold focus:ring-gold"
            checked={isPrivate}
            onChange={(event) => setIsPrivate(event.target.checked)}
          />
          <span className="min-w-0">
            <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Shield className="h-4 w-4 text-slate-400" /> Pedido confidencial
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Apenas os pastores terão acesso a este pedido.
            </span>
          </span>
        </label>
      </form>
    </ModalShell>
  );
}
