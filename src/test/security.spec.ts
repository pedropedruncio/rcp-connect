import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handler } from '../../server/api-handler.js';

const mockSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: new Error('Unauthorized') })),
    refreshSession: vi.fn(() => Promise.resolve({ data: { session: null, user: null }, error: new Error('Unauthorized') })),
    signInWithPassword: vi.fn(() => Promise.resolve({ data: { session: null, user: null }, error: { message: 'Credenciais inválidas.' } })),
  },
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

describe('Security: Error Handling', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
  });

  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
  });

  it('should suppress detailed error messages for 500 status codes', async () => {
    // We need to trigger an error that doesn't have a statusCode (defaults to 500)
    // The handler parses body and then calls getAuthedContext
    // If getAuthedContext throws an unexpected error, it will trigger a 500.

    const event = {
      httpMethod: 'GET',
      path: '/api/data',
      headers: {
        cookie: 'rcp_access_token=invalid'
      }
    };

    // Mock implementation of getAuthedContext would be better but it's internal.
    // Let's try to pass invalid JSON to a POST request that is parsed.
    const postEvent = {
      httpMethod: 'POST',
      path: '/api/auth/login',
      body: 'invalid-json'
    };

    const response = await handler(postEvent);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(500);
    expect(body.error).toBe('Erro interno no servidor.');
    expect(body.error).not.toContain('Unexpected token');
  });

  it('should preserve custom status codes and messages for non-500 errors', async () => {
     const postEvent = {
      httpMethod: 'POST',
      path: '/api/auth/login',
      body: JSON.stringify({ email: 'test@example.com', password: 'wrong' })
    };

    // This should hit the 401 in the handler
    const response = await handler(postEvent);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(401);
    expect(body.error).toBe('Credenciais inválidas.');
  });
});
