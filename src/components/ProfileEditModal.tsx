import React, { useEffect, useState } from 'react';
import { Calendar, Image as ImageIcon, MapPin, Phone, Upload, User } from 'lucide-react';
import { optimizeAvatarImage } from '../lib/avatarImage';
import { normalizeInternationalPhone, isValidInternationalPhone, PHONE_PLACEHOLDER, PHONE_HELP_TEXT } from '../lib/phone';
import { cn } from '../lib/utils';
import { ModalShell } from './ui/ModalShell';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: any;
  onSave: (data: any) => Promise<void> | void;
}

export default function ProfileEditModal({ isOpen, onClose, person, onSave }: ProfileEditModalProps) {
  const [formData, setFormData] = useState({
    phone: person?.phone || '',
    address: person?.address || '',
    baptismDate: person?.baptismDate || '',
  });
  const [avatarImage, setAvatarImage] = useState<{ dataUrl: string; previewUrl: string; size: number; type: string } | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setFormData({
      phone: person?.phone || '',
      address: person?.address || '',
      baptismDate: person?.baptismDate || '',
    });
    setAvatarImage(null);
    setImageError(null);
    setPhoneError(null);
  }, [isOpen, person?.address, person?.baptismDate, person?.phone]);

  useEffect(() => () => {
    if (avatarImage?.previewUrl) URL.revokeObjectURL(avatarImage.previewUrl);
  }, [avatarImage?.previewUrl]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isValidInternationalPhone(formData.phone)) {
      setPhoneError(PHONE_HELP_TEXT);
      return;
    }

    setIsSubmitting(true);
    setPhoneError(null);

    try {
      await onSave({
        phone: normalizeInternationalPhone(formData.phone),
        address: formData.address.trim(),
        baptismDate: formData.baptismDate,
        avatarImage: avatarImage?.dataUrl,
      });
      onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageError(null);

    try {
      const optimized = await optimizeAvatarImage(file);
      setAvatarImage((current) => {
        if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
        return optimized;
      });
    } catch (error: any) {
      setAvatarImage(null);
      setImageError(error?.message ?? 'Não foi possível preparar esta imagem.');
    }
  };

  const previewUrl = avatarImage?.previewUrl ?? person?.avatarUrl ?? null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Atualizar dados"
      description="Foto, contacto, batismo e morada do perfil."
      icon={<User className="h-5 w-5" />}
      size="lg"
      footer={(
        <div className="modal-footer-actions">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="btn-secondary-heritage">
            Cancelar
          </button>
          <button type="submit" form="profile-edit-form" disabled={isSubmitting} className="btn-primary-heritage">
            {isSubmitting ? 'A guardar...' : 'Guardar alterações'}
          </button>
        </div>
      )}
    >
      <form id="profile-edit-form" onSubmit={handleSubmit} className="space-y-5">
        <section className="modal-section">
          <h4 className="modal-section-title">Foto de perfil</h4>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-outline-variant bg-gold/10 text-gold">
              {previewUrl ? (
                <img src={previewUrl} alt="Pré-visualização do perfil" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-6 w-6" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">Imagem do utilizador</p>
              <p className="modal-help mt-1">PNG, JPG ou WebP. A imagem é otimizada antes de guardar.</p>
              {avatarImage && (
                <p className="mt-1 text-xs text-slate-400">
                  Otimizada para {Math.round(avatarImage.size / 1024)}KB.
                </p>
              )}
            </div>
            <label className="btn-secondary-heritage flex cursor-pointer items-center justify-center gap-2 text-xs">
              <Upload className="h-3.5 w-3.5" />
              Escolher
              <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleAvatarChange} className="hidden" />
            </label>
          </div>
          {imageError && <p className="mt-3 text-xs font-medium text-red-600">{imageError}</p>}
        </section>

        <section className="modal-section">
          <h4 className="modal-section-title">Dados pessoais</h4>
          <div className="modal-grid">
            <div className="modal-field">
              <label className="modal-label">Telemóvel</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(event) => {
                    setFormData({ ...formData, phone: event.target.value });
                    setPhoneError(null);
                  }}
                  className={cn('input-heritage pl-10', phoneError && 'border-red-300 focus:border-red-400 focus:ring-red-200')}
                  placeholder={PHONE_PLACEHOLDER}
                />
              </div>
              {phoneError ? (
                <p className="text-[11px] font-medium text-red-600">{phoneError}</p>
              ) : (
                <p className="modal-help">{PHONE_HELP_TEXT}</p>
              )}
            </div>

            <div className="modal-field">
              <label className="modal-label">Data de batismo</label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={formData.baptismDate}
                  onChange={(event) => setFormData({ ...formData, baptismDate: event.target.value })}
                  className="input-heritage pl-10"
                />
              </div>
            </div>
          </div>

          <div className="modal-field mt-4">
            <label className="modal-label">Morada completa</label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <textarea
                value={formData.address}
                onChange={(event) => setFormData({ ...formData, address: event.target.value })}
                className="input-heritage pl-10"
                placeholder="Rua, número, cidade, código postal, país"
              />
            </div>
            <p className="modal-help">Use um endereço completo para facilitar a localização no Google Maps.</p>
          </div>
        </section>
      </form>
    </ModalShell>
  );
}
