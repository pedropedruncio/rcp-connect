import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, Search, UserPlus, X, Users, AlertCircle } from 'lucide-react';
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
    isLoading 
  } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<FamilySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: 'success' | 'error' | 'info' }>({ show: false, msg: '', type: 'success' });

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
        setToast({ show: true, msg: error?.message ?? 'Não foi possível pesquisar membros.', type: 'error' });
      } finally {
        if (isCurrent) setIsSearching(false);
      }
    }, 300);

    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [searchTerm]);

  const handleInvite = async (targetPersonId: string) => {
    setIsInviting(true);
    try {
      const familyIdToUse = myFamilies.length > 0 ? myFamilies[0] : undefined;
      await inviteFamilyMember(targetPersonId, 'Familiar', familyIdToUse);
      setToast({ show: true, msg: 'Convite enviado com sucesso.', type: 'success' });
      setSearchTerm('');
      setSearchResults([]);
      setHasSearched(false);
    } catch (err: any) {
      setToast({ show: true, msg: err.message ?? 'Erro ao enviar convite.', type: 'error' });
    } finally {
      setIsInviting(false);
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
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Membros da Família</h2>
          <p className="mt-1 text-sm text-slate-500">
            Gere convites familiares com aceite explícito de cada membro.
          </p>
        </div>
      </div>

      {myPendingInvites.length > 0 && (
        <div className="card-heritage border-gold/30 bg-gold/5 p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
            <AlertCircle className="h-5 w-5 text-gold" />
            Convites pendentes
          </h3>
          <div className="space-y-3">
            {myPendingInvites.map(invite => {
              const senderFamId = invite.familyId;
              // Who invited me? Get the primary contact of that family, or anyone in it
              const inviter = familyMembers.find(m => m.familyId === senderFamId && m.personId !== user?.id);
              const inviterPerson = persons.find(p => p.id === inviter?.personId);
              
              return (
                <div key={invite.id} className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm border border-outline-variant">
                  <div>
                    <p className="font-medium text-slate-900">
                      {inviterPerson ? `${inviterPerson.name} convidou-te para a sua família.` : 'Convite para integrar uma família.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleReject(invite.id)}
                      className="btn-secondary-heritage p-2 text-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleAccept(invite.id)}
                      className="btn-primary-heritage px-4 py-2"
                    >
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
          <div className="card-heritage p-0 overflow-hidden">
            <div className="border-b border-outline-variant bg-surface p-6">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-gold" /> A Minha Família
              </h3>
            </div>
            <div className="divide-y divide-outline-variant">
              {currentFamilyMembers.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <p>Ainda não tens familiares associados.</p>
                </div>
              ) : (
                currentFamilyMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-6 hover:bg-slate-50">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-slate-100 flex items-center justify-center text-gold font-bold">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
                        ) : (
                          member.name.substring(0, 1)
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{member.name} {member.personId === user?.id && '(Tu)'}</p>
                        <p className="text-sm text-slate-500">
                          {member.status === 'PENDING' ? 'Convite Pendente' : member.relationship}
                        </p>
                      </div>
                    </div>
                    <div>
                      {member.status === 'PENDING' && (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                          A Aguardar
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Invite new members */}
        <div className="space-y-6">
          <div className="card-heritage p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Convidar Familiar</h3>
            <p className="text-sm text-slate-500 mb-4">
              Pesquise pelo nome ou e-mail de outro membro da igreja. Ele terá de aceitar o convite.
            </p>
            
            <div className="relative mb-6">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Pesquisar pessoa..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="input-heritage pl-10 w-full"
              />
            </div>

            {searchTerm.trim().length > 0 && searchTerm.trim().length < 2 && (
              <p className="text-sm text-slate-500 text-center py-4">Digite pelo menos 2 caracteres.</p>
            )}

            {searchTerm.trim().length >= 2 && (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {isSearching ? (
                  <p className="text-sm text-slate-500 text-center py-4">A pesquisar membros...</p>
                ) : hasSearched && searchResults.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">Nenhum membro encontrado.</p>
                ) : (
                  searchResults.map(p => (
                    <div key={p.id} className="flex items-center justify-between rounded border border-outline-variant p-3 hover:border-gold transition-colors">
                      <div className="flex min-w-0 items-center gap-3 pr-2">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gold/10 text-xs font-bold text-gold">
                          {p.avatarUrl ? (
                            <img src={p.avatarUrl} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            p.name.substring(0, 1)
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                          <p className="text-xs text-slate-500 truncate">{p.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleInvite(p.id)}
                        disabled={isInviting}
                        className="btn-primary-heritage px-3 py-1.5 text-xs flex-shrink-0 flex items-center gap-1"
                      >
                        <UserPlus className="h-3 w-3" />
                        Convidar
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
