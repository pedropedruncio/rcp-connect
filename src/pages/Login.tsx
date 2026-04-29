import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Church, LogIn, ShieldCheck, Database, Mail, Lock, LoaderCircle, UserPlus, User, ArrowLeft, MailCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type Mode = 'login' | 'signup';

interface SignupFormState {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, isGoogleAuthEnabled, signInWithPassword, signInWithGoogle, signUpWithPassword } = useAuth();

  // ── Mode ──
  const [mode, setMode] = React.useState<Mode>('login');

  // ── Login state ──
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  // ── Signup state ──
  const [signupForm, setSignupForm] = React.useState<SignupFormState>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // ── Shared state ──
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [feedbackType, setFeedbackType] = React.useState<'error' | 'success'>('error');
  const [isSubmittingEmail, setIsSubmittingEmail] = React.useState(false);
  const [isSubmittingGoogle, setIsSubmittingGoogle] = React.useState(false);
  const [emailConfirmationSent, setEmailConfirmationSent] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  React.useEffect(() => {
    const authError = new URLSearchParams(window.location.search).get('auth_error');
    if (authError) {
      setFeedback(authError);
      setFeedbackType('error');
      window.history.replaceState(null, '', '/login');
    }
  }, []);

  // Clear feedback when switching modes
  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setFeedback(null);
    setEmailConfirmationSent(false);
  };

  // ── Login handler ──
  const handleEmailLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setFeedback('Introduza o seu e-mail e password para aceder.');
      setFeedbackType('error');
      return;
    }

    setIsSubmittingEmail(true);
    setFeedback(null);

    const { error } = await signInWithPassword(email.trim(), password);

    if (error) {
      setFeedback(error.message);
      setFeedbackType('error');
    }

    setIsSubmittingEmail(false);
  };

  // ── Signup handler ──
  const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const { fullName, email: signupEmail, password: signupPassword, confirmPassword } = signupForm;

    if (!fullName.trim()) {
      setFeedback('Introduza o seu nome completo.');
      setFeedbackType('error');
      return;
    }

    if (!signupEmail.trim()) {
      setFeedback('Introduza um endereço de e-mail válido.');
      setFeedbackType('error');
      return;
    }

    if (signupPassword.length < 8) {
      setFeedback('A password deve ter pelo menos 8 caracteres.');
      setFeedbackType('error');
      return;
    }

    if (signupPassword !== confirmPassword) {
      setFeedback('As passwords não coincidem.');
      setFeedbackType('error');
      return;
    }

    setIsSubmittingEmail(true);
    setFeedback(null);

    const { error, needsEmailConfirmation, data } = await signUpWithPassword(
      signupEmail.trim(),
      signupPassword,
      fullName.trim(),
    );

    if (error) {
      setFeedback((error as any)?.message ?? 'Ocorreu um erro ao criar a conta.');
      setFeedbackType('error');
    } else if (needsEmailConfirmation) {
      setEmailConfirmationSent(true);
      setFeedback((data as any)?.message ?? 'Verifique o seu email para confirmar a conta.');
      setFeedbackType('success');
    }
    // If session was created, AuthContext sets user and the useEffect above will navigate to /

    setIsSubmittingEmail(false);
  };

  const handleGoogleLogin = async () => {
    setIsSubmittingGoogle(true);
    setFeedback(null);

    const { error } = await signInWithGoogle();

    if (error) {
      setFeedback(error.message);
      setFeedbackType('error');
      setIsSubmittingGoogle(false);
    }
  };

  const updateSignupField = (field: keyof SignupFormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setSignupForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  // ── Email confirmation screen ──
  if (emailConfirmationSent) {
    return (
      <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/6 w-80 h-80 rounded-full login-orb-1 pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/6 w-96 h-96 rounded-full login-orb-2 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/2 blur-3xl pointer-events-none" />

        {/* Logo top-left */}
        <div className="absolute top-8 left-8 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-amber-500 flex items-center justify-center rounded-lg shadow-lg shadow-amber-500/30">
            <Church className="text-white w-4 h-4" />
          </div>
          <span className="text-white/70 text-sm font-semibold tracking-tight">RCP Connect</span>
        </div>

        {/* Card */}
        <div className="relative z-10 w-full max-w-md rounded-3xl p-8 text-center login-glass-card">
          {/* Icon with rings */}
          <div className="relative flex items-center justify-center mb-8">
            <div className="absolute w-24 h-24 rounded-full bg-emerald-500/10 animate-ping" />
            <div className="absolute w-20 h-20 rounded-full bg-emerald-500/15" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/30">
              <MailCheck className="w-8 h-8 text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">Verifique o seu email</h1>

          <p className="text-white/50 text-sm mb-2">Enviámos um link de confirmação para</p>
          <p className="text-amber-400 font-semibold text-sm mb-6 break-all">{signupForm.email}</p>

          {/* Steps */}
          <div className="space-y-3 mb-8 text-left">
            {[
              { step: '1', text: 'Abra o seu email' },
              { step: '2', text: 'Clique no link de confirmação' },
              { step: '3', text: 'Volte aqui e inicie sessão' },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-center gap-3 rounded-xl px-4 py-3 login-step-card">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{step}</span>
                <span className="text-white/70 text-sm">{text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => { setEmailConfirmationSent(false); setMode('login'); setFeedback(null); }}
            className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] login-btn-gradient"
          >
            Ir para o login
          </button>

          <p className="text-white/30 text-xs mt-4">Não recebeu o email? Verifique a pasta de spam.</p>
        </div>
      </div>
    );
  }

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
            <p className="text-lg text-white/80 leading-relaxed font-sans">
              Um espaço digital desenhado para a permanência e reverência. Gira pessoas, ministérios e discipulado com precisão institucional.
            </p>
          </div>

          <div className="flex items-center gap-8 text-[10px] font-bold uppercase tracking-widest text-white/50">
            <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Acesso Protegido</span>
            <span className="flex items-center gap-2"><Database className="w-4 h-4" /> Gestão Segura</span>
            <span>© 2026 RCP Connect. Todos os direitos reservados.</span>
          </div>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="w-full lg:w-5/12 flex items-center justify-center p-8 md:p-16 bg-surface-container-lowest">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Header */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-gold flex items-center justify-center rounded-xl mb-4 shadow-xl shadow-gold/10">
              <Church className="text-white w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold text-tertiary tracking-tight">RCP Connect</h2>
          </div>

          {/* Header */}
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-4xl font-bold tracking-tight">
              {mode === 'login' ? 'Iniciar Sessão' : 'Criar Conta'}
            </h2>
            <p className="text-secondary font-medium text-sm">
              {mode === 'login' ? 'Autenticação ligada ao Supabase Auth' : 'Registe-se com email e password'}
            </p>
          </div>

          {/* Mode toggle tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                mode === 'login'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Entrar
            </button>
            <button
              onClick={() => switchMode('signup')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                mode === 'signup'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Criar conta
            </button>
          </div>

          <div className="bg-surface-container-high border border-outline-variant rounded-xl p-6 space-y-5">

            {/* ── LOGIN FORM ── */}
            {mode === 'login' && (
              <>
                <div className="text-center">
                  <p className="text-xs font-bold uppercase tracking-widest text-secondary mb-4">
                    {isGoogleAuthEnabled ? 'Entre com email ou Google' : 'Entre com email'}
                  </p>
                </div>

                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">Email</label>
                    <div className="flex items-center gap-2 rounded-lg border border-outline-variant bg-white px-3 py-3">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="voce@rcp.pt"
                        className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">Password</label>
                    <div className="flex items-center gap-2 rounded-lg border border-outline-variant bg-white px-3 py-3">
                      <Lock className="h-4 w-4 text-slate-400" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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
                  No primeiro acesso, o perfil é criado automaticamente com o papel inicial <code>Membro</code>.
                </div>
              </>
            )}

            {/* ── SIGNUP FORM ── */}
            {mode === 'signup' && (
              <>
                <div className="text-center">
                  <p className="text-xs font-bold uppercase tracking-widest text-secondary">
                    Preencha os dados para criar a sua conta
                  </p>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">Nome completo</label>
                    <div className="flex items-center gap-2 rounded-lg border border-outline-variant bg-white px-3 py-3">
                      <User className="h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={signupForm.fullName}
                        onChange={updateSignupField('fullName')}
                        placeholder="João Silva"
                        className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                        autoComplete="name"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">Email</label>
                    <div className="flex items-center gap-2 rounded-lg border border-outline-variant bg-white px-3 py-3">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        value={signupForm.email}
                        onChange={updateSignupField('email')}
                        placeholder="voce@rcp.pt"
                        className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Password <span className="normal-case font-normal text-slate-400">(mín. 8 caracteres)</span>
                    </label>
                    <div className="flex items-center gap-2 rounded-lg border border-outline-variant bg-white px-3 py-3">
                      <Lock className="h-4 w-4 text-slate-400" />
                      <input
                        type="password"
                        value={signupForm.password}
                        onChange={updateSignupField('password')}
                        placeholder="••••••••"
                        className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">Confirmar password</label>
                    <div className={`flex items-center gap-2 rounded-lg border bg-white px-3 py-3 ${
                      signupForm.confirmPassword && signupForm.confirmPassword !== signupForm.password
                        ? 'border-red-300'
                        : 'border-outline-variant'
                    }`}>
                      <Lock className="h-4 w-4 text-slate-400" />
                      <input
                        type="password"
                        value={signupForm.confirmPassword}
                        onChange={updateSignupField('confirmPassword')}
                        placeholder="••••••••"
                        className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                        autoComplete="new-password"
                      />
                    </div>
                    {signupForm.confirmPassword && signupForm.confirmPassword !== signupForm.password && (
                      <p className="text-xs text-red-500 mt-1">As passwords não coincidem.</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingEmail}
                    className="btn-primary-heritage flex w-full items-center justify-between py-3 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <span>Criar conta</span>
                    {isSubmittingEmail ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserPlus className="w-4 h-4 opacity-70" />}
                  </button>
                </form>

                <button
                  onClick={() => switchMode('login')}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors mx-auto"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Já tenho conta — entrar
                </button>
              </>
            )}

            {/* Feedback */}
            {feedback && (
              <div className={`rounded-lg border px-4 py-3 text-sm ${
                feedbackType === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-outline-variant bg-white text-slate-600'
              }`}>
                {feedback}
              </div>
            )}
          </div>

          <div className="text-center">
            <p className="text-[10px] text-slate-400">
              Ao aceder, concorda com a estrutura de papéis do RCP Connect.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
