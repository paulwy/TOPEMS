import fs from 'node:fs';
import { SESSION_SEED_FILE } from './env';

export interface SessionSeed {
  token: string;
  refreshToken: string;
  user: Record<string, unknown>;
  roles: string[];
  permissions: string[];
  tenantId: string;
  tokenExpiry: number;
}

/**
 * 读取 global-setup 生成的真实登录会话，供需要手工 seed localStorage 的
 * 用例复用。缺失时直接报错而不是静默退化成假 token（假 token 会导致
 * useAuth 判定过期并跳登录页）。
 */
export function readSessionSeed(): SessionSeed {
  const file = SESSION_SEED_FILE;
  if (!fs.existsSync(file)) {
    throw new Error(
      `[E2E] 缺少 ${file}：请通过 playwright test 运行（global-setup 会自动登录并生成）`
    );
  }
  return JSON.parse(fs.readFileSync(file, 'utf8')) as SessionSeed;
}
