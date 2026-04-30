import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Search, Bell, Settings, User, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { getRoleLabel } from '../lib/roleLabels';

export default function Layout() {
  const { user } = useAuth();
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useData();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const isLeadershipUser = user?.role === 'ADMIN' || user?.role === 'PASTOR';
  const myNotifications = notifications.filter(n => {
    const content = n.content ?? {};
    const targetPersonId = content.targetPersonId;
    const targetPersonIds = Array.isArray(content.targetPersonIds) ? content.targetPersonIds : [];
    const targetRoles = Array.isArray(content.targetRoles)
      ? content.targetRoles
      : content.targetRole
        ? [content.targetRole]
        : [];

    if (isLeadershipUser) return true;
    if (targetPersonId) return targetPersonId === user?.id;
    if (targetPersonIds.length > 0) return targetPersonIds.includes(user?.id ?? '');
    if (targetRoles.length > 0) return targetRoles.includes(user?.role ?? '');

    return false;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadNotifications = myNotifications.filter(n => !n.readBy?.includes(user?.id || ''));
  const unreadCount = unreadNotifications.length;
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
            <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={cn(
                  "p-2 rounded-full transition-all relative",
                  isNotificationsOpen ? "bg-gold/10 text-gold shadow-sm" : "text-slate-400 hover:text-gold hover:bg-gold/5"
                )}
                aria-label="Notificações"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-[60]" 
                      onClick={() => setIsNotificationsOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 12, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 12, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-[320px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-outline-variant z-[70] overflow-hidden"
                    >
                      <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-bold text-slate-900 text-sm">Notificações</h3>
                        {unreadCount > 0 && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              markAllNotificationsAsRead();
                            }}
                            className="text-[10px] font-bold text-gold hover:underline uppercase tracking-widest"
                          >
                            Ler Tudo
                          </button>
                        )}
                      </div>
                      <div className="max-h-[380px] overflow-y-auto">
                        {myNotifications.length === 0 ? (
                          <div className="py-12 px-6 text-center text-slate-400">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                              <Bell className="w-6 h-6 opacity-20" />
                            </div>
                            <p className="text-xs font-medium">Tudo em dia!</p>
                            <p className="text-[10px] mt-1">Não tens notificações novas.</p>
                          </div>
                        ) : (
                          myNotifications.map(n => {
                            const isRead = n.readBy?.includes(user?.id || '');
                            return (
                              <div 
                                key={n.id} 
                                onClick={() => {
                                  if (!isRead) markNotificationAsRead(n.id);
                                  setIsNotificationsOpen(false);
                                }}
                                className={cn(
                                  "p-4 border-b border-outline-variant last:border-0 cursor-pointer transition-all hover:bg-slate-50",
                                  !isRead ? "bg-gold/5" : "bg-white"
                                )}
                              >
                                <div className="flex gap-3">
                                  <div className={cn(
                                    "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                                    !isRead ? "bg-gold" : "bg-transparent"
                                  )} />
                                  <div>
                                    <p className="text-xs font-bold text-slate-900 mb-0.5">{n.content?.title ?? 'Notificação'}</p>
                                    <p className="text-[11px] text-slate-600 leading-normal">{n.content?.message ?? 'Há uma atualização disponível.'}</p>
                                    <p className="text-[9px] text-slate-400 mt-2 font-medium">
                                      {new Date(n.createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })} • {new Date(n.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                      {myNotifications.length > 0 && (
                         <div className="p-3 bg-slate-50/50 border-t border-outline-variant text-center">
                            <button className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600">
                               Ver histórico completo
                            </button>
                         </div>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
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
