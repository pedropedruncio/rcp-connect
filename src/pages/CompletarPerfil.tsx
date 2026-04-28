import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Church, User, Phone, MapPin, Calendar, Building2,
  LoaderCircle, AlertCircle, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

const LS_KEY = 'rcp_onboarding_draft';

interface Campus {
  id: string;
  name: string;
}

export default function CompletarPerfil() {
  const navigate = useNavigate();
  const { user, completeOnboarding, needsOnboarding } = useAuth();
  const { refetch } = useData();
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [campusId, setCampusId] = useState('');

  // Pre-fill: user data first, then localStorage draft
  useEffect(() => {
    if (user) {
      const parts = user.name.split(' ');
      setFirstName(parts[0] ?? '');
      setLastName(parts.slice(1).join(' ') ?? '');
    }
    try {
      const draft = JSON.parse(localStorage.getItem(LS_KEY) ?? '{}');
      if (draft.phone) setPhone(draft.phone);
      if (draft.address) setAddress(draft.address);
      if (draft.birthdate) setBirthdate(draft.birthdate);
      if (draft.campusId) setCampusId(draft.campusId);
      if (!user && draft.firstName) setFirstName(draft.firstName);
      if (!user && draft.lastName) setLastName(draft.lastName);
    } catch {
      // ignore
    }
  }, [user]);

  // Navigate to dashboard once onboarding is complete in context
  useEffect(() => {
    if (hasSubmitted && !needsOnboarding) {
      localStorage.removeItem(LS_KEY);
      navigate('/', { replace: true });
    }
  }, [hasSubmitted, needsOnboarding, navigate]);

  // Load campuses
  useEffect(() => {
    fetch('/api/campuses', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCampuses(data); })
      .catch(() => setCampuses([{ id: 'lisboa-id', name: 'Lisboa' }]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !address.trim()) {
      setError('Telefone e morada são obrigatórios.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const { error: err } = await completeOnboarding({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      birthdate: birthdate || undefined,
      campusId: campusId || undefined,
    });
    setIsSubmitting(false);
    if (err) {
      setError(typeof err === 'string' ? err : (err as any)?.message ?? 'Erro ao guardar perfil.');
    } else {
      await refetch();
      setHasSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12">
      <div
        className="absolute inset-0 opacity-30"
        style={{ backgroundImage: 'radial-gradient(circle at 60% 20%, #dbeafe 0%, transparent 50%), radial-gradient(circle at 20% 80%, #f0fdf4 0%, transparent 50%)' }}
      />

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-200 mb-4">
            <Church className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">RCP Connect</h1>
          <p className="text-slate-500 text-sm mt-1">Primeira vez? Completa o teu perfil</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/80 border border-slate-100 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800">Confirma o teu perfil</h2>
            <p className="text-slate-500 text-sm mt-1">
              Estes dados ajudam a tua liderança a acompanhar-te melhor.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                  Nome próprio *
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 focus-within:border-amber-400 focus-within:bg-white transition-colors">
                  <User className="w-4 h-4 text-slate-300 shrink-0" />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="João"
                    required
                    className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-300"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                  Apelido *
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 focus-within:border-amber-400 focus-within:bg-white transition-colors">
                  <User className="w-4 h-4 text-slate-300 shrink-0" />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Silva"
                    required
                    className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-300"
                  />
                </div>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                Telefone *
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 focus-within:border-amber-400 focus-within:bg-white transition-colors">
                <Phone className="w-4 h-4 text-slate-300 shrink-0" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+351 912 345 678"
                  required
                  className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-300"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                Morada *
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 focus-within:border-amber-400 focus-within:bg-white transition-colors">
                <MapPin className="w-4 h-4 text-slate-300 shrink-0" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua Exemplo, 123, Lisboa"
                  required
                  className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-300"
                />
              </div>
            </div>

            {/* Birthdate + Campus row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                  Data de nascimento
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 focus-within:border-amber-400 focus-within:bg-white transition-colors">
                  <Calendar className="w-4 h-4 text-slate-300 shrink-0" />
                  <input
                    type="date"
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full bg-transparent text-sm text-slate-700 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                  Campus
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 focus-within:border-amber-400 focus-within:bg-white transition-colors">
                  <Building2 className="w-4 h-4 text-slate-300 shrink-0" />
                  <select
                    value={campusId}
                    onChange={(e) => setCampusId(e.target.value)}
                    className="w-full bg-transparent text-sm text-slate-700 outline-none"
                  >
                    <option value="">Selecionar...</option>
                    {campuses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-between w-full mt-2 px-5 py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl font-semibold shadow-lg shadow-amber-200 transition-all duration-200 group"
            >
              <span>Confirmar e entrar</span>
              {isSubmitting
                ? <LoaderCircle className="w-5 h-5 animate-spin" />
                : <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              }
            </button>

            <p className="text-center text-xs text-slate-400 mt-2">
              * Campos obrigatórios. Os teus dados estão seguros e apenas acessíveis à liderança da RCP.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
