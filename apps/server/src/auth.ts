import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'topems-dev-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export interface TokenPayload {
  userId: string;
  username: string;
  roles: string[];
  tenantId: string;
  isSuperuser: boolean;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export const USERS: Record<string, { password: string; user: Omit<TokenPayload, 'userId' | 'username'> & { userId: string; username: string } }> = {
  admin: {
    password: 'admin123',
    user: {
      userId: '915e3e28-ef9a-4c05-ad23-42fae0a4096a',
      username: 'admin',
      roles: ['admin', 'user'],
      tenantId: 'default',
      isSuperuser: true,
    },
  },
  operator: {
    password: 'operator123',
    user: {
      userId: 'operator-001',
      username: 'operator',
      roles: ['user', 'operator'],
      tenantId: 'default',
      isSuperuser: false,
    },
  },
};

export function authenticateToken(
  req: { headers: { authorization?: string } },
  res: { status: (code: number) => { json: (data: unknown) => void } },
  next: () => void,
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
    return;
  }

  (req as unknown as { user: TokenPayload }).user = payload;
  next();
}
