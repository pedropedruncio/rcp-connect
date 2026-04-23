import { describe, expect, it } from 'vitest';
import { PAGE_ALLOWED_ROLES } from '../hooks/usePermissions';

describe('PAGE_ALLOWED_ROLES', () => {
  it('aplica a matriz de permissões de lançamento aprovada', () => {
    expect(PAGE_ALLOWED_ROLES['/']).toEqual(['MEMBER', 'LEADER', 'DISCIPLER', 'PASTOR', 'ADMIN']);
    expect(PAGE_ALLOWED_ROLES['/pessoas']).toEqual(['LEADER', 'DISCIPLER', 'PASTOR', 'ADMIN']);
    expect(PAGE_ALLOWED_ROLES['/celulas']).toEqual(['LEADER', 'DISCIPLER', 'PASTOR', 'ADMIN']);
    expect(PAGE_ALLOWED_ROLES['/discipulado']).toEqual(['LEADER', 'DISCIPLER', 'PASTOR', 'ADMIN']);
    expect(PAGE_ALLOWED_ROLES['/acompanhamento']).toEqual(['LEADER', 'DISCIPLER', 'PASTOR', 'ADMIN']);
    expect(PAGE_ALLOWED_ROLES['/lideranca']).toEqual(['DISCIPLER', 'PASTOR', 'ADMIN']);
    expect(PAGE_ALLOWED_ROLES['/relatorios']).toEqual(['DISCIPLER', 'PASTOR', 'ADMIN']);
    expect(PAGE_ALLOWED_ROLES['/familias']).toEqual(['PASTOR', 'ADMIN']);
    expect(PAGE_ALLOWED_ROLES['/ministerios']).toEqual(['PASTOR', 'ADMIN']);
    expect(PAGE_ALLOWED_ROLES['/escalas']).toEqual(['PASTOR', 'ADMIN']);
    expect(PAGE_ALLOWED_ROLES['/configuracoes']).toEqual(['ADMIN']);
  });
});
