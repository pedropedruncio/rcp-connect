import { createClient } from '@supabase/supabase-js';
import { assertMutationPermission, isAdmin, sanitizePersonPayload } from './authorization.js';

const ACCESS_COOKIE = 'rcp_access_token';
const REFRESH_COOKIE = 'rcp_refresh_token';
const OAUTH_COOKIE_PREFIX = 'rcp_oauth_';
const OAUTH_RETURN_COOKIE = 'rcp_oauth_return_to';
const OAUTH_COOKIE_MAX_AGE = 5 * 60;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing server environment variable: ${name}`);
  return value;
}

function getSupabaseConfig() {
  return {
    url: requiredEnv('SUPABASE_URL'),
    anonKey: requiredEnv('SUPABASE_ANON_KEY'),
  };
}

function getServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || null;
}

function createAnonClient() {
  const { url, anonKey } = getSupabaseConfig();
  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function createPrivilegedClient() {
  const serviceRoleKey = getServiceRoleKey();
  if (!serviceRoleKey) return null;

  const { url } = getSupabaseConfig();
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getHeader(event, name) {
  return event.headers?.[name] ?? event.headers?.[name.toLowerCase()] ?? event.headers?.[name.toUpperCase()];
}

function normalizeForwardedValue(value) {
  return Array.isArray(value) ? value[0] : String(value ?? '').split(',')[0].trim();
}

function getRequestOrigin(event) {
  const host = normalizeForwardedValue(getHeader(event, 'x-forwarded-host') ?? getHeader(event, 'host')) || 'localhost:3000';
  const forwardedProto = normalizeForwardedValue(getHeader(event, 'x-forwarded-proto'));
  const protocol = forwardedProto || (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');

  return `${protocol}://${host}`;
}

function safeReturnTo(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/';
  }

  return value;
}

