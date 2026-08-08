#!/usr/bin/env node
/**
 * scripts/gen-add-tenant-id.mjs
 * -----------------------------
 * 为指定服务生成一份规范化的 add_tenant_id 迁移 SQL。
 *
 * 工作流程：
 *   1. 扫描 svc/<svc>/migrations/ 下现有所有 .sql 迁移，按文件名升序 + 文件内出现顺序
 *      提取 CREATE TABLE (IF NOT EXISTS)? <name> 以及每表的 <parent>_id UUID 外键候选列
 *   2. 对每张表推断 tenant_id 回填 SQL：
 *        · 若存在 <parent>_id 且 <parent> 是同服务同批次出现过的表 → 关联回填
 *        · 否则 → gen_random_uuid()
 *   3. 按 style 组织输出（默认 unified = 每表 RLS+POLICY inline，事务封装）
 *   4. 写入 svc/<svc>/migrations/<ts>_add_tenant_id_to_<svc>_tables.sql
 *
 * CLI:
 *   node scripts/gen-add-tenant-id.mjs --svc billing [--svc communication ...]
 *      [--timestamp 20260809000000]
 *      [--style unified|batch-rls]  (default unified)
 *      [--dry-run]                  (stdout only, 不写盘)
 *      [--out <dir>]                (写到自定义目录，便于 dry-run 验收)
 *      [--self-check]               (对所有缺失 add_tenant_id 的 10 服务 dry-run 生成到 /tmp/self-check 后做命名门禁)
 *
 * Exit: 0 成功，非零错误
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');

// ---------- 命令行解析 ----------
function parseArgs(argv) {
  const out = { svcs: [], timestamp: null, style: 'unified', dryRun: false, outDir: null, selfCheck: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--svc': out.svcs.push(argv[++i]); break;
      case '--timestamp': out.timestamp = argv[++i]; break;
      case '--style': out.style = argv[++i]; break;
      case '--dry-run': out.dryRun = true; break;
      case '--out': out.outDir = argv[++i]; break;
      case '--self-check': out.selfCheck = true; break;
      default: throw new Error(`未知参数: ${a}`);
    }
  }
  if (!out.selfCheck && out.svcs.length === 0) {
    throw new Error('至少需要 --svc <name> 或 --self-check');
  }
  if (out.timestamp && !/^\d{14}$/.test(out.timestamp)) {
    throw new Error(`--timestamp 必须 14 位 YYYYMMDDhhmmss，收到: ${out.timestamp}`);
  }
  if (!['unified', 'batch-rls'].includes(out.style)) {
    throw new Error(`--style 仅支持 unified 或 batch-rls`);
  }
  return out;
}

// ---------- 扫描工具 ----------
function listServices() {
  const dir = path.join(REPO_ROOT, 'svc');
  return fs.readdirSync(dir).filter(n => fs.statSync(path.join(dir, n)).isDirectory());
}

function listMigrations(svc) {
  const mDir = path.join(REPO_ROOT, 'svc', svc, 'migrations');
  if (!fs.existsSync(mDir)) return [];
  return fs.readdirSync(mDir)
    .filter(n => n.endsWith('.sql'))
    .sort()
    .map(n => ({ name: n, path: path.join(mDir, n) }));
}

function hasExistingAddTenantId(svc) {
  return listMigrations(svc).some(m => /add_tenant_id/i.test(m.name));
}

/**
 * 扫描一批迁移 SQL，提取：
 *   tables: [{name, order}]  (按文件出现顺序、文件内顺序)
 *   fks:    Map<tableName, Array<{col, parent}>>   // <parent>_id → parent
 */
