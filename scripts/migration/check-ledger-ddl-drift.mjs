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
 *   4. 记账 success=false → 漂移；未记账（test/快照库）→ 显式 NOTE 跳过该条，不静默；
 *   5. K6 fail-closed：目标库可连但「无 _sqlx_migrations 表 / 账本 0 行 / 断言源全部未记账」
 *      一律 FAILED，不再 NOTE 跳过并 PASS（见 docs/database/known-gate-defects.md K6）。
 *      仅当显式设置 MIGRATION_DRIFT_ALLOW_EMPTY_LEDGER=1 才放行，且输出显眼 WARN。
 *
 * 用法：
 *   node scripts/migration/check-ledger-ddl-drift.mjs
 *   MIGRATION_DRIFT_ALLOW_EMPTY_LEDGER=1 node scripts/migration/check-ledger-ddl-drift.mjs  # 仅演练用
 *   MIGRATION_DRIFT_ALLOW_SUPERUSER=1 node scripts/migration/check-ledger-ddl-drift.mjs    # 仅演练用
 *
 * 目标库解析顺序：进程环境 MIGRATION_DRIFT_DB_URL → .env 的 MIGRATION_DRIFT_DB_URL
 *   （默认指向只读夹具库 topems_gate）→ 进程环境 DATABASE_URL → .env 的 MIGRATE_URL。
 *   - 连接串不含口令且未设置 PGPASSWORD/PGPASSFILE → 回落 socket
 *     （postgresql:///<库名>，本机 peer 认证），并打印实际用的是哪个来源。
 *   - 本机 pg_hba 把 127.0.0.1/32 改成 scram-sha-256 后，无口令 TCP 连接必然认证失败；
 *     回落 socket 是本地默认路径，不再先撞认证再 fail-closed。
 *   - 超级用户拒绝：连接成功后校验 current_user 的 rolsuper/rolbypassrls，命中即 FAILED。
 *     这类连接会 BYPASSRLS，权限/RLS 类断言恒真（2026-11-19 假绿事故）；
 *     仅本地演练可用 MIGRATION_DRIFT_ALLOW_SUPERUSER=1 显式豁免（CI 不得设置）。
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
// data_rows：数据型迁移（INSERT/UPDATE/DELETE）的「数据行断言」。
// 断言字段：sql（返回标量的 SELECT，通常是 count(*)）、expected（期望计数）。
// 可选 skip_if_applied：[版本]，其中任一版本在本库 success=t 时跳过该断言
// （用于「A 迁移写入、B 迁移按设计删除」的成对场景，避免把正常下线误判为漂移）。
const VALID_KINDS = new Set(["column_type", "constraint_absent", "index_exists", "data_rows"]);
// K6 显式豁免开关：只允许演练场景使用，CI 不得设置。
const ALLOW_EMPTY_LEDGER = /^(1|true|yes|on)$/i.test(
  String(process.env.MIGRATION_DRIFT_ALLOW_EMPTY_LEDGER ?? "").trim(),
);
// 超级用户拒绝开关：socket 回落默认以 OS 用户连接（本机通常即 superuser + BYPASSRLS），
// 这类连接会让权限/RLS 断言恒真，默认拒绝，仅本地演练可显式豁免。
const ALLOW_SUPERUSER = /^(1|true|yes|on)$/i.test(
  String(process.env.MIGRATION_DRIFT_ALLOW_SUPERUSER ?? "").trim(),
);

const startedAt = Date.now();

function fail(lines) {
  for (const line of lines) console.error(line);
  process.exit(1);
}

