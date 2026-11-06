#!/usr/bin/env node
/**
 * ledger-vs-DDL 漂移检查（[Gate DRIFT]）
 *
 * 背景：2026-11-06 mes 集成测试踩到「_sqlx_migrations 记账 success=t，但目标列/约束的实际结构
 * 未变」的漂移（本地/test 的 production_orders 停在 numeric/integer，prod 已 bigint；
 * batch_records 上还残留模板误加约束）。静态校验（validate.sh 只比对「本地文件是否记账」）
 * 看不见这一类问题，本脚本用「记账 + 实际结构」双证据做判定。
 *
 * 判定规则：
 *   1. 断言清单 database/migration_drift_assertions.json 每条声明 source 迁移版本；
 *   2. source_tokens 必须能在对应迁移文件里找到（防止清单与迁移脱节）；
 *   3. 仅当目标库 _sqlx_migrations 中该版本 success=true 时，才对实际结构做断言
 *      ——「记账说已执行」是结构必须到位的唯一前提；
 *   4. 记账 success=false → 漂移；未记账（test/快照库）→ 显式 NOTE 跳过该条，不静默。
 *
 * 用法：
 *   node scripts/migration/check-ledger-ddl-drift.mjs
 *
 * 目标库解析顺序：MIGRATION_DRIFT_DB_URL → DATABASE_URL → .env 的 MIGRATE_URL。
 * 均缺失或不可连接 → fail-closed（exit 1），并打印启动/改指向 test 库的指引。
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const MANIFEST_PATH = path.join(REPO_ROOT, "database/migration_drift_assertions.json");
const MIGRATION_DIR = path.join(REPO_ROOT, "database/migrations");
const TAG = "[Gate DRIFT]";
const PSQL_TIMEOUT_MS = 8000;
const VALID_KINDS = new Set(["column_type", "constraint_absent", "index_exists"]);

const startedAt = Date.now();

function fail(lines) {
  for (const line of lines) console.error(line);
  process.exit(1);
}

function readEnvMigrateUrl() {
  const envFile = path.join(REPO_ROOT, ".env");
  if (!fs.existsSync(envFile)) return null;
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = /^\s*MIGRATE_URL=(.*)$/.exec(line);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

function resolveDbUrl() {
  return (
    process.env.MIGRATION_DRIFT_DB_URL ||
    process.env.DATABASE_URL ||
    readEnvMigrateUrl()
  );
}

function sanitizeUrl(url) {
  return String(url).replace(/(\/\/)([^:@/]+):[^@/]+@/, "$1$2@");
}

function dbLabel(url) {
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || 5432}${u.pathname}`;
  } catch {
    return "(无法解析的连接串)";
  }
}

function sqlStr(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function psql(url, sql) {
  return execFileSync("psql", [url, "-v", "ON_ERROR_STOP=1", "-Atc", sql], {
    encoding: "utf8",
    timeout: PSQL_TIMEOUT_MS,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PGCONNECT_TIMEOUT: "5" },
  }).trim();
}

function connectivityFailureReason(err) {
  if (err && err.code === "ENOENT") return "未找到 psql 可执行文件";
  if (err && err.killed) return `连接/查询超时（>${PSQL_TIMEOUT_MS} ms）`;
  const stderr = typeof err?.stderr === "string" ? err.stderr : Buffer.isBuffer(err?.stderr) ? err.stderr.toString() : "";
  const first = (stderr || err?.message || String(err)).trim().split(/\r?\n/)[0];
  return first || "未知错误";
}

function migrationFileFor(version) {
  if (!fs.existsSync(MIGRATION_DIR)) return null;
  const match = fs
    .readdirSync(MIGRATION_DIR)
    .find((name) => name.startsWith(`${version}_`) && name.endsWith(".sql"));
  return match ? path.join(MIGRATION_DIR, match) : null;
}

function loadManifest() {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  } catch (err) {
    fail([`${TAG} FAILED 断言清单不可读：${MANIFEST_PATH}`, `  ${err.message}`]);
  }
  if (!Array.isArray(manifest.assertions) || manifest.assertions.length === 0) {
    fail([`${TAG} FAILED 断言清单为空：${MANIFEST_PATH}`]);
  }
  const seen = new Set();
  for (const a of manifest.assertions) {
    if (!a.id || seen.has(a.id)) fail([`${TAG} FAILED 断言 id 缺失或重复：${a.id ?? "?"}`]);
    seen.add(a.id);
    if (!VALID_KINDS.has(a.kind)) fail([`${TAG} FAILED 断言 ${a.id} 的 kind 不支持：${a.kind}`]);
    if (!a.source) fail([`${TAG} FAILED 断言 ${a.id} 缺少 source 迁移版本`]);
  }
  return manifest.assertions;
}

function assertManifestAgainstMigrations(assertions) {
  const problems = [];
  for (const a of assertions) {
    const file = migrationFileFor(a.source);
    if (!file) {
      problems.push(`${a.id}：找不到 source 迁移 ${a.source}_*.sql`);
      continue;
    }
    const text = fs.readFileSync(file, "utf8");
    for (const token of a.source_tokens ?? []) {
      if (!text.includes(token)) {
        problems.push(
          `${a.id}：source_tokens 在 ${path.basename(file)} 中缺失「${token}」，断言清单与迁移已脱节`,
        );
      }
    }
  }
  if (problems.length > 0) {
    fail([
      `${TAG} FAILED ${problems.length} 项断言清单校验失败`,
      ...problems.map((p) => `  - ${p}`),
      "  修复：同步 database/migration_drift_assertions.json 的 source/source_tokens，或撤销对应迁移改动。",
    ]);
  }
}

function buildStructSql(assertions) {
  const parts = assertions.map((a) => {
    let value;
    if (a.kind === "column_type") {
      const table = `to_regclass(${sqlStr(a.table)})`;
      value =
        `CASE WHEN ${table} IS NULL THEN 'TABLE_MISSING' ELSE COALESCE((` +
        `SELECT format_type(atttypid, atttypmod) FROM pg_attribute ` +
        `WHERE attrelid = ${table} AND attname = ${sqlStr(a.column)} AND attnum > 0 AND NOT attisdropped` +
        `), 'COLUMN_MISSING') END`;
    } else if (a.kind === "constraint_absent") {
      const table = `to_regclass(${sqlStr(a.table)})`;
      value =
        `CASE WHEN ${table} IS NULL THEN 'TABLE_MISSING' WHEN EXISTS (` +
        `SELECT 1 FROM pg_constraint WHERE conrelid = ${table} AND conname = ${sqlStr(a.constraint)}` +
        `) THEN 'present' ELSE 'absent' END`;
    } else {
      value =
        `CASE WHEN EXISTS (SELECT 1 FROM pg_indexes ` +
        `WHERE schemaname = ${sqlStr(a.schema)} AND indexname = ${sqlStr(a.index)}` +
        `) THEN 'present' ELSE 'absent' END`;
    }
    return `SELECT ${sqlStr(a.id)} || '|' || (${value})`;
  });
  return parts.join(" UNION ALL ");
}

function expectedLabel(a) {
  if (a.kind === "column_type") return `${a.table}.${a.column} = ${a.expected}`;
  if (a.kind === "constraint_absent") return `${a.table} 无约束 ${a.constraint}`;
  return `${a.schema}.${a.index} 索引存在`;
}

function actualLabel(a, value) {
  if (a.kind === "column_type") {
    if (value === "TABLE_MISSING") return "表不存在";
    if (value === "COLUMN_MISSING") return "列不存在";
    return value;
  }
  if (a.kind === "constraint_absent") {
    if (value === "TABLE_MISSING") return "表不存在";
    return value === "present" ? "约束仍存在（应已删除）" : "约束不存在";
  }
  return value === "present" ? "索引存在" : "索引不存在";
}

function isDrift(a, value) {
  if (a.kind === "column_type") return value !== a.expected;
  if (a.kind === "constraint_absent") return value === "present" || value === "TABLE_MISSING";
  return value !== "present";
}

function main() {
  const assertions = loadManifest();
  assertManifestAgainstMigrations(assertions);

  const url = resolveDbUrl();
  if (!url) {
    fail([
      `${TAG} FAILED 缺少数据库连接（fail-closed，不允许静默跳过）`,
      "  缺少什么：环境变量 MIGRATION_DRIFT_DB_URL / DATABASE_URL，或仓库 .env 的 MIGRATE_URL。",
      "  怎么起库：brew services start postgresql@18（仓库文档默认 @16），确认本机 5432 可连；",
      "            本地库 topems 需由迁移链建好（_sqlx_migrations 存在）。",
      "  无本地库：export MIGRATION_DRIFT_DB_URL=<test 库连接串>（同 .env 的 MIGRATE_URL 格式，指向 topems_prepare；用户名/口令按 test 环境填写）",
      "  重跑：node scripts/migration/check-ledger-ddl-drift.mjs",
    ]);
  }

  const label = dbLabel(url);
  console.log(`${TAG} 目标库 ${label}（${sanitizeUrl(url)}）；断言 ${assertions.length} 项`);

  let ledgerPresent;
  try {
    ledgerPresent = psql(
      url,
      "SELECT CASE WHEN to_regclass('_sqlx_migrations') IS NULL THEN 'absent' ELSE 'present' END",
    );
  } catch (err) {
    fail([
      `${TAG} FAILED 数据库不可用（fail-closed）`,
      `  目标库：${label}`,
      `  原因：${connectivityFailureReason(err)}`,
      "  缺少什么：可连接的 PostgreSQL + psql（当前 PATH 需能找到 psql）。",
      "  怎么起库：brew services start postgresql@18（仓库文档默认 @16）；PostgreSQL 未安装时 brew install postgresql@18。",
      "  确认 .env 的 MIGRATE_URL 指向本机库（示例：127.0.0.1:5432/topems）。",
      "  无本地库：export MIGRATION_DRIFT_DB_URL=<test 库连接串>（同 .env 的 MIGRATE_URL 格式，指向 topems_prepare；无记账时仅打印 NOTE）。",
      `${TAG} 本门禁不可跳过；修好数据库后重跑 push。`,
    ]);
  }

  const versions = [...new Set(assertions.map((a) => a.source))];
  const ledger = new Map();
  if (ledgerPresent === "present") {
    try {
      const out = psql(
        url,
        `SELECT version || '|' || success::text FROM _sqlx_migrations WHERE version IN (${versions
          .map((v) => sqlStr(v))
          .join(",")})`,
      );
      for (const line of out.split(/\r?\n/)) {
        if (!line) continue;
        const [version, success] = line.split("|");
        ledger.set(version, success === "t" || success === "true");
      }
    } catch (err) {
      fail([
        `${TAG} FAILED 读取 _sqlx_migrations 失败`,
        `  原因：${connectivityFailureReason(err)}`,
      ]);
    }
  }

  let structRows = new Map();
  if (ledger.size > 0) {
    try {
      const out = psql(url, buildStructSql(assertions));
      for (const line of out.split(/\r?\n/)) {
        if (!line) continue;
        const idx = line.indexOf("|");
        structRows.set(line.slice(0, idx), line.slice(idx + 1));
      }
    } catch (err) {
      fail([
        `${TAG} FAILED 结构断言查询失败`,
        `  原因：${connectivityFailureReason(err)}`,
        "  修复：确认目标库可读 pg_catalog / pg_indexes / pg_constraint。",
      ]);
    }
  }

  const drift = [];
  const failedLedger = [];
  const skipped = [];
  let enforced = 0;

  for (const a of assertions) {
    const recorded = ledger.get(a.source);
    if (ledgerPresent !== "present") {
      skipped.push(`${a.id}（目标库无 _sqlx_migrations）`);
      continue;
    }
    if (recorded === undefined) {
      skipped.push(`${a.id}（源迁移 ${a.source} 未记账）`);
      continue;
    }
    if (recorded === false) {
      failedLedger.push(`${a.id}（源迁移 ${a.source} 记账 success=false）`);
      continue;
    }
    enforced += 1;
    const actual = structRows.get(a.id);
    if (actual === undefined) {
      drift.push({ a, expected: expectedLabel(a), actual: "断言查询无返回" });
    } else if (isDrift(a, actual)) {
      drift.push({ a, expected: expectedLabel(a), actual: actualLabel(a, actual) });
    }
  }

  if (failedLedger.length > 0 || drift.length > 0) {
    console.error(`${TAG} FAILED ${drift.length + failedLedger.length} 项漂移（记账 success=t 与实际结构不符）`);
    for (const item of drift) {
      console.error(`  - ${item.a.id}`);
      console.error(`      期望 ${item.expected}（源 ${item.a.source} 已记账 success=t）`);
      console.error(`      实际 ${item.actual}`);
      console.error(`      修复：psql "$MIGRATION_DRIFT_DB_URL" -f database/migrations/${item.a.source}_*.sql（幂等）；或重跑 scripts/migration/apply-forward.sh`);
    }
    for (const item of failedLedger) {
      console.error(`  - ${item}`);
      console.error("      修复：确认该迁移失败原因，修正后重新应用并确保账本 success=t。");
    }
    console.error(`${TAG} 提示：漂移意味着「账本已记账但 DDL 未落地」，只改测试/放宽约束不能消除。`);
    process.exit(1);
  }

  if (skipped.length > 0) {
    console.log(`${TAG} NOTE ${skipped.length} 项源迁移未记账，按规则跳过结构断言（非静默）：`);
    for (const item of skipped) console.log(`  - ${item}`);
  }
  if (enforced === 0) {
    console.log(
      `${TAG} WARN 目标库无任何已记账的断言源（test/快照库），本库仅做连通性与清单校验；主库请指向 topems。`,
    );
  }
  const ms = Date.now() - startedAt;
  console.log(`${TAG} PASS 断言 ${assertions.length} 项，记账校验 ${enforced} 项，耗时 ${ms} ms`);
}

main();
