import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Search, UserPlus, X, Users, AlertCircle, LogOut, UserMinus, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import Toast from '../components/ui/Toast';
import { apiRequest } from '../lib/api';

type FamilySearchResult = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
};

export default function Familia() {
  const { user } = useAuth();
  const { 
    persons, 
    familyMembers, 
    inviteFamilyMember, 
    acceptFamilyInvitation, 
    rejectFamilyInvitation,
    requestFamilyRemoval,
    isLoading 
  } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<FamilySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: 'success' | 'error' | 'info' }>({ show: false, msg: '', type: 'success' });

  // Invite Modal State
  const [inviteTarget, setInviteTarget] = useState<FamilySearchResult | null>(null);
  const [inviteRel, setInviteRel] = useState('Familiar');
  const [inviteMsg, setInviteMsg] = useState('');
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);

  // Removal Request Modal State
  const [removalTarget, setRemovalTarget] = useState<{id: string, name: string} | null>(null);
  const [removalReason, setRemovalReason] = useState('');
  const [isSubmittingRemoval, setIsSubmittingRemoval] = useState(false);

  // 1. My pending invitations (where I am invited)
  const myPendingInvites = useMemo(() => {
    if (!user) return [];
    return familyMembers.filter(m => m.personId === user.id && m.status === 'PENDING');
  }, [familyMembers, user]);

  // 2. Determine my accepted families
  const myFamilies = useMemo(() => {
    if (!user) return [];
    return familyMembers
      .filter(m => m.personId === user.id && m.status === 'ACCEPTED')
      .map(m => m.familyId);
  }, [familyMembers, user]);

  // 3. Find all members in those families
  const currentFamilyMembers = useMemo(() => {
    if (myFamilies.length === 0) return [];
    return familyMembers
      .filter(m => myFamilies.includes(m.familyId) && m.status === 'ACCEPTED')
      .map(m => {
        const personData = persons.find(p => p.id === m.personId);
        return {
          ...m,
          name: personData?.name ?? 'Utilizador desconhecido',
          email: personData?.email ?? '',
          avatarUrl: personData?.avatarUrl ?? null,
        };
      });
  }, [familyMembers, myFamilies, persons]);

  useEffect(() => {
    const q = searchTerm.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }
    let isCurrent = true;
    setIsSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const results = await apiRequest<FamilySearchResult[]>(`/family-members/search?q=${encodeURIComponent(q)}`);
        if (!isCurrent) return;
        setSearchResults(results);
        setHasSearched(true);
      } catch (error: any) {
        if (!isCurrent) return;
        setSearchResults([]);
        setHasSearched(true);
      } finally {
        if (isCurrent) setIsSearching(false);
      }
    }, 300);
    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [searchTerm]);

  const handleOpenInviteModal = (target: FamilySearchResult) => {
    setInviteTarget(target);
    setInviteRel('Familiar');
    setInviteMsg('');
  };

  const submitInvite = async () => {
    if (!inviteTarget) return;
    setIsSubmittingInvite(true);
    try {
      const familyIdToUse = myFamilies.length > 0 ? myFamilies[0] : undefined;
      await inviteFamilyMember(inviteTarget.id, inviteRel, familyIdToUse, inviteMsg);
      setToast({ show: true, msg: 'Convite familiar enviado com sucesso.', type: 'success' });
      setSearchTerm('');
      setSearchResults([]);
      setHasSearched(false);
      setInviteTarget(null);
    } catch (err: any) {
      setToast({ show: true, msg: err.message ?? 'Erro ao enviar convite.', type: 'error' });
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const submitRemovalRequest = async () => {
    if (!removalTarget) return;
    setIsSubmittingRemoval(true);
    try {
      await requestFamilyRemoval(removalTarget.id, removalReason);
      setToast({ show: true, msg: 'Pedido de remoção submetido. Um líder irá rever.', type: 'success' });
      setRemovalTarget(null);
      setRemovalReason('');
    } catch (err: any) {
      setToast({ show: true, msg: err.message ?? 'Erro ao solicitar remoção.', type: 'error' });
    } finally {
      setIsSubmittingRemoval(false);
    }
  };

  const handleAccept = async (memberId: string) => {
    try {
      await acceptFamilyInvitation(memberId);
      setToast({ show: true, msg: 'Convite aceite! Bem-vindo à família.', type: 'success' });
    } catch (err: any) {
      setToast({ show: true, msg: 'Erro ao aceitar convite.', type: 'error' });
    }
  };

  const handleReject = async (memberId: string) => {
    try {
      await rejectFamilyInvitation(memberId);
      setToast({ show: true, msg: 'Convite recusado.', type: 'success' });
    } catch (err: any) {
      setToast({ show: true, msg: 'Erro ao recusar convite.', type: 'error' });
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">A carregar...</div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 p-8">
      <Toast 
        isVisible={toast.show} 
        message={toast.msg} 
        type={toast.type}
        onClose={() => setToast(s => ({ ...s, show: false }))} 
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Família / Casa</h2>
          <p className="mt-1 text-sm text-slate-500">
            Gere o teu agregado familiar. Convida membros e consolida a vossa casa.
          </p>
        </div>
      </div>

      {myPendingInvites.length > 0 && (
        <div className="card-heritage border-gold/30 bg-gold/5 p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
            <AlertCircle className="h-5 w-5 text-gold" />
            Convites familiares pendentes
          </h3>
          <div className="space-y-3">
            {myPendingInvites.map(invite => {
              const inviter = familyMembers.find(m => m.familyId === invite.familyId && m.personId !== user?.id);
              const inviterPerson = persons.find(p => p.id === inviter?.personId);
              
              return (
                <div key={invite.id} className="flex items-center justify-between rounded-lg bg-white p-4 border border-outline-variant shadow-sm">
                  <div>
                    <p className="font-medium text-slate-900">
                      {inviterPerson ? `${inviterPerson.name} convidou-te para integrares a sua família.` : 'Convite para integrar uma família.'}
                    </p>
                    <p className="text-sm text-slate-500">
                      Como: <span className="font-semibold text-slate-700">{invite.relationship}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleReject(invite.id)} className="btn-secondary-heritage p-2 text-red-600 hover:bg-red-50" title="Rejeitar convite">
                      <X className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleAccept(invite.id)} className="btn-primary-heritage px-4 py-2">
                      Aceitar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Current Family Members */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card-heritage p-0 overflow-hidden shadow-sm">
            <div className="border-b border-outline-variant bg-surface p-6 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-gold" /> A Minha Casa
              </h3>
            </div>
            <div className="divide-y divide-outline-variant">
              {currentFamilyMembers.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center text-center">
                  <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-slate-400" />
                  </div>
                  <h4 className="text-lg font-medium text-slate-900 mb-2">Ainda não tens família registada</h4>
                  <p className="text-slate-500 max-w-sm">
                    Começa por convidar o teu cônjuge ou filhos utilizando a pesquisa ao lado. 
                    A tua família será criada automaticamente.
                  </p>
                </div>
              ) : (
                currentFamilyMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 overflow-hidden rounded-full bg-slate-100 flex items-center justify-center text-gold font-bold ring-2 ring-white shadow-sm">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
                        ) : (
                          member.name.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-lg flex items-center gap-2">
                          {member.name} 
                          {member.personId === user?.id && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">(Tu)</span>}
                        </p>
                        <p className="text-sm text-slate-500">
                          {member.relationship}
                          {member.acceptedAt && <span className="ml-2 text-xs text-slate-400">• Desde {new Date(member.acceptedAt).toLocaleDateString('pt-PT')}</span>}
                        </p>
                      </div>
                    </div>
                    <div>
                      {member.personId !== user?.id && (
                        <button 
                          onClick={() => setRemovalTarget({ id: member.personId, name: member.name })}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          title="Remover da família"
                        >
                          <UserMinus className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Invite new members sidebar */}
        <div className="space-y-6">
          <div className="card-heritage p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Adicionar à Família</h3>
            <p className="text-sm text-slate-500 mb-6">
              Pesquise pelo nome ou e-mail de um membro e envie um convite para integrar a sua casa.
            </p>
            
            <div className="relative mb-4">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Pesquisar pessoa..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="input-heritage pl-10 w-full bg-slate-50 border-transparent focus:border-gold focus:bg-white transition-colors"
              />
            </div>

            {searchTerm.trim().length >= 2 && (
              <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {isSearching ? (
                  <p className="text-sm text-slate-400 text-center py-4">A pesquisar...</p>
                ) : hasSearched && searchResults.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Nenhum resultado.</p>
                ) : (
                  searchResults.filter(p => p.id !== user?.id).map(p => {
                    const isAlreadyInMyFamily = currentFamilyMembers.some(m => m.personId === p.id);
                    return (
                      <div key={p.id} className="flex items-center justify-between rounded-lg border border-outline-variant p-3 hover:border-gold hover:shadow-sm transition-all bg-white">
                        <div className="flex min-w-0 items-center gap-3 pr-2">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gold/10 text-xs font-bold text-gold">
                            {p.avatarUrl ? (
                              <img src={p.avatarUrl} alt={p.name} className="h-full w-full object-cover" />
                            ) : (
                              p.name.substring(0, 1)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                            <p className="text-xs text-slate-500 truncate">{p.email || 'Sem email'}</p>
                          </div>
                        </div>
                        {isAlreadyInMyFamily ? (
                          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Na família</span>
                        ) : (
                          <button
                            onClick={() => handleOpenInviteModal(p)}
                            className="btn-primary-heritage h-8 w-8 !p-0 rounded-full flex-shrink-0 flex items-center justify-center"
                            title="Convidar"
                          >
                            <UserPlus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {inviteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setInviteTarget(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <h3 className="text-lg font-bold text-slate-900">Convidar Familiar</h3>
                <button onClick={() => setInviteTarget(null)} className="text-slate-400 hover:text-slate-500">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold">
                    {inviteTarget.avatarUrl ? (
                      <img src={inviteTarget.avatarUrl} alt={inviteTarget.name} className="h-full w-full object-cover rounded-full" />
                    ) : (
                      inviteTarget.name.substring(0, 1)
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Convidando {inviteTarget.name}</p>
                    <p className="text-xs text-slate-500">{inviteTarget.email}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Parentesco na família</label>
                  <select 
                    value={inviteRel} 
                    onChange={e => setInviteRel(e.target.value)}
                    className="input-heritage w-full"
                  >
                    <option value="Cônjuge">Cônjuge</option>
                    <option value="Filho/a">Filho/a</option>
                    <option value="Pai/Mãe">Pai/Mãe</option>
                    <option value="Irmão/Irmã">Irmão/Irmã</option>
                    <option value="Familiar">Outro Familiar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mensagem (opcional)</label>
                  <textarea 
                    value={inviteMsg}
                    onChange={e => setInviteMsg(e.target.value)}
                    placeholder="Olá, junta-te à nossa família no RCP Connect!"
                    className="input-heritage w-full resize-none h-20"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex justify-end gap-3">
                <button onClick={() => setInviteTarget(null)} className="btn-secondary-heritage">Cancelar</button>
                <button 
                  onClick={submitInvite}
                  disabled={isSubmittingInvite}
                  className="btn-primary-heritage"
                >
                  {isSubmittingInvite ? 'A enviar...' : 'Enviar Convite'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Removal Request Modal */}
      <AnimatePresence>
        {removalTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setRemovalTarget(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden"
            >
              <div className="flex items-center gap-3 bg-red-50 border-b border-red-100 px-6 py-4">
                <ShieldAlert className="h-6 w-6 text-red-600" />
                <h3 className="text-lg font-bold text-red-900">Solicitar Remoção</h3>
              </div>
              
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600">
                  Estás a solicitar a remoção de <strong className="text-slate-900">{removalTarget.name}</strong> da tua família. 
                  Por questões de segurança e integridade de dados, a remoção precisa de ser aprovada por um líder ou administrador.
                </p>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Motivo (obrigatório)</label>
                  <textarea 
                    value={removalReason}
                    onChange={e => setRemovalReason(e.target.value)}
                    placeholder="Ex: Mudança de agregado, erro no registo..."
                    className="input-heritage w-full resize-none h-24"
                    required
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex justify-end gap-3">
                <button onClick={() => setRemovalTarget(null)} className="btn-secondary-heritage">Cancelar</button>
                <button 
                  onClick={submitRemovalRequest}
                  disabled={isSubmittingRemoval || removalReason.trim().length < 5}
                  className="px-4 py-2 bg-red-600 text-white font-medium rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmittingRemoval ? 'A solicitar...' : 'Solicitar Remoção'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