// 空账本（无表 / 0 行 / 断言源全部未记账）统一出口：默认 FAILED，显式豁免时打醒目 WARN 放行。
function emptyLedgerFailure(summary, detailLines, label, assertionCount, source) {
  const sourceLines = [
    `  连接来源：${source}`,
    "  提示：若该来源指向 pg_dump 结构副本（只同步了 schema、没执行迁移链），它天然没有迁移账本；",
    "        请用 MIGRATION_DRIFT_DB_URL 显式指向迁移链完整的库，而不是改此处判定。",
  ];
  if (!ALLOW_EMPTY_LEDGER) {
    fail([
      `${TAG} FAILED ${summary}`,
      `  目标库：${label}`,
      ...sourceLines,
      ...detailLines,
      "  判定：K6 fail-closed —— 可连但无账本/账本为空一律失败，不再 NOTE 跳过并 PASS。",
      "  修复：把 MIGRATION_DRIFT_DB_URL / DATABASE_URL / .env 的 MIGRATE_URL 指向已建好迁移链的库",
      "        （本机默认 topems，需 _sqlx_migrations 与断言源齐全），或先执行迁移。",
      "  仅演练可用显式豁免：MIGRATION_DRIFT_ALLOW_EMPTY_LEDGER=1（会打印 WARN，CI 不应设置）。",
    ]);
  }
  console.warn("");
  console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.warn(`${TAG} WARN ${summary}`);
  console.warn(`  目标库：${label}`);
  console.warn(`  连接来源：${source}`);
  for (const line of detailLines) console.warn(`  ${line.replace(/^ {2}/, "")}`);
  console.warn("  放行依据：MIGRATION_DRIFT_ALLOW_EMPTY_LEDGER=1（显式豁免，仅限本地演练；CI 不得设置）");
  console.warn("  本次未执行任何结构断言，本结论不可用于发布判定。");
  console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.warn("");
  console.log(`${TAG} PASS(WARN) 断言 ${assertionCount} 项，记账校验 0 项，空账本已显式豁免`);
  process.exit(0);
}