function serializeCookie(name, value, maxAge, sameSite = 'Strict') {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly${secure}; SameSite=${sameSite}`;
}

function oauthStorageCookieName(key) {
  return `${OAUTH_COOKIE_PREFIX}${Buffer.from(key).toString('base64url')}`;
}

function clearOAuthCookies(event) {
  const cookies = parseCookies(getHeader(event, 'cookie') ?? '');

  return Object.keys(cookies)
    .filter((name) => name.startsWith(OAUTH_COOKIE_PREFIX) || name === OAUTH_RETURN_COOKIE)
    .map((name) => serializeCookie(name, '', 0, 'Lax'));
}

function createOAuthStorage(event, pendingCookies) {
  const requestCookies = parseCookies(getHeader(event, 'cookie') ?? '');

  return {
    getItem(key) {
      return requestCookies[oauthStorageCookieName(key)] ?? null;
    },
    setItem(key, value) {
      pendingCookies.push(serializeCookie(oauthStorageCookieName(key), value, OAUTH_COOKIE_MAX_AGE, 'Lax'));
    },
    removeItem(key) {
      pendingCookies.push(serializeCookie(oauthStorageCookieName(key), '', 0, 'Lax'));
    },
  };
}

function createOAuthClient(event, pendingCookies) {
  const { url, anonKey } = getSupabaseConfig();
  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: 'pkce',
      persistSession: true,
      storage: createOAuthStorage(event, pendingCookies),
    },
  });
}

function createUserClient(accessToken) {
  const { url, anonKey } = getSupabaseConfig();
  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

function parseCookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name, ...value] = part.split('=');
        return [name, decodeURIComponent(value.join('='))];
      }),
  );
}

function sessionCookies(session) {
  const accessMaxAge = Math.max(60, session.expires_in ?? 3600);
  const refreshMaxAge = 60 * 60 * 24 * 30;

  return [
    serializeCookie(ACCESS_COOKIE, session.access_token, accessMaxAge, 'Lax'),
    serializeCookie(REFRESH_COOKIE, session.refresh_token, refreshMaxAge, 'Lax'),
  ];
}

function clearCookies() {
  return [
    serializeCookie(ACCESS_COOKIE, '', 0, 'Lax'),
    serializeCookie(REFRESH_COOKIE, '', 0, 'Lax'),
  ];
}

function json(statusCode, body, cookies = []) {
  const response = {
    statusCode,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };

  if (cookies.length > 0) {
    response.multiValueHeaders = {
      'Set-Cookie': cookies,
    };
  }

  return response;
}

function raw(statusCode, body, headers = {}, cookies = []) {
  const response = {
    statusCode,
    headers: {
      'Cache-Control': 'no-store',
      ...headers,
    },
    body,
  };

  if (cookies.length > 0) {
    response.multiValueHeaders = {
      'Set-Cookie': cookies,
    };
  }

  return response;
}

function redirect(location, cookies = []) {
  const response = {
    statusCode: 302,
    headers: {
      'Cache-Control': 'no-store',
      Location: location,
    },
    body: '',
  };

  if (cookies.length > 0) {
    response.multiValueHeaders = {
      'Set-Cookie': cookies,
    };
  }

  return response;
}

function firstQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function authErrorRedirect(message, cookies = []) {
  return redirect(`/login?auth_error=${encodeURIComponent(message)}`, cookies);
}

function getPath(event) {
  return event.path
    .replace(/^\/api/, '')
    .replace(/^\/\.netlify\/functions\/api/, '')
    .replace(/\/$/, '') || '/';
}

function toSessionPayload(user) {
  return {
    user: {
      id: user.id,
      email: user.email ?? null,
    },
  };
}

async function getAuthedContext(event) {
  const cookies = parseCookies(event.headers.cookie ?? event.headers.Cookie ?? '');
  const accessToken = cookies[ACCESS_COOKIE];
  const refreshToken = cookies[REFRESH_COOKIE];
  const anon = createAnonClient();

  if (accessToken) {
    const { data, error } = await anon.auth.getUser(accessToken);
    if (!error && data.user) {
      return {
        client: createUserClient(accessToken),
        cookies: [],
        session: toSessionPayload(data.user),
        user: data.user,
      };
    }
  }

  if (refreshToken) {
    const { data, error } = await anon.auth.refreshSession({ refresh_token: refreshToken });
    if (!error && data.session && data.user) {
      return {
        client: createUserClient(data.session.access_token),
        cookies: sessionCookies(data.session),
        session: toSessionPayload(data.user),
        user: data.user,
      };
    }
  }

  return null;
}

function authUserFromProfile(profile, scope, sbUser) {
  const firstName = profile.Person?.firstName ?? sbUser.user_metadata?.full_name ?? 'Utilizador';
  const lastName = profile.Person?.lastName ?? '';
  const phone = profile.Person?.phone ?? null;
  const address = profile.Person?.address ?? null;
  const providerAvatar = sbUser.user_metadata?.avatar_url ?? sbUser.user_metadata?.picture ?? null;
  const needsOnboarding = !phone || !address;

  return {
    id: profile.Person?.id ?? profile.personId,
    supabaseId: profile.supabaseId,
    name: `${firstName} ${lastName}`.trim(),
    email: profile.email,
    role: profile.Role?.name ?? 'MEMBER',
    campus: profile.Person?.Campus?.name ?? 'Sem campus',
    cellId: profile.Person?.cellGroupId ?? null,
    avatarUrl: profile.Person?.avatarUrl ?? providerAvatar,
    supervisedCellIds: scope.supervisedCellIds,
    memberIds: scope.memberIds,
    leaderPersonIds: scope.leaderPersonIds,
    needsOnboarding,
  };
}

async function computeScope(client, profile) {
  const [{ data: personsData, error: personsError }, { data: cellsData, error: cellsError }] = await Promise.all([
    client.from('Person').select('id, campusId, cellGroupId'),
    client.from('CellGroup').select('id, leaderId, campusId'),
  ]);

  if (personsError) throw personsError;
  if (cellsError) throw cellsError;

  const persons = personsData ?? [];
  const cells = cellsData ?? [];
  const personId = profile.Person?.id ?? profile.personId;
  const campusId = profile.Person?.campusId ?? null;

  if (profile.Role?.name === 'ADMIN' || profile.Role?.name === 'PASTOR') {
    return {
      supervisedCellIds: cells.map((cell) => cell.id),
      memberIds: persons.map((person) => person.id),
      leaderPersonIds: Array.from(new Set(cells.map((cell) => cell.leaderId))),
    };
  }

  if (profile.Role?.name === 'DISCIPLER') {
    const supervisedCells = cells.filter((cell) => cell.campusId === campusId);
    const supervisedCellIds = supervisedCells.map((cell) => cell.id);

    return {
      supervisedCellIds,
      memberIds: persons.filter((person) => person.cellGroupId && supervisedCellIds.includes(person.cellGroupId)).map((person) => person.id),
      leaderPersonIds: Array.from(new Set(supervisedCells.map((cell) => cell.leaderId))),
    };
  }

  if (profile.Role?.name === 'LEADER') {
    const supervisedCellIds = cells.filter((cell) => cell.leaderId === personId).map((cell) => cell.id);

    return {
      supervisedCellIds,
      memberIds: persons.filter((person) => person.cellGroupId && supervisedCellIds.includes(person.cellGroupId)).map((person) => person.id),
      leaderPersonIds: [personId],
    };
  }

  return {
    supervisedCellIds: profile.Person?.cellGroupId ? [profile.Person.cellGroupId] : [],
    memberIds: personId ? [personId] : [],
    leaderPersonIds: [],
  };
}

async function createAutomaticProfile(client, sbUser) {
  if (!sbUser.email) {
    throw new Error('Authenticated user is missing an email address.');
  }

  const [{ data: defaultRole, error: roleError }, { data: defaultCampus }] = await Promise.all([
    client.from('Role').select('id').eq('name', 'MEMBER').single(),
    client.from('Campus').select('id').eq('name', 'Lisboa').maybeSingle(),
  ]);

  if (roleError || !defaultRole) {
    throw roleError ?? new Error('Default MEMBER role not found.');
  }

  const fullName = sbUser.user_metadata?.full_name?.trim() || sbUser.email.split('@')[0] || 'Novo Membro';
  const [firstName, ...rest] = fullName.split(/\s+/);
  const personId = `per_${crypto.randomUUID()}`;
  const providerAvatar = sbUser.user_metadata?.avatar_url ?? sbUser.user_metadata?.picture ?? null;

  const { error: personError } = await client.from('Person').insert({
    id: personId,
    firstName: firstName || 'Novo',
    lastName: rest.join(' ') || 'Membro',
    email: sbUser.email,
    campusId: defaultCampus?.id ?? null,
    status: 'MEMBRO',
    avatarUrl: providerAvatar,
  });

  if (personError) throw personError;

  const { data: createdUser, error: userError } = await client
    .from('User')
    .insert({
      id: `usr_${crypto.randomUUID()}`,
      email: sbUser.email,
      personId,
      roleId: defaultRole.id,
      supabaseId: sbUser.id,
    })
    .select(`
      id,
      email,
      personId,
      roleId,
      supabaseId,
      Role ( name ),
      Person (
        id,
        firstName,
        lastName,
        avatarUrl,
        campusId,
        cellGroupId,
        Campus ( name )
      )
    `)
    .single();

  if (userError) throw userError;
  return createdUser;
}

async function getAuthUser(client, sbUser) {
  let { data: profile, error } = await client
    .from('User')
    .select(`
      id,
      email,
      personId,
      roleId,
      supabaseId,
      Role ( name ),
      Person (
        id,
        firstName,
        lastName,
        phone,
        address,
        avatarUrl,
        campusId,
        cellGroupId,
        Campus ( name )
      )
    `)
    .eq('supabaseId', sbUser.id)
    .single();

  if (error && error.code === 'PGRST116') {
    profile = await createAutomaticProfile(client, sbUser);
  } else if (error) {
    throw error;
  }

  const scope = await computeScope(client, profile);
  return authUserFromProfile(profile, scope, sbUser);
}

async function optionalSelect(client, table, columns) {
  try {
    const { data, error } = await client.from(table).select(columns);

    if (error) {
      // Log failure but return empty data for optional tables
      console.error(`[Data] Erro na tabela opcional ${table}:`, error.message);
      return { available: false, data: [] };
    }

    return { available: true, data: data ?? [] };
  } catch (err) {
    console.error(`[Data] Erro inesperado na tabela opcional ${table}:`, err);
    return { available: false, data: [] };
  }
}

async function getData(client) {
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
    prayerRequestsResult,
    notificationsResult,
    discipleshipJournalsResult,
  ] = await Promise.all([
    // Tabelas Primárias (Obrigatórias)
    client.from('Campus').select('id, name').order('name'),
    client.from('Role').select('id, name, description').order('name'),
    client.from('User').select('id, email, personId, roleId, supabaseId, createdAt'),
    client.from('Person').select('id, firstName, lastName, email, phone, address, birthdate, baptismDate, notes, avatarUrl, status, campusId, cellGroupId, createdAt'),
    client.from('CellGroup').select('id, name, leaderId, day, time, location, campusId, health, traineeLeaderIds'),

    // Tabelas Secundárias (Opcionais via optionalSelect)
    optionalSelect(client, 'DiscipleshipPair', 'id, mentorId, discipleId, course, progress, lastMeeting, startDate'),
    optionalSelect(client, 'FollowUp', 'id, personId, responsibleId, type, date, status, priority, notes'),
    optionalSelect(client, 'Family', 'id, name'),
    optionalSelect(client, 'Ministry', 'id, name, description'),
    optionalSelect(client, 'Event', 'id, name, description, date, time, location, category, campusId, status'),
    optionalSelect(client, 'Schedule', 'id, ministryId, date, time, status'),
    optionalSelect(client, 'FamilyMember', 'id, familyId, personId, relationship, isPrimaryContact, status'),
    optionalSelect(client, 'MinistryMember', 'id'),
    optionalSelect(client, 'EventRegistration', 'id'),
    optionalSelect(client, 'ScheduleAssignment', 'id'),
    optionalSelect(client, 'NotificationPreference', 'id, personId, pushEnabled, emailDigestEnabled, smsEnabled'),
    optionalSelect(client, 'AppSetting', 'id, settingKey, settingValue, scope'),
    optionalSelect(client, 'PrayerRequest', 'id, personId, request, status, createdAt'),
    optionalSelect(client, 'SystemNotification', 'id, type, content, readBy, createdAt'),
    optionalSelect(client, 'DiscipleshipJournal', 'id, pairId, authorId, content, createdAt'),
  ]);

  // Apenas Campus, Role, User, Person e CellGroup são estritamente obrigatórios para o app iniciar
  const requiredResults = [
    campusResult,
    roleResult,
    userResult,
    personResult,
    cellResult,
  ];
  const requiredError = requiredResults.find((result) => result.error)?.error;
  if (requiredError) throw requiredError;

  return {
    supports: {
      familyMembers: familyMembersResult.available,
      ministryMembers: ministryMembersResult.available,
      eventRegistrations: eventRegistrationsResult.available,
      scheduleAssignments: scheduleAssignmentsResult.available,
      notificationPreferences: preferencesResult.available,
      appSettings: settingsResult.available,
    },
    campuses: campusResult.data ?? [],
    roles: roleResult.data ?? [],
    users: userResult.data ?? [],
    persons: personResult.data ?? [],
    cells: cellResult.data ?? [],
    discipleshipPairs: pairResult.data ?? [],
    followUps: followUpResult.data ?? [],
    families: familyResult.data ?? [],
    familyMembers: familyMembersResult.data,
    ministries: ministryResult.data ?? [],
    events: eventResult.data ?? [],
    schedules: scheduleResult.data ?? [],
    preferences: preferencesResult.data,
    settings: settingsResult.data,
    prayerRequests: prayerRequestsResult.data || [],
    notifications: notificationsResult.data || [],
    discipleshipJournals: discipleshipJournalsResult.data || [],
  };
}

function escapeIcsText(value = '') {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function toUtcStamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function toLisbonDateTime(dateValue, timeValue = '19:00') {
  const cleanDate = /^\d{4}-\d{2}-\d{2}$/.test(String(dateValue ?? ''))
    ? String(dateValue)
    : new Date().toISOString().slice(0, 10);
  const cleanTime = /^\d{2}:\d{2}/.test(String(timeValue ?? '')) ? String(timeValue).slice(0, 5) : '19:00';
  return `${cleanDate.replace(/-/g, '')}T${cleanTime.replace(':', '')}00`;
}

function addHoursToIcsDateTime(icsDateTime, hours = 2) {
  const year = Number(icsDateTime.slice(0, 4));
  const month = Number(icsDateTime.slice(4, 6)) - 1;
  const day = Number(icsDateTime.slice(6, 8));
  const hour = Number(icsDateTime.slice(9, 11));
  const minute = Number(icsDateTime.slice(11, 13));
  const date = new Date(Date.UTC(year, month, day, hour + hours, minute, 0));
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}T${String(date.getUTCHours()).padStart(2, '0')}${String(date.getUTCMinutes()).padStart(2, '0')}00`;
}

