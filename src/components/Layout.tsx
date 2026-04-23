import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Search, Bell, Settings, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return <Outlet />;
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="ml-64 flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 w-full flex justify-between items-center px-8 py-0 h-16 bg-white border-b border-outline-variant z-40">
          <div className="flex items-center gap-8">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">RCP Connect</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-surface px-3 py-1.5 rounded-md border border-outline-variant">
              <Search className="text-secondary mr-2 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Pesquisar em toda a plataforma..." 
                className="bg-transparent border-none focus:ring-0 text-sm w-64 text-slate-700 placeholder-slate-400 outline-none"
              />
            </div>
            <div className="flex items-center gap-3 ml-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 leading-none">{user?.name || 'Visitante'}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {user?.role || 'Sem Acesso'}
                </p>
              </div>
              <div className="w-9 h-9 rounded-full bg-surface-container-high overflow-hidden border border-outline-variant">
                <img 
                  src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.name || 'V'}&background=bd903b&color=fff`} 
                  alt="Perfil" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1">
          <Outlet />
        </div>
        <div className="px-8 py-6 border-t border-outline-variant text-slate-400 text-[10px] font-bold uppercase tracking-widest flex justify-between bg-white">
          <div>Sessão Ativa: Campus Central - Lisboa</div>
          <div>v2.4.0 Stable • Reformed Church in Portugal</div>
        </div>
      </main>
    </div>
  );
}
