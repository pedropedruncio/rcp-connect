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
import { supabase } from '../lib/supabase';
import {
  ensureTimeValue,
  getPersonRoleLabel,
  getUpcomingStatus,
  isMissingSchemaError,
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
}

interface OptionalSelectResult<T> {
  available: boolean;
  data: T[];
}

type PersonRow = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
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
  campusId: string | null;
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

const EMPTY_STATE: DomainState = {
  campuses: [],
  roles: [],
  users: [],
  persons: [],
  cells: [],
  discipleshipPairs: [],
  followUps: [],
  families: [],
  ministries: [],
  events: [],
  schedules: [],
  preferences: [],
  settings: [],
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
  ministryRows: MinistryRow[],
  eventRows: EventRow[],
  scheduleRows: ScheduleRow[],
  preferenceRows: NotificationPreferenceRow[],
  settings: AppSetting[],
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
      address: '',
      birthdate: '',
      notes: '',
      avatarUrl: null,
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
    const traineeLeaderIds = persons
      .filter((person) => person.cellId === row.id && person.role === 'Líder em Formação')
      .map((person) => person.id);

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
    memberIds: [],
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
    time: '19:00',
    location: row.campusId ? campusMap.get(row.campusId) ?? 'Campus' : 'Campus',
    category: 'Igreja',
    campusId: row.campusId,
    campus: row.campusId ? campusMap.get(row.campusId) ?? 'Sem campus' : 'Sem campus',
    status: getUpcomingStatus(row.date ?? ''),
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

  return {
    campuses,
    roles,
    users,
    persons,
    cells,
    discipleshipPairs,
    followUps,
    families,
    ministries,
    events,
    schedules,
    preferences,
    settings,
  };
}