async function getChurchEvents(client) {
  const [{ data: events, error: eventsError }, { data: campuses, error: campusesError }] = await Promise.all([
    client.from('Event').select('id, name, description, date, time, location, category, campusId, status').order('date'),
    client.from('Campus').select('id, name'),
  ]);

  if (eventsError) throw eventsError;
  if (campusesError) throw campusesError;

  const campusMap = new Map((campuses ?? []).map((campus) => [campus.id, campus.name]));

  return (events ?? []).map((event) => ({
    ...event,
    time: event.time ?? '19:00',
    location: event.location || (event.campusId ? campusMap.get(event.campusId) ?? '' : ''),
    category: event.category ?? 'Igreja',
    status: event.status ?? 'Confirmado',
  }));
}

async function handleChurchCalendarFeed(event) {
  const dataClient = createPrivilegedClient() ?? createAnonClient();
  const events = await getChurchEvents(dataClient);
  const origin = getRequestOrigin(event);
  const stamp = toUtcStamp();

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RCP Connect//Church Calendar//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Agenda da Igreja RCP',
    'X-WR-TIMEZONE:Europe/Lisbon',
  ];

  events.forEach((churchEvent) => {
    const startsAt = toLisbonDateTime(churchEvent.date, churchEvent.time);
    const endsAt = addHoursToIcsDateTime(startsAt, 2);
    const description = [
      churchEvent.description,
      `Categoria: ${churchEvent.category}`,
      `Estado: ${churchEvent.status}`,
    ].filter(Boolean).join('\\n');

    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeIcsText(churchEvent.id)}@rcp-connect`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Europe/Lisbon:${startsAt}`,
      `DTEND;TZID=Europe/Lisbon:${endsAt}`,
      `SUMMARY:${escapeIcsText(churchEvent.name)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      `LOCATION:${escapeIcsText(churchEvent.location)}`,
      `URL:${origin}/eventos`,
      'END:VEVENT',
    );
  });

  lines.push('END:VCALENDAR');

  return raw(200, `${lines.join('\r\n')}\r\n`, {
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': 'attachment; filename="agenda-igreja-rcp.ics"',
  });
}

function normalizeSearchTerm(value) {
  return String(value ?? '')
    .replace(/[^\p{L}\p{N}@._\-\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function searchFamilyMembers(auth, query) {
  const q = normalizeSearchTerm(firstQueryValue(query.q));

  if (q.length < 2) {
    return [];
  }

  const currentPersonId = await getCurrentPersonId(auth.client, auth.user);
  const dataClient = createPrivilegedClient() ?? auth.client;
  const firstTerm = q.split(/\s+/)[0];

  const { data: currentMemberships, error: membershipsError } = await dataClient
    .from('FamilyMember')
    .select('familyId')
    .eq('personId', currentPersonId)
    .eq('status', 'ACCEPTED');

  if (membershipsError) throw membershipsError;

  const familyIds = (currentMemberships ?? []).map((item) => item.familyId);

  const { data: people, error: peopleError } = await dataClient
    .from('Person')
    .select('id, firstName, lastName, email, avatarUrl')
    .or(`firstName.ilike.%${firstTerm}%,lastName.ilike.%${firstTerm}%,email.ilike.%${firstTerm}%`)
    .neq('id', currentPersonId)
    .limit(30);

  if (peopleError) throw peopleError;

  const normalizedNeedle = q.toLowerCase();
  const matchedPeople = (people ?? [])
    .map((person) => {
      const name = `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim();
      return {
        id: person.id,
        name,
        email: person.email ?? '',
        avatarUrl: person.avatarUrl ?? null,
      };
    })
    .filter((person) => `${person.name} ${person.email}`.toLowerCase().includes(normalizedNeedle));

  if (matchedPeople.length === 0) {
    return [];
  }

  const candidateIds = matchedPeople.map((person) => person.id);
  const [{ data: acceptedRows, error: acceptedError }, pendingResult] = await Promise.all([
    dataClient
      .from('FamilyMember')
      .select('personId')
      .in('personId', candidateIds)
      .eq('status', 'ACCEPTED'),
    familyIds.length > 0
      ? dataClient
        .from('FamilyMember')
        .select('personId')
        .in('familyId', familyIds)
        .in('personId', candidateIds)
        .eq('status', 'PENDING')
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (acceptedError) throw acceptedError;
  if (pendingResult.error) throw pendingResult.error;

  const acceptedIds = new Set((acceptedRows ?? []).map((item) => item.personId));
  const pendingIds = new Set((pendingResult.data ?? []).map((item) => item.personId));

  return matchedPeople
    .filter((person) => !acceptedIds.has(person.id) && !pendingIds.has(person.id))
    .slice(0, 10);
}

function parseImagePayload(image) {
  const match = /^data:(image\/(?:png|jpe?g|webp));base64,([a-z0-9+/=]+)$/i.exec(String(image ?? ''));
  if (!match) {
    const error = new Error('Imagem inválida.');
    error.statusCode = 400;
    throw error;
  }

  const contentType = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
  const buffer = Buffer.from(match[2], 'base64');

  if (buffer.length > 1024 * 1024) {
    const error = new Error('A imagem otimizada deve ter no máximo 1MB.');
    error.statusCode = 400;
    throw error;
  }

  return { buffer, contentType };
}

async function ensureAvatarBucket(client) {
  const bucket = 'profile-avatars';
  const privilegedClient = createPrivilegedClient();

  if (!privilegedClient) {
    return { client, bucket };
  }

  const { error: lookupError } = await privilegedClient.storage.getBucket(bucket);
  if (lookupError) {
    const { error: createError } = await privilegedClient.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: 1024 * 1024,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    });

    if (createError && !/already exists/i.test(createError.message)) {
      throw createError;
    }
  } else {
    const { error: updateBucketError } = await privilegedClient.storage.updateBucket(bucket, {
      public: true,
      fileSizeLimit: 1024 * 1024,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    });
    if (updateBucketError) {
      console.warn('[profile-avatar] Could not update bucket settings:', updateBucketError.message);
    }
  }

  return { client: privilegedClient, bucket };
}

