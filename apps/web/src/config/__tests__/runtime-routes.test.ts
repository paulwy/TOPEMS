import { describe, it, expect } from 'vitest';
import runtime from '../runtime';

const GROUP1_SERVICES: Record<string, string> = {
  iam: '/api/core/iam',
  workflow: '/api/core/flow',
  file: '/api/core/file',
  mail: '/api/core/mail',
  im: '/api/core/im',
  notification: '/api/core/notification',
  master: '/api/core/master',
  migration: '/api/core/migration',
  communication: '/api/core/comm',
  core: '/api/core',
};

const GROUP2_SERVICES = [
  'erp', 'finance', 'doc', 'ai', 'hrm', 'pm', 'crm', 'mes',
  'manufacturing', 'pdm', 'scm', 'wms', 'srm', 'qms',
  'qualityAssurance', 'lims', 'ehs', 'rd', 'bi',
  'analytics', 'report', 'monitor', 'portal', 'mobile',
  'gis', 'integration',
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

  it('别名服务指向正确的主路径', () => {
    const services = runtime.services as unknown as Record<string, string>;

    expect(services.manufacturing).toBe(services.mes);
    expect(services.manufacturing).toBe('/api/mes');

    expect(services.qualityAssurance).toBe(services.qms);
    expect(services.qualityAssurance).toBe('/api/qms');

    expect(services.analytics).toBe(services.bi);
    expect(services.analytics).toBe('/api/bi');

    expect(services.report).toBe(services.bi);
    expect(services.report).toBe('/api/bi');
  });

  it('jaeger 是独立 HTTP URL（不在 /api 体系内）', () => {
    const val = (runtime.services as unknown as Record<string, unknown>).jaeger as string;
    expect(val.startsWith('http')).toBe(true);
  });

  it('services 总数与预期一致（防止有人新增遗漏分类）', () => {
    const defined = Object.keys(runtime.services).length;
    const expected =
      Object.keys(GROUP1_SERVICES).length +
      GROUP2_SERVICES.length +
      EXTERNAL_SERVICES.length;
    expect(defined).toBe(expected);
  });
});
