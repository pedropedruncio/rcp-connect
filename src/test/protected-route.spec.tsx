import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function renderProtectedRoute() {
  return render(
    <MemoryRouter initialEntries={['/privado']}>
      <Routes>
        <Route path="/login" element={<div>login</div>} />
        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route path="/privado" element={<div>conteudo-privado</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockedUseAuth.mockReset();
  });

  it('redireciona convidados para /login', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      isGoogleAuthEnabled: false,
      signInWithEmail: vi.fn(),
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    });

    renderProtectedRoute();
    expect(screen.getByText('login')).toBeInTheDocument();
  });

  it('permite a rota quando o role é aceite', () => {
    mockedUseAuth.mockReturnValue({
      user: {
        id: 'per_1',
        supabaseId: 'sup_1',
        name: 'Admin RCP',
        email: 'admin@rcp.pt',
        role: 'ADMIN',
        campus: 'Lisboa',
        cellId: null,
        avatarUrl: null,
        supervisedCellIds: [],
        memberIds: [],
        leaderPersonIds: [],
      },
      session: null,
      isAuthenticated: true,
      isLoading: false,
      isGoogleAuthEnabled: false,
      signInWithEmail: vi.fn(),
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    });

    renderProtectedRoute();
    expect(screen.getByText('conteudo-privado')).toBeInTheDocument();
  });
});