async function uploadProfileAvatar(auth, body) {
  const authUser = await getAuthUser(auth.client, auth.user);
  const { buffer, contentType } = parseImagePayload(body.image);
  const extension = contentType === 'image/png' ? 'png' : contentType === 'image/jpeg' ? 'jpg' : 'webp';
  const { client: storageClient, bucket } = await ensureAvatarBucket(auth.client);
  const path = `${authUser.id}/avatar.${extension}`;

  const { error: uploadError } = await storageClient.storage.from(bucket).upload(path, buffer, {
    cacheControl: '3600',
    contentType,
    upsert: true,
  });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = storageClient.storage.from(bucket).getPublicUrl(path);
  const avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;
  const dataClient = createPrivilegedClient() ?? auth.client;
  const { error: updateError } = await dataClient
    .from('Person')
    .update({ avatarUrl })
    .eq('id', authUser.id);

  if (updateError) throw updateError;

  return avatarUrl;
}

async function insertRow(client, table, payload) {
  const { error } = await client.from(table).insert(payload);
  if (error) throw error;
}

async function updateRow(client, table, id, payload) {
  const { error } = await client.from(table).update(payload).eq('id', id);
  if (error) throw error;
}

async function upsertRow(client, table, payload) {
  const { error } = await client.from(table).upsert(payload);
  if (error) throw error;
}

