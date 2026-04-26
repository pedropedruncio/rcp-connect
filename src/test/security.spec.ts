import { describe, expect, it, vi, beforeEach } from 'vitest';
import { handler } from '../../server/api-handler';
import { createClient } from '@supabase/supabase-js';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

describe('Security: Server-Side Authorization', () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    order: vi.fn().mockReturnThis(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as any).mockReturnValue(mockSupabase);
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'mock-key';
  });

  it('blocks unauthorized mutations for MEMBER role', async () => {
    // 1. Mock authentication
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user', email: 'test@rcp.pt' } },
      error: null
    });

    // 2. Mock profile fetch returning MEMBER role
    mockSupabase.single.mockResolvedValue({
      data: {
        id: 'usr_1',
        roleId: 'role_member',
        supabaseId: 'test-user',
        Role: { name: 'MEMBER' },
        Person: { id: 'per_1', campusId: 'campus_1', cellGroupId: null }
      },
      error: null
    });

    // 3. Mock computeScope queries (needed because getAuthUser calls computeScope)
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'Person' || table === 'CellGroup') {
        return {
          select: () => Promise.resolve({ data: [], error: null })
        };
      }
      return mockSupabase;
    });

    const event = {
      httpMethod: 'POST',
      path: '/api/people',
      headers: { cookie: 'rcp_access_token=mock-token' },
      body: JSON.stringify({ firstName: 'Hacker' }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Acesso negado. Permissões insuficientes.');
  });

  it('masks internal server errors with a generic message', async () => {
     // Force an error in getAuthedContext or elsewhere
     mockSupabase.auth.getUser.mockRejectedValue(new Error('Sensitive DB Error details'));

     const event = {
      httpMethod: 'GET',
      path: '/api/data',
      headers: { cookie: 'rcp_access_token=mock-token' },
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Erro interno no servidor.');
    expect(body.error).not.toContain('Sensitive DB Error details');
  });
});
