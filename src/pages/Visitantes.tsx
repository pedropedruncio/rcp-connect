import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Church, MessageCircle, Instagram, Facebook, Youtube, Globe, ArrowRight, Mail } from 'lucide-react';

const SLIDES = [
  {
    gradient: 'from-slate-900 via-blue-950 to-indigo-950',
    quote: 'Porque tanto amou Deus o mundo, que deu o seu Filho unigénito.',
    ref: 'João 3:16',
  },
  {
    gradient: 'from-slate-900 via-purple-950 to-slate-900',
    quote: 'O Senhor é o meu pastor; nada me faltará.',
    ref: 'Salmos 23:1',
  },
  {
    gradient: 'from-slate-900 via-teal-950 to-slate-900',
    quote: 'Confia no Senhor de todo o teu coração.',
    ref: 'Provérbios 3:5',
  },
  {
    gradient: 'from-slate-900 via-rose-950 to-slate-900',
    quote: 'Tudo o posso naquele que me fortalece.',
    ref: 'Filipenses 4:13',
  },
];

const SOCIAL_LINKS = [
  {
    id: 'whatsapp',
    label: 'Quero ser membro',
    sublabel: 'Fala connosco no WhatsApp',
    icon: MessageCircle,
    href: 'https://wa.me/351911846099?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20ser%20membro%20da%20Reformed%20Church%20in%20Portugal.',
    color: 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500',
    primary: true,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    sublabel: '@rcp_portugal',
    icon: Instagram,
    href: 'https://www.instagram.com/rcp_portugal/',
    color: 'bg-white/10 hover:bg-white/20 border-white/20',
    primary: false,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    sublabel: 'rcp.portugal',
    icon: Facebook,
    href: 'https://www.facebook.com/rcp.portugal/',
    color: 'bg-white/10 hover:bg-white/20 border-white/20',
    primary: false,
  },
  {
    id: 'youtube',
    label: 'YouTube',
    sublabel: '@rcp.portugal',
    icon: Youtube,
    href: 'https://www.youtube.com/@rcp.portugal',
    color: 'bg-white/10 hover:bg-white/20 border-white/20',
    primary: false,
  },
  {
    id: 'website',
    label: 'Site oficial',
    sublabel: 'rcportugal.com',
    icon: Globe,
    href: 'https://www.rcportugal.com/',
    color: 'bg-white/10 hover:bg-white/20 border-white/20',
    primary: false,
  },
  {
    id: 'email',
    label: 'Email',
    sublabel: 'evilazioneto@gmail.com',
    icon: Mail,
    href: 'mailto:evilazioneto@gmail.com',
    color: 'bg-white/10 hover:bg-white/20 border-white/20',
    primary: false,
  },
];

export default function Visitantes() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
        setFading(false);
      }, 600);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const slide = SLIDES[currentSlide];

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Animated background */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${slide.gradient} transition-all duration-1000`}
        style={{ opacity: fading ? 0 : 1 }}
      />

      {/* Geometric pattern overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 25% 35%, rgba(255,255,255,0.15) 0%, transparent 50%),
                            radial-gradient(circle at 75% 65%, rgba(255,255,255,0.1) 0%, transparent 50%)`,
        }}
      />

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-white/5 blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-white/5 blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />

      {/* Quote overlay bottom-left */}
      <div
        className="absolute bottom-8 left-8 max-w-xs text-white/50 hidden lg:block transition-opacity duration-700"
        style={{ opacity: fading ? 0 : 1 }}
      >
        <p className="text-sm italic leading-relaxed">"{slide.quote}"</p>
        <p className="text-xs mt-1 font-semibold tracking-widest uppercase">{slide.ref}</p>
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-8 right-8 flex gap-1.5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentSlide(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              i === currentSlide ? 'bg-white w-4' : 'bg-white/30'
            }`}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Logo + header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500 shadow-2xl shadow-amber-500/30 mb-5">
            <Church className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Reformed Church in Portugal</h1>
          <p className="text-white/60 mt-2 text-sm tracking-wide">Bem-vindo(a)! Como podemos ajudar?</p>
        </div>

        {/* Glass card with links */}
        <div
          className="w-full max-w-md rounded-3xl p-1"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 32px 64px rgba(0,0,0,0.4)',
          }}
        >
          <div className="p-6 space-y-3">
            {SOCIAL_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.id}
                  href={link.href}
                  target={link.href.startsWith('mailto') ? undefined : '_blank'}
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between w-full px-4 py-3.5 rounded-xl border transition-all duration-200 group ${link.color} ${
                    link.primary
                      ? 'text-white shadow-lg shadow-emerald-900/40'
                      : 'text-white/90'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${link.primary ? 'bg-white/20' : 'bg-white/10'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className={`text-sm font-semibold ${link.primary ? 'text-white' : 'text-white'}`}>{link.label}</p>
                      <p className={`text-xs ${link.primary ? 'text-emerald-200' : 'text-white/50'}`}>{link.sublabel}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 opacity-40 group-hover:opacity-80 group-hover:translate-x-0.5 transition-all" />
                </a>
              );
            })}
          </div>
        </div>

        {/* Login link */}
        <div className="mt-8 text-center">
          <Link
            to="/login"
            className="text-white/40 hover:text-white/70 text-xs transition-colors duration-200 flex items-center gap-1.5 group"
          >
            Já és membro?
            <span className="underline underline-offset-2 group-hover:text-white/80 transition-colors">Iniciar sessão</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
