import { describe, expect, it, vi, beforeEach } from 'vitest';
import { handler } from '../../server/api-handler';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
      refreshSession: vi.fn(),
      signInWithPassword: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    })),
  })),
}));

describe('Security: Server RBAC and Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_ANON_KEY = 'test-key';
  });

  it('suppresses internal details on 500 errors', async () => {
    const event = {
      httpMethod: 'GET',
      path: '/api/data',
      headers: { cookie: 'rcp_access_token=valid-token' },
    };

    // Force a crash in getAuthedContext or similar
    const { createClient } = await import('@supabase/supabase-js');
    (createClient as any).mockImplementationOnce(() => {
      throw new Error('Database connection failed - detailed schema error here');
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(500);
    expect(body.error).toBe('Erro interno no servidor.');
    expect(body.error).not.toContain('Database connection failed');
  });

  it('allows authorized mutation (Admin on cells)', async () => {
    const event = {
      httpMethod: 'POST',
      path: '/api/cells',
      headers: { cookie: 'rcp_access_token=admin-token' },
      body: JSON.stringify({ name: 'Nova Celula' }),
    };

    const { createClient } = await import('@supabase/supabase-js');
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-id', email: 'admin@test.com' } }, error: null }),
      },
      from: vi.fn((table) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          if (table === 'User') {
            return { data: { Role: { name: 'ADMIN' }, Person: { id: 'p1' } }, error: null };
          }
          return { data: {}, error: null };
        }),
        maybeSingle: vi.fn().mockResolvedValue({ data: {}, error: null }),
        insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
      })),
    };

    (createClient as any).mockReturnValue(mockClient);

    const result = await handler(event);
    expect(result.statusCode).toBe(200);
  });

  it('blocks unauthorized mutation (Member on cells)', async () => {
    const event = {
      httpMethod: 'POST',
      path: '/api/cells',
      headers: { cookie: 'rcp_access_token=member-token' },
      body: JSON.stringify({ name: 'Nova Celula' }),
    };

    const { createClient } = await import('@supabase/supabase-js');
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'member-id', email: 'member@test.com' } }, error: null }),
      },
      from: vi.fn((table) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          if (table === 'User') {
            return { data: { Role: { name: 'MEMBER' }, Person: { id: 'p2' } }, error: null };
          }
          return { data: {}, error: null };
        }),
        maybeSingle: vi.fn().mockResolvedValue({ data: {}, error: null }),
      })),
    };

    (createClient as any).mockReturnValue(mockClient);

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(403);
    expect(body.error).toBe('Você não tem permissão para realizar esta ação.');
  });
});
