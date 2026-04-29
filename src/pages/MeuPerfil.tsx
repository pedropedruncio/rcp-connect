import React from 'react';
import { motion } from 'motion/react';
import {
  BookOpen,
  Calendar,
  Heart,
  Mail,
  MapPin,
  Network,
  Phone,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { apiRequest } from '../lib/api';
import { formatDateLabel, getInitials } from '../lib/domain';
import ProfileEditModal from '../components/ProfileEditModal';
import PrayerRequestModal from '../components/PrayerRequestModal';
import Toast from '../components/ui/Toast';
import { buildGoogleMapsSearchUrl } from '../lib/address';

export default function MeuPerfil() {
  const { user } = useAuth();
  const {
    discipleshipPairs,
    followUps,
    getCellByMemberId,
    getPersonById,
    isLoading,
    addFollowUp,
    persons,
    updatePerson,
  } = useData();
  const [isEditModalOpen, setEditModalOpen] = React.useState(false);
  const [isPrayerModalOpen, setPrayerModalOpen] = React.useState(false);
  const [toast, setToast] = React.useState<{ show: boolean; msg: string; type?: 'success' | 'error' | 'info' }>({
    show: false,
    msg: '',
  });

  if (!user) return null;

  const person = getPersonById(user.id);
  const mapsUrl = buildGoogleMapsSearchUrl(person?.address);
  const cell = getCellByMemberId(user.id);
  const cellLeader = cell ? getPersonById(cell.leaderId) : undefined;
  const mentorPair = discipleshipPairs.find((pair) => pair.discipleId === user.id);
  const mentor = mentorPair ? getPersonById(mentorPair.mentorId) : undefined;
  const myFollowUps = followUps.filter((item) => item.personId === user.id);

  const primaryResponsible =
    persons.find((item) => item.role === 'Pastor') ||
    persons.find((item) => item.role === 'Discipulador') ||
    cellLeader;

  const handlePrayerRequest = async (data: { request: string; isPrivate: boolean }) => {
    if (!primaryResponsible) {
      setToast({
        show: true,
        msg: 'Ainda não existe um responsável elegível para receber este pedido.',
        type: 'error',
      });
      return;
    }

    try {
      await addFollowUp({
        personId: user.id,
        responsibleId: primaryResponsible.id,
        type: 'Mensagem',
        priority: data.isPrivate ? 'Alta' : 'Média',
        status: 'Pendente',
        notes: data.request,
        date: new Date().toISOString().slice(0, 10),
        cellId: cell?.id ?? null,
      });

      setToast({
        show: true,
        msg: 'Pedido de oração registado e encaminhado para acompanhamento.',
        type: 'success',
      });
    } catch (error: any) {
      setToast({
        show: true,
        msg: error?.message ?? 'Não foi possível registar o pedido de oração.',
        type: 'error',
      });
    }
  };

  const avatarUrl = person?.avatarUrl ?? user.avatarUrl ?? null;

  const handleProfileUpdate = async (data: { phone: string; address: string; avatarImage?: string }) => {
    if (!person) return;

    try {
      let uploadedAvatarUrl: string | undefined;

      if (data.avatarImage) {
        const uploadResult = await apiRequest<{ avatarUrl: string }>('/profile/avatar', {
          method: 'POST',
          body: JSON.stringify({ image: data.avatarImage }),
        });
        uploadedAvatarUrl = uploadResult.avatarUrl;
      }

      await updatePerson(user.id, {
        phone: data.phone,
        address: data.address,
        ...(uploadedAvatarUrl ? { avatarUrl: uploadedAvatarUrl } : {}),
      });
      setToast({ show: true, msg: 'Os seus dados foram atualizados com sucesso.', type: 'success' });
    } catch (error: any) {
      setToast({
        show: true,
        msg: error?.message ?? 'Não foi possível atualizar os seus dados.',
        type: 'error',
      });
      throw error;
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 p-8">
      <ProfileEditModal
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        person={person}
        onSave={handleProfileUpdate}
      />

      <PrayerRequestModal
        isOpen={isPrayerModalOpen}
        onClose={() => setPrayerModalOpen(false)}
        onSubmit={handlePrayerRequest}
      />

      <Toast
        isVisible={toast.show}
        message={toast.msg}
        type={toast.type}
        onClose={() => setToast((current) => ({ ...current, show: false }))}
      />

      <div>
        <h2 className="text-4xl font-bold tracking-tight text-slate-900">Meu Perfil</h2>
        <p className="font-medium text-slate-500">As suas informações, célula, discipulado e acompanhamento atual.</p>
      </div>

      {isLoading ? (
        <div className="card-heritage p-12 text-center text-slate-500">A carregar o seu perfil...</div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-4">
            <div className="card-heritage flex flex-col items-center p-8 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gold/10 text-2xl font-bold text-gold shadow-md">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={person?.name ?? user.name} className="h-full w-full object-cover" />
                ) : (
                  getInitials(person?.name ?? user.name)
                )}
              </div>
              <h3 className="text-xl font-bold text-slate-900">{person?.name ?? user.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{person?.role ?? 'Membro'}</p>
              <span className="badge-heritage mt-3 bg-green-100 text-green-700">{person?.status ?? 'MEMBRO'}</span>

              <div className="mt-6 flex w-full flex-col gap-2">
                <button onClick={() => setEditModalOpen(true)} className="btn-secondary-heritage w-full py-2 text-xs">
                  Atualizar dados pessoais
                </button>
                <button onClick={() => setPrayerModalOpen(true)} className="btn-primary-heritage w-full py-2 text-xs">
                  Pedir oração
                </button>
              </div>
            </div>

            <div className="card-heritage space-y-4 p-6">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Informações pessoais</h4>
              {[
                { icon: Mail, label: 'Email', value: person?.email || user.email },
                { icon: Phone, label: 'Telefone', value: person?.phone || '—' },
                { 
                  icon: MapPin, 
                  label: 'Morada', 
                  value: (
                    <div className="flex flex-col gap-1">
                      <span>{person?.address || '—'}</span>
                      {mapsUrl && (
                        <a 
                          href={mapsUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[10px] font-bold uppercase tracking-wider text-gold hover:underline"
                        >
                          Ver no Google Maps
                        </a>
                      )}
                    </div>
                  )
                },
                { icon: MapPin, label: 'Campus', value: person?.campus || user.campus },
                { icon: Calendar, label: 'Membro desde', value: person?.since || '—' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
                    <div className="text-sm font-medium text-slate-700">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6 lg:col-span-8">
            <div className="card-heritage p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-gold/10 p-2.5">
                  <Network className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{cell ? cell.name : 'Sem célula atribuída'}</h3>
                  {cell && <p className="text-xs text-slate-400">{cell.day}, {cell.time} · {cell.location}</p>}
                </div>
              </div>

              {cell ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-lg bg-surface-container-high p-4">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Líder</p>
                    <p className="text-sm font-bold text-slate-800">{cellLeader?.name ?? '—'}</p>
                    <p className="mt-1 text-xs text-slate-500">{cell.memberIds.length} pessoas na célula</p>
                  </div>
                  <div className="rounded-lg bg-surface-container-high p-4">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Saúde</p>
                    <p className="text-sm font-bold text-slate-800">{cell.health}</p>
                    <p className="mt-1 text-xs text-slate-500">Último registo: {cell.lastMeeting}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm italic text-slate-400">Ainda não está atribuído a nenhuma célula.</p>
              )}
            </div>

            <div className="card-heritage p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2.5">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Caminho de discipulado</h3>
                  <p className="text-xs text-slate-400">{mentor ? `Mentor: ${mentor.name}` : 'Sem mentor atribuído'}</p>
                </div>
              </div>

              {mentorPair ? (
                <div className="space-y-4">
                  <div>
                    <div className="mb-1.5 flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <span>{mentorPair.course}</span>
                      <span>{mentorPair.progress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gold" style={{ width: `${mentorPair.progress}%` }} />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">Último encontro: {mentorPair.lastMeeting}</p>
                </div>
              ) : (
                <p className="text-sm italic text-slate-400">Ainda não tem um percurso de discipulado atribuído.</p>
              )}
            </div>

            <div className="card-heritage p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-lg bg-red-50 p-2.5">
                  <Heart className="h-5 w-5 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Acompanhamento pastoral</h3>
              </div>

              {myFollowUps.length === 0 ? (
                <p className="text-sm italic text-slate-400">Sem acompanhamentos ativos neste momento.</p>
              ) : (
                <div className="space-y-3">
                  {myFollowUps.map((item) => (
                    <div key={item.id} className="rounded-lg border border-outline-variant bg-surface-container-high p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{item.type}</p>
                          <p className="text-xs text-slate-500">
                            {formatDateLabel(item.date)} · {item.notes}
                          </p>
                        </div>
                        <span className="badge-heritage bg-amber-100 text-amber-700">{item.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
