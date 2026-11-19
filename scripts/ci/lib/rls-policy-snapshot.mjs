/**
 * RLS 策略期望快照的共享实现（生成器与门禁共用）
 *
 * 设计来源：docs/quality/remaining-work-schedule-2026-11-19.md §6.3
 * 只读 pg_class / pg_policies；不写任何库对象。
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "../../..");
export const SNAPSHOT_PATH = path.join(REPO_ROOT, "database/rls_policy_expected.json");

const PSQL_TIMEOUT_MS = 15000;
export const TAG = "[Gate RLS-SNAP]";

export function sqlStr(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function sanitizeUrl(value) {
  return String(value).replace(/(\/\/)([^:@/]+):[^@/]+@/, "$1$2@");
}

export function dbLabel(value) {
  try {
    const u = new URL(value);
    const db = u.pathname || "";
    if (!u.hostname && !u.port) return `socket:${db}`;
    return `${u.hostname}:${u.port || 5432}${db}`;
  } catch {
    return "(无法解析的连接串)";
  }
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

function hasPasswordSource(url) {
  const u = parseUrl(url);
  if (u && (u.password || u.searchParams.get("password") || u.searchParams.get("passfile"))) {
    return true;
  }
  return Boolean(process.env.PGPASSWORD || process.env.PGPASSFILE);
}

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

/**
 * 解析目标库：显式 --dsn > RLS_POLICY_DB_URL > MIGRATION_DRIFT_DB_URL > DATABASE_URL > .env MIGRATE_URL。
 * 无口令时回落 socket（与 ledger 门禁一致），但门禁随后仍会拒绝特权身份。
 */
