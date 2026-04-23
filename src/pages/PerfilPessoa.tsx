import React from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Mail, MapPin, Phone } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { getInitials } from '../lib/domain';

export default function PerfilPessoa() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { discipleshipPairs, followUps, getCellByMemberId, getPersonById } = useData();
  const person = id ? getPersonById(id) : undefined;

  if (!person) {
    return (
      <div className="p-8">
        <div className="card-heritage p-12 text-center text-sm text-slate-400">Pessoa não encontrada.</div>
      </div>
    );
  }

  const cell = getCellByMemberId(person.id);
  const personPairs = discipleshipPairs.filter((pair) => pair.discipleId === person.id || pair.mentorId === person.id);
  const personFollowUps = followUps.filter((item) => item.personId === person.id);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 p-8">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/pessoas')} className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">{person.name}</h2>
          <p className="font-medium text-slate-500">Perfil real derivado dos dados da plataforma.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-4">
          <div className="card-heritage p-8 text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gold/10 text-2xl font-bold text-gold">
              {getInitials(person.name)}
            </div>
            <h3 className="text-2xl font-bold text-slate-900">{person.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{person.role}</p>
            <div className="mt-4 flex justify-center gap-2">
              <span className="badge-heritage bg-green-100 text-green-700">{person.status}</span>
              <span className="badge-heritage bg-slate-100 text-slate-700">{person.campus}</span>
            </div>
          </div>

          <div className="card-heritage space-y-4 p-6">
            <h3 className="text-lg font-bold text-slate-900">Contacto</h3>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Mail className="h-4 w-4 text-slate-400" />
              <span>{person.email || 'Sem email'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Phone className="h-4 w-4 text-slate-400" />
              <span>{person.phone || 'Sem telefone'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span>{cell?.location ?? person.campus}</span>
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-8">
          <div className="card-heritage p-6">
            <h3 className="mb-5 text-lg font-bold text-slate-900">Contexto atual</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-outline-variant bg-surface-container-high p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Célula</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">{cell?.name ?? 'Sem célula'}</p>
              </div>
              <div className="rounded-lg border border-outline-variant bg-surface-container-high p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Discipulado</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">{personPairs.length} pares</p>
              </div>
              <div className="rounded-lg border border-outline-variant bg-surface-container-high p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Acompanhamento</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">{personFollowUps.length} registos</p>
              </div>
            </div>
          </div>

          <div className="card-heritage p-6">
            <div className="mb-5 flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gold" />
              <h3 className="text-lg font-bold text-slate-900">Timeline pastoral</h3>
            </div>

            <div className="space-y-3">
              {personFollowUps.length === 0 && personPairs.length === 0 ? (
                <p className="text-sm text-slate-400">Sem histórico registado até ao momento.</p>
              ) : (
                <>
                  {personFollowUps.map((item) => (
                    <div key={item.id} className="rounded-lg border border-outline-variant bg-surface-container-high p-4">
                      <p className="text-sm font-bold text-slate-800">{item.type}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.date} · {item.notes}</p>
                    </div>
                  ))}
                  {personPairs.map((pair) => (
                    <div key={pair.id} className="rounded-lg border border-outline-variant bg-surface-container-high p-4">
                      <p className="text-sm font-bold text-slate-800">Discipulado · {pair.course}</p>
                      <p className="mt-1 text-xs text-slate-500">Progresso: {pair.progress}% · Último encontro: {pair.lastMeeting}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
