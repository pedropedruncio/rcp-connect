import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from '../../server/api-handler';

// Mock supabase-js
vi.mock('@supabase/supabase-js', () => {
  const mockClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      refreshSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: vi.fn(),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        order: vi.fn().mockReturnThis(),
      }),
    }),
  };
  return {
    createClient: vi.fn(() => mockClient),
  };
});

describe('Security: API Handler Error Sanitization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
  });

  it('returns generic error message for 500 status codes', async () => {
    const event = {
      httpMethod: 'POST',
      path: '/api/auth/login',
      body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
      headers: {},
    };

    const { createClient } = await import('@supabase/supabase-js');
    const mockClient = (createClient as any)();
    mockClient.auth.signInWithPassword.mockImplementation(() => {
      throw new Error('Sensitive DB Error Details');
    });

    const response = await handler(event);

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Erro interno no servidor.');
  });

  it('returns specific error message for non-500 status codes', async () => {
    const event = {
      httpMethod: 'POST',
      path: '/api/auth/login',
      body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
      headers: {},
    };

    const { createClient } = await import('@supabase/supabase-js');
    const mockClient = (createClient as any)();
    mockClient.auth.signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid credentials' }
    });

    const response = await handler(event);

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Invalid credentials');
  });
});
