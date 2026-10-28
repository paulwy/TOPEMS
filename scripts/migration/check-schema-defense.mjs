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
 *  - 自建 DDL：svc/unified-core/src/**\/*.rs 内 raw string 字面量（r#"..."#）中的
 *    CREATE TABLE 与 ALTER TABLE ADD COLUMN 语句。
 *  - 迁移 DDL：database/migrations/*.sql 中的 CREATE TABLE 与 ALTER TABLE ADD COLUMN。
 *
 * 用法：node scripts/migration/check-schema-defense.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

const SVC_SRC_DIR = path.join(REPO_ROOT, "svc/unified-core/src");
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
      cols.add(name);
    }
  }

  // ALTER TABLE name ADD [COLUMN] [IF NOT EXISTS] col ...
  const altRe = /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:"?[A-Za-z0-9_]+"?(?:\.(?:"?[A-Za-z0-9_]+"?)|\.[A-Za-z0-9_.]+)?)\s+ADD\s+(?:COLUMN\s+)?(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z_][A-Za-z0-9_]*)/gi;
  while ((m = altRe.exec(sqlText)) !== null) {
    const rawTable = m[0]
      .replace(/ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?/i, "")
      .replace(/\s+ADD\s+(?:COLUMN\s+)?(?:IF\s+NOT\s+EXISTS\s+)?[A-Za-z_][A-Za-z0-9_]*.*/i, "")
      .replace(/"/g, "");
    const table = rawTable.split(".").pop().toLowerCase();
    const col = m[1].toLowerCase();
    ensure(table).add(col);
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

function collectSelfBuilt() {
  const files = walkRs(SVC_SRC_DIR, []);
  const tables = new Map();
  const rawRe = /r#"(.*?)"#/gs;
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
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
