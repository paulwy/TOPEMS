import { describe, it, expect } from 'vitest';

import { moduleMapping, getAllModuleCodes } from '../navigation/moduleMapping';

describe('moduleMapping', () => {
  it('should export a non-empty record', () => {
    expect(typeof moduleMapping).toBe('object');
    expect(Object.keys(moduleMapping).length).toBeGreaterThan(0);
  });

  it('should have correct iam mapping', () => {
    expect(moduleMapping.iam).toEqual({
      service: 'unified-core',
      module: 'iam',
      apiBasePath: '/api/core/iam',
    });
  });

  it('should have correct admin mapping with subModules', () => {
    expect(moduleMapping.admin.service).toBe('unified-core');
    expect(moduleMapping.admin.module).toBe('tenant');
    expect(moduleMapping.admin.apiBasePath).toBe('/api/core/tenant');
    expect(moduleMapping.admin.subModules).toBeDefined();
    expect(moduleMapping.admin.subModules!.tenant).toEqual({
      service: 'unified-core',
      module: 'tenant',
      apiBasePath: '/api/core/tenant',
    });
    expect(moduleMapping.admin.subModules!.user.module).toBe('iam');
  });

  it('should have correct crm mapping', () => {
    expect(moduleMapping.crm).toEqual({
      service: 'crm',
      module: 'crm',
      apiBasePath: '/api/crm',
    });
  });

  it('should have correct wms mapping', () => {
    expect(moduleMapping.wms).toEqual({
      service: 'wms',
      module: 'wms',
      apiBasePath: '/api/wms',
    });
  });

  it('should have correct qms mapping', () => {
    expect(moduleMapping.qms).toEqual({
      service: 'qms',
      module: 'qms',
      apiBasePath: '/api/qms',
    });
  });

  it('should have doc mapping for document center', () => {
    expect(moduleMapping.doc).toEqual({
      service: 'unified-core',
      module: 'doc',
      apiBasePath: '/api/core/doc',
    });
  });

  it('should not have dead aliases "document" or "docs"', () => {
    expect(moduleMapping.document).toBeUndefined();
    expect(moduleMapping.docs).toBeUndefined();
  });
});

describe('getAllModuleCodes', () => {
  it('should return an array of all module codes', () => {
    const codes = getAllModuleCodes();
    expect(Array.isArray(codes)).toBe(true);
    expect(codes.length).toBe(Object.keys(moduleMapping).length);
  });

  it('should include known module codes', () => {
    const codes = getAllModuleCodes();
    expect(codes).toContain('iam');
    expect(codes).toContain('admin');
    expect(codes).toContain('crm');
    expect(codes).toContain('wms');
    expect(codes).toContain('qms');
  });
});