function scanTablesAndFks(migrations) {
  const tables = [];
  const seen = new Set();
  const fks = new Map();

  for (const m of migrations) {
    const content = fs.readFileSync(m.path, 'utf8');

    // 先抓 CREATE TABLE 定义的表体块（从 CREATE TABLE 到下一个 ); 或下一个 CREATE）
    // 两步：先拿表名清单 + 顺序，然后再逐段扫描外键列
    const lines = content.split(/\r?\n/);
    let currentTable = null;
    let inDef = false;
    let braceDepth = 0;

    const pushTable = (name) => {
      if (!seen.has(name)) {
        seen.add(name);
        tables.push({ name, order: tables.length });
        fks.set(name, []);
      }
    };

    for (const raw of lines) {
      let line = raw;
      // 去掉行尾 SQL 注释（避免干扰）
      line = line.replace(/--.*$/, '');
      if (!inDef) {
        // 支持 schema.table 前缀，如 crm.customers · rs.projects
        const m = line.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)?)\s*\(/i);
        if (m) {
          currentTable = m[1];
          pushTable(currentTable);
          inDef = true;
          braceDepth = 1;
          // 同行有没有 )？
          const rest = line.substring(line.indexOf('(') + 1);
          braceDepth += (rest.match(/\(/g) || []).length;
          braceDepth -= (rest.match(/\)/g) || []).length;
          scanLineForFk(currentTable, rest, fks);
          if (braceDepth <= 0) { inDef = false; currentTable = null; }
          continue;
        }
      } else {
        braceDepth += (line.match(/\(/g) || []).length;
        braceDepth -= (line.match(/\)/g) || []).length;
        scanLineForFk(currentTable, line, fks);
        if (braceDepth <= 0) { inDef = false; currentTable = null; }
      }
    }
  }

  return { tables, fks };
}

function scanLineForFk(table, line, fks) {
  if (!table) return;
  // FOREIGN KEY(col) REFERENCES parent(id) — 支持 schema.parent
  const fk1 = line.match(/FOREIGN\s+KEY\s*\(\s*([A-Za-z0-9_]+)\s*\)\s*REFERENCES\s+([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)?)\s*\(\s*id\s*\)/i);
  if (fk1) {
    fks.get(table).push({ col: fk1[1], parent: qualifySameSchema(table, fk1[2]) });
    return;
  }
  // <parent>_id UUID （以及后面可能 REFERENCES parent(id)）
  const m = line.match(/([A-Za-z0-9_]+_id)\s+(?:UUID|INT|BIGINT|SERIAL)\b(?:[^,]*REFERENCES\s+([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)?)\s*\(\s*id\s*\))?/i);
  if (m) {
    const col = m[1];
    let parent = m[2] || null;
    if (!parent) {
      const guess = col.replace(/_id$/, '');
      if (guess && guess.length >= 2) parent = guess;
    }
    if (parent) fks.get(table).push({ col, parent: qualifySameSchema(table, parent) });
  }
}

/** 如果当前表在 schema 下且引用未带 schema，自动补全为同 schema 引用 */
function qualifySameSchema(currentTable, refTable) {
  const dot = currentTable.indexOf('.');
  if (dot > 0 && refTable.indexOf('.') < 0) {
    return currentTable.substring(0, dot + 1) + refTable;
  }
  return refTable;
}

/** 把 schema.table 中的点号替换为下划线，用于 index / policy 标识符（避免需双引号） */
function identSafe(tblName) { return tblName.replace(/\./g, '_'); }

// ---------- 生成 SQL ----------
function pickBackfill(table, { tables, fks, seenParents }) {
  const candidates = fks.get(table.name) || [];
  const tableSet = new Set(tables.map(t => t.name));
  // 按列顺序选第一个已经处理过（或也在本批次存在）的父表
  for (const c of candidates) {
    if (tableSet.has(c.parent) && seenParents.has(c.parent)) {
      const alias = shortAlias(identSafe(table.name));
      return `(SELECT p.tenant_id FROM ${c.parent} p WHERE p.id = ${alias}.${c.col})`;
    }
  }
  return 'gen_random_uuid()';
}

function shortAlias(tblName) {
  const words = tblName.split('_').filter(Boolean);
  if (words.length <= 1) return tblName.substring(0, Math.min(3, tblName.length));
  return words.map(w => w[0]).join('');
}

function renderHeader(svc, style) {
  return `-- TOPEMS ${svc} Service - Add tenant_id for multi-tenant support
-- Generated by scripts/gen-add-tenant-id.mjs (style: ${style})
-- Note: transactional DDL, safe for PostgreSQL 14+

BEGIN;

`;
}

