import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiRequest } from '../lib/api';

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
  needsOnboarding: boolean;
}

export interface AuthSession {
  user: {
    id: string;
    email: string | null;
  };
}

interface AuthResponse {
  session: AuthSession | null;
  user: AuthUser | null;
}

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isGoogleAuthEnabled: boolean;
  needsOnboarding: boolean;
  signInWithPassword: (email: string, password: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  signUpWithPassword: (email: string, password: string, fullName: string) => Promise<{
    data: any;
    error: any | null;
    needsEmailConfirmation: boolean;
  }>;
  completeOnboarding: (data: {
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
    birthdate?: string;
    campusId?: string;
  }) => Promise<{ error: any | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const googleAuthEnabled = import.meta.env.VITE_ENABLE_GOOGLE_AUTH === 'true';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const data = await apiRequest<AuthResponse>('/auth/session');
        setSession(data.session);
        setUser(data.user);
      } catch (error) {
        console.error('Erro ao carregar sessão:', error);
        setSession(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void hydrate();
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    try {
      const data = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setSession(data.session);
      setUser(data.user);
      return { data, error: null };
    } catch (error) {
      setSession(null);
      setUser(null);
      return { data: null, error };
    }
  };

  const signInWithGoogle = async () => {
    if (!googleAuthEnabled) {
      return {
        data: { provider: 'google', url: null },
        error: new Error('Login com Google indisponível neste ambiente.'),
      };
    }

    try {
      const data = await apiRequest<{ url: string }>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ returnTo: '/' }),
      });

      window.location.assign(data.url);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signUpWithPassword = async (email: string, password: string, fullName: string) => {
    try {
      const data = await apiRequest<AuthResponse & { needsEmailConfirmation?: boolean; message?: string }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, fullName }),
      });

      if (data.needsEmailConfirmation) {
        return { data, error: null, needsEmailConfirmation: true };
      }

      setSession(data.session);
      setUser(data.user);
      return { data, error: null, needsEmailConfirmation: false };
    } catch (error) {
      return { data: null, error, needsEmailConfirmation: false };
    }
  };

  const completeOnboarding = async (data: {
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
    birthdate?: string;
    campusId?: string;
  }) => {
    try {
      const result = await apiRequest<{ ok: boolean; user: AuthUser }>('/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (result.user) {
        setUser(result.user);
      }
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      setSession(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: user !== null,
        isLoading,
        isGoogleAuthEnabled: googleAuthEnabled,
        needsOnboarding: user?.needsOnboarding ?? false,
        signInWithPassword,
        signInWithGoogle,
        signUpWithPassword,
        completeOnboarding,
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
