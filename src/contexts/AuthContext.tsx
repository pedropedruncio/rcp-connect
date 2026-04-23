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
  signInWithPassword: (email: string, password: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

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

  const signInWithGoogle = () =>
    Promise.resolve({
      data: { provider: 'google', url: null },
      error: new Error('Login com Google indisponivel no modo de API privada.'),
    });

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
        isGoogleAuthEnabled: false,
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
