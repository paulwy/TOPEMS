#!/usr/bin/env node
/**
 * V68.1-5: Code generator for add_tenant_id migrations (v3 template + scan-based generation)
 *
 * ========== TWO GENERATION MODES ==========
 *
 * MODE A: TEMPLATE-BASED (HEAD original · already validated · default for positional args)
 * ----------------------------------------------------------------------------------------
 * Uses external SQL template at database/migrations/.snippets/add_tenant_id_template.sql.
 * Simple, reliable, generates a "v3" standard add_tenant_id migration.
 *
 * Usage:
 *   node scripts/gen-add-tenant-id.mjs <service-name> [schemas]
 *
 * Examples:
 *   # 1. New service: give service folder name; schemas default to plugin_<service>
 *      node scripts/gen-add-tenant-id.mjs srm        → plugin_srm
 *      node scripts/gen-add-tenant-id.mjs wms        → plugin_wms
 *
 *   # 2. Custom schemas (comma-separated, preserves order)
 *      node scripts/gen-add-tenant-id.mjs crm crm,plugin_crm
 *      node scripts/gen-add-tenant-id.mjs unified-core unified_core,iam,doc,flow,notification,mail
 *
 * Output:
 *   svc/<service>/migrations/YYYYMMDDHHMMSS_add_tenant_id.sql
 *
 * MODE B: SCAN-BASED (origin/main merged · FK-aware backfill · style options)
 * --------------------------------------------------------------------------
 * Scans existing migrations in svc/<svc>/migrations/ to:
 *   1. Extract CREATE TABLE definitions (in file + in-order appearance)
 *   2. Detect <parent>_id UUID FK columns and associate with parent tables
 *   3. Per table: choose backfill strategy → FK-join WHERE parent already handled, else gen_random_uuid()
 *   4. Two output styles: "unified" (RLS inline per table, transaction wrapped) vs "batch-rls" (RLS at end)
 *
 * CLI for MODE B:
 *   node scripts/gen-add-tenant-id.mjs --svc billing [--svc communication ...]
 *      [--timestamp 20260809000000]
 *      [--style unified|batch-rls]  (default unified)
 *      [--dry-run]                  (stdout only, no write)
 *      [--out <dir>]                (write to custom dir, good for dry-run validation)
 *      [--self-check]               (auto dry-run all 10 missing services → /tmp/self-check → naming gate)
 *
 * ========== SHARED FLAGS ==========
 *   --force      Overwrite existing add_tenant_id migration (MODE A default check bypass)
 *   --dry-run    For both modes: print / preview, never touch disk
 *
 * ========== SHARED TIMESTAMP RULES ==========
 *   - Reads all existing *.sql in svc/<service>/migrations/ sorted
 *   - Picks max 14-digit timestamp
 *   - Adds +1 second
 *   - If same as current wall clock, uses wall clock + 1 second
 *   - Guarantees newly generated file sorts LAST in that service's migrations
 *
 * ========== MODE B SELF-CHECK ==========
 *   Idempotent: if a migration *_add_tenant_id*.sql already exists for a service,
 *   it exits with WARNING 0 (non-fatal) unless --force flag given (MODE A).
 *   For --self-check, the script scans all svc/* dirs, finds services WITHOUT
 *   add_tenant_id migration, generates to /tmp with sequential timestamps +5min apart,
 *   then runs check-migration-names gate on a reconstructed fake svc root.
 *
 * Exit: 0 success, non-zero error
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  rmSync,
  copyFileSync,
  statSync,
} from 'node:fs';
import { join, resolve, dirname as pDirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = pDirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ============================================================
// SECTION 1: 命令行解析 — 同时支持两种调用方式
// ============================================================
function parseArgsFull(argv) {
  const positional = [];
  const named = {
    svcs: [],
    timestamp: null,
    style: 'unified',
    dryRun: false,
    force: false,
    outDir: null,
    selfCheck: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force') {
      named.force = true;
      continue;
    }
    if (a === '--dry-run') {
      named.dryRun = true;
      continue;
    }
    if (a === '--svc') {
      named.svcs.push(argv[++i]);
      continue;
    }
    if (a === '--timestamp') {
      named.timestamp = argv[++i];
      continue;
    }
    if (a === '--style') {
      named.style = argv[++i];
      continue;
    }
    if (a === '--out') {
      named.outDir = argv[++i];
      continue;
    }
    if (a === '--self-check') {
      named.selfCheck = true;
      continue;
    }
    if (a.startsWith('-')) {
      throw new Error(`未知参数: ${a}`);
    }
    positional.push(a);
  }
  if (named.timestamp && !/^\d{14}$/.test(named.timestamp)) {
    throw new Error(`--timestamp 必须 14 位 YYYYMMDDhhmmss，收到: ${named.timestamp}`);
  }
  if (!['unified', 'batch-rls'].includes(named.style)) {
    throw new Error(`--style 仅支持 unified 或 batch-rls`);
  }
  named.positional = positional;
  named.useScanMode =
    named.svcs.length > 0 ||
    named.selfCheck ||
    named.timestamp != null ||
    named.outDir != null ||
    named.style !== 'unified';
  return named;
}

function printModeAHelpAndExit(code = 1) {
  console.error(`
Usage (MODE A · template-based — already validated):
  node scripts/gen-add-tenant-id.mjs <service> [schemas]

  <service>    Folder name under svc/ (e.g. srm, wms, crm, unified-core)
  [schemas]    Optional comma-separated list of target schemas.
               Default: plugin_<service>  (with hyphens→underscores)

Usage (MODE B · scan-based · FK backfill + style options):
  node scripts/gen-add-tenant-id.mjs --svc <name> [--svc <name2> ...]
     [--timestamp 20260809000000]
     [--style unified|batch-rls]  (default unified)
     [--dry-run]                  (stdout only)
     [--out <dir>]                (custom output dir)
     [--self-check]               (auto all-missing services + naming gate)

Shared flags:
  --force      Overwrite existing add_tenant_id migration
  --dry-run    Print result path and content without writing files

Examples:
  node scripts/gen-add-tenant-id.mjs srm
  node scripts/gen-add-tenant-id.mjs crm crm,plugin_crm
  node scripts/gen-add-tenant-id.mjs unified-core unified_core,iam,doc
  node scripts/gen-add-tenant-id.mjs --svc mes --dry-run
`);
  process.exit(code);
}

// ============================================================
// SECTION 2: MODE A IMPLEMENTATION (HEAD · original validated template approach)
// ============================================================
function modeA_main(positional, opts) {
  const force = opts.force;
  const dryRun = opts.dryRun;

  if (positional.length < 1) {
    printModeAHelpAndExit(1);
  }

  const service = positional[0];
  let schemas = positional[1]
    ? positional[1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : ['plugin_' + service.replace(/-/g, '_')];

  // --- Paths ---
  const svcDir = join(ROOT, 'svc', service);
  if (!existsSync(svcDir) && !dryRun) {
    console.error(`[ERROR] Service directory not found: ${svcDir}`);
    process.exit(2);
  }

  const mgDir = join(svcDir, 'migrations');
  if (!dryRun) mkdirSync(mgDir, { recursive: true });

  // --- Check existing add_tenant_id migration ---
  let existingFile = null;
  if (existsSync(mgDir)) {
    for (const f of readdirSync(mgDir)) {
      if (/add_tenant_id/i.test(f) && f.endsWith('.sql')) {
        existingFile = f;
        break;
      }
    }
  }
  if (existingFile && !force) {
    console.log(`⚠️  Service ${service} already has add_tenant_id migration:
       svc/${service}/migrations/${existingFile}
     Add --force to regenerate.`);
    process.exit(0);
  }

  // --- Compute strictly monotonic timestamp for THIS service ---
  function nextTimestampA() {
    let maxTs = 0n;
    if (existsSync(mgDir)) {
      const files = readdirSync(mgDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();
      for (const f of files) {
        const m = f.match(/^(\d{14})/) || f.match(/^(\d{12})/) || f.match(/^(\d{8})/);
        if (!m) continue;
        let ts = m[1];
        while (ts.length < 14) ts += '0';
        const big = BigInt(ts);
        if (big > maxTs) maxTs = big;
      }
    }
    const now = new Date();
    const pad = (n, w = 2) => String(n).padStart(w, '0');
    const nowTs = BigInt(
      pad(now.getFullYear(), 4) +
        pad(now.getMonth() + 1) +
        pad(now.getDate()) +
        pad(now.getHours()) +
        pad(now.getMinutes()) +
        pad(now.getSeconds())
    );
    const base = maxTs > nowTs ? maxTs : nowTs;
    const next = base + 1n;
    return next.toString();
  }

  const timestamp = nextTimestampA();
  const fileName = `${timestamp}_add_tenant_id.sql`;

  // --- Render template ---
  const TEMPLATE = readFileSync(
    join(ROOT, 'database', 'migrations', '.snippets', 'add_tenant_id_template.sql'),
    'utf8'
  );

  const schemaArrayLiteral = schemas.map((s) => `'${s}'`).join(', ');
  const dateStr = new Date().toISOString().slice(0, 10);

  let rendered = TEMPLATE.replace('{{SERVICE}}', service)
    .replace('{{DATE}}', dateStr)
    .replace('{{SCHEMA_ARRAY}}', schemaArrayLiteral);

  rendered = rendered.replace('{{SCHEMAS}}', schemas.join(', '));

  const outPath = join(mgDir, fileName);

  if (dryRun) {
    console.log(`=== DRY RUN (MODE A template-based) ===
Service:        ${service}
Schemas:        ${schemas.join(', ')}
File:           svc/${service}/migrations/${fileName}
Timestamp:      ${timestamp} (strict monotonic vs previous in-service max)

Generated content:
=== BEGIN ===
`);
    process.stdout.write(rendered);
    console.log('=== END ===');
  } else {
    writeFileSync(outPath, rendered);
    console.log(`✅ Generated:
     svc/${service}/migrations/${fileName}
     Schemas: [${schemas.join(', ')}]
     Timestamp: ${timestamp} (strict monotonic +1s)`);

    const { status } = spawnSync('node', ['scripts/check-migration-names.mjs'], {
      cwd: ROOT,
      stdio: 'inherit',
    });
    if (status !== 0) console.error('\n[WARN] check-migration-names returned non-zero (see above)');
  }
  return 0;
}

// ============================================================
// SECTION 3: MODE B IMPLEMENTATION (origin/main · scan-based)
// ============================================================

// ---------- 扫描工具 ----------
function listServicesB() {
  const dir = join(ROOT, 'svc');
  return readdirSync(dir).filter((n) => statSync(join(dir, n)).isDirectory());
}

function listMigrationsB(svc) {
  const mDir = join(ROOT, 'svc', svc, 'migrations');
  if (!existsSync(mDir)) return [];
  return readdirSync(mDir)
    .filter((n) => n.endsWith('.sql'))
    .sort()
    .map((n) => ({ name: n, path: join(mDir, n) }));
}

function hasExistingAddTenantIdB(svc) {
  return listMigrationsB(svc).some((m) => /add_tenant_id/i.test(m.name));
}

function scanTablesAndFksB(migrations) {
  const tables = [];
  const seen = new Set();
  const fks = new Map();

  for (const m of migrations) {
    const content = readFileSync(m.path, 'utf8');
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
      line = line.replace(/--.*$/, '');
      if (!inDef) {
        const mm = line.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)?)\s*\(/i);
        if (mm) {
          currentTable = mm[1];
          pushTable(currentTable);
          inDef = true;
          braceDepth = 1;
          const rest = line.substring(line.indexOf('(') + 1);
          braceDepth += (rest.match(/\(/g) || []).length;
          braceDepth -= (rest.match(/\)/g) || []).length;
          scanLineForFkB(currentTable, rest, fks);
          if (braceDepth <= 0) {
            inDef = false;
            currentTable = null;
          }
          continue;
        }
      } else {
        braceDepth += (line.match(/\(/g) || []).length;
        braceDepth -= (line.match(/\)/g) || []).length;
        scanLineForFkB(currentTable, line, fks);
        if (braceDepth <= 0) {
          inDef = false;
          currentTable = null;
        }
      }
    }
  }
  return { tables, fks };
}

function scanLineForFkB(table, line, fks) {
  if (!table) return;
  const fk1 = line.match(
    /FOREIGN\s+KEY\s*\(\s*([A-Za-z0-9_]+)\s*\)\s*REFERENCES\s+([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)?)\s*\(\s*id\s*\)/i
  );
  if (fk1) {
    fks.get(table).push({ col: fk1[1], parent: qualifySameSchemaB(table, fk1[2]) });
    return;
  }
  const mm = line.match(
    /([A-Za-z0-9_]+_id)\s+(?:UUID|INT|BIGINT|SERIAL)\b(?:[^,]*REFERENCES\s+([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)?)\s*\(\s*id\s*\))?/i
  );
  if (mm) {
    const col = mm[1];
    let parent = mm[2] || null;
    if (!parent) {
      const guess = col.replace(/_id$/, '');
      if (guess && guess.length >= 2) parent = guess;
    }
    if (parent) fks.get(table).push({ col, parent: qualifySameSchemaB(table, parent) });
  }
}

function qualifySameSchemaB(currentTable, refTable) {
  const dot = currentTable.indexOf('.');
  if (dot > 0 && refTable.indexOf('.') < 0) {
    return currentTable.substring(0, dot + 1) + refTable;
  }
  return refTable;
}

function identSafeB(tblName) {
  return tblName.replace(/\./g, '_');
}

// ---------- 生成 SQL ----------
function pickBackfillB(table, { tables, fks, seenParents }) {
  const candidates = fks.get(table.name) || [];
  const tableSet = new Set(tables.map((t) => t.name));
  for (const c of candidates) {
    if (tableSet.has(c.parent) && seenParents.has(c.parent)) {
      const alias = shortAliasB(identSafeB(table.name));
      return `(SELECT p.tenant_id FROM ${c.parent} p WHERE p.id = ${alias}.${c.col})`;
    }
  }
  return 'gen_random_uuid()';
}

function shortAliasB(tblName) {
  const words = tblName.split('_').filter(Boolean);
  if (words.length <= 1) return tblName.substring(0, Math.min(3, tblName.length));
  return words.map((w) => w[0]).join('');
}

function renderHeaderB(svc, style) {
  return `-- TOPEMS ${svc} Service - Add tenant_id for multi-tenant support
-- Generated by scripts/gen-add-tenant-id.mjs (style: ${style})
-- Note: transactional DDL, safe for PostgreSQL 14+

BEGIN;

`;
}

function renderTableBlockB(idx, table, backfill, style) {
  const alias = shortAliasB(identSafeB(table.name));
  const id = identSafeB(table.name);
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

function renderBatchRlsTailB(tables) {
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
    const id = identSafeB(t.name);
    out.push(`DROP POLICY IF EXISTS tenant_isolation_${id} ON ${t.name};`);
    out.push(`CREATE POLICY tenant_isolation_${id} ON ${t.name}`);
    out.push(`    USING (tenant_id = current_setting('app.tenant_id')::uuid)`);
    out.push(`    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`);
    out.push('');
  }
  return out.join('\n');
}

function generateSqlB(svc, opts) {
  const migrations = listMigrationsB(svc).filter((m) => !/add_tenant_id/i.test(m.name));
  const { tables, fks } = scanTablesAndFksB(migrations);
  if (tables.length === 0) {
    console.warn(`[gen-add-tenant-id] 警告: svc/${svc} 未扫描到任何 CREATE TABLE，跳过生成`);
    return null;
  }

  const parts = [];
  parts.push(renderHeaderB(svc, opts.style));

  const seenParents = new Set();
  let idx = 0;
  for (const t of tables) {
    idx += 1;
    const backfill = pickBackfillB(t, { tables, fks, seenParents });
    parts.push(renderTableBlockB(idx, t, backfill, opts.style));
    seenParents.add(t.name);
  }

  if (opts.style === 'batch-rls') parts.push(renderBatchRlsTailB(tables));
  parts.push('COMMIT;\n');

  return { sql: parts.join(''), tables: tables.length };
}

function nextTsB(baseTs, i) {
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

function defaultTsB() {
  const d = new Date();
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function writeForB(svc, i, opts) {
  const result = generateSqlB(svc, opts);
  if (!result) return null;

  const base = opts.timestamp || defaultTsB();
  const ts = opts.svcs.length > 1 ? nextTsB(base, i) : base;

  const filename = `${ts}_add_tenant_id_to_${svc}_tables.sql`;
  let targetDir;
  if (opts.outDir) targetDir = resolve(ROOT, opts.outDir);
  else targetDir = join(ROOT, 'svc', svc, 'migrations');

  mkdirSync(targetDir, { recursive: true });
  const filePath = join(targetDir, filename);
  if (!opts.dryRun) writeFileSync(filePath, result.sql, 'utf8');
  return { filename, filePath, tables: result.tables, sql: result.sql };
}

// ---------- 命名门禁自检 ----------
function runMigrationNamesGateB(checkDir) {
  const tmpRoot = join(ROOT, '/tmp/_mig_root');
  rmSync(tmpRoot, { recursive: true, force: true });
  const svcRoot = join(tmpRoot, 'svc');
  mkdirSync(svcRoot, { recursive: true });
  for (const svcDir of readdirSync(checkDir)) {
    const fakeMig = join(svcRoot, svcDir, 'migrations');
    mkdirSync(fakeMig, { recursive: true });
    for (const f of readdirSync(join(checkDir, svcDir))) {
      copyFileSync(join(checkDir, svcDir, f), join(fakeMig, f));
    }
  }
  const out = spawnSync(process.execPath, [join(ROOT, 'scripts/check-migration-names.mjs'), '--strict'], {
    cwd: tmpRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return { exit: out.status, stdout: out.stdout, stderr: out.stderr, tmpRoot };
}

// ---------- MODE B 主入口 ----------
function modeB_main(opts) {
  if (opts.selfCheck) {
    const all = listServicesB();
    const missing = all.filter((s) => !hasExistingAddTenantIdB(s)).sort();
    if (missing.length === 0) {
      console.log('[self-check] 无缺失 add_tenant_id 的服务，跳过');
      return 0;
    }
    const root = join(ROOT, '/tmp/self-check-add-tenant-id');
    rmSync(root, { recursive: true, force: true });
    mkdirSync(root, { recursive: true });
    const baseTs = '20260809000000';
    const results = [];
    missing.forEach((svc, i) => {
      const res = writeForB(svc, i, {
        ...opts,
        svcs: missing,
        timestamp: baseTs,
        outDir: join(root, svc),
        dryRun: false,
        style: 'unified',
      });
      if (res) results.push({ svc, ...res });
    });

    console.log(
      `[self-check] 服务共 ${all.length}，缺失 add_tenant_id 共 ${missing.length}，已生成 ${results.length} 份草稿：`
    );
    for (const r of results) console.log(`  · ${r.svc.padEnd(14)} ${r.filename}  (${r.tables} tables)`);

    const gate = runMigrationNamesGateB(root);
    console.log('\n[self-check] 命名门禁（--strict）结果：');
    console.log(gate.stdout);
    if (gate.stderr) process.stderr.write(gate.stderr);
    console.log(`[self-check] EXIT=${gate.exit}`);
    if (gate.exit !== 0) {
      console.error(`[self-check] 命名门禁失败，文件位于 ${root}（保留供人工排错）`);
      process.exit(1);
    }
    rmSync(root, { recursive: true, force: true });
    rmSync(gate.tmpRoot, { recursive: true, force: true });
    return 0;
  }

  if (opts.svcs.length === 0) {
    console.error('[gen-add-tenant-id] MODE B 需要至少 --svc <name> 或 --self-check');
    process.exit(2);
  }

  let ok = 0;
  opts.svcs.forEach((svc, i) => {
    const res = writeForB(svc, i, opts);
    if (!res) return;
    if (opts.dryRun) {
      console.log(`# ====== ${svc}: ${res.filename} (${res.tables} tables) ======`);
      console.log(res.sql);
    } else {
      console.log(`[gen-add-tenant-id] ${svc}: ${res.filePath}  (${res.tables} tables)`);
    }
    ok++;
  });
  if (ok === 0) {
    console.error('无任何文件生成');
    process.exit(2);
  }
  return 0;
}

// ============================================================
// SECTION 4: DISPATCH
// ============================================================
try {
  const opts = parseArgsFull(process.argv);
  if (opts.useScanMode) {
    process.exit(modeB_main(opts) || 0);
  } else {
    process.exit(modeA_main(opts.positional, opts) || 0);
  }
} catch (e) {
  console.error('[gen-add-tenant-id] ERROR:', e.message || e);
  printModeAHelpAndExit(1);
}
