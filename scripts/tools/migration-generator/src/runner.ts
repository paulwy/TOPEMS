import { Client, QueryResult } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const MIGRATION_TABLE = 'schema_migrations';

export interface MigrationRecord {
  version: string;
  name: string;
  applied_at: Date;
  duration_ms?: number;
}

export interface ApplyOptions {
  databaseUrl: string;
  migrationsDir?: string;
  specificFile?: string;
  singleTransaction?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
}

export interface RollbackOptions {
  databaseUrl: string;
  migrationsDir?: string;
  specificFile?: string;
}

// ============================================================================
// 基础工具函数
// ============================================================================

export async function getClient(databaseUrl: string): Promise<Client> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  return client;
}

export async function ensureMigrationTable(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      version       VARCHAR(255) PRIMARY KEY,
      name          VARCHAR(255) NOT NULL,
      applied_at    TIMESTAMPTZ DEFAULT NOW(),
      duration_ms   INTEGER
    );
  `);
}

export async function getAppliedMigrations(client: Client): Promise<Map<string, MigrationRecord>> {
  const result = await client.query<MigrationRecord>(
    `SELECT version, name, applied_at, duration_ms FROM ${MIGRATION_TABLE} ORDER BY version ASC;`,
  );
  const map = new Map<string, MigrationRecord>();
  for (const row of result.rows) {
    map.set(row.version, row);
  }
  return map;
}

export function extractVersionFromFilename(filename: string): string {
  const match = filename.match(/^(\d{14})_/);
  return match ? match[1] : filename;
}

export function extractNameFromFilename(filename: string): string {
  const match = filename.match(/^\d{14}_(.+)\.sql$/);
  return match ? match[1] : filename.replace(/\.sql$/, '');
}

export function findMigrationFiles(migrationsDir: string): string[] {
  if (!fs.existsSync(migrationsDir)) return [];
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql') && /^\d{14}_/.test(f))
    .sort();
}

// ============================================================================
// 单条 SQL 执行：支持将 BEGIN / COMMIT 包裹的脚本展开，并在失败时打印行号
// ============================================================================

export function stripLeadingTransactionWrappers(sql: string): string {
  // 如果脚本已经有 BEGIN / COMMIT（生成器会生成），我们仍然只依赖外部事务，
  // 所以剥离顶层的 BEGIN / COMMIT，避免嵌套事务（PG 不支持嵌套事务）。
  let trimmed = sql.trim();
  const original = trimmed;
  const beginRe = /^\s*BEGIN\s*;/i;
  const commitRe = /;?\s*COMMIT\s*;?\s*$/i;

  let changed = false;
  if (beginRe.test(trimmed)) {
    trimmed = trimmed.replace(beginRe, '');
    changed = true;
  }
  if (commitRe.test(trimmed)) {
    trimmed = trimmed.replace(commitRe, '');
    changed = true;
  }
  return changed ? trimmed : original;
}

interface ExecutionReport {
  filename: string;
  version: string;
  name: string;
  durationMs: number;
  ok: boolean;
  error?: string;
}

async function runSingleMigration(
  client: Client,
  filepath: string,
  filename: string,
  verbose?: boolean,
): Promise<ExecutionReport> {
  const version = extractVersionFromFilename(filename);
  const name = extractNameFromFilename(filename);
  const rawSql = fs.readFileSync(filepath, 'utf8');
  const sql = stripLeadingTransactionWrappers(rawSql);

  const start = Date.now();
  try {
    await client.query(sql);
    const duration = Date.now() - start;
    await client.query(
      `INSERT INTO ${MIGRATION_TABLE} (version, name, duration_ms) VALUES ($1, $2, $3)`,
      [version, name, duration],
    );
    if (verbose) {
      console.log(`     ✔ 已在记录表登记 (${duration}ms)`);
    }
    return { filename, version, name, durationMs: duration, ok: true };
  } catch (error) {
    const message = (error as Error).message || String(error);
    // 如果 driver 给了 position，尝试打印上下文
    const pgErr = error as { position?: string; detail?: string; where?: string };
    if (verbose && pgErr.position) {
      const pos = parseInt(pgErr.position, 10);
      const lines = sql.substring(0, pos).split('\n');
      const lineNo = lines.length;
      const colNo = lines[lines.length - 1].length + 1;
      console.log(`     ⓘ  出错位置: 第 ${lineNo} 行, 第 ${colNo} 列`);
      const ctx = sql.split('\n').slice(Math.max(0, lineNo - 3), lineNo + 2);
      ctx.forEach((line, i) => {
        const currentLineNo = Math.max(0, lineNo - 3) + i + 1;
        const marker = currentLineNo === lineNo ? ' >> ' : '    ';
        console.log(`     ${marker}L${currentLineNo}: ${line}`);
      });
      if (pgErr.detail) console.log(`     ⓘ  DETAIL: ${pgErr.detail}`);
      if (pgErr.where) console.log(`     ⓘ  WHERE:  ${pgErr.where}`);
    }
    return { filename, version, name, durationMs: Date.now() - start, ok: false, error: message };
  }
}

// ============================================================================
// 应用迁移
// ============================================================================

export async function applyMigration(options: ApplyOptions): Promise<ExecutionReport[]> {
  const migrationsDir = path.resolve(process.cwd(), options.migrationsDir || 'migrations');
  const migrationFiles = findMigrationFiles(migrationsDir);

  console.log(`  📁 迁移目录: ${migrationsDir}`);

  if (migrationFiles.length === 0) {
    console.log('  ℹ️  未找到迁移文件');
    return [];
  }

  if (options.specificFile) {
    const version = extractVersionFromFilename(options.specificFile);
    const matched = migrationFiles.filter((f) => extractVersionFromFilename(f) === version);
    if (matched.length === 0) {
      console.log(`  ⚠️  未找到迁移文件: ${options.specificFile}`);
      return [];
    }
    migrationFiles.splice(0, migrationFiles.length, ...matched);
  }

  const client = await getClient(options.databaseUrl);
  const reports: ExecutionReport[] = [];
  try {
    await ensureMigrationTable(client);
    const applied = await getAppliedMigrations(client);

    const pending = migrationFiles.filter((f) => !applied.has(extractVersionFromFilename(f)));

    if (pending.length === 0) {
      console.log('  ✨ 没有新的迁移需要应用');
      return reports;
    }

    console.log(`  ⏳ 待应用迁移: ${pending.length} 个\n`);

    if (options.dryRun) {
      console.log('  🧪 DRY-RUN 模式：仅列出待执行文件，不执行 SQL\n');
      for (const f of pending) {
        const stat = fs.statSync(path.join(migrationsDir, f));
        console.log(`     - ${f} (${stat.size} bytes)`);
      }
      console.log(`\n  💡 使用 migrate --up 正式应用`);
      return reports;
    }

    for (const filename of pending) {
      const version = extractVersionFromFilename(filename);
      const filepath = path.join(migrationsDir, filename);

      // 每个迁移独立事务：失败不影响之前已成功的迁移
      console.log(`  🔄 应用: ${filename}`);
      try {
        await client.query('BEGIN');
        const report = await runSingleMigration(client, filepath, filename, options.verbose);
        if (report.ok) {
          await client.query('COMMIT');
          console.log(`  ✅ 完成: ${filename} (${report.durationMs}ms)`);
          reports.push(report);
        } else {
          await client.query('ROLLBACK');
          console.log(`  ❌ 失败: ${filename}`);
          console.log(`     错误: ${report.error}`);
          reports.push(report);
          // 默认在第一个失败处中止
          break;
        }
      } catch (err) {
        // 客户端级别的错误（非 SQL 错误）
        try { await client.query('ROLLBACK'); } catch { /* ignore */ }
        const msg = (err as Error).message;
        console.log(`  ❌ 客户端错误: ${filename}`);
        console.log(`     ${msg}`);
        reports.push({ filename, version, name: extractNameFromFilename(filename), durationMs: 0, ok: false, error: msg });
        break;
      }
    }

    const success = reports.filter((r) => r.ok).length;
    const failed = reports.filter((r) => !r.ok).length;
    console.log(`\n  📊 统计: 应用 ${success} 个迁移${failed ? `，失败 ${failed} 个` : ''}`);
    return reports;
  } finally {
    await client.end().catch(() => { /* ignore */ });
  }
}

// ============================================================================
// 回滚（标记性，打印建议）
// ============================================================================

export async function rollbackMigration(options: RollbackOptions): Promise<MigrationRecord | null> {
  const migrationsDir = path.resolve(process.cwd(), options.migrationsDir || 'migrations');
  const client = await getClient(options.databaseUrl);

  try {
    await ensureMigrationTable(client);

    const result = await client.query<MigrationRecord>(
      `SELECT version, name, applied_at, duration_ms FROM ${MIGRATION_TABLE} ORDER BY version DESC LIMIT 1;`,
    );

    if (result.rows.length === 0) {
      console.log('  ℹ️  没有可回滚的迁移记录');
      return null;
    }

    const last = result.rows[0];
    const version = options.specificFile ? extractVersionFromFilename(options.specificFile) : last.version;

    console.log(`  ⬅️  回滚迁移: ${version}`);
    console.log(`  ⚠️  注意: 此工具只更新迁移记录表, 不自动执行反向 SQL`);
    console.log(`     请在 ${migrationsDir}/ 下编写对应 *_rollback.sql 并手动执行`);
    console.log(`     迁移记录版本: ${version}`);

    const deleted = await client.query(
      `DELETE FROM ${MIGRATION_TABLE} WHERE version = $1 RETURNING version, name, applied_at, duration_ms;`,
      [version],
    );

    if (deleted.rows.length === 0) {
      console.log(`  ⚠️  记录表中不存在该版本: ${version}`);
      return null;
    }
    console.log(`  ✅ 已从记录表中移除: ${version}`);
    return deleted.rows[0] as MigrationRecord;
  } finally {
    await client.end().catch(() => { /* ignore */ });
  }
}

// ============================================================================
// 状态查看
// ============================================================================

export async function getMigrationStatus(
  databaseUrl: string,
  migrationsDir: string = 'migrations',
): Promise<{ pending: string[]; applied: MigrationRecord[] }> {
  const migrationsDirResolved = path.resolve(process.cwd(), migrationsDir);
  const client = await getClient(databaseUrl);

  try {
    await ensureMigrationTable(client);

    const result: QueryResult<MigrationRecord> = await client.query(
      `SELECT version, name, applied_at, duration_ms FROM ${MIGRATION_TABLE} ORDER BY version ASC;`,
    );

    const files = findMigrationFiles(migrationsDirResolved);
    const appliedVersions = new Set(result.rows.map((r) => r.version));
    const pending = files.filter((f) => !appliedVersions.has(extractVersionFromFilename(f)));

    console.log('  ┌──────────────────────────────────────────────────────────┐');
    console.log('  │                    迁移状态汇总                         │');
    console.log('  ├──────────────────────────────────────────────────────────┤');
    console.log(`  │  本地迁移文件: ${String(files.length).padEnd(42)}│`);
    console.log(`  │  已应用迁移:   ${String(result.rows.length).padEnd(42)}│`);
    console.log(`  │  待执行迁移:   ${String(pending.length).padEnd(42)}│`);
    console.log('  └──────────────────────────────────────────────────────────┘\n');

    if (result.rows.length > 0) {
      console.log('  已应用的迁移:\n');
      result.rows.forEach((row, idx) => {
        const date = new Date(row.applied_at).toLocaleString('zh-CN');
        const meta = row.duration_ms ? ` (${row.duration_ms}ms)` : '';
        console.log(`  ${String(idx + 1).padStart(2)}. ${row.version}  ${row.name}${meta}`);
        console.log(`      时间: ${date}\n`);
      });
    }

    if (pending.length > 0) {
      console.log('  ⏳ 待执行的迁移:\n');
      pending.forEach((file, idx) => {
        console.log(`  ${String(idx + 1).padStart(2)}. ${file}`);
      });
      console.log('\n  💡 使用 npx topems-migration migrate --up 应用所有待执行迁移');
    }

    return { pending, applied: result.rows as MigrationRecord[] };
  } finally {
    await client.end().catch(() => { /* ignore */ });
  }
}

// ============================================================================
// Schema 辅助
// ============================================================================

export async function createSchemaIfNotExists(databaseUrl: string, schema: string): Promise<void> {
  const client = await getClient(databaseUrl);
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema};`);
    console.log(`  ✅ Schema ${schema} 已创建/已存在`);
  } finally {
    await client.end().catch(() => { /* ignore */ });
  }
}

export async function createAllSchemas(databaseUrl: string, schemas: string[]): Promise<number> {
  const client = await getClient(databaseUrl);
  let count = 0;
  try {
    await client.query('BEGIN');
    for (const schema of schemas) {
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema};`);
      count++;
    }
    await client.query('COMMIT');
    console.log(`  ✅ 已确保 ${count} 个 schema 存在`);
    return count;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    console.log(`  ❌ 创建 schema 失败: ${(err as Error).message}`);
    throw err;
  } finally {
    await client.end().catch(() => { /* ignore */ });
  }
}

// ============================================================================
// 数据库连接自检 (不依赖实际 DB 也能通过, 仅提示)
// ============================================================================

export async function probeDatabase(databaseUrl: string): Promise<{ ok: boolean; version?: string; error?: string }> {
  const client = await getClient(databaseUrl);
  try {
    const r = await client.query('SELECT version();');
    const version = r.rows[0]?.version?.toString() || '';
    return { ok: true, version };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  } finally {
    await client.end().catch(() => { /* ignore */ });
  }
}