async function selectOptional<T>(table: string, columns: string): Promise<OptionalSelectResult<T>> {
  const { data, error } = await supabase.from(table).select(columns);

  if (error) {
    if (isMissingSchemaError(error.message)) {
      return { available: false, data: [] };
    }
    throw error;
  }

  return {
    available: true,
    data: (data ?? []) as T[],
  };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
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
      const [
        campusResult,
        roleResult,
        userResult,
        personResult,
        cellResult,
        pairResult,
        followUpResult,
        familyResult,
        ministryResult,
        eventResult,
        scheduleResult,
        familyMembersResult,
        ministryMembersResult,
        eventRegistrationsResult,
        scheduleAssignmentsResult,
        preferencesResult,
        settingsResult,
      ] = await Promise.all([
        supabase.from('Campus').select('id, name, createdAt').order('name'),
        supabase.from('Role').select('id, name, description, createdAt').order('name'),
        supabase.from('User').select('id, email, personId, roleId, supabaseId, createdAt'),
        supabase.from('Person').select('id, firstName, lastName, email, phone, status, campusId, cellGroupId'),
        supabase.from('CellGroup').select('id, name, leaderId, day, time, location, campusId, health'),
        supabase.from('DiscipleshipPair').select('id, mentorId, discipleId, course, progress, lastMeeting, startDate'),
        supabase.from('FollowUp').select('id, personId, responsibleId, type, date, status, priority, notes'),
        supabase.from('Family').select('id, name'),
        supabase.from('Ministry').select('id, name, description'),
        supabase.from('Event').select('id, name, description, date, campusId'),
        supabase.from('Schedule').select('id, ministryId, date, time, status'),
        selectOptional('FamilyMember', 'id'),
        selectOptional('MinistryMember', 'id'),
        selectOptional('EventRegistration', 'id'),
        selectOptional('ScheduleAssignment', 'id'),
        selectOptional<NotificationPreferenceRow>(
          'NotificationPreference',
          'id, personId, pushEnabled, emailDigestEnabled, smsEnabled',
        ),
        selectOptional<AppSetting>('AppSetting', 'id, settingKey, settingValue, scope'),
      ]);

      const requiredResults = [
        campusResult,
        roleResult,
        userResult,
        personResult,
        cellResult,
        pairResult,
        followUpResult,
        familyResult,
        ministryResult,
        eventResult,
        scheduleResult,
      ];

      const requiredError = requiredResults.find((result) => result.error)?.error;
      if (requiredError) {
        throw requiredError;
      }

      setSupports({
        familyMembers: familyMembersResult.available,
        ministryMembers: ministryMembersResult.available,
        eventRegistrations: eventRegistrationsResult.available,
        scheduleAssignments: scheduleAssignmentsResult.available,
        notificationPreferences: preferencesResult.available,
        appSettings: settingsResult.available,
      });

      setState(
        mapDomainState(
          (campusResult.data ?? []) as CampusRow[],
          (roleResult.data ?? []) as RoleRow[],
          (userResult.data ?? []) as UserRow[],
          (personResult.data ?? []) as PersonRow[],
          (cellResult.data ?? []) as CellRow[],
          (pairResult.data ?? []) as PairRow[],
          (followUpResult.data ?? []) as FollowUpRow[],
          (familyResult.data ?? []) as FamilyRow[],
          (ministryResult.data ?? []) as MinistryRow[],
          (eventResult.data ?? []) as EventRow[],
          (scheduleResult.data ?? []) as ScheduleRow[],
          preferencesResult.data,
          settingsResult.data,
        ),
      );
    } catch (currentError: any) {
      console.error('Erro ao carregar dados da aplicação:', currentError);
      setState(EMPTY_STATE);
      setError(currentError?.message ?? 'Não foi possível carregar os dados do Supabase.');
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

  const roleIdByName = useMemo(
    () => new Map(state.roles.map((role) => [role.name, role.id])),
    [state.roles],
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
        status: data.status ?? existing?.status ?? 'VISITANTE',
        campusId: data.campusId ?? existing?.campusId ?? null,
        cellGroupId: data.cellId ?? existing?.cellId ?? null,
      };

      if (id) {
        const { error: updateError } = await supabase.from('Person').update(payload).eq('id', id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('Person').insert(payload);
        if (insertError) throw insertError;
      }

      if (id && roleName && roleIdByName.has(roleName)) {
        const roleId = roleIdByName.get(roleName);
        const userRow = state.users.find((entry) => entry.personId === id);

        if (userRow && roleId) {
          const { error: roleError } = await supabase
            .from('User')
            .update({ roleId })
            .eq('id', userRow.id);

          if (roleError) throw roleError;
        }
      }

      await refetch();
    },
    [getPersonById, refetch, roleIdByName, state.users],
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

    const { error: insertError } = await supabase.from('CellGroup').insert(payload);
    if (insertError) throw insertError;
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
    };

    const { error: updateError } = await supabase.from('CellGroup').update(payload).eq('id', id);
    if (updateError) throw updateError;
    await refetch();
  }, [refetch]);

  const addDiscipleshipPair = useCallback(async (pair: DiscipleshipPairInput) => {
    const { error: insertError } = await supabase.from('DiscipleshipPair').insert({
      id: pair.id ?? `dp_${crypto.randomUUID()}`,
      mentorId: pair.mentorId,
      discipleId: pair.discipleId,
      course: pair.course,
      progress: pair.progress,
      lastMeeting: pair.lastMeeting,
      startDate: pair.startDate,
    });

    if (insertError) throw insertError;
    await refetch();
  }, [refetch]);

  const updateDiscipleshipPair = useCallback(async (id: string, data: Partial<DiscipleshipPairInput>) => {
    const { error: updateError } = await supabase.from('DiscipleshipPair').update(data).eq('id', id);
    if (updateError) throw updateError;
    await refetch();
  }, [refetch]);

  const addFollowUp = useCallback(async (followUp: FollowUpInput) => {
    const { error: insertError } = await supabase.from('FollowUp').insert({
      id: followUp.id ?? `fu_${crypto.randomUUID()}`,
      personId: followUp.personId,
      responsibleId: followUp.responsibleId,
      type: followUp.type,
      date: followUp.date,
      status: followUp.status,
      priority: followUp.priority,
      notes: followUp.notes,
    });

    if (insertError) throw insertError;
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

    const { error: updateError } = await supabase.from('FollowUp').update(payload).eq('id', id);
    if (updateError) throw updateError;
    await refetch();
  }, [refetch]);

  const addFamily = useCallback(async (family: FamilyInput) => {
    const { error: insertError } = await supabase.from('Family').insert({
      id: family.id ?? `fam_${crypto.randomUUID()}`,
      name: family.name,
    });

    if (insertError) throw insertError;
    await refetch();
  }, [refetch]);

  const updateFamily = useCallback(async (id: string, data: Partial<FamilyInput>) => {
    const { error: updateError } = await supabase.from('Family').update({ name: data.name }).eq('id', id);
    if (updateError) throw updateError;
    await refetch();
  }, [refetch]);

  const addMinistry = useCallback(async (ministry: MinistryInput) => {
    const { error: insertError } = await supabase.from('Ministry').insert({
      id: ministry.id ?? `min_${crypto.randomUUID()}`,
      name: ministry.name,
      description: ministry.description,
    });

    if (insertError) throw insertError;
    await refetch();
  }, [refetch]);

  const updateMinistry = useCallback(async (id: string, data: Partial<MinistryInput>) => {
    const { error: updateError } = await supabase
      .from('Ministry')
      .update({
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
      })
      .eq('id', id);

    if (updateError) throw updateError;
    await refetch();
  }, [refetch]);

  const addEvent = useCallback(async (event: EventInput) => {
    const { error: insertError } = await supabase.from('Event').insert({
      id: event.id ?? `evt_${crypto.randomUUID()}`,
      name: event.name,
      description: event.description,
      date: event.date,
      campusId: event.campusId,
    });

    if (insertError) throw insertError;
    await refetch();
  }, [refetch]);

  const updateEvent = useCallback(async (id: string, data: Partial<EventInput>) => {
    const { error: updateError } = await supabase
      .from('Event')
      .update({
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.date ? { date: data.date } : {}),
        ...(data.campusId !== undefined ? { campusId: data.campusId } : {}),
      })
      .eq('id', id);

    if (updateError) throw updateError;
    await refetch();
  }, [refetch]);

  const addSchedule = useCallback(async (schedule: ScheduleInput) => {
    const { error: insertError } = await supabase.from('Schedule').insert({
      id: schedule.id ?? `sch_${crypto.randomUUID()}`,
      ministryId: schedule.ministryId,
      date: schedule.date,
      time: schedule.time,
      status: schedule.status,
    });

    if (insertError) throw insertError;
    await refetch();
  }, [refetch]);

  const updateSchedule = useCallback(async (id: string, data: Partial<ScheduleInput>) => {
    const { error: updateError } = await supabase
      .from('Schedule')
      .update({
        ...(data.ministryId !== undefined ? { ministryId: data.ministryId } : {}),
        ...(data.date ? { date: data.date } : {}),
        ...(data.time ? { time: data.time } : {}),
        ...(data.status ? { status: data.status } : {}),
      })
      .eq('id', id);

    if (updateError) throw updateError;
    await refetch();
  }, [refetch]);

  const saveNotificationPreference = useCallback(async (preference: NotificationPreference) => {
    if (!supports.notificationPreferences) {
      throw new Error('A tabela NotificationPreference ainda não está disponível no projeto remoto.');
    }

    const { error: upsertError } = await supabase.from('NotificationPreference').upsert({
      id: preference.id ?? `np_${crypto.randomUUID()}`,
      personId: preference.personId,
      pushEnabled: preference.pushEnabled,
      emailDigestEnabled: preference.emailDigestEnabled,
      smsEnabled: preference.smsEnabled,
    });

    if (upsertError) throw upsertError;
    await refetch();
  }, [refetch, supports.notificationPreferences]);

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