async function updatePerson(client, authUser, id, payload) {
  const { personPayload, roleName, roleId } = sanitizePersonPayload(authUser, id, payload);

  if (Object.keys(personPayload).length > 0) {
    await updateRow(client, 'Person', id, personPayload);
  }

  if (roleName || roleId) {
    if (!isAdmin(authUser)) {
      const error = new Error('Apenas administradores podem alterar cargos.');
      error.statusCode = 403;
      throw error;
    }

    let resolvedRoleId = roleId;

    if (roleName) {
      const { data: role, error: roleError } = await client.from('Role').select('id').eq('name', roleName).single();
      if (roleError) throw roleError;
      resolvedRoleId = role.id;
    }

    const { data: userRow, error: userError } = await client.from('User').select('id').eq('personId', id).maybeSingle();
    if (userError) throw userError;

    if (userRow) {
      await updateRow(client, 'User', userRow.id, { roleId: resolvedRoleId });
    }
  }
}

async function notifyLeaderOfPrayerRequest(client, personId, prayerRequestId, requestText) {
  try {
    const { data: person, error: personErr } = await client
      .from('Person')
      .select('firstName, lastName, cellGroupId')
      .eq('id', personId)
      .single();
    
    if (personErr || !person?.cellGroupId) return;

    const { data: cell, error: cellErr } = await client
      .from('CellGroup')
      .select('leaderId')
      .eq('id', person.cellGroupId)
      .single();

    if (cellErr || !cell?.leaderId) return;

    const privClient = createPrivilegedClient() ?? client;
    await privClient.from('SystemNotification').insert({
      id: `notif_${crypto.randomUUID()}`,
      type: 'PRAYER_REQUEST',
      content: {
        message: `Novo pedido de oração de ${person.firstName}: "${requestText.slice(0, 50)}${requestText.length > 50 ? '...' : ''}"`,
        personId,
        prayerRequestId,
        targetPersonId: cell.leaderId
      },
      readBy: []
    });
  } catch (err) {
    console.warn('[notifyLeaderOfPrayerRequest] error:', err);
  }
}

async function getCurrentPersonId(client, sbUser) {
  const { data, error } = await client
    .from('User')
    .select('personId')
    .eq('supabaseId', sbUser.id)
    .single();

  if (error) throw error;
  return data.personId;
}

