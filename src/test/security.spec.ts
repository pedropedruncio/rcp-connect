import { describe, expect, it, vi, beforeEach } from 'vitest';
import { handler } from '../../server/api-handler.js';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
      refreshSession: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    })),
  })),
}));

describe('Security - API RBAC and Error Handling', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockProfile = {
    id: 'usr_1',
    roleId: 'role_member',
    personId: 'per_1',
    Role: { name: 'MEMBER' },
    Person: { id: 'per_1', firstName: 'Test', lastName: 'User' }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_ANON_KEY = 'test-key';
  });

  it('allows mutation when user has the required role', async () => {
    // Setup mock for an ADMIN user
    const adminProfile = { ...mockProfile, Role: { name: 'ADMIN' } };

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: vi.fn((table) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: adminProfile, error: null }),
        maybeSingle: vi.fn(),
        insert: vi.fn().mockResolvedValue({ error: null }),
      })),
    };

    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const event = {
      httpMethod: 'POST',
      path: '/api/cells',
      headers: { cookie: 'rcp_access_token=valid-token' },
      body: JSON.stringify({ name: 'New Cell' })
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(200);
  });

  it('denies mutation when user does not have the required role (Defense in Depth)', async () => {
    // Setup mock for a MEMBER user trying to create a cell
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: vi.fn((table) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        maybeSingle: vi.fn(),
      })),
    };

    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const event = {
      httpMethod: 'POST',
      path: '/api/cells',
      headers: { cookie: 'rcp_access_token=valid-token' },
      body: JSON.stringify({ name: 'New Cell' })
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('Não tem permissão');
  });

  it('correctly extracts resource from various path formats', async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: vi.fn((table) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      })),
    };
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const paths = ['/api/cells', '/cells', 'cells/', '/api/cells/123'];
    for (const p of paths) {
      const event = {
        httpMethod: 'POST',
        path: p,
        headers: { cookie: 'rcp_access_token=valid-token' },
        body: JSON.stringify({ name: 'Test' })
      };
      const response = await handler(event);
      // MEMBER cannot POST to cells, should be 403
      expect(response.statusCode, `Failed for path: ${p}`).toBe(403);
    }
  });

  it('returns generic error message for 500 status codes (Info Leakage Prevention)', async () => {
    // Force an internal error
    const mockClient = {
      auth: {
        getUser: vi.fn().mockRejectedValue(new Error('Sensitive DB Error details')),
      },
    };

    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const event = {
      httpMethod: 'GET',
      path: '/api/data',
      headers: { cookie: 'rcp_access_token=valid-token' }
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Erro interno no servidor.');
    expect(body.error).not.toContain('Sensitive DB Error details');
  });
});
