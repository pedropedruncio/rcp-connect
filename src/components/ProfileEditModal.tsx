import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Image as ImageIcon, MapPin, Phone, Upload, User, X } from 'lucide-react';
import { optimizeAvatarImage } from '../lib/avatarImage';
import { normalizeInternationalPhone, isValidInternationalPhone, PHONE_PLACEHOLDER, PHONE_HELP_TEXT } from '../lib/phone';
import { cn } from '../lib/utils';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: any; // Using any for mock, realistically type Person
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
  }, [isOpen, person?.address, person?.phone]);

  useEffect(() => () => {
    if (avatarImage?.previewUrl) URL.revokeObjectURL(avatarImage.previewUrl);
  }, [avatarImage?.previewUrl]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-outline-variant"
        >
          <div className="flex items-center justify-between p-6 border-b border-outline-variant bg-surface-container-low">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gold/10 rounded-lg">
                <User className="w-5 h-5 text-gold" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Atualizar Dados</h3>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-surface">
            <div className="rounded-xl border border-outline-variant bg-surface-container-high p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-outline-variant bg-gold/10 text-gold">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Pré-visualização do perfil" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">Foto de perfil</p>
                  <p className="text-xs text-slate-500">PNG, JPG ou WebP. A imagem é otimizada antes de guardar.</p>
                  {avatarImage && (
                    <p className="mt-1 text-xs text-slate-400">
                      Otimizada para {Math.round(avatarImage.size / 1024)}KB.
                    </p>
                  )}
                </div>
                <label className="btn-secondary-heritage flex cursor-pointer items-center gap-2 px-3 py-2 text-xs">
                  <Upload className="h-3.5 w-3.5" />
                  Escolher
                  <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleAvatarChange} className="hidden" />
                </label>
              </div>
              {imageError && <p className="mt-3 text-xs font-medium text-red-600">{imageError}</p>}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Telemóvel</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => {
                      setFormData({ ...formData, phone: e.target.value });
                      setPhoneError(null);
                    }}
                    className={cn(
                      "w-full pl-10 pr-4 py-2.5 bg-surface-container-highest border rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2",
                      phoneError ? "border-red-300 focus:ring-red-200" : "border-outline-variant focus:ring-gold/50"
                    )}
                    placeholder={PHONE_PLACEHOLDER}
                  />
                </div>
                {phoneError ? (
                  <p className="mt-1.5 text-[10px] font-bold text-red-500 uppercase tracking-wider">{phoneError}</p>
                ) : (
                  <p className="mt-1.5 text-[10px] text-slate-400 tracking-wider">{PHONE_HELP_TEXT}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Data de Batismo</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={formData.baptismDate}
                    onChange={e => setFormData({ ...formData, baptismDate: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-container-highest border border-outline-variant rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Morada completa</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <textarea
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-container-highest border border-outline-variant rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-gold/50 min-h-[80px]"
                    placeholder="Rua, número, cidade, código postal, país"
                  />
                </div>
                <p className="mt-1.5 text-[10px] text-slate-400 tracking-wider">Use um endereço completo para facilitar a localização no Google Maps.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-outline-variant">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary-heritage disabled:opacity-70"
              >
                {isSubmitting ? 'A guardar...' : 'Guardar Alterações'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
