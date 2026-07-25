import { Router } from 'express';
import { signToken, verifyToken, USERS, authenticateToken } from '../auth';

const router = Router();

const ok = <T>(data: T) => ({ success: true, code: 200, message: 'OK', data, timestamp: Date.now() });
const err = (message: string, code = 400) => ({ success: false, code, message, timestamp: Date.now() });

router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };

    if (!username || !password) {
      res.status(400).json(err('Username and password are required'));
      return;
    }

    const userRecord = USERS[username];
    if (!userRecord || userRecord.password !== password) {
      res.status(401).json(err('Invalid username or password', 401));
      return;
    }

    const userData = userRecord.user;
    const token = signToken({
      userId: userData.userId,
      username: userData.username,
      roles: userData.roles,
      tenantId: userData.tenantId,
      isSuperuser: userData.isSuperuser,
    });

    res.json(ok({
      access_token: token,
      token_type: 'bearer',
      expires_in: 86400,
      user: {
        id: userData.userId,
        username: userData.username,
        tenant_id: userData.tenantId,
        roles: userData.roles,
        is_superuser: userData.isSuperuser,
      },
    }));
  } catch {
    res.status(500).json(err('Internal server error', 500));
  }
});

router.post('/auth/refresh', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    res.status(401).json(err('No token provided', 401));
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json(err('Invalid token', 401));
    return;
  }

  const newToken = signToken({
    userId: payload.userId,
    username: payload.username,
    roles: payload.roles,
    tenantId: payload.tenantId,
    isSuperuser: payload.isSuperuser,
  });

  res.json(ok({
    access_token: newToken,
    token_type: 'bearer',
    expires_in: 86400,
  }));
});

router.get('/auth/me', authenticateToken as any, (req, res) => {
  const user = (req as unknown as { user: { userId: string; username: string; roles: string[]; tenantId: string; isSuperuser: boolean } }).user;
  res.json(ok({
    id: user.userId,
    username: user.username,
    tenant_id: user.tenantId,
    roles: user.roles,
    is_superuser: user.isSuperuser,
  }));
});

router.post('/auth/logout', (_req, res) => {
  res.json(ok({ success: true }));
});

router.get('/auth/health', (_req, res) => {
  res.json({ success: true, status: 'ok', service: 'iam-auth', timestamp: Date.now() });
});

export default router;
