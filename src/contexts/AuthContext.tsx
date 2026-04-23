import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type Session, type User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type Role = 'MEMBER' | 'LEADER' | 'DISCIPLER' | 'PASTOR' | 'ADMIN';

export interface AuthUser {
  id: string;
  supabaseId: string;
  name: string;
  email: string;
  role: Role;
  campus: string;
  cellId: string | null;
  avatarUrl?: string | null;
  supervisedCellIds: string[];
  memberIds: string[];
  leaderPersonIds: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isGoogleAuthEnabled: boolean;
  signInWithPassword: (email: string, password: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  logout: () => Promise<void>;
}

type ProfileRow = {
  id: string;
  email: string;
  personId: string;
  roleId: string;
  supabaseId: string;
  Role?: {
    name: Role;
  } | null;
  Person?: {
    id: string;
    firstName: string;
    lastName: string | null;
    campusId: string | null;
    cellGroupId: string | null;
    Campus?: {
      name: string;
    } | null;
  } | null;
};

type ScopePersonRow = {
  id: string;
  campusId: string | null;
  cellGroupId: string | null;
};

type ScopeCellRow = {
  id: string;
  leaderId: string;
  campusId: string | null;
};

const AuthContext = createContext<AuthContextType | null>(null);
const isGoogleAuthEnabled = import.meta.env.VITE_ENABLE_GOOGLE_AUTH === 'true';

function getAuthRedirectUrl() {
  const configured = import.meta.env.VITE_APP_URL?.trim();
  if (configured) return configured;
  return window.location.origin;
}

async function computeScope(user: ProfileRow) {
  const [{ data: personsData, error: personsError }, { data: cellsData, error: cellsError }] = await Promise.all([
    supabase.from('Person').select('id, campusId, cellGroupId'),
    supabase.from('CellGroup').select('id, leaderId, campusId'),
  ]);

  if (personsError) throw personsError;
  if (cellsError) throw cellsError;

  const persons = (personsData ?? []) as ScopePersonRow[];
  const cells = (cellsData ?? []) as ScopeCellRow[];
  const personId = user.Person?.id ?? user.personId;
  const campusId = user.Person?.campusId ?? null;

  if (user.Role?.name === 'ADMIN' || user.Role?.name === 'PASTOR') {
    return {
      supervisedCellIds: cells.map((cell) => cell.id),
      memberIds: persons.map((person) => person.id),
      leaderPersonIds: Array.from(new Set(cells.map((cell) => cell.leaderId))),
    };
  }

  if (user.Role?.name === 'DISCIPLER') {
    const supervisedCells = cells.filter((cell) => cell.campusId === campusId);
    const supervisedCellIds = supervisedCells.map((cell) => cell.id);

    return {
      supervisedCellIds,
      memberIds: persons.filter((person) => person.cellGroupId && supervisedCellIds.includes(person.cellGroupId)).map((person) => person.id),
      leaderPersonIds: Array.from(new Set(supervisedCells.map((cell) => cell.leaderId))),
    };
  }

  if (user.Role?.name === 'LEADER') {
    const supervisedCellIds = cells.filter((cell) => cell.leaderId === personId).map((cell) => cell.id);

    return {
      supervisedCellIds,
      memberIds: persons.filter((person) => person.cellGroupId && supervisedCellIds.includes(person.cellGroupId)).map((person) => person.id),
      leaderPersonIds: [personId],
    };
  }

  return {
    supervisedCellIds: user.Person?.cellGroupId ? [user.Person.cellGroupId] : [],
    memberIds: personId ? [personId] : [],
    leaderPersonIds: [],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const hydrate = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);

      if (data.session) {
        await fetchProfile(data.session.user);
      } else {
        setIsLoading(false);
      }
    };

    void hydrate();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);

      if (nextSession) {
        void fetchProfile(nextSession.user);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(sbUser: SupabaseUser) {
    setIsLoading(true);

    try {
      let { data: profile, error } = await supabase
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
        profile = await createAutomaticProfile(sbUser);
      } else if (error) {
        throw error;
      }

      if (!profile) {
        throw new Error('O perfil autenticado não foi encontrado no Supabase.');
      }

      const typedProfile = profile as unknown as ProfileRow;
      const scope = await computeScope(typedProfile);
      const firstName = typedProfile.Person?.firstName ?? sbUser.user_metadata?.full_name ?? 'Utilizador';
      const lastName = typedProfile.Person?.lastName ?? '';
      const name = `${firstName} ${lastName}`.trim();

      setUser({
        id: typedProfile.Person?.id ?? typedProfile.personId,
        supabaseId: typedProfile.supabaseId,
        name,
        email: typedProfile.email,
        role: typedProfile.Role?.name ?? 'MEMBER',
        campus: typedProfile.Person?.Campus?.name ?? 'Sem campus',
        cellId: typedProfile.Person?.cellGroupId ?? null,
        avatarUrl: sbUser.user_metadata?.avatar_url ?? null,
        supervisedCellIds: scope.supervisedCellIds,
        memberIds: scope.memberIds,
        leaderPersonIds: scope.leaderPersonIds,
      });
    } catch (currentError) {
      console.error('Erro ao carregar perfil:', currentError);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function createAutomaticProfile(sbUser: SupabaseUser) {
    if (!sbUser.email) {
      throw new Error('Authenticated user is missing an email address.');
    }

    const [{ data: defaultRole, error: roleError }, { data: defaultCampus }] = await Promise.all([
      supabase.from('Role').select('id').eq('name', 'MEMBER').single(),
      supabase.from('Campus').select('id').eq('name', 'Lisboa').maybeSingle(),
    ]);

    if (roleError || !defaultRole) {
      throw roleError ?? new Error('Default MEMBER role not found.');
    }

    const fullName = sbUser.user_metadata?.full_name?.trim() || sbUser.email.split('@')[0] || 'Novo Membro';
    const [firstName, ...rest] = fullName.split(/\s+/);
    const personId = `per_${crypto.randomUUID()}`;

    const { error: personError } = await supabase.from('Person').insert({
      id: personId,
      firstName: firstName || 'Novo',
      lastName: rest.join(' ') || 'Membro',
      email: sbUser.email,
      campusId: defaultCampus?.id ?? null,
      status: 'MEMBRO',
    });

    if (personError) throw personError;

    const { data: createdUser, error: userError } = await supabase
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

  const signInWithPassword = (email: string, password: string) =>
    supabase.auth.signInWithPassword({
      email,
      password,
    });

  const signInWithGoogle = () => {
    if (!isGoogleAuthEnabled) {
      return Promise.resolve({
        data: { provider: 'google', url: null },
        error: new Error('Login com Google indisponivel nesta fase de lancamento.'),
      });
    }

    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAuthRedirectUrl(),
      },
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: user !== null,
        isLoading,
        isGoogleAuthEnabled,
        signInWithPassword,
        signInWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
