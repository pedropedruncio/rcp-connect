import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth, type Role } from './AuthContext';
import { apiRequest } from '../lib/api';
import {
  ensureTimeValue,
  getPersonRoleLabel,
  getUpcomingStatus,
  type DomainState,
} from '../lib/domain';
import type {
  AppSetting,
  Campus,
  CellGroup,
  CellInput,
  DiscipleshipPair,
  DiscipleshipPairInput,
  EventInput,
  EventItem,
  Family,
  FamilyInput,
  FollowUp,
  FollowUpInput,
  Ministry,
  MinistryInput,
  NotificationPreference,
  Person,
  PersonInput,
  RoleRecord,
  Schedule,
  ScheduleInput,
  UserRecord,
  SystemNotification,
} from '../types/domain';

interface SchemaCapabilities {
  familyMembers: boolean;
  ministryMembers: boolean;
  eventRegistrations: boolean;
  scheduleAssignments: boolean;
  notificationPreferences: boolean;
  appSettings: boolean;
}

interface DataContextType extends DomainState {
  isLoading: boolean;
  error: string | null;
  supports: SchemaCapabilities;
  refetch: () => Promise<void>;
  getPersonById: (id: string) => Person | undefined;
  getCellById: (id: string) => CellGroup | undefined;
  getCellByMemberId: (personId: string) => CellGroup | undefined;
  getCellByLeaderId: (leaderId: string) => CellGroup | undefined;
  addPerson: (person: PersonInput) => Promise<void>;
  updatePerson: (id: string, data: Partial<PersonInput>) => Promise<void>;
  addCell: (cell: CellInput) => Promise<void>;
  updateCell: (id: string, data: Partial<CellInput>) => Promise<void>;
  addDiscipleshipPair: (pair: DiscipleshipPairInput) => Promise<void>;
  updateDiscipleshipPair: (id: string, data: Partial<DiscipleshipPairInput>) => Promise<void>;
  addFollowUp: (followUp: FollowUpInput) => Promise<void>;
  updateFollowUp: (id: string, data: Partial<FollowUpInput>) => Promise<void>;
  addFamily: (family: FamilyInput) => Promise<void>;
  updateFamily: (id: string, data: Partial<FamilyInput>) => Promise<void>;
  addMinistry: (ministry: MinistryInput) => Promise<void>;
  updateMinistry: (id: string, data: Partial<MinistryInput>) => Promise<void>;
  addEvent: (event: EventInput) => Promise<void>;
  updateEvent: (id: string, data: Partial<EventInput>) => Promise<void>;
  addSchedule: (schedule: ScheduleInput) => Promise<void>;
  updateSchedule: (id: string, data: Partial<ScheduleInput>) => Promise<void>;
  saveNotificationPreference: (preference: NotificationPreference) => Promise<void>;
  inviteFamilyMember: (targetPersonId: string, relationship: string, familyId?: string) => Promise<void>;
  acceptFamilyInvitation: (memberId: string) => Promise<void>;
  rejectFamilyInvitation: (memberId: string) => Promise<void>;
  addPrayerRequest: (request: any) => Promise<void>;
  updatePrayerRequest: (id: string, data: any) => Promise<void>;
  deletePrayerRequest: (id: string) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  addDiscipleshipJournal: (pairId: string, content: string) => Promise<void>;
}

type PersonRow = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  birthdate: string | null;
  baptismDate: string | null;
  notes: string | null;
  avatarUrl: string | null;
  status: Person['status'] | null;
  campusId: string | null;
  cellGroupId: string | null;
};

type UserRow = UserRecord;
type CampusRow = Campus;
type RoleRow = RoleRecord;
type CellRow = {
  id: string;
  name: string;
  leaderId: string;
  day: string | null;
  time: string | null;
  location: string | null;
  campusId: string | null;
  health: CellGroup['health'] | null;
  traineeLeaderIds: string[] | null;
};

type PairRow = {
  id: string;
  mentorId: string;
  discipleId: string;
  course: string | null;
  progress: number | null;
  lastMeeting: string | null;
  startDate: string | null;
};

