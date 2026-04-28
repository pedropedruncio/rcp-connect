import type { Role } from '../contexts/AuthContext';
import type {
  AppSetting,
  Campus,
  CellGroup,
  DiscipleshipPair,
  EventItem,
  Family,
  FamilyMember,
  FollowUp,
  Ministry,
  NotificationPreference,
  Person,
  PersonRole,
  PersonStatus,
  RoleRecord,
  Schedule,
  UserRecord,
} from '../types/domain';

export const PERSON_STATUS_OPTIONS: PersonStatus[] = ['VISITANTE', 'BATIZADO', 'MEMBRO', 'INATIVO'];

export const PERSON_ROLE_LABELS: Record<Role, PersonRole> = {
  MEMBER: 'Membro',
  LEADER: 'Líder de Célula',
  DISCIPLER: 'Discipulador',
  PASTOR: 'Pastor',
  ADMIN: 'Administrador',
};

export function getPersonRoleLabel(role: Role | null | undefined): PersonRole {
  return role ? PERSON_ROLE_LABELS[role] : 'Frequentador';
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function formatDateLabel(date: string | null | undefined): string {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getUpcomingStatus(date: string): EventItem['status'] {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return 'Planeamento';
  }

  const now = Date.now();
  if (parsed.getTime() < now) return 'Concluído';
  return 'Confirmado';
}

export function ensureTimeValue(value: string | null | undefined, fallback = '20:00'): string {
  if (!value) return fallback;
  if (/^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
  return fallback;
}

export function isMissingSchemaError(message?: string | null): boolean {
  if (!message) return false;
  return (
    message.includes('schema cache') ||
    message.includes('does not exist') ||
    message.includes('Could not find the table')
  );
}

export interface DomainState {
  campuses: Campus[];
  roles: RoleRecord[];
  users: UserRecord[];
  persons: Person[];
  cells: CellGroup[];
  discipleshipPairs: DiscipleshipPair[];
  followUps: FollowUp[];
  families: Family[];
  familyMembers: FamilyMember[];
  ministries: Ministry[];
  events: EventItem[];
  schedules: Schedule[];
  preferences: NotificationPreference[];
  settings: AppSetting[];
}
