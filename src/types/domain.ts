import type { Role } from '../contexts/AuthContext';

export type PersonStatus = 'MEMBRO' | 'VISITANTE' | 'BATIZADO' | 'INATIVO';

export type PersonRole =
  | 'Membro'
  | 'Frequentador'
  | 'Líder de Célula'
  | 'Líder em Formação'
  | 'Discipulador'
  | 'Pastor'
  | 'Administrador';

export type CellHealth = 'EXCELENTE' | 'ESTÁVEL' | 'ATENÇÃO';
export type FollowUpType = 'Visita' | 'Chamada' | 'Mensagem';
export type FollowUpStatus = 'Pendente' | 'Agendado' | 'Concluído';
export type FollowUpPriority = 'Alta' | 'Média' | 'Baixa';

export interface Campus {
  id: string;
  name: string;
  createdAt?: string;
}

export interface RoleRecord {
  id: string;
  name: Role;
  description?: string | null;
  createdAt?: string;
}

export interface UserRecord {
  id: string;
  email: string;
  personId: string;
  roleId: string;
  supabaseId: string;
  createdAt?: string;
}

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  status: PersonStatus;
  campusId: string | null;
  campus: string;
  role: PersonRole;
  cellId: string | null;
  since: string;
  address?: string;
  birthdate?: string;
  notes?: string;
  avatarUrl?: string | null;
}

export interface CellGroup {
  id: string;
  name: string;
  leaderId: string;
  disciplerId: string | null;
  memberIds: string[];
  traineeLeaderIds: string[];
  day: string;
  time: string;
  location: string;
  campusId: string | null;
  campus: string;
  health: CellHealth;
  lastMeeting: string;
  growth: number;
}

export interface DiscipleshipPair {
  id: string;
  mentorId: string;
  discipleId: string;
  course: string;
  progress: number;
  lastMeeting: string;
  startDate: string;
}

export interface FollowUp {
  id: string;
  personId: string;
  responsibleId: string;
  cellId: string | null;
  type: FollowUpType;
  date: string;
  status: FollowUpStatus;
  priority: FollowUpPriority;
  notes: string;
}

export interface Family {
  id: string;
  name: string;
  campusId: string | null;
  campus: string;
  notes: string;
  memberIds: string[];
}

export interface Ministry {
  id: string;
  name: string;
  description: string;
  leaderId: string | null;
  campusId: string | null;
  campus: string;
  status: 'ATIVO' | 'PAUSADO';
  memberIds: string[];
}

export interface EventItem {
  id: string;
  name: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: string;
  campusId: string | null;
  campus: string;
  status: 'Planeamento' | 'Confirmado' | 'Concluído';
  attendeeIds: string[];
}

export interface Schedule {
  id: string;
  ministryId: string | null;
  title: string;
  date: string;
  time: string;
  status: 'Completo' | 'Incompleto' | 'Planeamento';
  volunteerIds: string[];
}

export interface NotificationPreference {
  id?: string;
  personId: string;
  pushEnabled: boolean;
  emailDigestEnabled: boolean;
  smsEnabled: boolean;
}

export interface AppSetting {
  id: string;
  settingKey: string;
  settingValue: string;
  scope: string;
}

export type PersonInput = Omit<Person, 'id' | 'name' | 'campus' | 'role'> & {
  id?: string;
  role: Role;
};

export type CellInput = Omit<CellGroup, 'id' | 'campus' | 'memberIds' | 'traineeLeaderIds' | 'disciplerId' | 'lastMeeting' | 'growth'> & {
  id?: string;
};

export type DiscipleshipPairInput = Omit<DiscipleshipPair, 'id'> & {
  id?: string;
};

export type FollowUpInput = Omit<FollowUp, 'id'> & {
  id?: string;
};

export type FamilyInput = Omit<Family, 'id' | 'campus' | 'memberIds'> & {
  id?: string;
  memberIds?: string[];
};

export type MinistryInput = Omit<Ministry, 'id' | 'campus' | 'memberIds'> & {
  id?: string;
  memberIds?: string[];
};

export type EventInput = Omit<EventItem, 'id' | 'campus' | 'attendeeIds'> & {
  id?: string;
  attendeeIds?: string[];
};

export type ScheduleInput = Omit<Schedule, 'id' | 'volunteerIds'> & {
  id?: string;
  volunteerIds?: string[];
};