type FollowUpRow = {
  id: string;
  personId: string;
  responsibleId: string;
  type: FollowUp['type'] | null;
  date: string | null;
  status: FollowUp['status'] | null;
  priority: FollowUp['priority'] | null;
  notes: string | null;
};

type FamilyRow = {
  id: string;
  name: string;
};

type FamilyMemberRow = {
  id: string;
  familyId: string;
  personId: string;
  relationship: string;
  isPrimaryContact: boolean;
  status: 'ACCEPTED' | 'PENDING' | 'REJECTED';
};

type MinistryRow = {
  id: string;
  name: string;
  description: string | null;
};

type EventRow = {
  id: string;
  name: string;
  description: string | null;
  date: string | null;
  time: string | null;
  location: string | null;
  category: string | null;
  campusId: string | null;
  status: EventItem['status'] | null;
};

type ScheduleRow = {
  id: string;
  ministryId: string | null;
  date: string | null;
  time: string | null;
  status: string | null;
};

type NotificationPreferenceRow = {
  id: string;
  personId: string;
  pushEnabled: boolean | null;
  emailDigestEnabled: boolean | null;
  smsEnabled: boolean | null;
};

type PrayerRequestRow = {
  id: string;
  personId: string;
  request: string;
  status: 'PENDING' | 'ANSWERED';
  createdAt: string;
};

type SystemNotificationRow = {
  id: string;
  type: string;
  content: any;
  readBy: string[] | null;
  createdAt: string;
};

type DiscipleshipJournalRow = {
  id: string;
  pairId: string;
  authorId: string;
  content: string;
  createdAt: string;
};

const EMPTY_STATE: DomainState = {
  campuses: [],
  roles: [],
  users: [],
  persons: [],
  cells: [],
  discipleshipPairs: [],
  followUps: [],
  families: [],
  familyMembers: [],
  ministries: [],
  events: [],
  schedules: [],
  preferences: [],
  settings: [],
  prayerRequests: [],
  notifications: [],
  discipleshipJournals: [],
};

const DEFAULT_SUPPORTS: SchemaCapabilities = {
  familyMembers: false,
  ministryMembers: false,
  eventRegistrations: false,
  scheduleAssignments: false,
  notificationPreferences: false,
  appSettings: false,
};

const DataContext = createContext<DataContextType | undefined>(undefined);

interface DataApiResponse {
  supports: SchemaCapabilities;
  campuses: CampusRow[];
  roles: RoleRow[];
  users: UserRow[];
  persons: PersonRow[];
  cells: CellRow[];
  discipleshipPairs: PairRow[];
  followUps: FollowUpRow[];
  families: FamilyRow[];
  familyMembers: FamilyMemberRow[];
  ministries: MinistryRow[];
  events: EventRow[];
  schedules: ScheduleRow[];
  preferences: NotificationPreferenceRow[];
  settings: AppSetting[];
  prayerRequests: PrayerRequestRow[];
  notifications: SystemNotificationRow[];
  discipleshipJournals: DiscipleshipJournalRow[];
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? 'Novo',
    lastName: parts.slice(1).join(' ') || null,
  };
}

function inferPersonRole(personId: string, userRole: Role | undefined, cells: CellRow[], pairs: PairRow[], personStatus: Person['status']): Person['role'] {
  if (userRole) return getPersonRoleLabel(userRole);
  if (cells.some((cell) => cell.leaderId === personId)) return 'Líder de Célula';
  if (pairs.some((pair) => pair.mentorId === personId)) return 'Discipulador';
  if (personStatus === 'VISITANTE') return 'Frequentador';
  return 'Membro';
}

