import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  extractVersionFromFilename,
  extractNameFromFilename,
  findMigrationFiles,
  applyMigration,
  rollbackMigration,
  getMigrationStatus,
  createSchemaIfNotExists,
  createAllSchemas,
  probeDatabase,
  stripLeadingTransactionWrappers,
} from '../src/runner';

// ============================================================================
// Mock pg.Client
// 策略：让 Client 的 connect / query / end 方法绑定到 prototype 上，
// 这样测试可以通过重写 Client.prototype.xxx 动态改变行为。
// ============================================================================
vi.mock('pg', () => {
  const Client = vi.fn(function (this: any) {
    // 让实例使用 prototype 上的方法（以便测试能够改写 prototype.query 等）
    return this;
  }) as unknown as any;
  Client.prototype.connect = vi.fn().mockResolvedValue(undefined);
  Client.prototype.query = vi.fn().mockResolvedValue({ rows: [] });
  Client.prototype.end = vi.fn().mockResolvedValue(undefined);
  return { Client };
});

import { Client } from 'pg';

// ============================================================================
// Temp directory helpers
// ============================================================================
let tmpDir: string;

function createTmpDir() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'migration-test-'));
  return tmpDir;
}

function cleanupTmpDir() {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

beforeEach(() => {
  vi.resetAllMocks();
  // 确保 Client.prototype 的每个方法仍是可调用的 mock（返回 Promise）
  (Client as any).prototype.connect = vi.fn().mockResolvedValue(undefined);
  (Client as any).prototype.query = vi.fn().mockResolvedValue({ rows: [] });
  (Client as any).prototype.end = vi.fn().mockResolvedValue(undefined);
  createTmpDir();
});

afterEach(() => {
  cleanupTmpDir();
});

// ============================================================================
// 工具函数测试（纯函数，无需 mock DB）
// ============================================================================
describe('工具函数 - 纯函数类', () => {
  describe('extractVersionFromFilename', () => {
    it('解析标准 14 位时间戳前缀', () => {
      expect(extractVersionFromFilename('20240101000000_hrm_schema.sql')).toBe('20240101000000');
      expect(extractVersionFromFilename('20241231235959_crm_schema.sql')).toBe('20241231235959');
      expect(extractVersionFromFilename('20230615120000_idx_users.sql')).toBe('20230615120000');
    });

    it('对非常规文件名返回原文件名', () => {
      expect(extractVersionFromFilename('some_random_file.sql')).toBe('some_random_file.sql');
      expect(extractVersionFromFilename('no_prefix_here.sql')).toBe('no_prefix_here.sql');
      expect(extractVersionFromFilename('20240101_abc.sql')).toBe('20240101_abc.sql');
    });
  });

  describe('extractNameFromFilename', () => {
    it('从标准迁移文件名提取出 schema 名', () => {
      expect(extractNameFromFilename('20240101000000_hrm_schema.sql')).toBe('hrm_schema');
      expect(extractNameFromFilename('20241231235959_crm_schema.sql')).toBe('crm_schema');
      expect(extractNameFromFilename('20230615120000_idx_users.sql')).toBe('idx_users');
    });

    it('无标准前缀时仅去除 .sql 扩展名', () => {
      expect(extractNameFromFilename('plain_file.sql')).toBe('plain_file');
      expect(extractNameFromFilename('no_version.sql')).toBe('no_version');
    });
  });

  describe('findMigrationFiles', () => {
    it('空目录 / 不存在目录返回 []', () => {
      expect(findMigrationFiles(tmpDir)).toEqual([]);
      const nonExistent = path.join(tmpDir, 'does_not_exist');
      expect(findMigrationFiles(nonExistent)).toEqual([]);
    });

    it('过滤掉不符合 14 位前缀规则的 .sql 文件', () => {
      fs.writeFileSync(path.join(tmpDir, '20240101000000_foo.sql'), 'BEGIN; SELECT 1; COMMIT;');
      fs.writeFileSync(path.join(tmpDir, 'bad_file.sql'), 'SELECT 1;');
      fs.writeFileSync(path.join(tmpDir, '202401_abc.sql'), 'SELECT 1;');
      fs.writeFileSync(path.join(tmpDir, 'README.md'), 'readme');

      const files = findMigrationFiles(tmpDir);
      expect(files).toEqual(['20240101000000_foo.sql']);
    });

    it('对多个合法文件按文件名排序', () => {
      fs.writeFileSync(path.join(tmpDir, '20240201000000_second.sql'), '');
      fs.writeFileSync(path.join(tmpDir, '20240101000000_first.sql'), '');
      fs.writeFileSync(path.join(tmpDir, '20240301000000_third.sql'), '');

      const files = findMigrationFiles(tmpDir);
      expect(files).toEqual([
        '20240101000000_first.sql',
        '20240201000000_second.sql',
        '20240301000000_third.sql',
      ]);
    });
  });

  describe('stripLeadingTransactionWrappers', () => {
    it('剥离 SQL 脚本头部 BEGIN 和尾部 COMMIT', () => {
      const sql = 'BEGIN;\nCREATE TABLE foo(id int);\nCOMMIT;';
      const stripped = stripLeadingTransactionWrappers(sql);
      expect(stripped).not.toMatch(/^\s*BEGIN\s*;/i);
      expect(stripped).not.toMatch(/;\s*COMMIT\s*;?\s*$/i);
      expect(stripped).toContain('CREATE TABLE foo');
    });

    it('对没有 BEGIN/COMMIT 的普通 SQL 返回原文', () => {
      const sql = 'SELECT 1;';
      expect(stripLeadingTransactionWrappers(sql)).toBe(sql.trim());
    });
  });
});

// ============================================================================
// applyMigration 逻辑分支
// ============================================================================
describe('applyMigration', () => {
  it('空目录 / 无文件 → 不报错且返回 []', async () => {
    const result = await applyMigration({
      databaseUrl: 'postgres://test',
      migrationsDir: tmpDir,
    });
    expect(result).toEqual([]);
  });

  it('有文件但 DB 已记录 → 不重复应用', async () => {
    fs.writeFileSync(path.join(tmpDir, '20240101000000_already.sql'), 'BEGIN; CREATE TABLE x(id int); COMMIT;');

    // 通过 getAppliedMigrations 返回已经存在的版本
    (Client as any).prototype.query = vi.fn().mockImplementation((sql: string) => {
      if (sql && typeof sql === 'string' && sql.toUpperCase().includes('SELECT VERSION, NAME')) {
        return Promise.resolve({ rows: [{ version: '20240101000000', name: 'already', applied_at: new Date() }] });
      }
      return Promise.resolve({ rows: [] });
    });

    const reports = await applyMigration({
      databaseUrl: 'postgres://test',
      migrationsDir: tmpDir,
    });

    expect(reports).toEqual([]);

    // 恢复
  });

  it('首次应用 → 执行 SQL、插入记录、返回 ok:true 报告', async () => {
    fs.writeFileSync(path.join(tmpDir, '20240101000000_foo.sql'), 'BEGIN; CREATE TABLE foo(id int); COMMIT;');

    const sqls: string[] = [];
    (Client as any).prototype.query = vi.fn().mockImplementation((sql: string) => {
      sqls.push(String(sql || '').split('\n')[0].slice(0, 80));
      return Promise.resolve({ rows: [] });
    });

    const reports = await applyMigration({
      databaseUrl: 'postgres://test',
      migrationsDir: tmpDir,
    });

    expect(reports.length).toBe(1);
    expect(reports[0].ok).toBe(true);
    expect(reports[0].version).toBe('20240101000000');
    expect(reports[0].name).toBe('foo');

    // 验证有 BEGIN/COMMIT
    const joined = sqls.join(' ');
    expect(joined).toContain('BEGIN');
    expect(joined).toContain('COMMIT');

    // 有 schema_migrations 记录插入
    expect(joined).toContain('INSERT INTO schema_migrations');

  });

  it('SQL 执行失败 → 事务回滚、返回 ok:false 报告并包含 error 字段', async () => {
    fs.writeFileSync(path.join(tmpDir, '20240101000000_broken.sql'), 'CREATE TABLE broken(id int);');

    let callCount = 0;
    (Client as any).prototype.query = vi.fn().mockImplementation((sql: string) => {
      callCount++;
      // 确保 create schema_migrations table、applied 查询能过
      if (sql && typeof sql === 'string' && sql.toUpperCase().includes('CREATE TABLE IF NOT EXISTS')) {
        return Promise.resolve({ rows: [] });
      }
      if (sql && typeof sql === 'string' && sql.toUpperCase().includes('SELECT VERSION, NAME')) {
        return Promise.resolve({ rows: [] });
      }
      // BEGIN 正常
      if (String(sql).trim().toUpperCase() === 'BEGIN') {
        return Promise.resolve({ rows: [] });
      }
      // 实际 SQL 执行失败
      if (sql && typeof sql === 'string' && sql.toUpperCase().includes('CREATE TABLE BROKEN')) {
        return Promise.reject(new Error('syntax error at CREATE'));
      }
      return Promise.resolve({ rows: [] });
    });

    const reports = await applyMigration({
      databaseUrl: 'postgres://test',
      migrationsDir: tmpDir,
    });

    expect(reports.length).toBe(1);
    expect(reports[0].ok).toBe(false);
    expect(reports[0].error).toBeTruthy();
    expect(reports[0].filename).toBe('20240101000000_broken.sql');

  });

  it('dryRun 模式 → 不执行任何业务 SQL、仅打印', async () => {
    fs.writeFileSync(path.join(tmpDir, '20240101000000_dry.sql'), 'CREATE TABLE dry(id int);');

    // 记录所有 client.query 调用
    const sqls: string[] = [];
    (Client as any).prototype.query = vi.fn().mockImplementation((sql: string) => {
      sqls.push(String(sql || ''));
      // 让 ensureMigrationTable / getAppliedMigrations 通过
      return Promise.resolve({ rows: [] });
    });

    const reports = await applyMigration({
      databaseUrl: 'postgres://test',
      migrationsDir: tmpDir,
      dryRun: true,
    });

    // dry-run 模式不返回业务报告
    expect(reports).toEqual([]);

    // 但至少要查询 applied migrations
    const joined = sqls.join(' ');
    expect(joined).toMatch(/schema_migrations/i);
    // dryRun 不会执行 CREATE TABLE dry
    expect(joined).not.toContain('CREATE TABLE dry');

  });
});

// ============================================================================
// rollbackMigration
// ============================================================================
describe('rollbackMigration', () => {
  it('正常：返回 schema_migrations 最后一条记录', async () => {
    const lastRecord = {
      version: '20240101000000',
      name: 'foo',
      applied_at: new Date(),
      duration_ms: 10,
    };

    (Client as any).prototype.query = vi.fn().mockImplementation((sql: string) => {
      const u = String(sql || '').toUpperCase();
      // ensureMigrationTable
      if (u.includes('CREATE TABLE IF NOT EXISTS')) return Promise.resolve({ rows: [] });
      // 查询最后一条
      if (u.includes('ORDER BY VERSION DESC LIMIT 1')) {
        return Promise.resolve({ rows: [lastRecord] });
      }
      // DELETE RETURNING
      if (u.startsWith('DELETE')) {
        return Promise.resolve({ rows: [lastRecord] });
      }
      return Promise.resolve({ rows: [] });
    });

    const result = await rollbackMigration({
      databaseUrl: 'postgres://test',
      migrationsDir: tmpDir,
    });

    expect(result).toBeTruthy();
    expect(result!.version).toBe(lastRecord.version);
    expect(result!.name).toBe(lastRecord.name);

  });

  it('空记录表 → 返回 null', async () => {
    (Client as any).prototype.query = vi.fn().mockImplementation((sql: string) => {
      const u = String(sql || '').toUpperCase();
      if (u.includes('CREATE TABLE IF NOT EXISTS')) return Promise.resolve({ rows: [] });
      if (u.includes('ORDER BY VERSION DESC LIMIT 1')) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const result = await rollbackMigration({
      databaseUrl: 'postgres://test',
      migrationsDir: tmpDir,
    });

    expect(result).toBeNull();

  });

  it('specificFile 模式：按文件名对应版本删除', async () => {
    const targetRecord = {
      version: '20240303000000',
      name: 'target',
      applied_at: new Date(),
      duration_ms: 5,
    };

    const executions: string[] = [];
    (Client as any).prototype.query = vi.fn().mockImplementation((sql: string, params?: any[]) => {
      executions.push(`${String(sql).trim()} | params=${JSON.stringify(params || [])}`);
      const u = String(sql || '').toUpperCase();
      if (u.includes('CREATE TABLE IF NOT EXISTS')) return Promise.resolve({ rows: [] });
      if (u.includes('ORDER BY VERSION DESC LIMIT 1')) {
        return Promise.resolve({ rows: [{ version: '20240101000000', name: 'ignored' }] });
      }
      if (u.startsWith('DELETE')) {
        return Promise.resolve({ rows: [targetRecord] });
      }
      return Promise.resolve({ rows: [] });
    });

    const result = await rollbackMigration({
      databaseUrl: 'postgres://test',
      migrationsDir: tmpDir,
      specificFile: '20240303000000_target.sql',
    });

    expect(result).toBeTruthy();
    expect(result!.version).toBe('20240303000000');

    // DELETE 语句中应包含 specificFile 解析出的版本
    const deleteCalls = executions.filter((c) => c.toUpperCase().startsWith('DELETE'));
    expect(deleteCalls.length).toBe(1);
    expect(deleteCalls[0]).toContain('"20240303000000"');

  });
});

// ============================================================================
// getMigrationStatus
// ============================================================================
describe('getMigrationStatus', () => {
  it('返回 {pending, applied} 结构，pending 对已应用版本为空', async () => {
    fs.writeFileSync(path.join(tmpDir, '20240101000000_a.sql'), '');
    fs.writeFileSync(path.join(tmpDir, '20240201000000_b.sql'), '');

    (Client as any).prototype.query = vi.fn().mockImplementation((sql: string) => {
      const u = String(sql || '').toUpperCase();
      if (u.includes('CREATE TABLE IF NOT EXISTS')) return Promise.resolve({ rows: [] });
      if (u.includes('SELECT VERSION, NAME')) {
        return Promise.resolve({
          rows: [
            { version: '20240101000000', name: 'a', applied_at: new Date(), duration_ms: 1 },
            { version: '20240201000000', name: 'b', applied_at: new Date(), duration_ms: 2 },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const result = await getMigrationStatus('postgres://test', tmpDir);

    expect(result).toBeDefined();
    expect(result.pending).toEqual([]);
    expect(result.applied.length).toBe(2);
    expect(result.applied[0].version).toBe('20240101000000');

  });

  it('部分已应用时 pending 包含未应用文件', async () => {
    fs.writeFileSync(path.join(tmpDir, '20240101000000_a.sql'), '');
    fs.writeFileSync(path.join(tmpDir, '20240201000000_b.sql'), '');
    fs.writeFileSync(path.join(tmpDir, '20240301000000_c.sql'), '');

    (Client as any).prototype.query = vi.fn().mockImplementation((sql: string) => {
      const u = String(sql || '').toUpperCase();
      if (u.includes('CREATE TABLE IF NOT EXISTS')) return Promise.resolve({ rows: [] });
      if (u.includes('SELECT VERSION, NAME')) {
        return Promise.resolve({
          rows: [{ version: '20240201000000', name: 'b', applied_at: new Date() }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const result = await getMigrationStatus('postgres://test', tmpDir);

    expect(result.pending).toEqual(['20240101000000_a.sql', '20240301000000_c.sql']);
    expect(result.applied.length).toBe(1);

  });
});

// ============================================================================
// createSchemaIfNotExists / createAllSchemas / probeDatabase
// ============================================================================
describe('Schema 辅助与自检', () => {
  it('createSchemaIfNotExists 生成预期的 CREATE SCHEMA SQL', async () => {
    const sqls: string[] = [];
    (Client as any).prototype.query = vi.fn().mockImplementation((sql: string) => {
      sqls.push(String(sql));
      return Promise.resolve({ rows: [] });
    });

    await createSchemaIfNotExists('postgres://test', 'hrm');

    const joined = sqls.join(' ').toUpperCase();
    expect(joined).toContain('CREATE SCHEMA IF NOT EXISTS');
    expect(joined).toContain('HRM');

  });

  it('createAllSchemas 失败时触发 ROLLBACK 并抛出错误', async () => {
    const sqls: string[] = [];
    let callIndex = 0;
    (Client as any).prototype.query = vi.fn().mockImplementation((sql: string) => {
      sqls.push(String(sql).trim());
      callIndex++;
      // 期望调用顺序: 1. BEGIN  2. CREATE hrm  3. CREATE crm (失败)  4. ROLLBACK
      if (callIndex === 3) {
        return Promise.reject(new Error('schema creation failed'));
      }
      return Promise.resolve({ rows: [] });
    });

    await expect(createAllSchemas('postgres://test', ['hrm', 'crm'])).rejects.toThrow(/schema creation failed/);

    const joined = sqls.join(' ').toUpperCase();
    expect(joined).toContain('BEGIN');
    expect(joined).toContain('ROLLBACK');
    expect(joined).not.toContain('COMMIT');

  });

  it('probeDatabase 成功路径 → { ok:true, version }', async () => {
    (Client as any).prototype.query = vi.fn().mockImplementation((sql: string) => {
      const u = String(sql || '').toUpperCase().trim();
      if (u === 'SELECT VERSION();') {
        return Promise.resolve({ rows: [{ version: 'PostgreSQL 15.3' }] });
      }
      return Promise.resolve({ rows: [] });
    });

    const result = await probeDatabase('postgres://test');
    expect(result.ok).toBe(true);
    expect(result.version).toBe('PostgreSQL 15.3');

  });

  it('probeDatabase 失败路径 → { ok:false, error }', async () => {
    (Client as any).prototype.query = vi.fn().mockRejectedValue(new Error('connection refused'));

    const result = await probeDatabase('postgres://test');
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.version).toBeUndefined();

  });
});
