import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, UserCircle, Award, Network, Church,
  Calendar, BookOpen, HeartHandshake, CalendarRange, BarChart3,
  Settings, HelpCircle, LogOut, User, X
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { getRoleLabel } from '../lib/roleLabels';
import { useData } from '../contexts/DataContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const { familyMembers } = useData();
  const navigate = useNavigate();
  const p = usePermissions();

  const pendingInvitesCount = familyMembers?.filter(m => m.personId === user?.id && m.status === 'PENDING').length || 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard',      path: '/',               show: true },
    { icon: User,            label: 'Meu Perfil',     path: '/meu-perfil',     show: p.canViewMeuPerfil },
    { icon: Users,           label: 'A minha família', path: '/familia',       show: p.canViewMinhaFamilia },
    { icon: Calendar,        label: 'A minha Agenda', path: '/minha-agenda',   show: p.canViewAgenda },
    { icon: Users,           label: 'Pessoas',        path: '/pessoas',        show: p.canViewPessoas },
    { icon: Network,         label: 'Células',        path: '/celulas',        show: p.canViewCelulas },
    { icon: BookOpen,        label: 'Discipulado',    path: '/discipulado',    show: p.canViewDiscipulado },
    { icon: HeartHandshake,  label: 'Acompanhamento', path: '/acompanhamento', show: p.canViewAcompanhamento },
    { icon: Award,           label: 'Liderança',      path: '/lideranca',      show: p.canViewLideranca },
    { icon: BarChart3,       label: 'Relatórios',     path: '/relatorios',     show: p.canViewRelatorios },
    { icon: UserCircle,      label: 'Famílias',       path: '/familias',       show: p.canViewFamilias },
    { icon: Church,          label: 'Ministérios',    path: '/ministerios',    show: p.canViewMinisterios },
    { icon: CalendarRange,   label: 'Escalas',        path: '/escalas',        show: p.canViewEscalas },
    { icon: Calendar,        label: 'Eventos',        path: '/eventos',        show: p.canViewEventos },
    { icon: Settings,        label: 'Configurações',  path: '/configuracoes',  show: p.canViewConfiguracoes },
  ].filter(item => item.show);

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen w-64 bg-tertiary flex flex-col py-6 px-0 overflow-y-auto z-50 transition-transform duration-300 ease-in-out lg:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between mb-8 px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary flex items-center justify-center rounded-lg">
            <Church className="text-white w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">RCP Connect</h2>
        </div>
        <button 
          onClick={onClose}
          className="lg:hidden p-2 text-slate-400 hover:text-white rounded-md"
          aria-label="Close Menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* User badge */}
      <div className="mx-4 mb-6 px-3 py-3 bg-white/5 rounded-lg border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold text-xs font-bold flex-shrink-0">
            {user?.name.split(' ').map(n => n[0]).slice(0, 2).join('') ?? 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-bold truncate">{user?.name}</p>
            <p className="text-gold text-[10px] font-bold uppercase tracking-widest">{getRoleLabel(user?.role)}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={onClose}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-6 py-3 transition-all text-sm font-medium border-l-4",
              isActive
                ? "bg-white/5 text-gold border-gold"
                : "text-slate-400 border-transparent hover:text-white hover:bg-white/5"
            )}
          >
            <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.path === '/familia' && pendingInvitesCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm">
                {pendingInvitesCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-white/10 space-y-0.5">
        <button className="w-full flex items-center gap-3 px-6 py-2.5 text-slate-400 hover:text-white transition-all text-sm font-medium">
          <HelpCircle className="w-5 h-5" />
          <span>Suporte</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-6 py-2.5 text-slate-400 hover:text-red-400 transition-all text-sm font-medium"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </div>

      {/* Footer version */}
      <div className="px-6 pt-3">
        <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">
          v2.4.0 Stable · Reformed Church in Portugal
        </p>
      </div>
    </aside>
  );
}
