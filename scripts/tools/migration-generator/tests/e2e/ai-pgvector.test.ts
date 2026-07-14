import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import {
  generateServiceMigration,
  generateIndexMigration,
  generateAuditMigration,
} from '../../src/generator';
import { getServiceByName } from '../../src/services';
import { applyMigration, getMigrationStatus } from '../../src/runner';

const SKIP_E2E = process.env.CI === 'true' || process.env.SKIP_E2E === 'true';
const POSTGRES_IMAGE = 'postgres:latest';
const PG_PORT = 5432;

async function startPgvectorContainer(): Promise<StartedTestContainer> {
  const container = await new GenericContainer(POSTGRES_IMAGE)
    .withEnvironment({
      POSTGRES_USER: 'topems',
      POSTGRES_PASSWORD: 'topems',
      POSTGRES_DB: 'topems',
    })
    .withExposedPorts(PG_PORT)
    .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
    .withStartupTimeout(120_000)
    .start();

  // 在容器内安装 pgvector 扩展（对应当前 postgres 版本的 apt 包）
  // 先检测 postgres 主版本号，再安装 postgresql-<major>-pgvector
  const detectRes = await container.exec(['bash', '-c', 'psql --version']);
  const versionMatch = detectRes.output?.match(/\s(\d+)\./);
  const major = versionMatch ? versionMatch[1] : '16';

  const installRes = await container.exec([
    'bash',
    '-c',
    `apt-get update -qq >/dev/null 2>&1 && apt-get install -y -qq postgresql-${major}-pgvector >/dev/null 2>&1 && echo OK`,
  ]);
  if (installRes.exitCode !== 0 || !installRes.output?.includes('OK')) {
    throw new Error(`安装 pgvector 扩展失败: ${installRes.output}`);
  }
  return container;
}

function buildConnectionString(container: StartedTestContainer): string {
  const host = container.getHost();
  const port = container.getMappedPort(PG_PORT);
  return `postgresql://topems:topems@${host}:${port}/topems`;
}