export function resolveDbUrl(explicitDsn) {
  let url = null;
  let source = null;
  if (explicitDsn) {
    url = explicitDsn;
    source = "--dsn 参数";
  } else if (process.env.RLS_POLICY_DB_URL) {
    url = process.env.RLS_POLICY_DB_URL;
    source = "RLS_POLICY_DB_URL（环境变量）";
  } else if (process.env.MIGRATION_DRIFT_DB_URL) {
    url = process.env.MIGRATION_DRIFT_DB_URL;
    source = "MIGRATION_DRIFT_DB_URL（环境变量）";
  } else if (process.env.DATABASE_URL) {
    url = process.env.DATABASE_URL;
    source = "DATABASE_URL（环境变量）";
  } else {
    const fromEnvFile = readEnvMigrateUrl();
    if (fromEnvFile) {
      url = fromEnvFile;
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

function psql(url, sql) {
  // search_path 固定为 pg_catalog：pg_policies.qual / with_check 由 pg_get_expr 生成，
  // 其限定名输出取决于会话 search_path（search_path 含 mes 时输出 process_flows，
  // 不含时输出 mes.process_flows）。不固定会让快照随连接用户/环境漂移。
  const pgoptions = [process.env.PGOPTIONS, "-c search_path=pg_catalog"]
    .filter(Boolean)
    .join(" ");
  return execFileSync("psql", [url, "-v", "ON_ERROR_STOP=1", "-Atc", sql], {
    encoding: "utf8",
    timeout: PSQL_TIMEOUT_MS,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PGCONNECT_TIMEOUT: "5", PGOPTIONS: pgoptions },
  }).trim();
}

export function connectivityFailureReason(err) {
  if (err && err.code === "ENOENT") return "未找到 psql 可执行文件";
  if (err && err.killed) return `连接/查询超时（>${PSQL_TIMEOUT_MS} ms）`;
  const stderr =
    typeof err?.stderr === "string"
      ? err.stderr
      : Buffer.isBuffer(err?.stderr)
        ? err.stderr.toString()
        : "";
  const first = (stderr || err?.message || String(err)).trim().split(/\r?\n/)[0];
  return first || "未知错误";
}

/** 非特权校验：superuser / BYPASSRLS 一律拒绝，不提供豁免开关。 */
export function assertNonPrivileged(url, label) {
  const ident = psql(
    url,
    "SELECT current_user || '|' || rolsuper::text || '|' || rolbypassrls::text " +
      "FROM pg_roles WHERE rolname = current_user",
  );
  const [user, rolsuper, rolbypass] = ident.split("|");
  const isTrue = (v) => v === "t" || v === "true";
  if (isTrue(rolsuper) || isTrue(rolbypass)) {
    throw new Error(
      `${TAG} FAILED 拒绝特权连接：current_user=${user} rolsuper=${rolsuper} rolbypassrls=${rolbypass}\n` +
        `  目标库：${label}\n` +
        "  该连接会绕过 RLS，策略断言恒真；本门禁不提供 superuser/BYPASSRLS 豁免。\n" +
        "  请改用非特权角色（本机 topems_drift，CI topems_gate）并确保其只有只读权限。",
    );
  }
  return { user, rolsuper, rolbypass };
}

/**
 * 从目标库读取策略快照。
 * 覆盖面：除系统 schema 外，所有「启用/强制 RLS 或存在策略」的普通表/分区表。
 */
export function fetchPolicySnapshot(url) {
  const sql = `
WITH tbl AS (
  SELECT
    n.nspname AS schema,
    c.relname AS relname,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS force_rls,
    COALESCE((
      SELECT json_agg(json_build_object(
        'name', p.policyname,
        'cmd', p.cmd,
        'permissive', (p.permissive = 'PERMISSIVE'),
        'roles', (SELECT json_agg(r ORDER BY r) FROM unnest(p.roles) AS r),
        'using', regexp_replace(btrim(COALESCE(p.qual, '')), '\\s+', ' ', 'g'),
        'with_check', regexp_replace(btrim(COALESCE(p.with_check, '')), '\\s+', ' ', 'g')
      ) ORDER BY p.policyname, p.cmd)
      FROM pg_policies p
      WHERE p.schemaname = n.nspname AND p.tablename = c.relname
    ), '[]'::json) AS policies
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r', 'p')
    AND n.nspname NOT IN ('pg_catalog', 'information_schema')
    AND n.nspname NOT LIKE 'pg_toast%'
)
SELECT json_build_object(
  'version', 1,
  'generated_from', 'migration-chain',
  'tables', COALESCE(json_agg(entry ORDER BY entry->>'schema', entry->>'table'), '[]'::json)
)
FROM (
  SELECT json_build_object(
    'schema', tbl.schema,
    'table', tbl.relname,
    'rls_enabled', tbl.rls_enabled,
    'force_rls', tbl.force_rls,
    'policies', tbl.policies
  ) AS entry
  FROM tbl
  WHERE tbl.rls_enabled OR tbl.force_rls OR json_array_length(tbl.policies) > 0
) x;
`.trim();
  const raw = psql(url, sql);
  const parsed = JSON.parse(raw);
  if (!parsed || !Array.isArray(parsed.tables)) {
    throw new Error(`${TAG} FAILED 策略查询返回结构非法`);
  }
  return parsed;
}

/**
 * 逐项比对。返回 problems 数组，每项 { table, field, expected, actual }。
 * 多表/少表、多策略/少策略、表达式、RLS/FORCE 开关变化均计入。
 */
export function compareSnapshots(expected, actual) {
  const problems = [];
  const keyOf = (t) => `${t.schema}.${t.table}`;
  const exp = new Map((expected.tables ?? []).map((t) => [keyOf(t), t]));
  const act = new Map((actual.tables ?? []).map((t) => [keyOf(t), t]));

  for (const table of [...exp.keys()].sort()) {
    const e = exp.get(table);
    const a = act.get(table);
    if (!a) {
      problems.push({ table, field: "table", expected: "存在", actual: "缺失" });
      continue;
    }
    if (e.rls_enabled !== a.rls_enabled) {
      problems.push({
        table,
        field: "relrowsecurity",
        expected: e.rls_enabled,
        actual: a.rls_enabled,
      });
    }
    if (e.force_rls !== a.force_rls) {
      problems.push({
        table,
        field: "relforcerowsecurity",
        expected: e.force_rls,
        actual: a.force_rls,
      });
    }

    const ep = new Map((e.policies ?? []).map((p) => [p.name, p]));
    const ap = new Map((a.policies ?? []).map((p) => [p.name, p]));
    for (const name of [...ep.keys()].sort()) {
      const x = ep.get(name);
      const y = ap.get(name);
      if (!y) {
        problems.push({ table, field: `policy:${name}`, expected: "存在", actual: "缺失" });
        continue;
      }
      for (const field of ["cmd", "permissive", "roles", "using", "with_check"]) {
        const xv = field === "roles" ? JSON.stringify(x.roles ?? []) : x[field];
        const yv = field === "roles" ? JSON.stringify(y.roles ?? []) : y[field];
        if (xv !== yv) {
          problems.push({
            table,
            field: `policy:${name}.${field}`,
            expected: xv,
            actual: yv,
          });
        }
      }
    }
    for (const name of [...ap.keys()].sort()) {
      if (!ep.has(name)) {
        problems.push({
          table,
          field: `policy:${name}`,
          expected: "（快照无此策略）",
          actual: "多出策略",
        });
      }
    }
  }

  for (const table of [...act.keys()].sort()) {
    if (!exp.has(table)) {
      problems.push({
        table,
        field: "table",
        expected: "（快照无此表）",
        actual: "多出 RLS 表/策略",
      });
    }
  }
  return problems;
}

export function snapshotCounts(snapshot) {
  const tables = snapshot.tables ?? [];
  const policies = tables.reduce((n, t) => n + (t.policies?.length ?? 0), 0);
  return { tables: tables.length, policies };
}

export function readSnapshot(file) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    throw new Error(`${TAG} FAILED 快照不可读或不是合法 JSON：${file}\n  ${err.message}`);
  }
  if (parsed.version !== 1 || !Array.isArray(parsed.tables)) {
    throw new Error(`${TAG} FAILED 快照结构非法（需要 version=1 且 tables 为数组）：${file}`);
  }
  return parsed;
}

export function writeSnapshot(file, snapshot) {
  const body = `${JSON.stringify(snapshot, null, 2)}\n`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body, "utf8");
}
