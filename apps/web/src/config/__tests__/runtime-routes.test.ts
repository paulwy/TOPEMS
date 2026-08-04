import { describe, it, expect } from 'vitest';
import runtime from '../runtime';

const GROUP1_SERVICES: Record<string, string> = {
  iam: '/api/core/iam',
  workflow: '/api/core/flow',
  file: '/api/core/file',
  master: '/api/core/master',
  migration: '/api/core/migration',
  // doc/monitor 仍由 unified-core 承载（虚拟服务），路径含 /api/core 前缀
  doc: '/api/core/doc',
  monitor: '/api/core/monitor',
  core: '/api/core',
};

const GROUP2_SERVICES = [
  'mail',
  'im',
  'notification',
  'erp',
  'finance',
  'ai',
  'hrm',
  'pm',
  'crm',
  'mes',
  'pdm',
  'scm',
  'wms',
  'srm',
  'qms',
  'lims',
  'ehs',
  'rd',
  'bi',
  'portal',
  'mobile',
  'gis',
  'integration',
];

const EXTERNAL_SERVICES = ['jaeger'];

describe('runtime.ts services 路由契约', () => {
  it('所有服务路径均不包含 /v1', () => {
    Object.entries(runtime.services).forEach(([key, value]) => {
      if (EXTERNAL_SERVICES.includes(key)) return;
      expect(String(value)).not.toContain('/v1');
    });
  });

  it('Group1 核心虚拟服务前缀正确', () => {
    Object.entries(GROUP1_SERVICES).forEach(([key, expected]) => {
      const val = (runtime.services as unknown as Record<string, unknown>)[key] as string;
      expect(val).toBeDefined();
      if (key === 'core') {
        expect(val).toBe('/api/core');
      } else {
        expect(val.startsWith('/api/core/')).toBe(true);
      }
      expect(val).toBe(expected);
    });
  });

  it('Group2 独立进程服务无 /core 前缀', () => {
    GROUP2_SERVICES.forEach((key) => {
      const val = (runtime.services as unknown as Record<string, unknown>)[key] as string;
      expect(val).toBeDefined();
      expect(val.startsWith('/api/core')).toBe(false);
      expect(val.startsWith('/api/')).toBe(true);
    });
  });

  it('jaeger 是独立 HTTP URL（不在 /api 体系内）', () => {
    const val = (runtime.services as unknown as Record<string, unknown>).jaeger as string;
    expect(val.startsWith('http')).toBe(true);
  });

  it('services 总数与预期一致（防止有人新增遗漏分类）', () => {
    const defined = Object.keys(runtime.services).length;
    const expected =
      Object.keys(GROUP1_SERVICES).length + GROUP2_SERVICES.length + EXTERNAL_SERVICES.length;
    expect(defined).toBe(expected);
  });
});