function renderTableBlock(idx, table, backfill, style) {
  const alias = shortAlias(identSafe(table.name));
  const id = identSafe(table.name);
  const lines = [];
  lines.push(`-- ============================================`);
  lines.push(`-- ${idx}. ${table.name}`);
  lines.push(`-- ============================================`);
  lines.push(`ALTER TABLE IF EXISTS ${table.name} ADD COLUMN IF NOT EXISTS tenant_id UUID;`);
  if (backfill.startsWith('gen_random_uuid()')) {
    lines.push(`UPDATE ${table.name} SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;`);
  } else {
    lines.push(`UPDATE ${table.name} ${alias} SET tenant_id = ${backfill} WHERE tenant_id IS NULL;`);
    lines.push(`UPDATE ${table.name} SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;`);
  }
  lines.push(`ALTER TABLE ${table.name} ALTER COLUMN tenant_id SET NOT NULL;`);
  lines.push(`CREATE INDEX IF NOT EXISTS idx_${id}_tenant_id ON ${table.name}(tenant_id);`);

  if (style === 'unified') {
    lines.push(`ALTER TABLE ${table.name} ENABLE ROW LEVEL SECURITY;`);
    lines.push(`DROP POLICY IF EXISTS tenant_isolation_${id} ON ${table.name};`);
    lines.push(`CREATE POLICY tenant_isolation_${id} ON ${table.name}`);
    lines.push(`    USING (tenant_id = current_setting('app.tenant_id')::uuid)`);
    lines.push(`    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`);
  }
  lines.push('');
  return lines.join('\n');
}

function renderBatchRlsTail(tables) {
  const out = [];
  out.push(`-- ============================================`);
  out.push(`-- Enable Row Level Security for all tables`);
  out.push(`-- ============================================`);
  for (const t of tables) out.push(`ALTER TABLE ${t.name} ENABLE ROW LEVEL SECURITY;`);
  out.push('');
  out.push(`-- ============================================`);
  out.push(`-- Create tenant isolation policies`);
  out.push(`-- ============================================`);
  for (const t of tables) {
    const id = identSafe(t.name);
    out.push(`DROP POLICY IF EXISTS tenant_isolation_${id} ON ${t.name};`);
    out.push(`CREATE POLICY tenant_isolation_${id} ON ${t.name}`);
    out.push(`    USING (tenant_id = current_setting('app.tenant_id')::uuid)`);
    out.push(`    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`);
    out.push('');
  }
  return out.join('\n');
}

function generateSql(svc, opts) {
  const migrations = listMigrations(svc).filter(m => !/add_tenant_id/i.test(m.name));
  const { tables, fks } = scanTablesAndFks(migrations);
  if (tables.length === 0) {
    console.warn(`[gen-add-tenant-id] 警告: svc/${svc} 未扫描到任何 CREATE TABLE，跳过生成`);
    return null;
  }

  const parts = [];
  parts.push(renderHeader(svc, opts.style));

  const seenParents = new Set();
  let idx = 0;
  for (const t of tables) {
    idx += 1;
    const backfill = pickBackfill(t, { tables, fks, seenParents });
    parts.push(renderTableBlock(idx, t, backfill, opts.style));
    seenParents.add(t.name);
  }

  if (opts.style === 'batch-rls') parts.push(renderBatchRlsTail(tables));
  parts.push('COMMIT;\n');

  return { sql: parts.join(''), tables: tables.length };
}

function nextTs(baseTs, i) {
  // baseTs 是 YYYYMMDDhhmmss 字符串，每服务加 5 分钟（i 从 0 开始）
  const y = +baseTs.slice(0, 4);
  const mo = +baseTs.slice(4, 6);
  const d = +baseTs.slice(6, 8);
  const h = +baseTs.slice(8, 10);
  const mi = +baseTs.slice(10, 12);
  const s = +baseTs.slice(12, 14);
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi + i * 5, s));
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
}

