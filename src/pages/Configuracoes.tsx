import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BellRing, Building, Database, Key, Save, ShieldCheck } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import PersonFormModal from '../components/modals/PersonFormModal';
import Toast from '../components/ui/Toast';

type ConfigTab = 'pessoal' | 'ministerial' | 'sistema' | 'credenciais';

export default function Configuracoes() {
  const { user } = useAuth();
  const { error, getPersonById, preferences, saveNotificationPreference, supports } = useData();
  const [activeTab, setActiveTab] = React.useState<ConfigTab>('pessoal');
  const [isProfileModalOpen, setProfileModalOpen] = React.useState(false);
  const [toast, setToast] = React.useState<{ show: boolean; msg: string; type?: 'success' | 'error' | 'info' }>({
    show: false,
    msg: '',
  });

  if (!user) return null;

  const person = getPersonById(user.id);
  const preference = preferences.find((item) => item.personId === user.id) ?? {
    personId: user.id,
    pushEnabled: true,
    emailDigestEnabled: false,
    smsEnabled: false,
  };

  const tabs = [
    { id: 'pessoal' as const, label: 'Perfil & Acesso', icon: ShieldCheck, visible: true },
    { id: 'ministerial' as const, label: 'Campus & Rede', icon: Building, visible: true },
    { id: 'sistema' as const, label: 'Infraestrutura', icon: Database, visible: true },
    { id: 'credenciais' as const, label: 'Credenciais', icon: Key, visible: true },
  ];

  const updatePreference = async (field: 'pushEnabled' | 'emailDigestEnabled' | 'smsEnabled', value: boolean) => {
    try {
      await saveNotificationPreference({ ...preference, [field]: value });
      setToast({ show: true, msg: 'Preferências atualizadas com sucesso.', type: 'success' });
    } catch (currentError: any) {
      setToast({
        show: true,
        msg: currentError?.message ?? 'Não foi possível guardar as preferências.',
        type: 'error',
      });
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-5xl space-y-8 p-8">
      <PersonFormModal
        isOpen={isProfileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        initialData={person}
        onSuccess={() => setToast({ show: true, msg: 'Perfil atualizado com sucesso.', type: 'success' })}
      />

      <Toast
        isVisible={toast.show}
        message={toast.msg}
        type={toast.type}
        onClose={() => setToast((current) => ({ ...current, show: false }))}
      />

      <div>
        <h2 className="text-4xl font-bold tracking-tight text-slate-900">Configurações</h2>
        <p className="font-medium text-slate-500">Conta, preferências e estado operacional do ambiente remoto.</p>
      </div>

      {error && <div className="card-heritage border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <nav className="flex flex-col space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-3 rounded-md border-l-2 px-3 py-2.5 text-sm font-semibold transition-all',
                  activeTab === tab.id ? 'border-gold bg-gold/10 text-gold' : 'border-transparent text-slate-600 hover:bg-surface-container-high',
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="lg:col-span-9">
          <AnimatePresence mode="wait">
            {activeTab === 'pessoal' && (
              <motion.div key="pessoal" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                <div className="card-heritage p-6">
                  <div className="mb-6 flex items-center justify-between border-b border-outline-variant pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Perfil atual</h3>
                      <p className="text-sm text-slate-500">Dados ligados à sua conta autenticada.</p>
                    </div>
                    <span className="badge-heritage bg-slate-100 text-slate-600">{user.role}</span>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nome</p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">{person?.name ?? user.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email</p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">{user.email}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Campus</p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">{person?.campus ?? user.campus}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Telefone</p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">{person?.phone || '—'}</p>
                    </div>
                  </div>

                  <div className="mt-8">
                    <button onClick={() => setProfileModalOpen(true)} className="btn-primary-heritage flex items-center gap-2">
                      <Save className="h-4 w-4" /> Editar perfil
                    </button>
                  </div>
                </div>

                <div className="card-heritage p-6">
                  <div className="mb-6 flex items-center gap-3 border-b border-outline-variant pb-4">
                    <BellRing className="h-5 w-5 text-gold" />
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Notificações</h3>
                      <p className="text-sm text-slate-500">Preferências guardadas no backend quando a tabela estiver disponível.</p>
                    </div>
                  </div>

                  {!supports.notificationPreferences && (
                    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      A tabela `NotificationPreference` ainda não existe no projeto remoto. A migração incluída no repositório cobre esta parte.
                    </div>
                  )}

                  <div className="space-y-4">
                    {[
                      {
                        key: 'pushEnabled' as const,
                        title: 'Notificações push',
                        description: 'Alertas rápidos sobre eventos e acompanhamento.',
                        value: preference.pushEnabled,
                      },
                      {
                        key: 'emailDigestEnabled' as const,
                        title: 'Resumo semanal por email',
                        description: 'Resumo do seu âmbito ministerial.',
                        value: preference.emailDigestEnabled,
                      },
                      {
                        key: 'smsEnabled' as const,
                        title: 'SMS prioritário',
                        description: 'Usado para convocações críticas.',
                        value: preference.smsEnabled,
                      },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-high p-4">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{item.title}</p>
                          <p className="text-xs text-slate-500">{item.description}</p>
                        </div>
                        <button
                          disabled={!supports.notificationPreferences}
                          onClick={() => updatePreference(item.key, !item.value)}
                          className={cn(
                            'h-6 w-11 rounded-full transition-colors',
                            item.value ? 'bg-gold' : 'bg-slate-200',
                            !supports.notificationPreferences && 'cursor-not-allowed opacity-50',
                          )}
                        >
                          <span
                            className={cn(
                              'block h-5 w-5 rounded-full bg-white transition-transform',
                              item.value ? 'translate-x-5' : 'translate-x-0.5',
                            )}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'ministerial' && (
              <motion.div key="ministerial" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="card-heritage space-y-6 p-6">
                <div className="border-b border-outline-variant pb-4">
                  <h3 className="text-lg font-bold text-slate-900">Contexto ministerial</h3>
                  <p className="text-sm text-slate-500">Informações hoje disponíveis a partir do projeto remoto.</p>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Campus atual</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{person?.campus ?? user.campus}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Célula atual</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{user.cellId ?? 'Sem célula'}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-dashed border-outline-variant p-4 text-sm text-slate-500">
                  Ajustes avançados de redes, campus e cobertura ministerial dependem da expansão de schema já preparada em `supabase/migrations`.
                </div>
              </motion.div>
            )}

            {activeTab === 'sistema' && (
              <motion.div key="sistema" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                <div className="card-heritage p-6">
                  <div className="border-b border-outline-variant pb-4">
                    <h3 className="text-lg font-bold text-slate-900">Estado do backend</h3>
                    <p className="text-sm text-slate-500">Leitura do ambiente remoto em vez de comandos locais com Docker.</p>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-green-100 bg-green-50 p-4">
                      <span className="text-sm font-bold text-green-800">Supabase remoto conectado</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-green-600">ONLINE</span>
                    </div>
                    <div className="rounded-lg border border-outline-variant bg-surface-container-high p-4 text-sm text-slate-600">
                      Backup manual foi removido da UI até existir backend/job próprio, para evitar promessa operacional falsa.
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'credenciais' && (
              <motion.div key="credenciais" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="card-heritage p-6">
                <div className="border-b border-outline-variant pb-4">
                  <h3 className="text-lg font-bold text-slate-900">Credenciais</h3>
                  <p className="text-sm text-slate-500">O acesso v1 está limitado a magic link e Google OAuth.</p>
                </div>

                <div className="mt-6 space-y-3 text-sm text-slate-600">
                  <p>Email: {user.email}</p>
                  <p>Provider principal: Supabase Auth</p>
                  <p>OAuth ativo no frontend: Google</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
