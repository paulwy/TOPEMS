#!/usr/bin/env node
/**
 * 状态枚举单一源（W5-B / DEC-09）B1：DB CHECK 状态目录导出
 *
 * DB 的 CHECK 约束是状态集合的唯一持久化权威。本脚本从 pg_constraint 只提取
 * 作用在 status/state 列上的 CHECK 约束，解析其中的字面量，输出稳定排序的
 * JSON 目录；`--check` 与已提交目录逐字比对，用于发现迁移新增/修改状态集后
 * 未刷新目录的漂移。
 *
 * 当前只建立 DB 单一源目录，不生成 Rust/TS 枚举；后续 B2/B3 以本目录为输入。
 *
 * 用法：
 *   node scripts/ci/dump-status-checks.mjs --dsn 'postgresql:///topems?host=/tmp'
 *   node scripts/ci/dump-status-checks.mjs --check
 *   node scripts/ci/dump-status-checks.mjs --check --changed-only
 *
 * 连接解析：统一委托 scripts/ci/lib/db-target.mjs（profile=status-catalog）。
 * 顺序：--dsn > STATUS_CATALOG_DB_URL（env→.env）> RLS_POLICY_DB_URL > MIGRATION_DRIFT_DB_URL
 *       > DATABASE_URL > .env MIGRATE_URL > TEST_DATABASE_URL（env→.env）。
 * STATUS_CATALOG_DB_URL 用于把状态目录校验库与 ledger-ddl-drift 的 MIGRATION_DRIFT_DB_URL 解耦，
 * 避免两个门禁被迫共用同一个库。完整口径见 docs/quality/environment-provisioning.md §12.1。
 *
 * --changed-only：只比对本次改动迁移涉及表的约束与无约束列；取暂存区的
 * database/migrations/*.sql，无暂存时取 HEAD 与工作区差异。解析不到任何表时按全量处理。
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dbLabel } from "./lib/rls-policy-snapshot.mjs";
import { resolveDbTarget } from "./lib/db-target.mjs";

const TAG = "[status-catalog]";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_OUT = path.join(ROOT, "docs/database/status-check-catalog.json");

function parseArgs(argv) {
  const out = { dsn: null, out: DEFAULT_OUT, check: false, changedOnly: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dsn") out.dsn = argv[++i];
    else if (arg === "--out") out.out = path.resolve(argv[++i]);
    else if (arg === "--check") out.check = true;
    else if (arg === "--changed-only") out.changedOnly = true;
    else if (arg === "--help" || arg === "-h") {
      console.log(
        [
          "用法: node scripts/ci/dump-status-checks.mjs [--dsn <url>] [--out <file>] [--check] [--changed-only]",
          "",
          "  --dsn <url>       显式指定校验库，优先于所有环境变量",
          "  --out <file>      输出路径（默认 docs/database/status-check-catalog.json）",
          "  --check           与已提交目录逐项比对（默认全量）",
          "  --changed-only    只校验本次改动迁移涉及的表；解析不到表时回退全量",
          "",
          "定期全量（建议每周或发布前）：node scripts/ci/dump-status-checks.mjs --check",
          "校验库解析：--dsn > STATUS_CATALOG_DB_URL > RLS_POLICY_DB_URL > MIGRATION_DRIFT_DB_URL > DATABASE_URL > .env MIGRATE_URL > TEST_DATABASE_URL",
          "统一解析器与诊断：node scripts/ci/lib/db-target.mjs --hook status-catalog --explain",
        ].join("\n"),
      );
      process.exit(0);
    } else {
      console.error(`${TAG} 未知参数: ${arg}`);
      process.exit(2);
    }
  }
  return out;
}

function psql(url, sql) {
  return execFileSync("psql", [url, "-v", "ON_ERROR_STOP=1", "-Atc", sql], {
    encoding: "utf8",
    timeout: 30000,
    maxBuffer: 64 * 1024 * 1024,
  }).trim();
}

function extractValues(definition) {
  const values = [];
  const re = /'((?:[^']|'')*)'/g;
  let m;
  while ((m = re.exec(definition)) !== null) {
    const v = m[1].replaceAll("''", "'");
    const parts = v.startsWith("{") && v.endsWith("}") ? v.slice(1, -1).split(",") : [v];
    for (const part of parts.map((x) => x.trim()).filter(Boolean)) {
      if (!values.includes(part)) values.push(part);
    }
  }
  return values.sort();
}

function buildCatalog(url) {
  const sql = `
    select json_agg(row_to_json(t))::text
    from (
      select n.nspname as schema,
             c.relname as table,
             con.conname as constraint,
             (
               select string_agg(a.attname, ',' order by a.attname)
               from unnest(con.conkey) k
               join pg_attribute a on a.attrelid = c.oid and a.attnum = k
               where a.attname ~* '(^|_)(status|state)$'
             ) as columns,
             pg_get_constraintdef(con.oid) as definition
      from pg_constraint con
      join pg_class c on c.oid = con.conrelid
      join pg_namespace n on n.oid = c.relnamespace
      where con.contype = 'c'
        and n.nspname not in ('pg_catalog', 'information_schema')
        and exists (
          select 1
          from unnest(con.conkey) k
          join pg_attribute a on a.attrelid = c.oid and a.attnum = k
          where a.attname ~* '(^|_)(status|state)$'
        )
      order by n.nspname, c.relname, con.conname
    ) t;
  `;
  const raw = psql(url, sql);
  if (!raw) return { constraints: [] };
  const rows = JSON.parse(raw);
  const constraints = rows
    .filter((r) => r.columns)
    .map((r) => ({
      schema: r.schema,
      table: r.table,
      constraint: r.constraint,
      columns: r.columns.split(",").sort(),
      values: extractValues(r.definition),
      definition: r.definition,
    }))
    .filter((r) => r.values.length > 0)
    .sort((a, b) =>
      `${a.schema}.${a.table}.${a.constraint}`.localeCompare(
        `${b.schema}.${b.table}.${b.constraint}`,
      ),
    );
  const uncoveredSql = `
    select json_agg(row_to_json(t))::text
    from (
      select n.nspname as schema, c.relname as table, a.attname as column,
             format_type(a.atttypid, a.atttypmod) as type,
             ty.typname as enum_type,
             a.attnotnull as not_null,
             pg_get_expr(d.adbin, d.adrelid) as default_expr
      from pg_attribute a
      join pg_class c on c.oid = a.attrelid
      join pg_namespace n on n.oid = c.relnamespace
      join pg_type ty on ty.oid = a.atttypid
      left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
      where c.relkind = 'r'
        and a.attname ~* '(^|_)(status|state)$'
        and a.attnum > 0 and not a.attisdropped
        and ty.typtype <> 'e'
        and ty.typname not in ('json', 'jsonb')
        and n.nspname not in ('pg_catalog', 'information_schema')
        and not exists (
          select 1 from pg_constraint con
          where con.conrelid = c.oid and con.contype = 'c'
            and a.attnum = any(con.conkey)
        )
      order by n.nspname, c.relname, a.attname
    ) t;
  `;
  const uncoveredRaw = psql(url, uncoveredSql);
  const uncovered = uncoveredRaw
    ? JSON.parse(uncoveredRaw).map((r) => ({
        schema: r.schema,
        table: r.table,
        column: r.column,
        type: r.type,
        enum_type: r.enum_type,
        not_null: r.not_null,
        default_expr: r.default_expr,
      }))
    : [];
  const enumSql = `
    select json_agg(row_to_json(t))::text
    from (
      select n.nspname as schema, ty.typname as name,
             string_agg(e.enumlabel, ',' order by e.enumsortorder) as labels
      from pg_type ty
      join pg_namespace n on n.oid = ty.typnamespace
      join pg_enum e on e.enumtypid = ty.oid
      where ty.typtype = 'e'
        and exists (
          select 1 from pg_attribute a
          join pg_class c on c.oid = a.attrelid
          where a.atttypid = ty.oid and c.relkind = 'r'
            and a.attname ~* '(^|_)(status|state)$'
            and a.attnum > 0 and not a.attisdropped
        )
      group by n.nspname, ty.typname
      order by n.nspname, ty.typname
    ) t;
  `;
  const enumRaw = psql(url, enumSql);
  const enumTypes = enumRaw
    ? JSON.parse(enumRaw).map((r) => ({
        schema: r.schema,
        name: r.name,
        values: r.labels.split(",").sort(),
      }))
    : [];
  return {
    catalog_version: 2,
    source: "postgres.pg_constraint CHECK + enum types on status/state columns",
    constraints,
    enum_types: enumTypes,
    uncovered,
  };
}

function stableJson(obj) {
  return `${JSON.stringify(obj, null, 2)}\n`;
}

const QID = `(?:"[^"]+"|[A-Za-z_][\\w$]*)`;
const TABLE_REF = `${QID}(?:\\s*\\.\\s*${QID})?`;

// 只收「能新增/修改/删除 CHECK 约束或改变表结构」的语句；DML 不参与状态目录比对。
const TABLE_PATTERNS = [
  new RegExp(`\\bALTER\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?(?:ONLY\\s+)?(${TABLE_REF})`, "gi"),
  new RegExp(`\\bCREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(${TABLE_REF})`, "gi"),
  new RegExp(`\\bDROP\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?(${TABLE_REF})`, "gi"),
  new RegExp(
    `\\bCREATE\\s+(?:UNIQUE\\s+)?INDEX\\s+(?:CONCURRENTLY\\s+)?(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:${QID}\\s+)?ON\\s+(?:ONLY\\s+)?(${TABLE_REF})`,
    "gi",
  ),
  new RegExp(`\\bCREATE\\s+POLICY\\s+${QID}\\s+ON\\s+(${TABLE_REF})`, "gi"),
  new RegExp(`\\bDROP\\s+POLICY\\s+(?:IF\\s+EXISTS\\s+)?${QID}\\s+ON\\s+(${TABLE_REF})`, "gi"),
  new RegExp(`\\bCOMMENT\\s+ON\\s+(?:COLUMN|TABLE)\\s+(${TABLE_REF})`, "gi"),
];

function normalizeTable(raw) {
  return raw.replace(/"/g, "").replace(/\s*\.\s*/g, ".").trim().toLowerCase();
}

