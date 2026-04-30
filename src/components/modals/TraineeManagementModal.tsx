import React, { useState } from 'react';
import { Check, Plus, Users } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { ModalShell } from '../ui/ModalShell';
import type { CellGroup } from '../../types/domain';

interface TraineeManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  cell: CellGroup;
}

export default function TraineeManagementModal({ isOpen, onClose, cell }: TraineeManagementModalProps) {
  const { persons, updateCell } = useData();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cellMembers = persons.filter(p => p.cellId === cell.id);
  const traineeIds = cell.traineeLeaderIds || [];

  const handleToggleTrainee = async (personId: string) => {
    setIsSubmitting(true);
    try {
      const newTrainees = traineeIds.includes(personId)
        ? traineeIds.filter(id => id !== personId)
        : [...traineeIds, personId];

      await updateCell(cell.id, { traineeLeaderIds: newTrainees });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Gerir líderes em treino"
      description="Selecione os membros em formação de liderança nesta célula."
      icon={<Users className="h-5 w-5" />}
      size="md"
      zIndexClassName="z-[110]"
      footer={(
        <div className="modal-footer-actions">
          <button type="button" onClick={onClose} className="btn-secondary-heritage">
            Fechar
          </button>
        </div>
      )}
    >
      <section className="modal-section">
        <div className="space-y-2">
          {cellMembers.length === 0 ? (
            <p className="py-8 text-center text-sm italic text-slate-400">Nenhum membro encontrado nesta célula.</p>
          ) : (
            cellMembers.map(member => {
              const isTrainee = traineeIds.includes(member.id);
              return (
                <button
                  key={member.id}
                  disabled={isSubmitting}
                  onClick={() => handleToggleTrainee(member.id)}
                  className={`flex w-full items-center justify-between rounded-md border p-3 text-left transition-all disabled:opacity-60 ${
                    isTrainee
                      ? 'border-gold bg-gold/5 text-gold'
                      : 'border-outline-variant bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isTrainee ? 'bg-gold text-white' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {member.name.split(' ').map(name => name[0]).slice(0, 2).join('')}
                    </span>
                    <span className="truncate text-sm font-bold">{member.name}</span>
                  </span>
                  {isTrainee ? <Check className="h-4 w-4 text-gold" /> : <Plus className="h-4 w-4 text-slate-300" />}
                </button>
              );
            })
          )}
        </div>
      </section>
    </ModalShell>
  );
}
