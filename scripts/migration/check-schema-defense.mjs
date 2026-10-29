#!/usr/bin/env node
/**
 * check-schema-defense.mjs
 * 初始化路径防复发校验（B 方案）：自建 DDL（init_database / schema_defense）与迁移 DDL 的列级对齐检查。
 *
 * 背景：B 类清单"服务代码引用缺列"根因是旧库初始化路径（try_init 自建 DDL）与迁移权威 DDL
 * 不同步——自建表缺列，且 CREATE TABLE IF NOT EXISTS 幂等跳过导致静默失败。本脚本在门禁侧
 * 拦截此类漂移：对每个"自建表"，若迁移 DDL 中存在同名表，自建列集合必须 ⊆ 迁移列集合；
 * 缺列 → FAIL（退出码 1）。自建表在迁移 DDL 中不存在 → WARN（提示核对是否为有意自建）。
 *
 * 解析范围：
 *  - 自建 DDL：svc 与 lib 下所有子目录的 src 中，所有 *.rs 内 raw string 字面量（r#"..."#）里的
 *    CREATE TABLE 与 ALTER TABLE ADD COLUMN 语句（含 unified-core；动态建表模板 "{}.{}" 天然不匹配）。
 *  - 迁移 DDL：database/migrations 下 *.sql 中的 CREATE TABLE 与 ALTER TABLE ADD COLUMN。
 *
 * 用法：node scripts/migration/check-schema-defense.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

// 自建 DDL 扫描根：svc/*/src 与 lib/*/src（服务级 + 库级全量；unified-core 已包含在内）
function collectSelfBuiltDirs() {
  const roots = [];
  for (const top of ["svc", "lib"]) {
    const base = path.join(REPO_ROOT, top);
    for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const src = path.join(base, entry.name, "src");
      if (fs.existsSync(src)) roots.push(src);
    }
  }
  return roots;
}

const SELF_BUILT_DIRS = collectSelfBuiltDirs();
const MIGRATION_DIR = path.join(REPO_ROOT, "database/migrations");

const TABLE_LEVEL_KEYWORDS = new Set([
  "primary", "unique", "foreign", "check", "constraint", "key", "index", "exclude",
]);

/**
 * 从 SQL 文本提取 { 表名 -> 列名 Set }（大小写归一为小写）。
 * 解析 CREATE TABLE 顶层字段（括号配对）与 ALTER TABLE ... ADD [COLUMN] ...。
 */
function extractTables(sqlText) {
  const tables = new Map(); // lower table -> Set(lower column)
  const likeDeps = []; // { target, src }：LIKE 拷贝依赖（列闭包传播）

  const ensure = (t) => {
    const key = t.toLowerCase();
    if (!tables.has(key)) tables.set(key, new Set());
    return tables.get(key);
  };

  // CREATE TABLE [IF NOT EXISTS] [schema.]table (...) —— 顶层列提取（支持 "schema"."table" 引号形式）
  const ctRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?[A-Za-z0-9_]+"?(?:\.(?:"?[A-Za-z0-9_]+"?)|\.[A-Za-z0-9_.]+)?)\s*\(/gi;
  let m;
  while ((m = ctRe.exec(sqlText)) !== null) {
    // 从匹配中提取表全名（去引号）
    const raw = m[0].replace(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?/i, "");
    const parts = raw.slice(0, raw.lastIndexOf("(")).split(".").map((s) => s.replace(/"/g, "").trim());
    const full = parts.join(".");
    const table = parts[parts.length - 1].toLowerCase();
    const open = m.index + m[0].length - 1; // index of '('
    let depth = 0;
    let close = -1;
    for (let i = open; i < sqlText.length; i++) {
      const ch = sqlText[i];
      if (ch === "(") depth++;
      else if (ch === ")") {
        depth--;
        if (depth === 0) { close = i; break; }
      }
    }
    if (close < 0) continue;
    const inner = sqlText.slice(open + 1, close);
    // 按顶层逗号切分字段
    const fields = [];
    let d = 0;
    let start = 0;
    for (let i = 0; i < inner.length; i++) {
      const ch = inner[i];
      if (ch === "(") d++;
      else if (ch === ")") d--;
      else if (ch === "," && d === 0) { fields.push(inner.slice(start, i)); start = i + 1; }
    }
    fields.push(inner.slice(start));
    const cols = ensure(table);
    for (const f of fields) {
      const colName = /^\s*(?:"([^"]+)"|`([^`]+)`|([A-Za-z_][A-Za-z0-9_]*))/.exec(f);
      if (!colName) continue;
      const name = (colName[1] ?? colName[2] ?? colName[3]).toLowerCase();
      if (TABLE_LEVEL_KEYWORDS.has(name)) continue; // 表级约束行
      if (name === "like") {
        // CREATE TABLE t (LIKE src [INCLUDING ALL])：拷贝源表列（闭包解析见下）
        const srcM = /LIKE\s+("?[A-Za-z0-9_]+"?)(?:\.("?[A-Za-z0-9_]+"?))?/i.exec(f);
        if (srcM) {
          const srcName = (srcM[2] ?? srcM[1]).replace(/"/g, "").toLowerCase();
          likeDeps.push({ target: table, src: srcName });
        }
        continue;
      }
      cols.add(name);
    }
  }

  // ALTER TABLE name ADD [COLUMN] [IF NOT EXISTS] col ...（列名支持引号与非引号形式）
  const altRe = /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:"?[A-Za-z0-9_]+"?(?:\.(?:"?[A-Za-z0-9_]+"?)|\.[A-Za-z0-9_.]+)?)\s+ADD\s+(?:COLUMN\s+)?(?:IF\s+NOT\s+EXISTS\s+)?(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_]*))/gi;
  while ((m = altRe.exec(sqlText)) !== null) {
    const rawTable = m[0]
      .replace(/ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?/i, "")
      .replace(/\s+ADD\s+(?:COLUMN\s+)?(?:IF\s+NOT\s+EXISTS\s+)?.*/i, "")
      .replace(/"/g, "");
    const table = rawTable.split(".").pop().toLowerCase();
    const col = (m[1] ?? m[2]).toLowerCase();
    ensure(table).add(col);
  }

  // LIKE 拷贝闭包：src 表列并入 target（迭代至稳定；src 不存在时跳过）
  let changed = true;
  while (changed) {
    changed = false;
    for (const { target, src } of likeDeps) {
      const srcCols = tables.get(src);
      if (!srcCols) continue;
      const tCols = ensure(target);
      for (const c of srcCols) {
        if (!tCols.has(c)) {
          tCols.add(c);
          changed = true;
        }
      }
    }
  }

  return tables;
}