async function handleMutation(client, authUser, method, path, body) {
  const [, resource, id] = path.split('/');

  await assertMutationPermission({
    client,
    authUser,
    method,
    resource,
    id,
    body,
  });

  if (resource === 'people' && method === 'POST') return insertRow(client, 'Person', body);
  if (resource === 'people' && method === 'PATCH' && id) return updatePerson(client, authUser, id, body);
  if (resource === 'cells' && method === 'POST') return insertRow(client, 'CellGroup', body);
  if (resource === 'cells' && method === 'PATCH' && id) {
    const payload = { ...body };
    // Ensure traineeLeaderIds is passed correctly if present
    return updateRow(client, 'CellGroup', id, payload);
  }
  if (resource === 'discipleship-pairs' && method === 'POST') return insertRow(client, 'DiscipleshipPair', body);
  if (resource === 'discipleship-pairs' && method === 'PATCH' && id) return updateRow(client, 'DiscipleshipPair', id, body);
  if (resource === 'discipleship-journals' && method === 'POST') return insertRow(client, 'DiscipleshipJournal', body);
  if (resource === 'follow-ups' && method === 'POST') return insertRow(client, 'FollowUp', body);
  if (resource === 'follow-ups' && method === 'PATCH' && id) return updateRow(client, 'FollowUp', id, body);
  if (resource === 'families' && method === 'POST') return insertRow(client, 'Family', body);
  if (resource === 'families' && method === 'PATCH' && id) return updateRow(client, 'Family', id, body);
  if (resource === 'ministries' && method === 'POST') return insertRow(client, 'Ministry', body);
  if (resource === 'ministries' && method === 'PATCH' && id) return updateRow(client, 'Ministry', id, body);
  if (resource === 'events' && method === 'POST') return insertRow(client, 'Event', body);
  if (resource === 'events' && method === 'PATCH' && id) return updateRow(client, 'Event', id, body);
  if (resource === 'schedules' && method === 'POST') return insertRow(client, 'Schedule', body);
  if (resource === 'schedules' && method === 'PATCH' && id) return updateRow(client, 'Schedule', id, body);
  if (resource === 'notification-preferences' && method === 'PUT') return upsertRow(client, 'NotificationPreference', body);
  if (resource === 'prayer-requests' && method === 'POST') {
    const res = await insertRow(client, 'PrayerRequest', body);
    await notifyLeaderOfPrayerRequest(client, body.personId, body.id, body.request);
    return res;
  }
  if (resource === 'prayer-requests' && method === 'PATCH' && id) {
    const res = await updateRow(client, 'PrayerRequest', id, body);
    if (body.status === 'ANSWERED') {
      const { data: pr } = await client.from('PrayerRequest').select('personId, request').eq('id', id).single();
      if (pr) {
        await client.from('SystemNotification').insert({
          type: 'PRAYER_ANSWERED',
          content: {
            title: 'Oração Respondida',
            message: `O seu pedido "${pr.request.slice(0, 30)}..." foi marcado como respondido pelo seu líder.`,
            targetPersonId: pr.personId,
            prayerRequestId: id
          }
        });
      }
    }
    return res;
  }
  if (resource === 'prayer-requests' && method === 'DELETE' && id) {
    const { error } = await client.from('PrayerRequest').delete().eq('id', id);
    if (error) throw error;
    return;
  }

  if (resource === 'notifications' && method === 'POST') {
    const personId = await getPersonIdFromUser(client, authUser.id);
    
    if (path.endsWith('/read-all')) {
      // Get all notifications the user can see and haven't read
      const { data: list } = await client.from('SystemNotification').select('id, readBy');
      for (const item of list) {
        if (!item.readBy?.includes(personId)) {
          const newReadBy = [...(item.readBy || []), personId];
          await client.from('SystemNotification').update({ readBy: newReadBy }).eq('id', item.id);
        }
      }
      return;
    }
    
    if (id && path.endsWith('/read')) {
      const { data: notification } = await client.from('SystemNotification').select('readBy').eq('id', id).single();
      if (notification && !notification.readBy?.includes(personId)) {
        const newReadBy = [...(notification.readBy || []), personId];
        await client.from('SystemNotification').update({ readBy: newReadBy }).eq('id', id);
      }
      return;
    }
  }

  const error = new Error('Endpoint não encontrado.');
  error.statusCode = 404;
  throw error;
}

