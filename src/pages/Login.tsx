import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Church, LogIn, ShieldCheck, Database, Mail, Lock, LoaderCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, isGoogleAuthEnabled, signInWithPassword, signInWithGoogle } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [isSubmittingEmail, setIsSubmittingEmail] = React.useState(false);
  const [isSubmittingGoogle, setIsSubmittingGoogle] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleEmailLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setFeedback('Introduza o seu e-mail e password para aceder.');
      return;
    }

    setIsSubmittingEmail(true);
    setFeedback(null);

    const { error } = await signInWithPassword(email.trim(), password);

    if (error) {
      setFeedback(error.message);
    } else {
      setFeedback('Sessão iniciada com sucesso.');
    }

    setIsSubmittingEmail(false);
  };

  const handleGoogleLogin = async () => {
    setIsSubmittingGoogle(true);
    setFeedback(null);

    const { error } = await signInWithGoogle();

    if (error) {
      setFeedback(error.message);
      setIsSubmittingGoogle(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden bg-surface text-slate-800">
      {/* Left Side: Immersive Brand Visual */}
      <div className="hidden lg:flex lg:w-7/12 relative bg-tertiary overflow-hidden">
        <div className="absolute inset-0 z-10 bg-gradient-to-tr from-tertiary/95 via-tertiary/70 to-transparent"></div>
        <img 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8dZMqMbK6yjcDpPLNjrUeUaU1yKN3YqtmG4l6HwS39mtRvuU5UZmPPqvFFtZMXjA7J3sAooDU_rUXQo55BCQD-y9ZTvgnP0VBU3hjgnSfPBuVp6Z-5VarG9SUCEXh8d8s4O0XnWNTyDOdlzjTS56anoPBINUTit_cGikKhMk-v_Dzwi3YYEfYBKYTukDJ34s1j4jyaSZ5TWd_Kj1c6kE5S8crywIxSaBdg68FvRC-Q0EyO_fG8K_GUTTi09T0el3XgAh0v5pT6m0" 
          alt="Atmosfera Ministerial" 
          className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay"
          referrerPolicy="no-referrer"
        />
        
        {/* Branding Overlay */}
        <div className="relative z-20 flex flex-col justify-between h-full p-16 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold flex items-center justify-center rounded-md">
              <Church className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight">RCP Connect</span>
          </div>
          
          <div className="max-w-xl">
            <div className="inline-block px-3 py-1 bg-gold/20 text-gold border border-gold/30 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6">
              Excelência Ministerial
            </div>
            <h1 className="text-6xl font-bold leading-tight mb-6">Eleve a sua liderança e gestão eclesial.</h1>
            <p className="text-lg text-white/80 leading-relaxed font-sans">Um espaço digital desenhado para a permanência e reverência. Gira pessoas, ministérios e discipulado com precisão institucional.</p>
          </div>
          
          <div className="flex items-center gap-8 text-[10px] font-bold uppercase tracking-widest text-white/50">
            <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Acesso Protegido</span>
            <span className="flex items-center gap-2"><Database className="w-4 h-4" /> Gestão Segura</span>
            <span>© 2026 RCP Connect. Todos os direitos reservados.</span>
          </div>
        </div>
      </div>

      {/* Right Side: Clean Login Form */}
      <div className="w-full lg:w-5/12 flex items-center justify-center p-8 md:p-16 bg-surface-container-lowest">
        <div className="w-full max-w-md space-y-12">
          {/* Mobile Header Only */}
          <div className="lg:hidden flex flex-col items-center mb-12">
            <div className="w-12 h-12 bg-gold flex items-center justify-center rounded-xl mb-4 shadow-xl shadow-gold/10">
              <Church className="text-white w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold text-tertiary tracking-tight">RCP Connect</h2>
          </div>

          <div className="space-y-4 text-center lg:text-left">
            <h2 className="text-4xl font-bold tracking-tight">Iniciar Sessão</h2>
            <p className="text-secondary font-medium">Autenticação ligada ao Supabase Auth</p>
          </div>

          <div className="bg-surface-container-high border border-outline-variant rounded-xl p-6 space-y-6">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-secondary mb-4">
                {isGoogleAuthEnabled ? 'Entre com email ou Google' : 'Entre com email'}
              </p>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Email
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-outline-variant bg-white px-3 py-3">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="voce@rcp.pt"
                    className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Password
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-outline-variant bg-white px-3 py-3">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmittingEmail}
                className="btn-primary-heritage flex w-full items-center justify-between py-3 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span>Iniciar Sessão</span>
                {isSubmittingEmail ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogIn className="w-4 h-4 opacity-70" />}
              </button>
            </form>

            <div className="flex flex-col gap-3">
              {isGoogleAuthEnabled && (
                <>
                  <div className="relative py-1">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-outline-variant" />
                    </div>
                    <div className="relative mx-auto w-fit bg-surface-container-high px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      ou
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isSubmittingGoogle}
                    className="btn-secondary-heritage flex justify-between items-center w-full py-3 hover:border-gold hover:text-gold disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <span>Continuar com <strong>Google</strong></span>
                    {isSubmittingGoogle ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogIn className="w-4 h-4 opacity-50" />}
                  </button>
                </>
              )}

              <div className="rounded-lg border border-dashed border-outline-variant bg-white/70 px-4 py-3 text-xs text-slate-500">
                No primeiro acesso, o perfil é criado automaticamente no Supabase com o papel inicial `MEMBER`.
              </div>
            </div>

            {feedback && (
              <div className="rounded-lg border border-outline-variant bg-white px-4 py-3 text-sm text-slate-600">
                {feedback}
              </div>
            )}
          </div>
          
          <div className="text-center">
            <p className="text-[10px] text-slate-400">
              Ao aceder, concorda com a estrutura de papéis do RCP Connect.
            </p>
            <p className="mt-2 text-[10px] text-slate-400">
              Produção inicial: `https://rcp-connect-web-pedro.netlify.app`.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