describe.skipIf(SKIP_E2E)('E2E: AI pgvector 向量存储链路', () => {
  let container: StartedTestContainer;
  let client: Client;
  let connectionString: string;
  const outDir = path.join(__dirname, '..', '..', '.test-e2e-ai-temp');

  beforeAll(async () => {
    container = await startPgvectorContainer();
    connectionString = buildConnectionString(container);
    client = new Client({ connectionString });
    await client.connect();
    // 设置自定义 GUC 参数，用于 ai.organization_id 列的 DEFAULT 表达式
    await client.query("SET app.organization_id = '00000000-0000-0000-0000-000000000001'");
    await client.query("SET app.user_id = '00000000-0000-0000-0000-000000000001'");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  }, 240_000);

  afterAll(async () => {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
    try {
      await container.stop();
    } catch {
      /* ignore */
    }
    try {
      fs.rmSync(outDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }, 120_000);

  async function runSqlFile(filepath: string) {
    const sql = fs.readFileSync(filepath, 'utf8');
    try {
      await client.query(sql);
    } catch (err: any) {
      console.error(`❌ ${path.basename(filepath)}: ${err.message}`);
      if (err.position) {
        const pos = Number(err.position);
        const start = Math.max(0, pos - 120);
        console.error('--- 上下文 (byte:' + pos + ') ---');
        console.error(sql.slice(start, pos + 60));
        console.error('---------------------------');
      }
      throw err;
    }
  }

  it('pgvector 扩展可正常安装', async () => {
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    const res = await client.query(
      "SELECT extname FROM pg_extension WHERE extname = 'vector'",
    );
    expect(res.rows.length).toBeGreaterThan(0);
  });

  it('生成并应用 AI 服务 schema 迁移，关键表存在且字段正确', async () => {
    const ai = getServiceByName('ai');
    expect(ai).toBeDefined();

    const schemaFile = generateServiceMigration(ai!, outDir);
    expect(schemaFile).toBeTruthy();
    await runSqlFile(path.join(outDir, schemaFile!));

    // 验证 pgvector 扩展存在
    const ext = await client.query(
      "SELECT extname FROM pg_extension WHERE extname = 'vector'",
    );
    expect(ext.rows.length).toBeGreaterThan(0);

    // 验证 ai.documents、ai.document_chunks、ai.knowledge_bases、ai.audit_logs
    const tablesToCheck = ['documents', 'document_chunks', 'knowledge_bases', 'audit_logs'];
    for (const t of tablesToCheck) {
      const exists = await client.query(
        "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'ai' AND table_name = $1) AS exists",
        [t],
      );
      expect(exists.rows[0].exists).toBe(true);
    }

    // 验证 document_chunks 的关键字段类型：embedding 必须为 vector 类型且 NOT NULL
    const cols = await client.query(
      "SELECT column_name, data_type, udt_name, is_nullable FROM information_schema.columns WHERE table_schema = 'ai' AND table_name = 'document_chunks'",
    );
    const colMap: Record<string, { udt_name: string; is_nullable: string }> = Object.fromEntries(
      cols.rows.map((r: any) => [r.column_name, r]),
    );

    expect(colMap.id).toBeDefined();
    expect(colMap.document_id).toBeDefined();
    expect(colMap.knowledge_base_id).toBeDefined();
    expect(colMap.chunk_index).toBeDefined();
    expect(colMap.content).toBeDefined();
    expect(colMap.embedding).toBeDefined();
    expect(colMap.embedding.udt_name).toBe('vector');
    expect(colMap.embedding.is_nullable).toBe('NO');
    expect(colMap.vector_dimensions).toBeDefined();
    expect(colMap.token_count).toBeDefined();
    expect(colMap.embedding_model).toBeDefined();
    expect(colMap.metadata).toBeDefined();
  });

  it('应用索引迁移并验证 HNSW 向量索引存在', async () => {
    const ai = getServiceByName('ai')!;
    const idxFile = generateIndexMigration(ai, outDir);
    expect(idxFile).toBeTruthy();
    await runSqlFile(path.join(outDir, idxFile!));

    const idxs = await client.query(
      "SELECT indexname FROM pg_indexes WHERE schemaname = 'ai' AND indexname LIKE '%embedding%'",
    );
    expect(idxs.rows.length).toBeGreaterThan(0);
    expect(
      idxs.rows.some((r: any) => r.indexname === 'idx_ai_document_chunks_embedding'),
    ).toBe(true);
  });

  it('应用审计触发器迁移', async () => {
    const ai = getServiceByName('ai')!;
    const auditFile = generateAuditMigration(ai, outDir);
    expect(auditFile).toBeTruthy();
    await runSqlFile(path.join(outDir, auditFile!));

    const fn = await client.query(
      "SELECT proname FROM pg_proc WHERE proname = 'audit_log_change' AND pronamespace::regnamespace::text = 'ai'",
    );
    expect(fn.rows.length).toBeGreaterThan(0);
  });

  it('插入测试数据：知识库、文档、3 条分块向量', async () => {
    await client.query('BEGIN');
    try {
      await client.query(
        `INSERT INTO ai.knowledge_bases(id, name, code, description, embedding_model, vector_dimension, chunk_size, chunk_overlap)
         VALUES ('11111111-1111-1111-1111-111111111111', 'topems-kb', 'KB001', '测试知识库', 'text-embedding-3-small', 1536, 512, 50)`,
      );

      await client.query(
        `INSERT INTO ai.documents(id, knowledge_base_id, title, file_path, file_name, file_size, file_type, content_hash, chunk_count, status)
         VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '用户手册', '/docs/manual.md', 'manual.md', 1024, 'text/markdown', 'hash1', 3, 'processed')`,
      );

      // 构造 1536 维向量字面量：
      //   chunk 0: 全 0.1 的"基础主题"向量
      //   chunk 1: 大部分 0.1，少部分 0.11，与 chunk 0 相近
      //   chunk 2: 全 0.9，与前两条明显不同
      const baseVals = new Array(1536).fill(0.1);
      const closeVals = new Array(1536).fill(0).map((_, i) => (i % 7 === 0 ? 0.11 : 0.1));
      const farVals = new Array(1536).fill(0.9);

      const baseLit = `[${baseVals.join(',')}]`;
      const closeLit = `[${closeVals.join(',')}]`;
      const farLit = `[${farVals.join(',')}]`;

      await client.query(
        `INSERT INTO ai.document_chunks(id, document_id, knowledge_base_id, chunk_index, content, content_hash, embedding, vector_dimensions, token_count, embedding_status, embedding_model, metadata) VALUES
         ('30000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 0, 'TOPEMS 系统介绍：用于企业综合管理', 'ch0', '${baseLit}'::vector(1536), 1536, 64, 'done', 'text-embedding-3-small', '{"source":"manual"}'::jsonb),
         ('31111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 1, 'TOPEMS 模块说明：HRM, CRM, SRM 等', 'ch1', '${closeLit}'::vector(1536), 1536, 72, 'done', 'text-embedding-3-small', '{"source":"manual"}'::jsonb),
         ('32222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 2, '天气播报：今日晴，温度 25 度', 'ch2', '${farLit}'::vector(1536), 1536, 30, 'done', 'text-embedding-3-small', '{"source":"manual"}'::jsonb)`,
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

    const count = await client.query('SELECT COUNT(*) FROM ai.document_chunks');
    expect(Number(count.rows[0].count)).toBe(3);
  });

  it('向量相似度查询：语义最接近的 chunk 返回距离最小且排在首位', async () => {
    const queryLit = `[${new Array(1536).fill(0.1).join(',')}]`;

    const res = await client.query(
      `SELECT id, content, embedding <-> '${queryLit}'::vector(1536) AS distance
       FROM ai.document_chunks
       ORDER BY distance ASC
       LIMIT 5`,
    );

    expect(res.rows.length).toBe(3);
    const firstId = res.rows[0].id;
    expect(
      firstId === '30000000-0000-0000-0000-000000000000' ||
        firstId === '31111111-1111-1111-1111-111111111111',
    ).toBe(true);

    const distances = res.rows.map((r: any) => Number(r.distance));
    // 最接近的两条距离应小于最远那条
    expect(distances[0]).toBeLessThan(distances[2]);
    expect(distances[1]).toBeLessThan(distances[2]);
    // 最后一条应该是明显不同的 chunk 2（全 0.9）
    expect(res.rows[res.rows.length - 1].id).toBe('32222222-2222-2222-2222-222222222222');
  });
});

describe.skipIf(SKIP_E2E)('E2E: runner.applyMigration / getMigrationStatus 集成', () => {
  let container: StartedTestContainer;
  let connectionString: string;
  const migDir = path.join(__dirname, '..', '..', '.test-e2e-runner-migrations');

  beforeAll(async () => {
    container = await startPgvectorContainer();
    connectionString = buildConnectionString(container);

    // 使用 ALTER ROLE/DATABASE 让自定义 GUC 在新连接中也可见，避免 runner 内部新建 client 时因未设置而失败
    const setupClient = new Client({ connectionString });
    await setupClient.connect();
    try {
      await setupClient.query(
        "ALTER ROLE topems SET app.organization_id = '00000000-0000-0000-0000-000000000001'",
      );
      await setupClient.query(
        "ALTER ROLE topems SET app.user_id = '00000000-0000-0000-0000-000000000001'",
      );
    } finally {
      await setupClient.end();
    }

    if (!fs.existsSync(migDir)) fs.mkdirSync(migDir, { recursive: true });
    const ai = getServiceByName('ai')!;
    generateServiceMigration(ai, migDir);
    generateIndexMigration(ai, migDir);
  }, 240_000);

  afterAll(async () => {
    try {
      await container.stop();
    } catch {
      /* ignore */
    }
    try {
      fs.rmSync(migDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }, 120_000);

  it('applyMigration 能将生成的 SQL 文件应用到数据库', async () => {
    const reports = await applyMigration({
      databaseUrl: connectionString,
      migrationsDir: migDir,
    });
    expect(reports).toBeDefined();
    const okReports = reports.filter((r) => r.ok);
    expect(okReports.length).toBeGreaterThan(0);
  });

  it('getMigrationStatus 返回已应用的迁移条目', async () => {
    const status = await getMigrationStatus(connectionString, migDir);
    expect(status).toBeDefined();
    expect(status.applied.length).toBeGreaterThan(0);
    const names = status.applied.map((a) => a.name).join(',');
    expect(names).toMatch(/ai/);
  });
});
