export function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function forbidden(message = 'Não tem permissão para executar esta ação.') {
  return httpError(403, message);
}

export function badRequest(message = 'Pedido inválido.') {
  return httpError(400, message);
}

const ADMIN_ONLY_PERSON_FIELDS = new Set([
  'roleName',
  'roleId',
  'supabaseId',
]);

const MEMBER_SAFE_PERSON_FIELDS = new Set([
  'firstName',
  'lastName',
  'phone',
  'address',
  'birthdate',
  'avatarUrl',
  'campusId',
]);

export function isAdmin(authUser) {
  return authUser?.role === 'ADMIN';
}

export function isPastor(authUser) {
  return authUser?.role === 'PASTOR';
}

export function isPastorOrAdmin(authUser) {
  return ['ADMIN', 'PASTOR'].includes(authUser?.role);
}

export function hasRole(authUser, roles) {
  return roles.includes(authUser?.role);
}

export function hasAdminOnlyPersonFields(payload = {}) {
  return Object.keys(payload).some((key) => ADMIN_ONLY_PERSON_FIELDS.has(key));
}

export function pickAllowedFields(payload = {}, allowedFields) {
  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => allowedFields.has(key)),
  );
}

function hasUnsafeFields(payload = {}, allowedFields) {
  return Object.keys(payload).some((key) => !allowedFields.has(key));
}

export function canManagePerson(authUser, personId) {
  if (!authUser || !personId) return false;

  if (isPastorOrAdmin(authUser)) return true;

  if (['LEADER', 'DISCIPLER'].includes(authUser.role)) {
    return Array.isArray(authUser.memberIds) && authUser.memberIds.includes(personId);
  }

  if (authUser.role === 'MEMBER') {
    return authUser.id === personId;
  }

  return false;
}

function assertNoAdminOnlyPersonFields(authUser, payload = {}) {
  if (!isAdmin(authUser) && hasAdminOnlyPersonFields(payload)) {
    throw forbidden('Apenas administradores podem alterar cargos ou dados administrativos.');
  }
}

export function sanitizePersonPayload(authUser, targetPersonId, payload = {}) {
  assertNoAdminOnlyPersonFields(authUser, payload);

  const { roleName, roleId, supabaseId, id: payloadId, ...personPayload } = payload;

  if (payloadId && payloadId !== targetPersonId && !isAdmin(authUser)) {
    throw forbidden('Apenas administradores podem alterar identificadores administrativos.');
  }

  if (isAdmin(authUser)) {
    return { personPayload, roleName, roleId };
  }

  if (isPastor(authUser)) {
    return { personPayload, roleName: null, roleId: null };
  }

  if (!canManagePerson(authUser, targetPersonId)) {
    throw forbidden('Não tem permissão para editar esta pessoa.');
  }

  if (authUser.role === 'MEMBER') {
    if (hasUnsafeFields(personPayload, MEMBER_SAFE_PERSON_FIELDS)) {
      throw forbidden('Só pode alterar campos básicos do próprio perfil.');
    }

    return {
      personPayload: pickAllowedFields(personPayload, MEMBER_SAFE_PERSON_FIELDS),
      roleName: null,
      roleId: null,
    };
  }

  return {
    personPayload,
    roleName: null,
    roleId: null,
  };
}

function hasAllInScope(authUser, personIds) {
  const uniqueIds = Array.from(new Set(personIds.filter(Boolean)));
  return uniqueIds.length > 0 && uniqueIds.every((personId) => authUser.memberIds?.includes(personId));
}