function defaultTs() {
  const d = new Date();
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function writeFor(svc, i, opts) {
  const result = generateSql(svc, opts);
  if (!result) return null;

  const base = opts.timestamp || defaultTs();
  const ts = opts.svcs.length > 1 ? nextTs(base, i) : base;

  // FULL 命名: YYYYMMDDhhmmss_add_tenant_id_to_<svc>_tables.sql
  const filename = `${ts}_add_tenant_id_to_${svc}_tables.sql`;
  let targetDir;
  if (opts.outDir) targetDir = path.resolve(REPO_ROOT, opts.outDir);
  else targetDir = path.join(REPO_ROOT, 'svc', svc, 'migrations');

  fs.mkdirSync(targetDir, { recursive: true });
  const filePath = path.join(targetDir, filename);
  if (!opts.dryRun) fs.writeFileSync(filePath, result.sql, 'utf8');
  return { filename, filePath, tables: result.tables, sql: result.sql };
}

// ---------- 命名门禁自检（针对 self-check）----------
function runMigrationNamesGate(checkDir) {
  // 把 svc/<svc>/migrations 重建成临时结构供 check-migration-names.mjs 扫描
  const tmpRoot = path.join(REPO_ROOT, '/tmp/_mig_root');
  fs.rmSync(tmpRoot, { recursive: true, force: true });
  const svcRoot = path.join(tmpRoot, 'svc');
  fs.mkdirSync(svcRoot, { recursive: true });
  for (const svcDir of fs.readdirSync(checkDir)) {
    const fakeMig = path.join(svcRoot, svcDir, 'migrations');
    fs.mkdirSync(fakeMig, { recursive: true });
    for (const f of fs.readdirSync(path.join(checkDir, svcDir))) {
      fs.copyFileSync(path.join(checkDir, svcDir, f), path.join(fakeMig, f));
    }
  }
  // 用相对路径跑 check-migration-names
  const out = spawnSync(process.execPath,
    [path.join(REPO_ROOT, 'scripts/check-migration-names.mjs'), '--strict'],
    { cwd: tmpRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return { exit: out.status, stdout: out.stdout, stderr: out.stderr, tmpRoot };
}

// ---------- 主入口 ----------
function main() {
  const opts = parseArgs(process.argv);

  if (opts.selfCheck) {
    const all = listServices();
    const missing = all.filter(s => !hasExistingAddTenantId(s)).sort();
    if (missing.length === 0) {
      console.log('[self-check] 无缺失 add_tenant_id 的服务，跳过');
      return 0;
    }
    const root = path.join(REPO_ROOT, '/tmp/self-check-add-tenant-id');
    fs.rmSync(root, { recursive: true, force: true });
    fs.mkdirSync(root, { recursive: true });
    const baseTs = '20260809000000';
    const results = [];
    missing.forEach((svc, i) => {
      const res = writeFor(svc, i, { ...opts, svcs: missing, timestamp: baseTs, outDir: path.join(root, svc), dryRun: false, style: 'unified' });
      if (res) results.push({ svc, ...res });
    });

    console.log(`[self-check] 服务共 ${all.length}，缺失 add_tenant_id 共 ${missing.length}，已生成 ${results.length} 份草稿：`);
    for (const r of results) console.log(`  · ${r.svc.padEnd(14)} ${r.filename}  (${r.tables} tables)`);

    const gate = runMigrationNamesGate(root);
    console.log('\n[self-check] 命名门禁（--strict）结果：');
    console.log(gate.stdout);
    if (gate.stderr) process.stderr.write(gate.stderr);
    console.log(`[self-check] EXIT=${gate.exit}`);
    if (gate.exit !== 0) {
      console.error(`[self-check] 命名门禁失败，文件位于 ${root}（保留供人工排错）`);
      process.exit(1);
    }
    // 成功就清理
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(gate.tmpRoot, { recursive: true, force: true });
    return 0;
  }

  let ok = 0;
  opts.svcs.forEach((svc, i) => {
    const res = writeFor(svc, i, opts);
    if (!res) return;
    if (opts.dryRun) {
      console.log(`# ====== ${svc}: ${res.filename} (${res.tables} tables) ======`);
      console.log(res.sql);
    } else {
      console.log(`[gen-add-tenant-id] ${svc}: ${res.filePath}  (${res.tables} tables)`);
    }
    ok++;
  });
  if (ok === 0) { console.error('无任何文件生成'); process.exit(2); }
  return 0;
}

try { process.exit(main() || 0); }
catch (e) { console.error('[gen-add-tenant-id] ERROR:', e.message || e); process.exit(1); }