export async function handler(event) {
  try {
    const method = event.httpMethod;
    const path = getPath(event);

    if (method === 'GET' && path === '/calendar/church.ics') {
      return handleChurchCalendarFeed(event);
    }

    if (method === 'POST' && path === '/auth/login') {
      const { email, password } = JSON.parse(event.body ?? '{}');
      const anon = createAnonClient();
      const { data, error } = await anon.auth.signInWithPassword({ email, password });

      if (error || !data.session || !data.user) {
        return json(401, { error: error?.message ?? 'Credenciais inválidas.' });
      }

      const client = createUserClient(data.session.access_token);
      const authUser = await getAuthUser(client, data.user);
      return json(200, { session: toSessionPayload(data.user), user: authUser }, sessionCookies(data.session));
    }

    if (method === 'POST' && path === '/auth/google') {
      const { returnTo } = JSON.parse(event.body ?? '{}');
      const cookies = [
        serializeCookie(OAUTH_RETURN_COOKIE, safeReturnTo(returnTo), OAUTH_COOKIE_MAX_AGE, 'Lax'),
      ];
      const anon = createOAuthClient(event, cookies);
      const redirectTo = `${getRequestOrigin(event)}/api/auth/callback`;
      const { data, error } = await anon.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });

      if (error || !data?.url) {
        return json(500, { error: error?.message ?? 'Não foi possível iniciar o login com Google.' }, cookies);
      }

      return json(200, { url: data.url }, cookies);
    }

    if (method === 'GET' && path === '/auth/callback') {
      const query = event.queryStringParameters ?? {};
      const code = firstQueryValue(query.code);
      const providerError = firstQueryValue(query.error_description ?? query.error);
      const requestCookies = parseCookies(getHeader(event, 'cookie') ?? '');
      const returnTo = safeReturnTo(requestCookies[OAUTH_RETURN_COOKIE] ?? '/');
      const cookies = clearOAuthCookies(event);

      if (providerError) {
        return authErrorRedirect(providerError, cookies);
      }

      if (!code) {
        return authErrorRedirect('Callback do Google sem código de autenticação.', cookies);
      }

      const anon = createOAuthClient(event, cookies);
      const { data, error } = await anon.auth.exchangeCodeForSession(code);

      if (error || !data.session || !data.user) {
        return authErrorRedirect(error?.message ?? 'Não foi possível concluir o login com Google.', cookies);
      }

      const client = createUserClient(data.session.access_token);
      await getAuthUser(client, data.user);
      return redirect(returnTo, [...cookies, ...sessionCookies(data.session)]);
    }

    if (method === 'POST' && path === '/auth/logout') {
      return json(200, { ok: true }, clearCookies());
    }

    if (method === 'POST' && path === '/auth/signup') {
      const { email, password, fullName } = JSON.parse(event.body ?? '{}');

      if (!email || !password) {
        return json(400, { error: 'Email e password são obrigatórios.' });
      }

      if (password.length < 8) {
        return json(400, { error: 'A password deve ter pelo menos 8 caracteres.' });
      }

      const anon = createAnonClient();
      const { data, error } = await anon.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: String(fullName ?? '').trim() || null },
        },
      });

      if (error) {
        return json(400, { error: error.message });
      }

      // Email confirmation required — session is null
      if (!data.session || !data.user) {
        return json(200, {
          needsEmailConfirmation: true,
          message: 'Conta criada! Verifique o seu email e clique no link de confirmação antes de entrar.',
        });
      }

      // Session active — create Person + User automatically
      const client = createUserClient(data.session.access_token);
      const authUser = await getAuthUser(client, data.user);
      return json(200, { session: toSessionPayload(data.user), user: authUser }, sessionCookies(data.session));
    }

    if (method === 'POST' && path === '/auth/onboarding') {
      const auth = await getAuthedContext(event);
      if (!auth) return json(401, { error: 'Sessão expirada. Entre novamente.' }, clearCookies());

      const { firstName, lastName, phone, address, birthdate, campusId } = JSON.parse(event.body ?? '{}');

      if (!phone || !address) {
        return json(400, { error: 'Telefone e morada são obrigatórios.' });
      }

      // Fetch the user profile to get their personId
      const { data: userRow, error: userError } = await auth.client
        .from('User')
        .select('personId, email, Person(firstName, lastName, Campus(name))')
        .eq('supabaseId', auth.user.id)
        .single();

      if (userError || !userRow) {
        return json(500, { error: 'Perfil não encontrado.' });
      }

      // Update Person record
      const updatePayload = {
        phone,
        address,
        status: 'MEMBRO',
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(birthdate && { birthdate }),
        ...(campusId && { campusId }),
      };

      const { error: updateError } = await auth.client
        .from('Person')
        .update(updatePayload)
        .eq('id', userRow.personId);

      if (updateError) throw updateError;

      // Update Supabase Auth to include the phone number
      if (phone) {
        // This will update the user's phone in auth.users
        await auth.client.auth.updateUser({ phone });
        // Optionally update user_metadata too so it's visible in JSON
        await auth.client.auth.updateUser({ data: { phone } });
      }

      // Create SystemNotification for leadership (non-fatal if table not yet created)
      const campusName = userRow.Person?.Campus?.name ?? 'Sem campus';
      const memberName = `${firstName ?? userRow.Person?.firstName ?? ''} ${lastName ?? userRow.Person?.lastName ?? ''}`.trim();

      try {
        const { error: notifError } = await auth.client
          .from('SystemNotification')
          .insert({
            id: `notif_${crypto.randomUUID()}`,
            type: 'NEW_MEMBER_REGISTERED',
            content: {
              personId: userRow.personId,
              name: memberName,
              email: userRow.email,
              phone,
              campus: campusName,
              registeredAt: new Date().toISOString(),
            },
          });
        if (notifError) {
          console.warn('[onboarding] SystemNotification insert failed (table may not exist yet):', notifError.message);
        }
      } catch (notifErr) {
        console.warn('[onboarding] SystemNotification insert error:', notifErr);
      }

      // Re-fetch updated user
      const authUser = await getAuthUser(auth.client, auth.user);
      return json(200, { ok: true, user: authUser }, auth.cookies);
    }

    const auth = await getAuthedContext(event);

    if (method === 'GET' && path === '/auth/session') {
      if (!auth) return json(200, { session: null, user: null }, clearCookies());

      const authUser = await getAuthUser(auth.client, auth.user);
      return json(200, { session: auth.session, user: authUser }, auth.cookies);
    }

    if (!auth) {
      return json(401, { error: 'Sessão expirada. Entre novamente.' }, clearCookies());
    }

    if (method === 'GET' && path === '/data') {
      return json(200, await getData(auth.client), auth.cookies);
    }

    if (method === 'GET' && path === '/campuses') {
      const { data, error } = await auth.client.from('Campus').select('id, name').order('name');
      if (error) throw error;
      return json(200, data ?? [], auth.cookies);
    }

    if (method === 'GET' && path === '/family-members/search') {
      return json(200, await searchFamilyMembers(auth, event.queryStringParameters ?? {}), auth.cookies);
    }

    if (method === 'POST' && path === '/profile/avatar') {
      const body = event.body ? JSON.parse(event.body) : {};
      const avatarUrl = await uploadProfileAvatar(auth, body);
      return json(200, { avatarUrl }, auth.cookies);
    }

    if (method === 'POST' && path === '/family-members/invite') {
      const body = event.body ? JSON.parse(event.body) : {};
      const { targetPersonId, relationship, familyId } = body;
      const currentPersonId = await getCurrentPersonId(auth.client, auth.user);
      const familyClient = createPrivilegedClient() ?? auth.client;
      const normalizedRelationship = typeof relationship === 'string' ? relationship.trim() : '';

      if (!targetPersonId || !normalizedRelationship) {
        return json(400, { error: 'Dados em falta.' }, auth.cookies);
      }

      if (targetPersonId === currentPersonId) {
        return json(400, { error: 'Não pode convidar a si próprio.' }, auth.cookies);
      }

      const { data: targetPerson, error: targetPersonError } = await familyClient
        .from('Person')
        .select('id')
        .eq('id', targetPersonId)
        .maybeSingle();

      if (targetPersonError) throw targetPersonError;
      if (!targetPerson) {
        return json(404, { error: 'Pessoa não encontrada ou sem acesso.' }, auth.cookies);
      }

      const { data: targetHasFamily, error: existingTargetError } = await familyClient
        .rpc('person_has_accepted_family', { row_person_id: targetPersonId });

      if (existingTargetError) throw existingTargetError;
      if (targetHasFamily) {
        return json(400, { error: 'Esta pessoa já pertence a um grupo familiar.' }, auth.cookies);
      }

      let targetFamilyId = familyId;
      const { data: senderFamilies, error: senderFamiliesError } = await familyClient
        .from('FamilyMember')
        .select('familyId')
        .eq('personId', currentPersonId)
        .eq('status', 'ACCEPTED');

      if (senderFamiliesError) throw senderFamiliesError;

      if (targetFamilyId) {
        const belongsToRequestedFamily = (senderFamilies ?? []).some((item) => item.familyId === targetFamilyId);
        if (!belongsToRequestedFamily) {
          return json(403, { error: 'Não tem permissão para convidar para esta família.' }, auth.cookies);
        }
      } else if (senderFamilies && senderFamilies.length > 0) {
        targetFamilyId = senderFamilies[0].familyId;
      } else {
        const newFamilyId = `fam_${crypto.randomUUID()}`;
        const { data: newFam, error: famErr } = await familyClient
          .from('Family')
          .insert({ id: newFamilyId, name: 'Família' })
          .select('id')
          .single();

        if (famErr) throw famErr;
        targetFamilyId = newFam.id;

        const { error: senderMemberErr } = await familyClient
          .from('FamilyMember')
          .insert({
            id: `fam_mem_${crypto.randomUUID()}`,
            familyId: targetFamilyId,
            personId: currentPersonId,
            relationship: 'Titular',
            isPrimaryContact: true,
            status: 'ACCEPTED',
          });

        if (senderMemberErr) throw senderMemberErr;
      }

      const { data: existingPendingInvite, error: pendingInviteError } = await familyClient
        .from('FamilyMember')
        .select('id')
        .eq('familyId', targetFamilyId)
        .eq('personId', targetPersonId)
        .eq('status', 'PENDING')
        .maybeSingle();

      if (pendingInviteError) throw pendingInviteError;
      if (existingPendingInvite) {
        return json(400, { error: 'Já existe um convite pendente para esta pessoa.' }, auth.cookies);
      }

      const { error: inviteErr } = await familyClient.from('FamilyMember').insert({
        id: `fam_mem_${crypto.randomUUID()}`,
        familyId: targetFamilyId,
        personId: targetPersonId,
        relationship: normalizedRelationship,
        isPrimaryContact: false,
        status: 'PENDING',
      });

      if (inviteErr) throw inviteErr;

      try {
        await familyClient.from('SystemNotification').insert({
          id: `notif_${crypto.randomUUID()}`,
          type: 'FAMILY_INVITE',
          content: {
            message: 'Recebeu um convite para integrar uma família.',
            targetPersonId,
          },
          readBy: [],
        });
      } catch (notifErr) {
        console.warn('[family-invite] SystemNotification insert error:', notifErr);
      }

      return json(200, { ok: true, familyId: targetFamilyId }, auth.cookies);
    }

    if (method === 'POST' && path === '/family-members/accept') {
      const { memberId } = event.body ? JSON.parse(event.body) : {};
      const currentPersonId = await getCurrentPersonId(auth.client, auth.user);
      const familyClient = createPrivilegedClient() ?? auth.client;
      const { data: acceptedInvite, error: updateErr } = await familyClient
        .from('FamilyMember')
        .update({ status: 'ACCEPTED' })
        .eq('id', memberId)
        .eq('personId', currentPersonId)
        .eq('status', 'PENDING')
        .select('id')
        .maybeSingle();

      if (updateErr) throw updateErr;
      if (!acceptedInvite) {
        return json(404, { error: 'Convite não encontrado.' }, auth.cookies);
      }

      return json(200, { ok: true }, auth.cookies);
    }

    if (method === 'POST' && path === '/family-members/reject') {
      const { memberId } = event.body ? JSON.parse(event.body) : {};
      const currentPersonId = await getCurrentPersonId(auth.client, auth.user);
      const familyClient = createPrivilegedClient() ?? auth.client;
      const { data: rejectedInvite, error: inviteLookupError } = await familyClient
        .from('FamilyMember')
        .select('id')
        .eq('id', memberId)
        .eq('personId', currentPersonId)
        .eq('status', 'PENDING')
        .maybeSingle();

      if (inviteLookupError) throw inviteLookupError;
      if (!rejectedInvite) {
        return json(404, { error: 'Convite não encontrado.' }, auth.cookies);
      }

      const { error: delErr } = await familyClient
        .from('FamilyMember')
        .delete()
        .eq('id', memberId)
        .eq('personId', currentPersonId)
        .eq('status', 'PENDING');

      if (delErr) throw delErr;

      return json(200, { ok: true }, auth.cookies);
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const authUser = await getAuthUser(auth.client, auth.user);
    await handleMutation(auth.client, authUser, method, path, body);
    return json(200, { ok: true }, auth.cookies);
  } catch (error) {
    console.error(error);
    return json(error.statusCode ?? 500, {
      error: error.message ?? 'Erro interno.',
    });
  }
}