async function getExistingDiscipleshipPair(client, id) {
  const { data, error } = await client
    .from('DiscipleshipPair')
    .select('mentorId, discipleId')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

async function getExistingFollowUp(client, id) {
  const { data, error } = await client
    .from('FollowUp')
    .select('personId, responsibleId')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function assertMutationPermission({ client, authUser, method, resource, id = null, body = {} }) {
  if (!authUser) {
    throw forbidden('Sessão inválida.');
  }

  if (resource === 'people') {
    if (method === 'POST') {
      if (!isPastorOrAdmin(authUser)) {
        throw forbidden('Apenas liderança autorizada pode criar pessoas.');
      }

      assertNoAdminOnlyPersonFields(authUser, body);
      return;
    }

    if (method === 'PATCH' && id) {
      sanitizePersonPayload(authUser, id, body);
      return;
    }

    throw httpError(404, 'Endpoint não encontrado.');
  }

  if (resource === 'cells') {
    if (method === 'POST') {
      if (!isPastorOrAdmin(authUser)) {
        throw forbidden('Apenas pastores ou administradores podem criar células.');
      }
      return;
    }

    if (method === 'PATCH' && id) {
      if (isPastorOrAdmin(authUser)) return;

      if (
        authUser.role === 'LEADER' &&
        Array.isArray(authUser.supervisedCellIds) &&
        authUser.supervisedCellIds.includes(id)
      ) {
        return;
      }

      throw forbidden('Não tem permissão para editar esta célula.');
    }

    throw httpError(404, 'Endpoint não encontrado.');
  }

  if (resource === 'discipleship-pairs') {
    if (!['POST', 'PATCH'].includes(method)) {
      throw httpError(404, 'Endpoint não encontrado.');
    }

    if (!hasRole(authUser, ['ADMIN', 'PASTOR', 'DISCIPLER'])) {
      throw forbidden('Não tem permissão para gerir discipulados.');
    }

    if (isPastorOrAdmin(authUser)) return;

    let mentorId = body.mentorId;
    let discipleId = body.discipleId;

    if (method === 'PATCH' && id) {
      const existing = await getExistingDiscipleshipPair(client, id);
      mentorId = mentorId ?? existing.mentorId;
      discipleId = discipleId ?? existing.discipleId;
    }

    if (hasAllInScope(authUser, [mentorId, discipleId, body.personId])) {
      return;
    }

    throw forbidden('Só pode gerir discipulados dentro do seu escopo.');
  }

  if (resource === 'follow-ups') {
    if (!['POST', 'PATCH'].includes(method)) {
      throw httpError(404, 'Endpoint não encontrado.');
    }

    if (!hasRole(authUser, ['ADMIN', 'PASTOR', 'LEADER', 'DISCIPLER'])) {
      throw forbidden('Não tem permissão para gerir follow-ups.');
    }

    if (isPastorOrAdmin(authUser)) return;

    let personId = body.personId;
    let responsibleId = body.responsibleId;

    if (method === 'PATCH' && id) {
      const existing = await getExistingFollowUp(client, id);
      personId = personId ?? existing.personId;
      responsibleId = responsibleId ?? existing.responsibleId;
    }

    if (hasAllInScope(authUser, [personId, responsibleId])) {
      return;
    }

    throw forbidden('Só pode gerir follow-ups dentro do seu escopo.');
  }

  if (resource === 'families') {
    if (!['POST', 'PATCH'].includes(method) || (method === 'PATCH' && !id)) {
      throw httpError(404, 'Endpoint não encontrado.');
    }

    if (!isPastorOrAdmin(authUser)) {
      throw forbidden('A gestão genérica de famílias é restrita à liderança.');
    }
    return;
  }

  if (['ministries', 'events', 'schedules'].includes(resource)) {
    if (!['POST', 'PATCH'].includes(method) || (method === 'PATCH' && !id)) {
      throw httpError(404, 'Endpoint não encontrado.');
    }

    if (!isPastorOrAdmin(authUser)) {
      throw forbidden('Não tem permissão para gerir este recurso.');
    }
    return;
  }

  if (resource === 'notification-preferences') {
    if (method !== 'PUT') {
      throw forbidden('Método não permitido para preferências de notificação.');
    }

    const targetPersonId = body.personId;
    if (!targetPersonId) {
      throw badRequest('Pessoa alvo é obrigatória para preferências de notificação.');
    }

    if (isPastorOrAdmin(authUser)) return;

    if (targetPersonId !== authUser.id && !authUser.memberIds?.includes(targetPersonId)) {
      throw forbidden('Não pode alterar preferências de outra pessoa.');
    }

    return;
  }

  throw httpError(404, 'Endpoint não encontrado.');
}