function changedMigrationFiles() {
  const diff = (extra) =>
    execFileSync(
      "git",
      ["-C", ROOT, "diff", "--name-only", "--diff-filter=ACM", ...extra, "--", "database/migrations"],
      { encoding: "utf8", timeout: 15000 },
    ).trim();
  let out = "";
  try {
    out = diff(["--cached"]);
  } catch {
    /* 非 git 环境：退回全量 */
  }
  if (!out) {
    try {
      out = diff(["HEAD"]);
    } catch {
      /* ignore */
    }
  }
  return out
    .split(/\r?\n/)
    .map((f) => f.trim())
    .filter((f) => f.endsWith(".sql"))
    .map((f) => path.join(ROOT, f));
}

function migrationTables(file) {
  let sql = "";
  try {
    sql = fs.readFileSync(file, "utf8");
  } catch {
    return [];
  }
  const tables = new Set();
  for (const pattern of TABLE_PATTERNS) {
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(sql)) !== null) tables.add(normalizeTable(m[1]));
  }
  return [...tables].sort();
}

function tableKey(row) {
  return `${row.schema}.${row.table}`.toLowerCase();
}

function pickRows(rows, involved) {
  return (rows ?? []).filter((row) => involved.has(tableKey(row)));
}

function describeDiff(expected, actual, kind) {
  const keyOf = (r) =>
    kind === "constraints" ? `${r.schema}.${r.table}.${r.constraint}` : `${r.schema}.${r.table}.${r.column}`;
  const exp = new Map(expected.map((r) => [keyOf(r), r]));
  const act = new Map(actual.map((r) => [keyOf(r), r]));
  const missing = [...exp.keys()].filter((k) => !act.has(k));
  const extra = [...act.keys()].filter((k) => !exp.has(k));
  const changed = [...exp.keys()].filter(
    (k) => act.has(k) && JSON.stringify(exp.get(k)) !== JSON.stringify(act.get(k)),
  );
  const brief = (arr) => `${arr.slice(0, 3).join("、")}${arr.length > 3 ? "…" : ""}`;
  const parts = [];
  if (missing.length) parts.push(`目录有库中无 ${missing.length}（${brief(missing)}）`);
  if (extra.length) parts.push(`库中有目录无 ${extra.length}（${brief(extra)}）`);
  if (changed.length) parts.push(`定义不一致 ${changed.length}（${brief(changed)}）`);
  return parts.join("；");
}

