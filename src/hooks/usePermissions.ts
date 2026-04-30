/**
 * usePermissions.ts — Hook centralizado de controlo de acessos.
 *
 * Todas as páginas e componentes devem usar este hook para verificar permissões,
 * em vez de replicar lógica de role em cada ficheiro.
 */
import { useAuth, Role } from '../contexts/AuthContext';

// ─── Constantes de Permissão ─────────────────────────────────────────────────

/** Roles que têm acesso à página */
const CAN_VIEW_DASHBOARD: Role[]       = ['MEMBER', 'LEADER', 'DISCIPLER', 'PASTOR', 'ADMIN'];
const CAN_VIEW_PESSOAS: Role[]         = ['LEADER', 'DISCIPLER', 'PASTOR', 'ADMIN'];
const CAN_VIEW_FAMILIAS: Role[]        = ['PASTOR', 'ADMIN'];
const CAN_VIEW_LIDERANCA: Role[]       = ['DISCIPLER', 'PASTOR', 'ADMIN'];
const CAN_VIEW_CELULAS: Role[]         = ['LEADER', 'DISCIPLER', 'PASTOR', 'ADMIN'];
const CAN_VIEW_MINISTERIOS: Role[]     = ['PASTOR', 'ADMIN'];
const CAN_VIEW_EVENTOS: Role[]         = ['MEMBER', 'LEADER', 'DISCIPLER', 'PASTOR', 'ADMIN'];
const CAN_VIEW_DISCIPULADO: Role[]     = ['LEADER', 'DISCIPLER', 'PASTOR', 'ADMIN'];
const CAN_VIEW_ACOMPANHAMENTO: Role[]  = ['LEADER', 'DISCIPLER', 'PASTOR', 'ADMIN'];
const CAN_VIEW_ESCALAS: Role[]         = ['PASTOR', 'ADMIN'];
const CAN_VIEW_RELATORIOS: Role[]      = ['DISCIPLER', 'PASTOR', 'ADMIN'];
const CAN_VIEW_CONFIGURACOES: Role[]   = ['ADMIN'];
const CAN_VIEW_MEU_PERFIL: Role[]      = ['MEMBER', 'LEADER', 'DISCIPLER', 'PASTOR', 'ADMIN'];
const CAN_VIEW_AGENDA: Role[]          = ['MEMBER', 'LEADER', 'DISCIPLER', 'PASTOR', 'ADMIN'];
const CAN_VIEW_MINHA_FAMILIA: Role[]   = ['MEMBER', 'LEADER', 'DISCIPLER', 'PASTOR', 'ADMIN'];

/** Permissões de acção */
const CAN_ADD_MEMBER: Role[]           = ['LEADER', 'DISCIPLER', 'PASTOR', 'ADMIN'];
const CAN_EDIT_MEMBER: Role[]          = ['LEADER', 'DISCIPLER', 'PASTOR', 'ADMIN'];
const CAN_EXPORT_DATA: Role[]          = ['DISCIPLER', 'PASTOR', 'ADMIN'];
const CAN_ADD_CELL: Role[]             = ['PASTOR', 'ADMIN'];
const CAN_ADD_LEADER: Role[]           = ['PASTOR', 'ADMIN'];
const CAN_EDIT_LEADER: Role[]          = ['DISCIPLER', 'PASTOR', 'ADMIN'];
const CAN_ADD_DISCIPLESHIP: Role[]     = ['LEADER', 'DISCIPLER', 'PASTOR', 'ADMIN'];
const CAN_ADD_FOLLOWUP: Role[]         = ['LEADER', 'DISCIPLER', 'PASTOR', 'ADMIN'];

// Acessos específicos e configuração
const CAN_CREATE_GLOBAL_EVENT: Role[]        = ['PASTOR', 'ADMIN'];
const CAN_MANAGE_EVENT_REGISTRATIONS: Role[] = ['DISCIPLER', 'PASTOR', 'ADMIN'];
const CAN_MANAGE_MINISTERIAL_CONFIG: Role[]  = ['DISCIPLER', 'PASTOR', 'ADMIN'];
const CAN_MANAGE_SYSTEM: Role[]              = ['PASTOR', 'ADMIN'];
const CAN_MANAGE_CREDENTIALS: Role[]         = ['ADMIN'];

