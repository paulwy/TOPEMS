import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  generateServiceMigration,
  generateIndexMigration,
  generateAuditMigration,
} from '../src/generator';
import { generateAllServiceConfigs, ServiceConfig } from '../src/services';

const outDir = path.join(__dirname, '..', '.test-temp');

// 构造一个最小化的测试服务（含 foreignKeys / compositeIndexes）
const testService: ServiceConfig = {
  name: 'testsvc',
  display_name: 'Test Service',
  description: '用于测试 generator 的虚构服务',
  schema: 'testsvc',
  port: 9999,
  tables: [
    {
      name: 'users',
      description: '用户表',
      fields: [
        { name: 'id', type: 'UUID', primaryKey: true, comment: '主键' },
        { name: 'name', type: 'VARCHAR(255)', notNull: true, index: true, searchable: true },
        { name: 'email', type: 'VARCHAR(255)', unique: true },
        { name: 'status', type: 'VARCHAR(50)', notNull: true, index: true, default: "'active'" },
        { name: 'bio', type: 'TEXT', searchable: true },
      ],
      compositeIndexes: [
        { columns: ['status', 'name'], unique: false },
      ],
    },
    {
      name: 'orders',
      description: '订单表',
      fields: [
        { name: 'id', type: 'UUID', primaryKey: true },
        { name: 'user_id', type: 'UUID', notNull: true, index: true },
        { name: 'amount', type: 'NUMERIC(15,2)', notNull: true },
        { name: 'status', type: 'VARCHAR(50)', index: true },
      ],
      foreignKeys: [
        { column: 'user_id', references: 'testsvc.users(id)', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      ],
      compositeIndexes: [
        { columns: ['user_id', 'status'], name: 'idx_orders_user_status' },
      ],
    },
  ],
};

beforeAll(() => {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
});

afterAll(() => {
  try {
    fs.rmSync(outDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe('generateServiceMigration - schema 生成', () => {
  it('能够生成非空 SQL 文件并包含基本结构', () => {
    const filename = generateServiceMigration(testService, outDir);
    expect(filename).toBeTruthy();

    const content = fs.readFileSync(path.join(outDir, filename!), 'utf8');
    expect(content.length).toBeGreaterThan(0);

    // 基本结构
    expect(content).toContain('BEGIN;');
    expect(content).toContain('COMMIT;');
    expect(content).toContain(`SET search_path TO ${testService.schema}`);
    expect(content).toContain('CREATE TABLE IF NOT EXISTS');
    expect(content).toContain('audit_logs');
  });

  it('正确输出字段属性：PRIMARY KEY / NOT NULL / DEFAULT / UNIQUE', () => {
    const filename = generateServiceMigration(testService, outDir);
    const content = fs.readFileSync(path.join(outDir, filename!), 'utf8');

    expect(content).toMatch(/id\s+UUID PRIMARY KEY/);
    expect(content).toMatch(/name\s+VARCHAR\(255\) NOT NULL/);
    expect(content).toMatch(/email\s+VARCHAR\(255\)\s+UNIQUE/);
    expect(content).toMatch(/status.*DEFAULT 'active'/);
  });

  it('正确输出命名外键约束（含 ON DELETE CASCADE / ON UPDATE CASCADE）', () => {
    const filename = generateServiceMigration(testService, outDir);
    const content = fs.readFileSync(path.join(outDir, filename!), 'utf8');

    expect(content).toContain('FOREIGN KEY (user_id) REFERENCES testsvc.users(id)');
    expect(content).toContain('ON DELETE CASCADE');
    expect(content).toContain('ON UPDATE CASCADE');
    expect(content).toMatch(/CONSTRAINT fk_orders_user_id_\d+/);
  });

  it('自动为每个表注入标准字段：created_at / updated_at / organization_id / deleted_at', () => {
    const filename = generateServiceMigration(testService, outDir);
    const content = fs.readFileSync(path.join(outDir, filename!), 'utf8');

    ['created_at', 'updated_at', 'organization_id', 'deleted_at'].forEach((col) => {
      expect(content).toContain(col);
    });
  });

  it('自动为每个表生成 update_timestamp 触发器', () => {
    const filename = generateServiceMigration(testService, outDir);
    const content = fs.readFileSync(path.join(outDir, filename!), 'utf8');

    expect(content).toContain('CREATE OR REPLACE FUNCTION');
    expect(content).toContain('update_timestamp()');
    expect(content).toContain('BEFORE UPDATE ON');
  });

  it('生成了标准索引：created_at / organization_id / deleted_at / 单字段索引', () => {
    const filename = generateServiceMigration(testService, outDir);
    const content = fs.readFileSync(path.join(outDir, filename!), 'utf8');

    expect(content).toContain('idx_users_created_at');
    expect(content).toContain('idx_users_organization_id');
    expect(content).toContain('idx_users_deleted_at');
    expect(content).toContain('idx_users_name');
    expect(content).toContain('idx_users_status');
  });

  it('基于 compositeIndexes 配置生成了复合索引', () => {
    const filename = generateServiceMigration(testService, outDir);
    const content = fs.readFileSync(path.join(outDir, filename!), 'utf8');

    expect(content).toMatch(/CREATE INDEX IF NOT EXISTS idx_users_composite_0/);
    expect(content).toContain('(status, name)');
    // orders 的复合索引用自定义名称
    expect(content).toContain('idx_orders_user_status');
    expect(content).toContain('(user_id, status)');
  });

  it('为审计日志表生成了 user_id / action / created_at 索引', () => {
    const filename = generateServiceMigration(testService, outDir);
    const content = fs.readFileSync(path.join(outDir, filename!), 'utf8');

    expect(content).toContain('idx_testsvc_audit_logs_user_id');
    expect(content).toContain('idx_testsvc_audit_logs_action');
    expect(content).toContain('idx_testsvc_audit_logs_created_at');
  });

  it('为表生成了 COMMENT', () => {
    const filename = generateServiceMigration(testService, outDir);
    const content = fs.readFileSync(path.join(outDir, filename!), 'utf8');
    expect(content).toContain("COMMENT ON TABLE testsvc.users IS '用户表'");
  });
});

describe('generateIndexMigration - 独立索引脚本', () => {
  it('优先使用 compositeIndexes 配置生成索引', () => {
    const filename = generateIndexMigration(testService, outDir);
    expect(filename).toBeTruthy();
    const content = fs.readFileSync(path.join(outDir, filename!), 'utf8');

    expect(content).toContain('BEGIN;');
    expect(content).toContain('COMMIT;');
    expect(content).toContain('idx_users_composite_0');
    expect(content).toContain('idx_orders_user_status');
  });

  it('当没有 compositeIndexes 时，根据高频 index 字段建议复合索引', () => {
    const plain: ServiceConfig = {
      ...testService,
      name: 'plain',
      tables: [
        {
          name: 'events',
          description: '事件表',
          fields: [
            { name: 'id', type: 'UUID', primaryKey: true },
            { name: 'a', type: 'VARCHAR(50)', index: true },
            { name: 'b', type: 'VARCHAR(50)', index: true },
            { name: 'c', type: 'TEXT', searchable: true },
          ],
        },
      ],
    };
    const filename = generateIndexMigration(plain, outDir);
    const content = fs.readFileSync(path.join(outDir, filename!), 'utf8');
    expect(content).toContain('idx_events_composite');
    // searchable 的 TEXT 字段也应有 gin 索引
    expect(content).toContain('idx_events_c_search');
    expect(content).toContain('USING gin');
  });

  it('为可搜索 TEXT 字段生成 GIN 全文索引', () => {
    const filename = generateIndexMigration(testService, outDir);
    const content = fs.readFileSync(path.join(outDir, filename!), 'utf8');
    expect(content).toContain('USING gin');
    expect(content).toContain('idx_users_bio_search');
    // name 字段是 VARCHAR(255) 且 searchable，仍应生成文本搜索索引
    expect(content).toContain('to_tsvector');
  });
});

describe('generateAuditMigration - 审计触发器脚本', () => {
  it('生成了 audit_log_change 函数并为每个业务表附加 BEFORE INSERT OR UPDATE OR DELETE 触发器', () => {
    const filename = generateAuditMigration(testService, outDir);
    expect(filename).toBeTruthy();
    const content = fs.readFileSync(path.join(outDir, filename!), 'utf8');

    expect(content).toContain('audit_log_change()');
    expect(content).toContain('TG_OP');
    expect(content).toContain('trigger_users_audit');
    expect(content).toContain('trigger_orders_audit');
    expect(content).toContain('CURRENT_SETTING');
    expect(content).toContain('BEGIN;');
    expect(content).toContain('COMMIT;');
  });
});

describe('真实服务配置的生成验证', () => {
  it('对所有真实服务都能生成非空的 SQL 文件', () => {
    const services = generateAllServiceConfigs();
    expect(services.length).toBeGreaterThan(0);

    services.forEach((s) => {
      const f1 = generateServiceMigration(s, outDir);
      const f2 = generateIndexMigration(s, outDir);
      const f3 = generateAuditMigration(s, outDir);
      expect(f1).toBeTruthy();
      expect(f2).toBeTruthy();
      expect(f3).toBeTruthy();

      const c1 = fs.readFileSync(path.join(outDir, f1!), 'utf8');
      expect(c1.length).toBeGreaterThan(100);
      expect(c1).toContain('BEGIN;');
      expect(c1).toContain('COMMIT;');
    });
  });
});