function resolveCatalogDbUrl(explicitDsn) {
  const target = resolveDbTarget({ hook: "status-catalog", explicitDsn });
  if (!target.ok) return { url: null, source: null };
  if (target.password && !process.env.PGPASSWORD) process.env.PGPASSWORD = target.password;
  return { url: target.urlWithPassword, source: target.source };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { url, source } = resolveCatalogDbUrl(args.dsn);
  if (!url) {
    console.error(
      `${TAG} FAIL: 未找到数据库连接（--dsn / STATUS_CATALOG_DB_URL / RLS_POLICY_DB_URL / MIGRATION_DRIFT_DB_URL / DATABASE_URL / .env MIGRATE_URL / TEST_DATABASE_URL）`,
    );
    console.error(
      `${TAG} 诊断：node scripts/ci/lib/db-target.mjs --hook status-catalog --explain；缺库即失败，不跳过。`,
    );
    process.exit(1);
  }

  let catalog;
  try {
    catalog = buildCatalog(url);
  } catch (e) {
    console.error(`${TAG} FAIL: 读取 DB CHECK 失败（db=${dbLabel(url)}）: ${e.message}`);
    process.exit(1);
  }

  const body = stableJson(catalog);
  if (!args.check) {
    fs.mkdirSync(path.dirname(args.out), { recursive: true });
    fs.writeFileSync(args.out, body);
    console.log(
      `${TAG} WROTE: ${catalog.constraints.length} 条状态 CHECK + ${catalog.enum_types.length} 个枚举类型 + ${catalog.uncovered.length} 个无约束列 -> ${path.relative(ROOT, args.out)}`,
    );
    return;
  }

  if (!fs.existsSync(args.out)) {
    console.error(`${TAG} FAIL: 目录不存在 ${args.out}，先不带 --check 生成`);
    process.exit(1);
  }
  const currentRaw = fs.readFileSync(args.out, "utf8");

  let mode = "full";
  let involved = new Set();
  let scopeNote = "";
  if (args.changedOnly) {
    const files = changedMigrationFiles();
    involved = new Set(files.flatMap(migrationTables));
    if (involved.size > 0) {
      mode = "changed-only";
      scopeNote = `涉及表 ${involved.size} 张（${[...involved].sort().join("、")}）`;
    } else {
      scopeNote = files.length ? "改动迁移未解析出表" : "无改动迁移";
    }
  }

  if (mode === "full") {
    if (currentRaw !== body) {
      const why = args.changedOnly ? `（--changed-only 已回退全量：${scopeNote}）` : "";
      console.error(`${TAG} FAIL: 状态目录与 DB CHECK 漂移${why}（db=${dbLabel(url)}，连接来源=${source}）`);
      console.error(`${TAG} 修复：node scripts/ci/dump-status-checks.mjs --dsn '<url>' 后复核并提交`);
      process.exit(1);
    }
    console.log(
      `${TAG} PASS: ${catalog.constraints.length} 条状态 CHECK + ${catalog.enum_types.length} 个枚举类型 + ${catalog.uncovered.length} 个无约束列与目录一致（db=${dbLabel(url)}，全量）`,
    );
    return;
  }

  const expected = JSON.parse(currentRaw);
  const problems = [];
  for (const kind of ["constraints", "uncovered"]) {
    const exp = pickRows(expected[kind], involved);
    const act = pickRows(catalog[kind], involved);
    if (JSON.stringify(exp) !== JSON.stringify(act)) {
      problems.push(`${kind}: ${describeDiff(exp, act, kind)}`);
    }
  }
  if (problems.length > 0) {
    console.error(`${TAG} FAIL: --changed-only 漂移（db=${dbLabel(url)}，连接来源=${source}，${scopeNote}）`);
    for (const p of problems) console.error(`${TAG}  - ${p}`);
    console.error(`${TAG} 修复：重生成目录后复核涉及表；无法定位时可跑全量 --check`);
    process.exit(1);
  }
  console.log(`${TAG} PASS: --changed-only 校验通过（db=${dbLabel(url)}，连接来源=${source}，${scopeNote}）`);
}

main();