function readEnvValue(key) {
  const envFile = path.join(REPO_ROOT, ".env");
  if (!fs.existsSync(envFile)) return null;
  const pattern = new RegExp(`^\\s*${key}=(.*)$`);
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = pattern.exec(line);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

function readEnvMigrateUrl() {
  return readEnvValue("MIGRATE_URL");
}

function readEnvDriftUrl() {
  return readEnvValue("MIGRATION_DRIFT_DB_URL");
}

function parseUrl(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

// 口令来源：URL 内嵌口令、URL 的 password/passfile 参数，或 libpq 环境变量。
function hasPasswordSource(url) {
  const u = parseUrl(url);
  if (u && (u.password || u.searchParams.get("password") || u.searchParams.get("passfile"))) {
    return true;
  }
  return Boolean(process.env.PGPASSWORD || process.env.PGPASSFILE);
}

// authority 为空即 socket 形式：postgresql:///db
function isSocketUrl(url) {
  const u = parseUrl(url);
  return Boolean(u) && !u.hostname && !u.port;
}

function socketFallbackUrl(url) {
  const u = parseUrl(url);
  const db = u && u.pathname && u.pathname !== "/" ? u.pathname.slice(1) : "";
  const search = u && u.search ? u.search : "";
  return `postgresql:///${db}${search}`;
}

function resolveDbUrl() {
  let url = null;
  let source = null;
  const fromEnvFileDrift = readEnvDriftUrl();
  if (process.env.MIGRATION_DRIFT_DB_URL) {
    url = process.env.MIGRATION_DRIFT_DB_URL;
    source = "MIGRATION_DRIFT_DB_URL（环境变量）";
  } else if (fromEnvFileDrift) {
    // 专用变量优先于通用 DATABASE_URL：DATABASE_URL 常是某个 shell 里遗留的通用连接，
    // 不该覆盖本仓库显式配置的门禁目标库（见 .env.example 解析顺序说明）。
    url = fromEnvFileDrift;
    source = ".env 的 MIGRATION_DRIFT_DB_URL";
  } else if (process.env.DATABASE_URL) {
    url = process.env.DATABASE_URL;
    source = "DATABASE_URL（环境变量/外层 shell 导出）";
  } else {
    const fromEnvFileMigrate = readEnvMigrateUrl();
    if (fromEnvFileMigrate) {
      url = fromEnvFileMigrate;
      source = ".env 的 MIGRATE_URL";
    }
  }
  if (!url) return { url: null, source: null };
  if (isSocketUrl(url) || hasPasswordSource(url)) return { url, source };
  return {
    url: socketFallbackUrl(url),
    source: `${source} → 无口令，回落 socket（peer 认证）`,
  };
}

function sanitizeUrl(url) {
  return String(url).replace(/(\/\/)([^:@/]+):[^@/]+@/, "$1$2@");
}

function dbLabel(url) {
  try {
    const u = new URL(url);
    const db = u.pathname || "";
    // socket 形式没有 hostname/port，别显示成「:5432/库名」误导。
    if (!u.hostname && !u.port) return `socket:${db}`;
    return `${u.hostname}:${u.port || 5432}${db}`;
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
    if (a.kind === "data_rows") {
      if (typeof a.sql !== "string" || !a.sql.trim()) {
        fail([`${TAG} FAILED data_rows 断言 ${a.id} 缺少 sql`]);
      }
      if (!Number.isInteger(a.expected)) {
        fail([`${TAG} FAILED data_rows 断言 ${a.id} 的 expected 必须是整数`]);
      }
      if (a.skip_if_applied !== undefined && !Array.isArray(a.skip_if_applied)) {
        fail([`${TAG} FAILED data_rows 断言 ${a.id} 的 skip_if_applied 必须是版本数组`]);
      }
    }
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
    if (a.kind === "data_rows") {
      value = `COALESCE((${a.sql}), -1)`;
    } else if (a.kind === "column_type") {
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
  if (a.kind === "data_rows") return `数据行数 = ${a.expected}（${a.sql}）`;
  if (a.kind === "column_type") return `${a.table}.${a.column} = ${a.expected}`;
  if (a.kind === "constraint_absent") return `${a.table} 无约束 ${a.constraint}`;
  return `${a.schema}.${a.index} 索引存在`;
}

function actualLabel(a, value) {
  if (a.kind === "data_rows") {
    return value === "-1" ? "断言 SQL 返回空" : `数据行数 = ${value}`;
  }
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
  if (a.kind === "data_rows") return value === "-1" || Number(value) !== a.expected;
  if (a.kind === "column_type") return value !== a.expected;
  if (a.kind === "constraint_absent") return value === "present" || value === "TABLE_MISSING";
  return value !== "present";
}

function main() {
  const assertions = loadManifest();
  assertManifestAgainstMigrations(assertions);

  const { url, source } = resolveDbUrl();
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
  console.log(`${TAG} 目标库 ${label}（${sanitizeUrl(url)}；来源 ${source}）；断言 ${assertions.length} 项`);

  let identity;
  try {
    identity = psql(
      url,
      "SELECT current_user || '|' || rolsuper::text || '|' || rolbypassrls::text || '|' || " +
        "CASE WHEN to_regclass('_sqlx_migrations') IS NULL THEN 'absent' ELSE 'present' END " +
        "FROM pg_roles WHERE rolname = current_user",
    );
  } catch (err) {
    fail([
      `${TAG} FAILED 数据库不可用（fail-closed）`,
      `  目标库：${label}（来源 ${source}）`,
      `  原因：${connectivityFailureReason(err)}`,
      "  缺少什么：可连接的 PostgreSQL + psql（当前 PATH 需能找到 psql）。",
      "  认证提示：本机 pg_hba 若为 127.0.0.1/32 scram-sha-256，TCP 连接必须带口令；",
      "            无口令时本脚本已自动回落 socket（postgresql:///<库名>），走 peer 认证。",
      "  怎么起库：brew services start postgresql@18（仓库文档默认 @16）；PostgreSQL 未安装时 brew install postgresql@18。",
      "  确认 .env 的 MIGRATE_URL 指向本机库（示例：127.0.0.1:5432/topems）。",
      "  无本地库：export MIGRATION_DRIFT_DB_URL=<test 库连接串>（同 .env 的 MIGRATE_URL 格式）；无账本会 FAILED，仅显式豁免可放行。",
      `${TAG} 本门禁不可跳过；修好数据库后重跑 push。`,
    ]);
  }

  const [connUser, rolSuper, rolBypass, ledgerPresent] = identity.split("|");
  const privileged = /^(t|true)$/i.test(rolSuper ?? "") || /^(t|true)$/i.test(rolBypass ?? "");
  if (privileged) {
    const detail = `current_user=${connUser} rolsuper=${rolSuper} rolbypassrls=${rolBypass}`;
    if (!ALLOW_SUPERUSER) {
      fail([
        `${TAG} FAILED 该连接会 BYPASSRLS，校验恒真 —— 拒绝在特权角色上执行漂移门禁`,
        `  目标库：${label}（来源 ${source}）`,
        `  连接身份：${detail}`,
        "  为什么拒绝：superuser / BYPASSRLS 角色绕过行级安全与权限检查，",
        "              在这类连接上得到的绿灯不能代表普通业务角色（2026-11-19 假绿事故）。",
        "  怎么改（任选其一）：",
        "    1) 改用非特权角色并携带口令（连接串内嵌口令，或设置 PGPASSWORD）；",
        "    2) socket 回落必然以 OS 用户连接（本机通常为超级用户），需显式配置带口令的连接串；",
        "    3) 仅本地演练可显式豁免：MIGRATION_DRIFT_ALLOW_SUPERUSER=1（CI 不得设置）。",
      ]);
    }
    console.warn(
      `${TAG} WARN 特权连接已显式豁免（MIGRATION_DRIFT_ALLOW_SUPERUSER=1）：${detail}；结论不可用于发布判定`,
    );
  }

  // K6：无账本表即失败，不再按「无需校验」放行。
  if (ledgerPresent !== "present") {
    emptyLedgerFailure(
      "目标库无 _sqlx_migrations 表（可连但无账本）",
      ["  现状：to_regclass('_sqlx_migrations') IS NULL", "  含义：该库从未执行过迁移链，无法做任何记账-结构比对。"],
      label,
      assertions.length,
      source,
    );
  }

  let ledgerTotal;
  try {
    ledgerTotal = Number(psql(url, "SELECT count(*) FROM _sqlx_migrations"));
  } catch (err) {
    fail([
      `${TAG} FAILED 读取 _sqlx_migrations 行数失败`,
      `  目标库：${label}`,
      `  原因：${connectivityFailureReason(err)}`,
    ]);
  }
  if (!Number.isFinite(ledgerTotal) || ledgerTotal === 0) {
    emptyLedgerFailure(
      "目标库 _sqlx_migrations 账本为空（0 行）",
      [`  现状：表存在但记录数 = ${Number.isFinite(ledgerTotal) ? ledgerTotal : "未知"}`],
      label,
      assertions.length,
      source,
    );
  }

  const versions = [
    ...new Set(
      assertions.flatMap((a) => [a.source, ...(a.skip_if_applied ?? [])]),
    ),
  ];
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

  // K6：账本有行但 12 项断言源一个都没记账 → 视为「指向了非本仓库迁移链的库」，失败。
  if (ledger.size === 0) {
    emptyLedgerFailure(
      "目标库账本存在但断言源全部未记账",
      [
        `  现状：_sqlx_migrations 共 ${ledgerTotal} 行，但断言清单涉及的 ${versions.length} 个版本命中 0 条`,
        "  含义：该库不是本仓库的迁移链（或迁移尚未应用到这些版本），无法校验结构。",
      ],
      label,
      assertions.length,
      source,
    );
  }

  // 只为「源迁移已记账 success=true 且未被后续迁移取代」的断言构建结构 SQL。
  // 否则 data_rows 的原文 SQL 可能引用尚未存在的列（断言属新迁移、目标库尚未应用），
  // 会让整条 UNION 查询报错，而不是按规则 3/4 正常跳过该条。
  const activeAssertions = assertions.filter((a) => {
    if (ledger.get(a.source) !== true) return false;
    if ((a.skip_if_applied ?? []).some((v) => ledger.get(v) === true)) return false;
    return true;
  });
  let structRows = new Map();
  if (activeAssertions.length > 0) {
    try {
      const out = psql(url, buildStructSql(activeAssertions));
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
    if (recorded === undefined) {
      skipped.push(`${a.id}（源迁移 ${a.source} 未记账）`);
      continue;
    }
    if (recorded === false) {
      failedLedger.push(`${a.id}（源迁移 ${a.source} 记账 success=false）`);
      continue;
    }
    const supersededBy = (a.skip_if_applied ?? []).find((v) => ledger.get(v) === true);
    if (supersededBy) {
      skipped.push(`${a.id}（后续迁移 ${supersededBy} 已记账，数据按设计移除）`);
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
    console.error(`${TAG} FAILED ${drift.length + failedLedger.length} 项漂移（记账 success=t 与实际结构/数据不符）`);
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
  const ms = Date.now() - startedAt;
  console.log(`${TAG} PASS 断言 ${assertions.length} 项，记账校验 ${enforced} 项，耗时 ${ms} ms`);
}

main();
