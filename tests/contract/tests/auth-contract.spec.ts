import { createMockProvider, authHeaders } from './setup';
import axios from 'axios';

describe('Authentication API Contract', () => {
  const provider = createMockProvider('topems-iam');

  it('should return JWT token on valid credentials', async () => {
    provider
      .given('a valid user exists with username admin and password password')
      .uponReceiving('a request to login with valid credentials')
      .withRequest({
        method: 'POST',
        path: '/api/core/iam/auth/login',
        headers: { 'Content-Type': 'application/json' },
        body: { username: 'admin', password: 'password' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          code: 0,
          message: 'success',
          data: {
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
            refreshToken: 'refresh-token-abc123',
            expiresIn: 86400,
            user: {
              id: 'user-001',
              username: 'admin',
              email: 'admin@example.com',
              name: 'Admin User',
            },
          },
        },
      });

    await provider.executeTest(async (mockServer) => {
      const response = await axios.post(`${mockServer.url}/api/core/iam/auth/login`, {
        username: 'admin',
        password: 'password',
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('code', 0);
      expect(response.data.data).toHaveProperty('token');
      expect(response.data.data).toHaveProperty('refreshToken');
      expect(response.data.data).toHaveProperty('expiresIn', 86400);
      expect(response.data.data.user).toHaveProperty('username', 'admin');
    });
  });

  it('should return 401 on invalid credentials', async () => {
    provider
      .given('no user exists with username invalid and password wrong')
      .uponReceiving('a request to login with invalid credentials')
      .withRequest({
        method: 'POST',
        path: '/api/core/iam/auth/login',
        headers: { 'Content-Type': 'application/json' },
        body: { username: 'invalid', password: 'wrong' },
      })
      .willRespondWith({
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        body: {
          code: 401,
          message: 'Invalid username or password',
          data: null,
        },
      });

    await provider.executeTest(async (mockServer) => {
      await expect(
        axios.post(`${mockServer.url}/api/core/iam/auth/login`, {
          username: 'invalid',
          password: 'wrong',
        })
      ).rejects.toMatchObject({
        response: {
          status: 401,
          data: { code: 401, message: 'Invalid username or password' },
        },
      });
    });
  });

  it('should validate token and return user info', async () => {
    const token = 'valid-token';

    provider
      .given('a valid JWT token exists for user admin')
      .uponReceiving('a request to validate token')
      .withRequest({
        method: 'GET',
        path: '/api/core/iam/auth/validate',
        headers: authHeaders(token),
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          code: 0,
          message: 'success',
          data: {
            valid: true,
            claims: {
              userId: 'user-001',
              username: 'admin',
              email: 'admin@example.com',
              roles: ['admin', 'user'],
              permissions: ['system:read', 'system:write'],
            },
          },
        },
      });

    await provider.executeTest(async (mockServer) => {
      const response = await axios.get(`${mockServer.url}/api/core/iam/auth/validate`, {
        headers: authHeaders(token),
      });

      expect(response.status).toBe(200);
      expect(response.data.code).toBe(0);
      expect(response.data.data.valid).toBe(true);
      expect(response.data.data.claims.username).toBe('admin');
      expect(response.data.data.claims.roles).toContain('admin');
    });
  });

  it('should refresh token', async () => {
    const refreshToken = 'valid-refresh-token';

    provider
      .given('a valid refresh token exists')
      .uponReceiving('a request to refresh token')
      .withRequest({
        method: 'POST',
        path: '/api/core/iam/auth/refresh',
        headers: { 'Content-Type': 'application/json' },
        body: { refreshToken },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          code: 0,
          message: 'success',
          data: {
            token: 'new-access-token',
            refreshToken: 'new-refresh-token',
            expiresIn: 86400,
          },
        },
      });

    await provider.executeTest(async (mockServer) => {
      const response = await axios.post(`${mockServer.url}/api/core/iam/auth/refresh`, {
        refreshToken,
      });

      expect(response.status).toBe(200);
      expect(response.data.code).toBe(0);
      expect(response.data.data.token).toBe('new-access-token');
      expect(response.data.data.refreshToken).toBe('new-refresh-token');
    });
  });
});