// ─── Mapeamento de Páginas para Roles ────────────────────────────────────────

export const PAGE_ALLOWED_ROLES: Record<string, Role[]> = {
  '/':                CAN_VIEW_DASHBOARD,
  '/meu-perfil':      CAN_VIEW_MEU_PERFIL,
  '/minha-agenda':    CAN_VIEW_AGENDA,
  '/pessoas':         CAN_VIEW_PESSOAS,
  '/familias':        CAN_VIEW_FAMILIAS,
  '/familia':         CAN_VIEW_MINHA_FAMILIA,
  '/lideranca':       CAN_VIEW_LIDERANCA,
  '/celulas':         CAN_VIEW_CELULAS,
  '/ministerios':     CAN_VIEW_MINISTERIOS,
  '/eventos':         CAN_VIEW_EVENTOS,
  '/discipulado':     CAN_VIEW_DISCIPULADO,
  '/acompanhamento':  CAN_VIEW_ACOMPANHAMENTO,
  '/escalas':         CAN_VIEW_ESCALAS,
  '/relatorios':      CAN_VIEW_RELATORIOS,
  '/configuracoes':   CAN_VIEW_CONFIGURACOES,
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role;

  const has = (allowedRoles: Role[]): boolean =>
    !!role && allowedRoles.includes(role);

  return {
    // ── Páginas ──────────────────────────────────────────────────────────────
    canViewPessoas:        has(CAN_VIEW_PESSOAS),
    canViewFamilias:       has(CAN_VIEW_FAMILIAS),
    canViewLideranca:      has(CAN_VIEW_LIDERANCA),
    canViewCelulas:        has(CAN_VIEW_CELULAS),
    canViewMinisterios:    has(CAN_VIEW_MINISTERIOS),
    canViewEventos:        has(CAN_VIEW_EVENTOS),
    canViewDiscipulado:    has(CAN_VIEW_DISCIPULADO),
    canViewAcompanhamento: has(CAN_VIEW_ACOMPANHAMENTO),
    canViewEscalas:        has(CAN_VIEW_ESCALAS),
    canViewRelatorios:     has(CAN_VIEW_RELATORIOS),
    canViewConfiguracoes:  has(CAN_VIEW_CONFIGURACOES),
    canViewMeuPerfil:      has(CAN_VIEW_MEU_PERFIL),
    canViewAgenda:         has(CAN_VIEW_AGENDA),
    canViewMinhaFamilia:   has(CAN_VIEW_MINHA_FAMILIA),

    // ── Acções ───────────────────────────────────────────────────────────────
    canAddMember:          has(CAN_ADD_MEMBER),
    canEditMember:         has(CAN_EDIT_MEMBER),
    canExportData:         has(CAN_EXPORT_DATA),
    canAddCell:            has(CAN_ADD_CELL),
    canAddLeader:          has(CAN_ADD_LEADER),
    canEditLeader:         has(CAN_EDIT_LEADER),
    canAddDiscipleship:    has(CAN_ADD_DISCIPLESHIP),
    canAddFollowUp:        has(CAN_ADD_FOLLOWUP),

    // ── Acessos Específicos Gerais ──────────────────────────────────────────
    canCreateGlobalEvent:        has(CAN_CREATE_GLOBAL_EVENT),
    canManageEventRegistrations: has(CAN_MANAGE_EVENT_REGISTRATIONS),
    canManageMinisterialConfig:  has(CAN_MANAGE_MINISTERIAL_CONFIG),
    canManageSystem:             has(CAN_MANAGE_SYSTEM),
    canManageCredentials:        has(CAN_MANAGE_CREDENTIALS),

    // ── Âmbitos ───────────────────────────────────────────────────────────────
    /** Verdadeiro se o utilizador tem acesso irrestrito (pastor/admin) */
    isGlobal:         has(['PASTOR', 'ADMIN']),
    /** Verdadeiro se o utilizador tem âmbito alargado (discipulador+) */
    isWide:           has(['DISCIPLER', 'PASTOR', 'ADMIN']),
    /** Verdadeiro se o utilizador é líder ou superior */
    isLeaderOrAbove:       has(['LEADER', 'DISCIPLER', 'PASTOR', 'ADMIN']),
  };
}
