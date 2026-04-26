import { createClient } from '@supabase/supabase-js';

const ACCESS_COOKIE = 'rcp_access_token';
const REFRESH_COOKIE = 'rcp_refresh_token';

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

function createAnonClient() {
  const { url, anonKey } = getSupabaseConfig();
  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
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
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

  return [
    `${ACCESS_COOKIE}=${encodeURIComponent(session.access_token)}; Path=/; Max-Age=${accessMaxAge}; HttpOnly${secure}; SameSite=Strict`,
    `${REFRESH_COOKIE}=${encodeURIComponent(session.refresh_token)}; Path=/; Max-Age=${refreshMaxAge}; HttpOnly${secure}; SameSite=Strict`,
  ];
}

function clearCookies() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

  return [
    `${ACCESS_COOKIE}=; Path=/; Max-Age=0; HttpOnly${secure}; SameSite=Strict`,
    `${REFRESH_COOKIE}=; Path=/; Max-Age=0; HttpOnly${secure}; SameSite=Strict`,
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

  return {
    id: profile.Person?.id ?? profile.personId,
    supabaseId: profile.supabaseId,
    name: `${firstName} ${lastName}`.trim(),
    email: profile.email,
    role: profile.Role?.name ?? 'MEMBER',
    campus: profile.Person?.Campus?.name ?? 'Sem campus',
    cellId: profile.Person?.cellGroupId ?? null,
    avatarUrl: sbUser.user_metadata?.avatar_url ?? null,
    supervisedCellIds: scope.supervisedCellIds,
    memberIds: scope.memberIds,
    leaderPersonIds: scope.leaderPersonIds,
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

  const { error: personError } = await client.from('Person').insert({
    id: personId,
    firstName: firstName || 'Novo',
    lastName: rest.join(' ') || 'Membro',
    email: sbUser.email,
    campusId: defaultCampus?.id ?? null,
    status: 'MEMBRO',
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
  const { data, error } = await client.from(table).select(columns);

  if (error) {
    if (/schema cache|does not exist|undefined_table/i.test(error.message)) {
      return { available: false, data: [] };
    }
    throw error;
  }

  return { available: true, data: data ?? [] };
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
  ] = await Promise.all([
    client.from('Campus').select('id, name, createdAt').order('name'),
    client.from('Role').select('id, name, description, createdAt').order('name'),
    client.from('User').select('id, email, personId, roleId, supabaseId, createdAt'),
    client.from('Person').select('id, firstName, lastName, email, phone, address, birthdate, notes, avatarUrl, status, campusId, cellGroupId'),
    client.from('CellGroup').select('id, name, leaderId, day, time, location, campusId, health'),
    client.from('DiscipleshipPair').select('id, mentorId, discipleId, course, progress, lastMeeting, startDate'),
    client.from('FollowUp').select('id, personId, responsibleId, type, date, status, priority, notes'),
    client.from('Family').select('id, name'),
    client.from('Ministry').select('id, name, description'),
    client.from('Event').select('id, name, description, date, campusId'),
    client.from('Schedule').select('id, ministryId, date, time, status'),
    optionalSelect(client, 'FamilyMember', 'id'),
    optionalSelect(client, 'MinistryMember', 'id'),
    optionalSelect(client, 'EventRegistration', 'id'),
    optionalSelect(client, 'ScheduleAssignment', 'id'),
    optionalSelect(client, 'NotificationPreference', 'id, personId, pushEnabled, emailDigestEnabled, smsEnabled'),
    optionalSelect(client, 'AppSetting', 'id, settingKey, settingValue, scope'),
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
    ministries: ministryResult.data ?? [],
    events: eventResult.data ?? [],
    schedules: scheduleResult.data ?? [],
    preferences: preferencesResult.data,
    settings: settingsResult.data,
  };
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

async function updatePerson(client, id, payload) {
  const { roleName, ...personPayload } = payload;
  await updateRow(client, 'Person', id, personPayload);

  if (roleName) {
    const { data: role, error: roleError } = await client.from('Role').select('id').eq('name', roleName).single();
    if (roleError) throw roleError;

    const { data: userRow, error: userError } = await client.from('User').select('id').eq('personId', id).maybeSingle();
    if (userError) throw userError;

    if (userRow) {
      await updateRow(client, 'User', userRow.id, { roleId: role.id });
    }
  }
}

async function handleMutation(client, method, path, body, role) {
  const [, resource, id] = path.split('/');

  const isLeaderPlus = ['LEADER', 'DISCIPLER', 'PASTOR', 'ADMIN'].includes(role);
  const isDisciplerPlus = ['DISCIPLER', 'PASTOR', 'ADMIN'].includes(role);
  const isPastorPlus = ['PASTOR', 'ADMIN'].includes(role);

  // Security: Server-side authorization check (Defense in Depth)
  const checkAuth = (allowed) => {
    if (!allowed) {
      const error = new Error('Acesso negado. Permissões insuficientes.');
      error.statusCode = 403;
      throw error;
    }
  };

  if (resource === 'people') {
    checkAuth(isLeaderPlus);
    if (method === 'POST') return insertRow(client, 'Person', body);
    if (method === 'PATCH' && id) return updatePerson(client, id, body);
  }

  if (resource === 'cells') {
    if (method === 'POST') {
      checkAuth(isPastorPlus);
      return insertRow(client, 'CellGroup', body);
    }
    if (method === 'PATCH' && id) {
      checkAuth(isDisciplerPlus);
      return updateRow(client, 'CellGroup', id, body);
    }
  }

  if (resource === 'discipleship-pairs') {
    checkAuth(isLeaderPlus);
    if (method === 'POST') return insertRow(client, 'DiscipleshipPair', body);
    if (method === 'PATCH' && id) return updateRow(client, 'DiscipleshipPair', id, body);
  }

  if (resource === 'follow-ups') {
    checkAuth(isLeaderPlus);
    if (method === 'POST') return insertRow(client, 'FollowUp', body);
    if (method === 'PATCH' && id) return updateRow(client, 'FollowUp', id, body);
  }

  if (resource === 'families') {
    checkAuth(isPastorPlus);
    if (method === 'POST') return insertRow(client, 'Family', body);
    if (method === 'PATCH' && id) return updateRow(client, 'Family', id, body);
  }

  if (resource === 'ministries') {
    checkAuth(isPastorPlus);
    if (method === 'POST') return insertRow(client, 'Ministry', body);
    if (method === 'PATCH' && id) return updateRow(client, 'Ministry', id, body);
  }

  if (resource === 'events') {
    checkAuth(isPastorPlus);
    if (method === 'POST') return insertRow(client, 'Event', body);
    if (method === 'PATCH' && id) return updateRow(client, 'Event', id, body);
  }

  if (resource === 'schedules') {
    checkAuth(isPastorPlus);
    if (method === 'POST') return insertRow(client, 'Schedule', body);
    if (method === 'PATCH' && id) return updateRow(client, 'Schedule', id, body);
  }

  if (resource === 'notification-preferences' && method === 'PUT') {
    return upsertRow(client, 'NotificationPreference', body);
  }

  const error = new Error('Endpoint não encontrado.');
  error.statusCode = 404;
  throw error;
}

export async function handler(event) {
  try {
    const method = event.httpMethod;
    const path = getPath(event);

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

    if (method === 'POST' && path === '/auth/logout') {
      return json(200, { ok: true }, clearCookies());
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

    const body = event.body ? JSON.parse(event.body) : {};
    const authUser = await getAuthUser(auth.client, auth.user);
    await handleMutation(auth.client, method, path, body, authUser.role);
    return json(200, { ok: true }, auth.cookies);
  } catch (error) {
    console.error(error);
    // Security: Secure error responses for 500 status codes (Defense in Depth)
    const statusCode = error.statusCode ?? 500;
    const message = statusCode === 500 ? 'Erro interno no servidor.' : (error.message ?? 'Erro interno.');
    return json(statusCode, { error: message });
  }
}
