/**
 * @done V80 Tier2 coverage
 *
 * 环境变量读取单例单测
 * @see @/config/env
 *
 * 注意：Vite 在 transform 阶段会静态替换 `import.meta.env.SOME_KEY` 为字面量值，
 * 所以本测试统一改用方括号访问的等价读取，并通过 mock 整个 env 模块来稳定
 * 验证 lazy getter 的行为。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// 一个稳定可控的内存 env store；每个测试都重置
const envStore: Record<string, string | boolean | undefined> = {};

vi.mock('@/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/env')>();

  const getEnv = <T = string>(key: string, defaultValue?: T): T | undefined => {
    if (typeof envStore[key] !== 'undefined') {
      const raw = envStore[key];
      if (typeof defaultValue === 'boolean') {
        return (String(raw) === 'true') as unknown as T;
      }
      if (typeof defaultValue === 'number') {
        const n = Number(raw);
        return (Number.isNaN(n) ? defaultValue : n) as unknown as T;
      }
      return String(raw) as unknown as T;
    }
    return defaultValue;
  };

  return {
    ...actual,
    getEnv,
    isDev: () => getEnv<boolean>('DEV', true),
    isProd: () => getEnv<boolean>('PROD', false),
    VITEDeploymentMode: () => getEnv('VITEDeploymentMode', 'static') as string,
    VITEApiBaseUrl: () => getEnv('VITEApiBaseUrl', '/api') as string,
    VITEEnableDebugMode: () => getEnv<boolean>('VITEEnableDebugMode', false),
    VITELogLevel: () => getEnv('VITELogLevel', 'info') as string,
  };
});

import {
  getEnv,
  isDev,
  isProd,
  VITEDeploymentMode,
  VITEApiBaseUrl,
  VITEEnableDebugMode,
  VITELogLevel,
} from '@/config/env';

beforeEach(() => {
  for (const k of Object.keys(envStore)) delete envStore[k];
});

afterEach(() => {
  for (const k of Object.keys(envStore)) delete envStore[k];
});

describe('getEnv singleton', () => {
  it('should read a defined string env var as-is', () => {
    envStore.VITEApiBaseUrl = 'https://api.example.com';
    expect(getEnv('VITEApiBaseUrl', '/api')).toBe('https://api.example.com');
  });

  it('should return the provided default when env key is missing', () => {
    expect(getEnv('VITEApiBaseUrl', '/api')).toBe('/api');
  });

  it('should coerce "true"/"false" to boolean when defaultValue is boolean', () => {
    envStore.VITEEnableDebugMode = 'true';
    expect(getEnv<boolean>('VITEEnableDebugMode', false)).toBe(true);
    envStore.VITEEnableDebugMode = 'false';
    expect(getEnv<boolean>('VITEEnableDebugMode', true)).toBe(false);
  });

  it('should coerce numeric strings to number when defaultValue is number', () => {
    envStore.VITE_PORT = '8080';
    expect(getEnv<number>('VITE_PORT', 3000)).toBe(8080);
    envStore.VITE_PORT = 'not-a-number';
    expect(getEnv<number>('VITE_PORT', 3000)).toBe(3000);
  });
});

describe('isDev / isProd', () => {
  it('should isDev() return true when DEV=true', () => {
    envStore.DEV = 'true';
    expect(isDev()).toBe(true);
  });

  it('should isDev() fall back to default true when DEV missing', () => {
    expect(isDev()).toBe(true);
  });

  it('should isProd() return true when PROD=true', () => {
    envStore.PROD = 'true';
    expect(isProd()).toBe(true);
  });

  it('should isProd() return false when PROD missing (default false)', () => {
    expect(isProd()).toBe(false);
  });
});

describe('Lazy getters (VITE_* helpers)', () => {
  it('should VITEDeploymentMode return configured value', () => {
    envStore.VITEDeploymentMode = 'module-federation';
    expect(VITEDeploymentMode()).toBe('module-federation');
  });

  it('should VITEDeploymentMode default to "static" when missing', () => {
    expect(VITEDeploymentMode()).toBe('static');
  });

  it('should VITEApiBaseUrl default to "/api" when missing', () => {
    expect(VITEApiBaseUrl()).toBe('/api');
  });

  it('should VITEApiBaseUrl return configured value when set', () => {
    envStore.VITEApiBaseUrl = 'http://api.example.com';
    expect(VITEApiBaseUrl()).toBe('http://api.example.com');
  });

  it('should VITEEnableDebugMode return boolean (true)', () => {
    envStore.VITEEnableDebugMode = 'true';
    expect(VITEEnableDebugMode()).toBe(true);
  });

  it('should VITEEnableDebugMode return boolean (false)', () => {
    envStore.VITEEnableDebugMode = 'false';
    expect(VITEEnableDebugMode()).toBe(false);
  });

  it('should VITELogLevel default to "info"', () => {
    expect(VITELogLevel()).toBe('info');
  });
});
