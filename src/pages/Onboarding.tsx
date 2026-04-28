import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Church, CheckCircle2, ArrowRight, ChevronRight } from 'lucide-react';

type Step = 'membership' | 'visitor-redirect';

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('membership');
  const [countdown, setCountdown] = useState(5);

  // Visitor redirect countdown
  useEffect(() => {
    if (step !== 'visitor-redirect') return;
    if (countdown <= 0) { navigate('/visitantes', { replace: true }); return; }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, countdown, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12">
      {/* Background subtle pattern */}
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
          <p className="text-slate-500 text-sm mt-1">Reformed Church in Portugal</p>
        </div>

        {/* ── STEP 1: Membership question ── */}
        {step === 'membership' && (
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/80 border border-slate-100 p-8 text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Church className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Bem-vindo(a)!</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              Para personalizar a tua experiência, precisamos de saber um pouco mais sobre ti.
            </p>
            <p className="text-base font-semibold text-slate-700 mb-6">
              És membro da <span className="text-amber-600">Reformed Church in Portugal</span>?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/login')}
                className="flex items-center justify-between w-full px-5 py-4 bg-amber-500 hover:bg-amber-400 text-white rounded-2xl font-semibold shadow-lg shadow-amber-200 transition-all duration-200 group"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Sim, sou membro
                </span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={() => setStep('visitor-redirect')}
                className="flex items-center justify-between w-full px-5 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-semibold transition-all duration-200 group"
              >
                <span>Não, sou visitante</span>
                <ChevronRight className="w-5 h-5 opacity-40 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Visitor redirect ── */}
        {step === 'visitor-redirect' && (
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/80 border border-slate-100 p-8 text-center">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <ArrowRight className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Que bom ter-te aqui!</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Vamos levar-te para a área de visitantes onde encontrarás toda a informação sobre a nossa comunidade.
            </p>
            <div className="bg-slate-50 rounded-2xl p-4 mb-6">
              <p className="text-slate-600 text-sm">
                Serás redirecionado(a) em <span className="font-bold text-2xl text-amber-600 mx-1">{countdown}</span> segundos...
              </p>
              <div className="mt-3 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                  style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                />
              </div>
            </div>
            <button
              onClick={() => navigate('/visitantes', { replace: true })}
              className="w-full px-5 py-3.5 bg-amber-500 hover:bg-amber-400 text-white rounded-2xl font-semibold shadow-lg shadow-amber-200 transition-all duration-200"
            >
              Ir já para a área de visitantes
            </button>
            <button
              onClick={() => setStep('membership')}
              className="mt-3 text-slate-400 hover:text-slate-600 text-sm transition-colors"
            >
              ← Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
