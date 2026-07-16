import runtime from '../runtime';
import { describe, it, expect } from 'vitest';

const EXPECTED_GROUP1: Record<string, string> = {
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

const EXPECTED_GROUP2: Record<string, string> = {
  erp: '/api/erp',
  finance: '/api/finance',
  doc: '/api/doc',
  ai: '/api/ai',
  hrm: '/api/hrm',
  pm: '/api/pm',
  crm: '/api/crm',
  mes: '/api/mes',
  manufacturing: '/api/mes',
  pdm: '/api/pdm',
  scm: '/api/scm',
  wms: '/api/wms',
  srm: '/api/srm',
  qms: '/api/qms',
  qualityAssurance: '/api/qms',
  lims: '/api/lims',
  ehs: '/api/ehs',
  rd: '/api/rd',
  bi: '/api/bi',
  analytics: '/api/bi',
  report: '/api/report',
  monitor: '/api/monitor',
  portal: '/api/portal',
  mobile: '/api/mobile',
  gis: '/api/gis',
  integration: '/api/integration',
};

describe('runtime.ts services 路由契约（V9.0 删除 /v1）', () => {
  it('所有 service 路径均不包含 /v1（jaeger 除外）', () => {
    Object.entries(runtime.services).forEach(([k, v]) => {
      if (k === 'jaeger') return;
      expect(String(v)).not.toContain('/v1');
    });
  });

  it('Group1 核心虚拟服务前缀正确（/api/core/ 开头，无 /v1）', () => {
    Object.entries(EXPECTED_GROUP1).forEach(([k, expected]) => {
      const val: string = (runtime.services as unknown as Record<string, unknown>)[k] ?? '';
      expect(val.startsWith('/api/core')).toBe(true);
      expect(val).toContain(expected);
      expect(val).not.toContain('/v1');
    });
  });

  it('Group2 独立进程服务无 /core 前缀，无 /v1', () => {
    Object.entries(EXPECTED_GROUP2).forEach(([k, expected]) => {
      const val: string = (runtime.services as unknown as Record<string, unknown>)[k] ?? '';
      expect(val.startsWith('/api/core')).toBe(false);
      expect(val).toContain(expected);
      expect(val).not.toContain('/v1');
    });
  });

  it('jaeger 是独立 HTTP URL（不在 /api 体系内）', () => {
    const val: string = (runtime.services as unknown as Record<string, unknown>).jaeger ?? '';
    expect(val.startsWith('http')).toBe(true);
  });

  it('services 总数与预期一致（防止有人新增遗漏分类）', () => {
    const defined = Object.keys(runtime.services).length;
    const expected = Object.keys(EXPECTED_GROUP1).length
      + Object.keys(EXPECTED_GROUP2).length
      + 1; // jaeger
    expect(defined).toBe(expected);
  });
});
