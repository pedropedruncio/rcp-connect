import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Search, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getRoleLabel } from '../lib/roleLabels';

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return <Outlet />;
  }

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex min-h-screen bg-surface relative overflow-x-hidden">
      {/* Sidebar - responsive */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="flex-1 flex flex-col min-h-screen lg:ml-64 w-full">
        <header className="fixed top-0 left-0 right-0 lg:left-64 flex justify-between items-center px-4 md:px-8 py-0 h-16 bg-white border-b border-outline-variant z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleSidebar}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
              aria-label="Toggle Menu"
            >
              {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 hidden xs:block">RCP Connect</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center bg-surface px-3 py-1.5 rounded-md border border-outline-variant">
              <Search className="text-secondary mr-2 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Pesquisar..." 
                className="bg-transparent border-none focus:ring-0 text-sm w-40 lg:w-64 text-slate-700 placeholder-slate-400 outline-none"
              />
            </div>
            <div className="flex items-center gap-3 ml-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 leading-none">{user?.name || 'Visitante'}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {user ? getRoleLabel(user.role) : 'Sem acesso'}
                </p>
              </div>
              <div className="w-9 h-9 rounded-full bg-surface-container-high overflow-hidden border border-outline-variant flex-shrink-0">
                <img 
                  src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.name || 'V'}&background=bd903b&color=fff`} 
                  alt="Perfil" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 pt-16">
          <Outlet />
        </div>
        <footer className="px-4 md:px-8 py-6 border-t border-outline-variant text-slate-400 text-[10px] font-bold uppercase tracking-widest flex flex-col md:flex-row justify-between gap-2 bg-white">
          <div>Sessão Ativa: Campus Central - Lisboa</div>
          <div>v2.4.0 Stable • Reformed Church in Portugal</div>
        </footer>
      </main>
    </div>
  );
}