function walkRs(dir, acc) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkRs(p, acc);
    else if (entry.name.endsWith(".rs")) acc.push(p);
  }
  return acc;
}

// 有意自建白名单（迁移 DDL 权威之外，经确认保留的自建表，不报 WARN）：
// - schema_defense_ledger：运行时 schema-defense 门控台账，shared-db 注释明确"不在 sqlx
//   迁移链内，CREATE IF NOT EXISTS 自建"（lib/shared-db/src/schema.rs，2026-09 schema 门控设计）
const SELF_BUILT_ALLOWLIST = new Set(["schema_defense_ledger"]);

// 剔除测试代码：扫描目标是运行时自建 DDL，#[cfg(test)] 测试断言中的 SQL 字面量
// （如 shared-db build_add_column_sql 的 "t"/"employee" 样例）非真实建表，须排除。
// 用括号配对扫描 mod tests { ... }（任意嵌套深度），再删孤立 #[cfg(test)] 属性行。
function stripTestCode(src) {
  let out = src;
  const modRe = /mod\s+tests\s*\{/g;
  let m;
  while ((m = modRe.exec(out)) !== null) {
    const open = out.indexOf("{", m.index);
    let depth = 0;
    let close = -1;
    for (let i = open; i < out.length; i++) {
      const ch = out[i];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) { close = i; break; }
      }
    }
    if (close < 0) break;
    out = out.slice(0, m.index) + out.slice(close + 1);
    modRe.lastIndex = m.index;
  }
  out = out.replace(/^\s*#\[cfg\(test\)\]\s*$/gm, "");
  return out;
}

function collectSelfBuilt() {
  const files = SELF_BUILT_DIRS.flatMap((d) => walkRs(d, []));
  const tables = new Map();
  const rawRe = /r#"(.*?)"#/gs;
  for (const f of files) {
    const src = stripTestCode(fs.readFileSync(f, "utf8"));
    for (const lit of src.matchAll(rawRe)) {
      for (const [t, cols] of extractTables(lit[1])) {
        if (!tables.has(t)) tables.set(t, new Set());
        for (const c of cols) tables.get(t).add(c);
      }
    }
  }
  return tables;
}

function collectMigrations() {
  const tables = new Map();
  const dirs = [MIGRATION_DIR];
  // 服务级迁移目录（与 validate.sh 的 MIGRATION_DIRS 口径一致）
  for (const svc of fs.readdirSync(path.join(REPO_ROOT, "svc"), { withFileTypes: true })) {
    if (!svc.isDirectory()) continue;
    const d = path.join(REPO_ROOT, "svc", svc.name, "migrations");
    if (fs.existsSync(d)) dirs.push(d);
  }
  for (const dir of dirs) {
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(".sql")) continue;
      const src = fs.readFileSync(path.join(dir, f), "utf8");
      for (const [t, cols] of extractTables(src)) {
        if (!tables.has(t)) tables.set(t, new Set());
        for (const c of cols) tables.get(t).add(c);
      }
    }
  }
  return tables;
}

function main() {
  const selfBuilt = collectSelfBuilt();
  const migrations = collectMigrations();

  let errors = 0;
  let warnings = 0;
  const lines = [];

  lines.push(`自建 DDL 表数: ${selfBuilt.size} | 迁移 DDL 表数: ${migrations.size}`);
  for (const [table, selfCols] of [...selfBuilt.entries()].sort()) {
    const migCols = migrations.get(table);
    if (!migCols) {
      if (SELF_BUILT_ALLOWLIST.has(table)) {
        lines.push(`INFO  ${table}（有意自建白名单，核对通过）`);
        continue;
      }
      warnings++;
      lines.push(`WARN  自建表「${table}」在迁移 DDL 中不存在——如为有意自建请核对；否则需补迁移 DDL`);
      continue;
    }
    const missing = [...selfCols].filter((c) => !migCols.has(c)).sort();
    if (missing.length > 0) {
      errors++;
      lines.push(
        `FAIL  自建表「${table}」缺列(相对迁移 DDL): ${missing.join(", ")}`
      );
    } else {
      lines.push(`PASS  ${table}（自建 ${selfCols.size} 列 ⊆ 迁移 ${migCols.size} 列）`);
    }
  }

  console.log(lines.join("\n"));
  console.log(`\nschema-defense: ${errors === 0 ? "PASS" : "FAIL"}（errors=${errors} warnings=${warnings}）`);
  process.exit(errors === 0 ? 0 : 1);
}

main();
