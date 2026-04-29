import type { Role } from '../contexts/AuthContext';

export const ROLE_LABELS: Record<Role, string> = {
  MEMBER: 'Membro',
  LEADER: 'Líder',
  DISCIPLER: 'Discipulador',
  PASTOR: 'Pastor',
  ADMIN: 'Administrador',
};

export function getRoleLabel(role?: string | null) {
  if (!role) return ROLE_LABELS.MEMBER;
  return ROLE_LABELS[role as Role] ?? role;
}
