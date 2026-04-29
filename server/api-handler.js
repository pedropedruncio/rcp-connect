import { createClient } from '@supabase/supabase-js';

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

function createAnonClient() {
  const { url, anonKey } = getSupabaseConfig();
  return createClient(url, anonKey, {
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
  const needsOnboarding = !phone || !address;

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
        phone,
        address,
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
    client.from('Campus').select('id, name').order('name'),
    client.from('Role').select('id, name, description').order('name'),
    client.from('User').select('id, email, personId, roleId, supabaseId, createdAt'),
    client.from('Person').select('id, firstName, lastName, email, phone, address, birthdate, notes, avatarUrl, status, campusId, cellGroupId'),
    client.from('CellGroup').select('id, name, leaderId, day, time, location, campusId, health'),
    client.from('DiscipleshipPair').select('id, mentorId, discipleId, course, progress, lastMeeting, startDate'),
    client.from('FollowUp').select('id, personId, responsibleId, type, date, status, priority, notes'),
    client.from('Family').select('id, name'),
    client.from('Ministry').select('id, name, description'),
    client.from('Event').select('id, name, description, date, campusId'),
    client.from('Schedule').select('id, ministryId, date, time, status'),
    optionalSelect(client, 'FamilyMember', 'id, familyId, personId, relationship, isPrimaryContact, status'),
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
    familyMembers: familyMembersResult.data,
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

async function getCurrentPersonId(client, sbUser) {
  const { data, error } = await client
    .from('User')
    .select('personId')
    .eq('supabaseId', sbUser.id)
    .single();

  if (error) throw error;
  return data.personId;
}

async function handleMutation(client, method, path, body) {
  const [, resource, id] = path.split('/');

  if (resource === 'people' && method === 'POST') return insertRow(client, 'Person', body);
  if (resource === 'people' && method === 'PATCH' && id) return updatePerson(client, id, body);
  if (resource === 'cells' && method === 'POST') return insertRow(client, 'CellGroup', body);
  if (resource === 'cells' && method === 'PATCH' && id) return updateRow(client, 'CellGroup', id, body);
  if (resource === 'discipleship-pairs' && method === 'POST') return insertRow(client, 'DiscipleshipPair', body);
  if (resource === 'discipleship-pairs' && method === 'PATCH' && id) return updateRow(client, 'DiscipleshipPair', id, body);
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

    if (method === 'POST' && path === '/family-members/invite') {
      const body = event.body ? JSON.parse(event.body) : {};
      const { targetPersonId, relationship, familyId } = body;
      const currentPersonId = await getCurrentPersonId(auth.client, auth.user);
      const normalizedRelationship = typeof relationship === 'string' ? relationship.trim() : '';

      if (!targetPersonId || !normalizedRelationship) {
        return json(400, { error: 'Dados em falta.' }, auth.cookies);
      }

      if (targetPersonId === currentPersonId) {
        return json(400, { error: 'Não pode convidar a si próprio.' }, auth.cookies);
      }

      const { data: targetPerson, error: targetPersonError } = await auth.client
        .from('Person')
        .select('id')
        .eq('id', targetPersonId)
        .maybeSingle();

      if (targetPersonError) throw targetPersonError;
      if (!targetPerson) {
        return json(404, { error: 'Pessoa não encontrada ou sem acesso.' }, auth.cookies);
      }

      const { data: targetHasFamily, error: existingTargetError } = await auth.client
        .rpc('person_has_accepted_family', { row_person_id: targetPersonId });

      if (existingTargetError) throw existingTargetError;
      if (targetHasFamily) {
        return json(400, { error: 'Esta pessoa já pertence a um grupo familiar.' }, auth.cookies);
      }

      let targetFamilyId = familyId;
      const { data: senderFamilies, error: senderFamiliesError } = await auth.client
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
        const { data: newFam, error: famErr } = await auth.client
          .from('Family')
          .insert({ id: newFamilyId, name: 'Família' })
          .select('id')
          .single();

        if (famErr) throw famErr;
        targetFamilyId = newFam.id;

        const { error: senderMemberErr } = await auth.client
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

      const { error: inviteErr } = await auth.client.from('FamilyMember').insert({
        id: `fam_mem_${crypto.randomUUID()}`,
        familyId: targetFamilyId,
        personId: targetPersonId,
        relationship: normalizedRelationship,
        isPrimaryContact: false,
        status: 'PENDING',
      });

      if (inviteErr) throw inviteErr;

      try {
        await auth.client.from('SystemNotification').insert({
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
      const { data: acceptedInvite, error: updateErr } = await auth.client
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
      const { data: rejectedInvite, error: inviteLookupError } = await auth.client
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

      const { error: delErr } = await auth.client
        .from('FamilyMember')
        .delete()
        .eq('id', memberId)
        .eq('personId', currentPersonId)
        .eq('status', 'PENDING');

      if (delErr) throw delErr;

      return json(200, { ok: true }, auth.cookies);
    }

    const body = event.body ? JSON.parse(event.body) : {};
    await handleMutation(auth.client, method, path, body);
    return json(200, { ok: true }, auth.cookies);
  } catch (error) {
    console.error(error);
    return json(error.statusCode ?? 500, {
      error: error.message ?? 'Erro interno.',
    });
  }
}
