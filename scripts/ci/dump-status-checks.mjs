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
 *
 * 连接解析顺序：--dsn > RLS_POLICY_DB_URL > MIGRATION_DRIFT_DB_URL > DATABASE_URL > .env MIGRATE_URL。
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveDbUrl, dbLabel } from "./lib/rls-policy-snapshot.mjs";

const TAG = "[status-catalog]";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_OUT = path.join(ROOT, "docs/database/status-check-catalog.json");

function parseArgs(argv) {
  const out = { dsn: null, out: DEFAULT_OUT, check: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dsn") out.dsn = argv[++i];
    else if (arg === "--out") out.out = path.resolve(argv[++i]);
    else if (arg === "--check") out.check = true;
    else if (arg === "--help" || arg === "-h") {
      console.log("用法: node scripts/ci/dump-status-checks.mjs [--dsn <url>] [--out <file>] [--check]");
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

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { url, source } = resolveDbUrl(args.dsn);
  if (!url) {
    console.error(`${TAG} FAIL: 未找到数据库连接（--dsn / RLS_POLICY_DB_URL / DATABASE_URL / .env MIGRATE_URL）`);
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
  if (args.check) {
    if (!fs.existsSync(args.out)) {
      console.error(`${TAG} FAIL: 目录不存在 ${args.out}，先不带 --check 生成`);
      process.exit(1);
    }
    const current = fs.readFileSync(args.out, "utf8");
    if (current !== body) {
      console.error(`${TAG} FAIL: 状态目录与 DB CHECK 漂移（db=${dbLabel(url)}，连接来源=${source}）`);
      console.error(`${TAG} 修复：node scripts/ci/dump-status-checks.mjs --dsn '<url>' 后复核并提交`);
      process.exit(1);
    }
    console.log(`${TAG} PASS: ${catalog.constraints.length} 条状态 CHECK + ${catalog.enum_types.length} 个枚举类型 + ${catalog.uncovered.length} 个无约束列与目录一致（db=${dbLabel(url)}）`);
    return;
  }

  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, body);
  console.log(`${TAG} WROTE: ${catalog.constraints.length} 条状态 CHECK + ${catalog.enum_types.length} 个枚举类型 + ${catalog.uncovered.length} 个无约束列 -> ${path.relative(ROOT, args.out)}`);
}

main();
