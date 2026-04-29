import { describe, expect, it } from 'vitest';
import {
  assertMutationPermission,
  canManagePerson,
  sanitizePersonPayload,
} from '../../server/authorization.js';

const member = {
  id: 'per_member',
  role: 'MEMBER',
  memberIds: ['per_member'],
  supervisedCellIds: [],
  leaderPersonIds: [],
};

const leader = {
  id: 'per_leader',
  role: 'LEADER',
  memberIds: ['per_member'],
  supervisedCellIds: ['cell_1'],
  leaderPersonIds: ['per_leader'],
};

const discipler = {
  id: 'per_discipler',
  role: 'DISCIPLER',
  memberIds: ['per_member'],
  supervisedCellIds: ['cell_1'],
  leaderPersonIds: ['per_leader'],
};

const pastor = {
  id: 'per_pastor',
  role: 'PASTOR',
  memberIds: ['per_member', 'per_other'],
  supervisedCellIds: ['cell_1'],
  leaderPersonIds: ['per_leader'],
};

const admin = {
  id: 'per_admin',
  role: 'ADMIN',
  memberIds: ['per_member', 'per_other'],
  supervisedCellIds: ['cell_1'],
  leaderPersonIds: ['per_leader'],
};

describe('authorization helpers', () => {
  it('MEMBER não pode editar outra pessoa', () => {
    expect(canManagePerson(member, 'per_other')).toBe(false);
    expect(() => sanitizePersonPayload(member, 'per_other', { phone: '123' })).toThrowError(
      'Não tem permissão para editar esta pessoa.',
    );
  });

  it('MEMBER não pode enviar roleName no próprio perfil', () => {
    expect(() => sanitizePersonPayload(member, 'per_member', { roleName: 'ADMIN' })).toThrowError(
      'Apenas administradores podem alterar cargos ou dados administrativos.',
    );
  });

  it('MEMBER pode editar o próprio perfil com campos seguros', () => {
    const result = sanitizePersonPayload(member, 'per_member', {
      phone: '910000000',
      address: 'Rua A',
    });

    expect(result).toEqual({
      personPayload: {
        phone: '910000000',
        address: 'Rua A',
      },
      roleName: null,
      roleId: null,
    });
  });

  it('LEADER não pode alterar roleName', () => {
    expect(() => sanitizePersonPayload(leader, 'per_member', { roleName: 'PASTOR' })).toThrowError(
      'Apenas administradores podem alterar cargos ou dados administrativos.',
    );
  });

  it('LEADER não pode editar pessoa fora de memberIds', () => {
    expect(() => sanitizePersonPayload(leader, 'per_other', { phone: '910000000' })).toThrowError(
      'Não tem permissão para editar esta pessoa.',
    );
  });

  it('DISCIPLER não pode editar pessoa fora de memberIds', () => {
    expect(() => sanitizePersonPayload(discipler, 'per_other', { phone: '910000000' })).toThrowError(
      'Não tem permissão para editar esta pessoa.',
    );
  });

  it('PASTOR pode editar pessoa, mas não pode alterar roleName', () => {
    expect(sanitizePersonPayload(pastor, 'per_other', { phone: '910000000' })).toEqual({
      personPayload: { phone: '910000000' },
      roleName: null,
      roleId: null,
    });
    expect(() => sanitizePersonPayload(pastor, 'per_other', { roleName: 'ADMIN' })).toThrowError(
      'Apenas administradores podem alterar cargos ou dados administrativos.',
    );
  });

  it('ADMIN pode alterar roleName', () => {
    expect(sanitizePersonPayload(admin, 'per_other', { roleName: 'PASTOR' })).toEqual({
      personPayload: {},
      roleName: 'PASTOR',
      roleId: undefined,
    });
  });

  it('recurso desconhecido retorna 404', async () => {
    await expect(
      assertMutationPermission({
        client: {},
        authUser: admin,
        method: 'POST',
        resource: 'unknown',
        body: {},
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('recurso conhecido sem permissão retorna 403', async () => {
    await expect(
      assertMutationPermission({
        client: {},
        authUser: member,
        method: 'POST',
        resource: 'people',
        body: { firstName: 'Teste' },
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
