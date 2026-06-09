import { describe, it, expect } from 'vitest';
import {
  generateAllServiceConfigs,
  FIELD_TYPES,
  ServiceConfig,
} from '../src/services';

describe('services 配置', () => {
  it('导出的服务数量 >= 16', () => {
    const services = generateAllServiceConfigs();
    expect(services.length).toBeGreaterThanOrEqual(16);
  });

  it('每个服务都必须包含 name / schema / tables / port', () => {
    const services = generateAllServiceConfigs();
    services.forEach((s: ServiceConfig) => {
      expect(s.name).toBeTruthy();
      expect(s.schema).toBeTruthy();
      expect(typeof s.port === 'number').toBe(true);
      expect(Array.isArray(s.tables)).toBe(true);
      expect(s.tables.length).toBeGreaterThan(0);
    });
  });

  it('每个表都必须包含字段且字段有 name 和 type', () => {
    const services = generateAllServiceConfigs();
    services.forEach((s) => {
      s.tables.forEach((table) => {
        expect(table.name).toBeTruthy();
        expect(Array.isArray(table.fields)).toBe(true);
        expect(table.fields.length).toBeGreaterThan(0);
        table.fields.forEach((f) => {
          expect(f.name).toBeTruthy();
          expect(f.type).toBeTruthy();
        });
      });
    });
  });

  it('FIELD_TYPES 包含常用类型映射', () => {
    expect(FIELD_TYPES['UUID']).toBe('UUID');
    expect(FIELD_TYPES['TEXT']).toBe('TEXT');
    expect(FIELD_TYPES['TIMESTAMPTZ']).toBe('TIMESTAMPTZ');
  });

  it('ForeignKeyConfig / CompositeIndexConfig 类型可作为普通对象使用', () => {
    const services = generateAllServiceConfigs();
    // 至少某些表配置了 foreignKeys 或 compositeIndexes 时，验证它们的结构
    services.forEach((s) => {
      s.tables.forEach((table) => {
        if (table.foreignKeys) {
          table.foreignKeys.forEach((fk) => {
            expect(fk.column).toBeTruthy();
            expect(fk.references).toBeTruthy();
          });
        }
        if (table.compositeIndexes) {
          table.compositeIndexes.forEach((ci) => {
            expect(ci.columns.length).toBeGreaterThan(0);
          });
        }
      });
    });
  });
});