function mapDomainState(
  campuses: CampusRow[],
  roles: RoleRow[],
  users: UserRow[],
  personRows: PersonRow[],
  cellRows: CellRow[],
  pairRows: PairRow[],
  followUpRows: FollowUpRow[],
  familyRows: FamilyRow[],
  familyMemberRows: FamilyMemberRow[],
  ministryRows: MinistryRow[],
  eventRows: EventRow[],
  scheduleRows: ScheduleRow[],
  preferenceRows: NotificationPreferenceRow[],
  settings: AppSetting[],
  prayerRequestRows: PrayerRequestRow[],
  notificationRows: SystemNotificationRow[],
  discipleshipJournalRows: DiscipleshipJournalRow[],
): DomainState {
  const campusMap = new Map(campuses.map((campus) => [campus.id, campus.name]));
  const roleMap = new Map(roles.map((role) => [role.id, role.name]));
  const userByPersonId = new Map(users.map((row) => [row.personId, row]));

  const persons: Person[] = personRows.map((row) => {
    const matchingUser = userByPersonId.get(row.id);
    const roleName = matchingUser ? roleMap.get(matchingUser.roleId) : undefined;
    const status = row.status ?? 'VISITANTE';
    const firstName = row.firstName?.trim() || 'Sem';
    const lastName = row.lastName?.trim() || '';
    const name = `${firstName} ${lastName}`.trim();

    return {
      id: row.id,
      firstName,
      lastName,
      name,
      email: row.email ?? '',
      phone: row.phone ?? '',
      status,
      campusId: row.campusId,
      campus: row.campusId ? campusMap.get(row.campusId) ?? 'Sem campus' : 'Sem campus',
      role: inferPersonRole(row.id, roleName, cellRows, pairRows, status),
      cellId: row.cellGroupId,
      since: new Date().getFullYear().toString(),
      address: row.address ?? '',
      birthdate: row.birthdate ?? '',
      baptismDate: row.baptismDate ?? '',
      notes: row.notes ?? '',
      avatarUrl: row.avatarUrl ?? null,
    };
  });

  const personsById = new Map(persons.map((person) => [person.id, person]));
  const disciplerByCampus = new Map(
    persons
      .filter((person) => person.role === 'Discipulador')
      .map((person) => [person.campusId ?? 'none', person.id]),
  );

  const cells: CellGroup[] = cellRows.map((row) => {
    const memberIds = persons.filter((person) => person.cellId === row.id).map((person) => person.id);
    const traineeLeaderIds = row.traineeLeaderIds ?? [];

    return {
      id: row.id,
      name: row.name,
      leaderId: row.leaderId,
      disciplerId: disciplerByCampus.get(row.campusId ?? 'none') ?? null,
      memberIds,
      traineeLeaderIds,
      day: row.day ?? 'Quinta-feira',
      time: ensureTimeValue(row.time),
      location: row.location ?? 'A definir',
      campusId: row.campusId,
      campus: row.campusId ? campusMap.get(row.campusId) ?? 'Sem campus' : 'Sem campus',
      health: row.health ?? 'ESTÁVEL',
      lastMeeting: `${row.day ?? 'Quinta-feira'}, ${ensureTimeValue(row.time)}`,
      growth: memberIds.length,
    };
  });

  const families: Family[] = familyRows.map((row) => ({
    id: row.id,
    name: row.name,
    campusId: null,
    campus: 'Sem campus',
    notes: '',
    memberIds: familyMemberRows.filter(m => m.familyId === row.id && m.status === 'ACCEPTED').map(m => m.personId),
  }));

  const familyMembers = familyMemberRows.map((row) => ({
    id: row.id,
    familyId: row.familyId,
    personId: row.personId,
    relationship: row.relationship ?? 'Membro',
    isPrimaryContact: row.isPrimaryContact ?? false,
    status: row.status ?? 'PENDING',
  }));

  const ministries: Ministry[] = ministryRows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    leaderId: null,
    campusId: null,
    campus: 'Sem campus',
    status: 'ATIVO',
    memberIds: [],
  }));

  const events: EventItem[] = eventRows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    date: row.date ?? new Date().toISOString().slice(0, 10),
    time: ensureTimeValue(row.time, '19:00'),
    location: row.location || (row.campusId ? campusMap.get(row.campusId) ?? 'Campus' : 'Campus'),
    category: row.category ?? 'Igreja',
    campusId: row.campusId,
    campus: row.campusId ? campusMap.get(row.campusId) ?? 'Sem campus' : 'Sem campus',
    status: row.status ?? getUpcomingStatus(row.date ?? ''),
    attendeeIds: [],
  }));

  const schedules: Schedule[] = scheduleRows.map((row) => {
    const ministry = ministries.find((item) => item.id === row.ministryId);

    return {
      id: row.id,
      ministryId: row.ministryId,
      title: ministry ? `Escala ${ministry.name}` : 'Escala',
      date: row.date ?? new Date().toISOString().slice(0, 10),
      time: ensureTimeValue(row.time, '09:00'),
      status:
        row.status === 'Completo' || row.status === 'Incompleto' || row.status === 'Planeamento'
          ? row.status
          : 'Planeamento',
      volunteerIds: [],
    };
  });

  const followUps: FollowUp[] = followUpRows.map((row) => ({
    id: row.id,
    personId: row.personId,
    responsibleId: row.responsibleId,
    cellId: personsById.get(row.personId)?.cellId ?? null,
    type: row.type ?? 'Visita',
    date: row.date ?? '',
    status: row.status ?? 'Pendente',
    priority: row.priority ?? 'Média',
    notes: row.notes ?? '',
  }));

  const discipleshipPairs: DiscipleshipPair[] = pairRows.map((row) => ({
    id: row.id,
    mentorId: row.mentorId,
    discipleId: row.discipleId,
    course: row.course ?? 'Fundamentos da Fé',
    progress: Number.isFinite(row.progress) ? row.progress ?? 0 : 0,
    lastMeeting: row.lastMeeting ?? 'Sem registo',
    startDate: row.startDate ?? new Date().toISOString().slice(0, 10),
  }));

  const preferences: NotificationPreference[] = preferenceRows.map((row) => ({
    id: row.id,
    personId: row.personId,
    pushEnabled: row.pushEnabled ?? true,
    emailDigestEnabled: row.emailDigestEnabled ?? false,
    smsEnabled: row.smsEnabled ?? false,
  }));

  const prayerRequests: any[] = prayerRequestRows.map((row) => ({
    id: row.id,
    personId: row.personId,
    request: row.request,
    status: row.status,
    createdAt: row.createdAt,
  }));

  const notifications: SystemNotification[] = notificationRows.map((row) => ({
    id: row.id,
    type: row.type,
    content: row.content,
    readBy: row.readBy ?? [],
    createdAt: row.createdAt,
  }));

  return {
    campuses,
    roles,
    users,
    persons,
    cells,
    discipleshipPairs,
    followUps,
    families,
    familyMembers,
    ministries,
    events,
    schedules,
    preferences,
    settings,
    prayerRequests,
    notifications,
    discipleshipJournals: discipleshipJournalRows,
  };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { session, user } = useAuth();
  const [state, setState] = useState<DomainState>(EMPTY_STATE);
  const [supports, setSupports] = useState<SchemaCapabilities>(DEFAULT_SUPPORTS);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!session?.user) {
      setState(EMPTY_STATE);
      setSupports(DEFAULT_SUPPORTS);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest<DataApiResponse>('/data');

      setSupports(data.supports);

      setState(
        mapDomainState(
          data.campuses,
          data.roles,
          data.users,
          data.persons,
          data.cells,
          data.discipleshipPairs,
          data.followUps,
          data.families,
          data.familyMembers || [],
          data.ministries,
          data.events,
          data.schedules,
          data.preferences,
          data.settings,
          data.prayerRequests || [],
          data.notifications || [],
          data.discipleshipJournals || [],
        ),
      );
    } catch (currentError: any) {
      console.error('Erro ao carregar dados da aplicação:', currentError);
      setState(EMPTY_STATE);
      setError(currentError?.message ?? 'Não foi possível carregar os dados da aplicação.');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const getPersonById = useCallback(
    (id: string) => state.persons.find((person) => person.id === id),
    [state.persons],
  );

  const getCellById = useCallback(
    (id: string) => state.cells.find((cell) => cell.id === id),
    [state.cells],
  );

  const getCellByMemberId = useCallback(
    (personId: string) => state.cells.find((cell) => cell.memberIds.includes(personId)),
    [state.cells],
  );

  const getCellByLeaderId = useCallback(
    (leaderId: string) => state.cells.find((cell) => cell.leaderId === leaderId),
    [state.cells],
  );

  const persistPerson = useCallback(
    async (id: string | undefined, data: Partial<PersonInput>) => {
      const existing = id ? getPersonById(id) : undefined;
      const roleName = data.role;
      const mergedName = data.firstName || data.lastName
        ? `${data.firstName ?? existing?.firstName ?? ''} ${data.lastName ?? existing?.lastName ?? ''}`.trim()
        : existing?.name ?? '';
      const { firstName, lastName } = mergedName ? splitName(mergedName) : {
        firstName: data.firstName ?? existing?.firstName ?? 'Novo',
        lastName: data.lastName ?? existing?.lastName ?? null,
      };

      const payload = {
        id: id ?? `per_${crypto.randomUUID()}`,
        firstName,
        lastName,
        email: data.email ?? existing?.email ?? null,
        phone: data.phone ?? existing?.phone ?? null,
        address: data.address ?? existing?.address ?? null,
        birthdate: data.birthdate ?? existing?.birthdate ?? null,
        baptismDate: data.baptismDate ?? existing?.baptismDate ?? null,
        notes: data.notes ?? existing?.notes ?? null,
        avatarUrl: data.avatarUrl ?? existing?.avatarUrl ?? null,
        status: data.status ?? existing?.status ?? 'VISITANTE',
        campusId: data.campusId ?? existing?.campusId ?? null,
        cellGroupId: data.cellId ?? existing?.cellId ?? null,
      };

      if (id) {
        const personPatchPayload = { ...payload };
        delete personPatchPayload.id;
        const memberPatchPayload = {
          ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
          ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
          ...(data.phone !== undefined ? { phone: data.phone } : {}),
          ...(data.address !== undefined ? { address: data.address } : {}),
          ...(data.birthdate !== undefined ? { birthdate: data.birthdate } : {}),
          ...(data.baptismDate !== undefined ? { baptismDate: data.baptismDate } : {}),
          ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
          ...(data.campusId !== undefined ? { campusId: data.campusId } : {}),
        };
        const patchPayload = user?.role === 'MEMBER' ? memberPatchPayload : personPatchPayload;
        const rolePayload = user?.role === 'ADMIN' && roleName ? { roleName } : {};

        await apiRequest(`/people/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: JSON.stringify({ ...patchPayload, ...rolePayload }),
        });
      } else {
        await apiRequest('/people', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      await refetch();
    },
    [getPersonById, refetch, user?.role],
  );

  const addPerson = useCallback(async (person: PersonInput) => {
    await persistPerson(undefined, person);
  }, [persistPerson]);

  const updatePerson = useCallback(async (id: string, data: Partial<PersonInput>) => {
    await persistPerson(id, data);
  }, [persistPerson]);

  const addCell = useCallback(async (cell: CellInput) => {
    const payload = {
      id: cell.id ?? `cel_${crypto.randomUUID()}`,
      name: cell.name,
      leaderId: cell.leaderId,
      day: cell.day,
      time: cell.time,
      location: cell.location,
      campusId: cell.campusId,
      health: cell.health,
    };

    await apiRequest('/cells', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await refetch();
  }, [refetch]);

  const updateCell = useCallback(async (id: string, data: Partial<CellInput>) => {
    const payload = {
      ...(data.name ? { name: data.name } : {}),
      ...(data.leaderId ? { leaderId: data.leaderId } : {}),
      ...(data.day ? { day: data.day } : {}),
      ...(data.time ? { time: data.time } : {}),
      ...(data.location ? { location: data.location } : {}),
      ...(data.campusId !== undefined ? { campusId: data.campusId } : {}),
      ...(data.health ? { health: data.health } : {}),
      ...(data.traineeLeaderIds ? { traineeLeaderIds: data.traineeLeaderIds } : {}),
    };

    await apiRequest(`/cells/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    await refetch();
  }, [refetch]);

  const addDiscipleshipPair = useCallback(async (pair: DiscipleshipPairInput) => {
    await apiRequest('/discipleship-pairs', {
      method: 'POST',
      body: JSON.stringify({
      id: pair.id ?? `dp_${crypto.randomUUID()}`,
      mentorId: pair.mentorId,
      discipleId: pair.discipleId,
      course: pair.course,
      progress: pair.progress,
      lastMeeting: pair.lastMeeting,
      startDate: pair.startDate,
      }),
    });

    await refetch();
  }, [refetch]);

  const updateDiscipleshipPair = useCallback(async (id: string, data: Partial<DiscipleshipPairInput>) => {
    await apiRequest(`/discipleship-pairs/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    await refetch();
  }, [refetch]);

  const addFollowUp = useCallback(async (followUp: FollowUpInput) => {
    await apiRequest('/follow-ups', {
      method: 'POST',
      body: JSON.stringify({
      id: followUp.id ?? `fu_${crypto.randomUUID()}`,
      personId: followUp.personId,
      responsibleId: followUp.responsibleId,
      type: followUp.type,
      date: followUp.date,
      status: followUp.status,
      priority: followUp.priority,
      notes: followUp.notes,
      }),
    });

    await refetch();
  }, [refetch]);

  const updateFollowUp = useCallback(async (id: string, data: Partial<FollowUpInput>) => {
    const payload = {
      ...(data.personId ? { personId: data.personId } : {}),
      ...(data.responsibleId ? { responsibleId: data.responsibleId } : {}),
      ...(data.type ? { type: data.type } : {}),
      ...(data.date ? { date: data.date } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.priority ? { priority: data.priority } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    };

    await apiRequest(`/follow-ups/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    await refetch();
  }, [refetch]);

  const addFamily = useCallback(async (family: FamilyInput) => {
    await apiRequest('/families', {
      method: 'POST',
      body: JSON.stringify({
      id: family.id ?? `fam_${crypto.randomUUID()}`,
      name: family.name,
      }),
    });

    await refetch();
  }, [refetch]);

  const updateFamily = useCallback(async (id: string, data: Partial<FamilyInput>) => {
    await apiRequest(`/families/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: data.name }),
    });
    await refetch();
  }, [refetch]);

  const addMinistry = useCallback(async (ministry: MinistryInput) => {
    await apiRequest('/ministries', {
      method: 'POST',
      body: JSON.stringify({
      id: ministry.id ?? `min_${crypto.randomUUID()}`,
      name: ministry.name,
      description: ministry.description,
      }),
    });

    await refetch();
  }, [refetch]);

  const updateMinistry = useCallback(async (id: string, data: Partial<MinistryInput>) => {
    await apiRequest(`/ministries/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
      }),
    });

    await refetch();
  }, [refetch]);

  const addEvent = useCallback(async (event: EventInput) => {
    await apiRequest('/events', {
      method: 'POST',
      body: JSON.stringify({
      id: event.id ?? `evt_${crypto.randomUUID()}`,
      name: event.name,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location,
      category: event.category,
      campusId: event.campusId,
      status: event.status,
      }),
    });

    await refetch();
  }, [refetch]);

  const updateEvent = useCallback(async (id: string, data: Partial<EventInput>) => {
    await apiRequest(`/events/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.date ? { date: data.date } : {}),
        ...(data.time ? { time: data.time } : {}),
        ...(data.location !== undefined ? { location: data.location } : {}),
        ...(data.category ? { category: data.category } : {}),
        ...(data.campusId !== undefined ? { campusId: data.campusId } : {}),
        ...(data.status ? { status: data.status } : {}),
      }),
    });

    await refetch();
  }, [refetch]);

  const addSchedule = useCallback(async (schedule: ScheduleInput) => {
    await apiRequest('/schedules', {
      method: 'POST',
      body: JSON.stringify({
      id: schedule.id ?? `sch_${crypto.randomUUID()}`,
      ministryId: schedule.ministryId,
      date: schedule.date,
      time: schedule.time,
      status: schedule.status,
      }),
    });

    await refetch();
  }, [refetch]);

  const updateSchedule = useCallback(async (id: string, data: Partial<ScheduleInput>) => {
    await apiRequest(`/schedules/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...(data.ministryId !== undefined ? { ministryId: data.ministryId } : {}),
        ...(data.date ? { date: data.date } : {}),
        ...(data.time ? { time: data.time } : {}),
        ...(data.status ? { status: data.status } : {}),
      }),
    });

    await refetch();
  }, [refetch]);

  const saveNotificationPreference = useCallback(async (preference: NotificationPreference) => {
    if (!supports.notificationPreferences) {
      throw new Error('A tabela NotificationPreference ainda não está disponível no projeto remoto.');
    }

    await apiRequest('/notification-preferences', {
      method: 'PUT',
      body: JSON.stringify({
        id: preference.id ?? `np_${crypto.randomUUID()}`,
        personId: preference.personId,
        pushEnabled: preference.pushEnabled,
        emailDigestEnabled: preference.emailDigestEnabled,
        smsEnabled: preference.smsEnabled,
      }),
    });

    await refetch();
  }, [refetch, supports.notificationPreferences]);

  const inviteFamilyMember = useCallback(async (targetPersonId: string, relationship: string, familyId?: string) => {
    await apiRequest('/family-members/invite', {
      method: 'POST',
      body: JSON.stringify({
        targetPersonId,
        relationship,
        familyId,
      }),
    });
    await refetch();
  }, [refetch]);

  const acceptFamilyInvitation = useCallback(async (memberId: string) => {
    await apiRequest('/family-members/accept', {
      method: 'POST',
      body: JSON.stringify({ memberId }),
    });
    await refetch();
  }, [refetch]);

  const rejectFamilyInvitation = useCallback(async (memberId: string) => {
    await apiRequest('/family-members/reject', {
      method: 'POST',
      body: JSON.stringify({ memberId }),
    });
    await refetch();
  }, [refetch]);

  const addPrayerRequest = useCallback(async (request: any) => {
    await apiRequest('/prayer-requests', {
      method: 'POST',
      body: JSON.stringify({
        id: request.id ?? `pr_${crypto.randomUUID()}`,
        personId: request.personId,
        request: request.request,
        status: request.status ?? 'PENDING',
      }),
    });
    await refetch();
  }, [refetch]);

  const updatePrayerRequest = useCallback(async (id: string, data: any) => {
    await apiRequest(`/prayer-requests/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    await refetch();
  }, [refetch]);

  const deletePrayerRequest = useCallback(async (id: string) => {
    await apiRequest(`/prayer-requests/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    await refetch();
  }, [refetch]);

  const markNotificationAsRead = useCallback(async (id: string) => {
    await apiRequest(`/notifications/${encodeURIComponent(id)}/read`, {
      method: 'POST',
    });
    await refetch();
  }, [refetch]);

  const markAllNotificationsAsRead = useCallback(async () => {
    await apiRequest('/notifications/read-all', {
      method: 'POST',
    });
    await refetch();
  }, [refetch]);

  const value = useMemo<DataContextType>(() => ({
    ...state,
    isLoading,
    error,
    supports,
    refetch,
    getPersonById,
    getCellById,
    getCellByMemberId,
    getCellByLeaderId,
    addPerson,
    updatePerson,
    addCell,
    updateCell,
    addDiscipleshipPair,
    updateDiscipleshipPair,
    addFollowUp,
    updateFollowUp,
    addFamily,
    updateFamily,
    addMinistry,
    updateMinistry,
    addEvent,
    updateEvent,
    addSchedule,
    updateSchedule,
    saveNotificationPreference,
    inviteFamilyMember,
    acceptFamilyInvitation,
    rejectFamilyInvitation,
    addPrayerRequest,
    updatePrayerRequest,
    deletePrayerRequest,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  }), [
    addCell,
    addDiscipleshipPair,
    addEvent,
    addFamily,
    addFollowUp,
    addMinistry,
    addPerson,
    addSchedule,
    error,
    getCellById,
    getCellByLeaderId,
    getCellByMemberId,
    getPersonById,
    isLoading,
    refetch,
    saveNotificationPreference,
    state,
    supports,
    updateCell,
    updateDiscipleshipPair,
    updateEvent,
    updateFamily,
    updateFollowUp,
    updateMinistry,
    updatePerson,
    updateSchedule,
    inviteFamilyMember,
    acceptFamilyInvitation,
    rejectFamilyInvitation,
    addPrayerRequest,
    updatePrayerRequest,
    deletePrayerRequest,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
