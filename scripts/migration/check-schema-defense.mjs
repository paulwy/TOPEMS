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
  // --drift-json <path>：导出 TABLE_DEFS↔迁移 DDL 列级类型差异（唯一仲裁数据源，供自动修复生成）
  if (process.argv.includes("--drift-json")) {
    const tableDefs = collectTableDefs();
    const mig = collectMigrationsTyped();
    const schemaOf = new Map();
    for (const dir of [MIGRATION_DIR, ...Array.from({ length: 0 })]) {
      // noop
    }
    const dirs = [MIGRATION_DIR];
    for (const svc of fs.readdirSync(path.join(REPO_ROOT, "svc"), { withFileTypes: true })) {
      if (!svc.isDirectory()) continue;
      const d = path.join(REPO_ROOT, "svc", svc.name, "migrations");
      if (fs.existsSync(d)) dirs.push(d);
    }
    for (const dir of dirs) {
      for (const f of fs.readdirSync(dir)) {
        if (!f.endsWith(".sql")) continue;
        const sql = fs.readFileSync(path.join(dir, f), "utf8");
        const cre = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:("?[A-Za-z0-9_]+"?)\s*\.\s*)?("?[A-Za-z0-9_]+"?)\s*\(/gi;
        let cm;
        while ((cm = cre.exec(sql)) !== null) {
          const sch = (cm[1] ?? "").replace(/"/g, "").trim().toLowerCase() || "public";
          const tbl = cm[2].replace(/"/g, "").trim().toLowerCase();
          if (!schemaOf.has(tbl)) schemaOf.set(tbl, sch);
        }
      }
    }
    const out = [];
    for (const [table, cols] of [...tableDefs.entries()].sort()) {
      const mcols = mig.get(table);
      if (!mcols) continue;
      for (const [c, ty] of cols) {
        const mty = mcols.get(c);
        const n1 = normalizeType(ty), n2 = normalizeType(mty);
        if (!n1 || !n2 || n1 === n2) continue;
        out.push({ t: table, c, td: ty, m: mty ?? "", n1, n2, fam1: typeFamily(n1), fam2: typeFamily(n2), schema: schemaOf.get(table) ?? "public" });
      }
    }
    const target = process.argv[process.argv.indexOf("--drift-json") + 1];
    fs.writeFileSync(target, JSON.stringify(out, null, 1));
    process.exit(0);
  }

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

  // ---- B 扩展：TABLE_DEFS（Rust 运行时列契约）↔ 迁移 DDL 列级一致性校验 ----
  const tableDefs = collectTableDefs();
  lines.push(`\nTABLE_DEFS 契约表数: ${tableDefs.size}`);
  let tdPass = 0;
  let tdTypeWarn = 0;
  for (const [table, cols] of [...tableDefs.entries()].sort()) {
    const migColsTyped = collectMigrationsTyped().get(table);
    if (!migColsTyped) {
      warnings++;
      lines.push(`WARN  TABLE_DEFS 契约表「${table}」在迁移 DDL 中无此表——需核对（或补迁移）`);
      continue;
    }
    const missingCol = [...cols.keys()].filter((c) => !migColsTyped.has(c)).sort();
    if (missingCol.length > 0) {
      errors++;
      lines.push(`FAIL  TABLE_DEFS「${table}」缺列(相对迁移 DDL): ${missingCol.join(", ")}`);
      continue;
    }
    const typeMismatch = [];
    const typeInfo = [];
    for (const [c, ty] of cols) {
      const mty = migColsTyped.get(c);
      const n1 = normalizeType(ty), n2 = normalizeType(mty);
      if (!n1 || !n2 || n1 === n2) continue;
      if (typeFamily(n1) === typeFamily(n2)) {
        // 同族差异（可接受）：时区列族 timestamp↔timestamptz、文本列族 TEXT↔VARCHAR(n)
        typeInfo.push(`${c}: ${ty} → ${mty}`);
      } else {
        typeMismatch.push(`${c}: ${ty} → ${mty}`);
      }
    }
    if (typeMismatch.length > 0) {
      warnings++;
      tdTypeWarn++;
      lines.push(`WARN  TABLE_DEFS「${table}」类型不一致(${typeMismatch.length}) → ${typeMismatch.slice(0, 3).join(" | ")}${typeMismatch.length > 3 ? ` …(+${typeMismatch.length - 3})` : ""}`);
    } else if (typeInfo.length > 0) {
      lines.push(`INFO  TABLE_DEFS「${table}」类型同族差异(${typeInfo.length}) → ${typeInfo.slice(0, 2).join(" | ")}${typeInfo.length > 2 ? ` …(+${typeInfo.length - 2})` : ""}`);
    } else {
      tdPass++;
      lines.push(`PASS  TABLE_DEFS「${table}」（${cols.size} 列对齐，类型一致）`);
    }
  }
  lines.push(`TABLE_DEFS 校验: PASS ${tdPass} | 类型差异 ${tdTypeWarn}`);

  console.log(lines.join("\n"));
  console.log(`\nschema-defense: ${errors === 0 ? "PASS" : "FAIL"}（errors=${errors} warnings=${warnings}）`);
  process.exit(errors === 0 ? 0 : 1);
}

// ---- B 扩展辅助：TABLE_DEFS 解析 + 迁移类型提取 + 类型归一化 ----

/** 解析 TABLE_DEFS 数组体 → Map(table -> Map(col -> type))
 *  形态兼容：表名行独立（后接 &[）｜单行列对 ("col","type")｜跨行列对（"col" 行 + "type" 行） */
function parseTableDefsArray(body) {
  const tables = new Map();
  let cur = null;
  let pendingCol = null;
  const lines = body.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = lines[i + 1] ?? "";
    let m = /^\s*"([a-z0-9_]+)",\s*$/.exec(line);
    if (m && /^\s*&\[/.test(next)) {
      cur = m[1];
      if (!tables.has(cur)) tables.set(cur, new Map());
      pendingCol = null;
      continue;
    }
    m = /^\s*\(\s*"([^"]+)"\s*,\s*"([^"]*)"\s*\)\s*,?\s*$/.exec(line);
    if (m && cur) {
      tables.get(cur).set(m[1].toLowerCase(), m[2]);
      pendingCol = null;
      continue;
    }
    if (!cur) continue;
    m = /^\s*"([^"]+)"\s*,?\s*$/.exec(line);
    if (m && /^\s*"/.test(next)) {
      pendingCol = m[1];
      continue;
    }
    m = /^\s*"([^"]*)"\s*,?\s*$/.exec(line);
    if (m && pendingCol) {
      tables.get(cur).set(pendingCol.toLowerCase(), m[1]);
      pendingCol = null;
    }
  }
  return tables;
}

/** 收集全仓 TABLE_DEFS → Map(table -> Map(col -> type)) */
function collectTableDefs() {
  const defs = new Map();
  const files = SELF_BUILT_DIRS.flatMap((d) => walkRs(d, []));
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    const idx = src.indexOf("pub const TABLE_DEFS");
    if (idx < 0) continue;
    const arrStart = src.indexOf("= &[", idx);
    if (arrStart < 0) continue;
    const open = src.indexOf("[", arrStart);
    let depth = 0, close = -1;
    for (let i = open; i < src.length; i++) {
      if (src[i] === "[") depth++;
      else if (src[i] === "]") { depth--; if (depth === 0) { close = i; break; } }
    }
    if (close < 0) continue;
    const parsed = parseTableDefsArray(src.slice(open + 1, close));
    for (const [t, cols] of parsed) {
      if (!defs.has(t)) defs.set(t, new Map());
      for (const [c, ty] of cols) if (!defs.get(t).has(c)) defs.get(t).set(c, ty);
    }
  }
  return defs;
}

/** 迁移 DDL：Map(table -> Map(col -> type))——CREATE TABLE 顶层列 + ALTER ADD */
const TD_LEVEL_KEYWORDS = new Set(["primary", "unique", "foreign", "check", "constraint", "key", "index", "exclude", "like"]);

function extractTablesTyped(sqlText) {
  const tables = new Map();
  const ensure = (t) => {
    const k = t.toLowerCase();
    if (!tables.has(k)) tables.set(k, new Map());
    return tables.get(k);
  };
  const ctRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?[A-Za-z0-9_]+"?(?:\.(?:"?[A-Za-z0-9_]+"?)|\.[A-Za-z0-9_.]+)?)\s*\(/gi;
  let m;
  while ((m = ctRe.exec(sqlText)) !== null) {
    const raw = m[0].replace(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?/i, "");
    const parts = raw.slice(0, raw.lastIndexOf("(")).split(".").map((s) => s.replace(/"/g, "").trim());
    const table = parts[parts.length - 1].toLowerCase();
    const open = m.index + m[0].length - 1;
    let depth = 0, close = -1;
    for (let i = open; i < sqlText.length; i++) {
      const ch = sqlText[i];
      if (ch === "(") depth++;
      else if (ch === ")") { depth--; if (depth === 0) { close = i; break; } }
    }
    if (close < 0) continue;
    const inner = sqlText.slice(open + 1, close);
    const fields = [];
    let d = 0, start = 0;
    for (let i = 0; i < inner.length; i++) {
      const ch = inner[i];
      if (ch === "(") d++;
      else if (ch === ")") d--;
      else if (ch === "," && d === 0) { fields.push(inner.slice(start, i)); start = i + 1; }
    }
    fields.push(inner.slice(start));
    const cols = ensure(table);
    for (const f of fields) {
      const cm = /^\s*(?:"([^"]+)"|`([^`]+)`|([A-Za-z_][A-Za-z0-9_]*))\s+((?:[A-Za-z_][A-Za-z0-9_]*\.)?[A-Za-z_][A-Za-z0-9_]*(?:\s+[A-Za-z_][A-Za-z0-9_]*)*(?:\s*\([^)]*\))?(?:\[\])?)/i.exec(f);
      if (!cm) continue;
      const name = (cm[1] ?? cm[2] ?? cm[3]).toLowerCase();
      if (TD_LEVEL_KEYWORDS.has(name)) continue;
      // 类型：完整短语（多 token + 参数 + schema 限定 + 数组），如 public.vector(1536) / TEXT[] / character varying(255)
      cols.set(name, cm[4].trim());
    }
  }
  const altRe = /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:"?[A-Za-z0-9_]+"?(?:\.(?:"?[A-Za-z0-9_]+"?)|\.[A-Za-z0-9_.]+)?)\s+ADD\s+(?:COLUMN\s+)?(?:IF\s+NOT\s+EXISTS\s+)?(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_]*))\s+((?:[A-Za-z_][A-Za-z0-9_]*\.)?[A-Za-z_][A-Za-z0-9_]*(?:\s+[A-Za-z_][A-Za-z0-9_]*)*(?:\s*\([^)]*\))?(?:\[\])?)/gi;
  while ((m = altRe.exec(sqlText)) !== null) {
    const rawTable = m[0].replace(/ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?/i, "").replace(/\s+ADD\s+(?:COLUMN\s+)?(?:IF\s+NOT\s+EXISTS\s+)?.*/i, "").replace(/"/g, "");
    const table = rawTable.split(".").pop().toLowerCase();
    ensure(table).set((m[1] ?? m[2]).toLowerCase(), m[3]?.toLowerCase() ?? "");
  }
  // ALTER COLUMN ... TYPE ...（列类型变更，覆盖既有定义——迁移顺序后者生效）
  const altTypeRe = /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:"?[A-Za-z0-9_]+"?(?:\.(?:"?[A-Za-z0-9_]+"?)|\.[A-Za-z0-9_.]+)?)\s+ALTER\s+(?:COLUMN\s+)?(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_]*))\s+TYPE\s+((?:[A-Za-z_][A-Za-z0-9_]*\.)?[A-Za-z_][A-Za-z0-9_]*(?:\s+[A-Za-z_][A-Za-z0-9_]*)*(?:\s*\([^)]*\))?(?:\[\])?)/gi;
  while ((m = altTypeRe.exec(sqlText)) !== null) {
    const rawTable = m[0].replace(/ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?/i, "").replace(/\s+ALTER\s+(?:COLUMN\s+)?.*/i, "").replace(/"/g, "");
    const table = rawTable.split(".").pop().toLowerCase();
    const ty = (m[3] ?? "").replace(/\s+using\b.*$/i, "").trim(); // 去 USING 转换表达式
    ensure(table).set((m[1] ?? m[2]).toLowerCase(), ty.toLowerCase());
  }
  return tables;
}

const MIGRATIONS_TYPED_CACHE = (() => {
  const tables = new Map();
  // 主权威 database/migrations 最后遍历（覆盖 svc 迁移的早期定义；同目录内按文件名时间戳序，ALTER TYPE 后写覆盖）
  const dirs = [];
  for (const svc of fs.readdirSync(path.join(REPO_ROOT, "svc"), { withFileTypes: true })) {
    if (!svc.isDirectory()) continue;
    const d = path.join(REPO_ROOT, "svc", svc.name, "migrations");
    if (fs.existsSync(d)) dirs.push(d);
  }
  dirs.push(MIGRATION_DIR);
  for (const dir of dirs) {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    for (const f of files) {
      const src = fs.readFileSync(path.join(dir, f), "utf8");
      for (const [t, cols] of extractTablesTyped(src)) {
        if (!tables.has(t)) tables.set(t, new Map());
        for (const [c, ty] of cols) tables.get(t).set(c, ty); // 后写覆盖（ADD 早期定义 + ALTER TYPE 新类型）
      }
    }
  }
  return tables;
})();

function collectMigrationsTyped() {
  return MIGRATIONS_TYPED_CACHE;
}

/** 类型族：跨族差异 = 真实漂移（WARN）；同族差异 = 可接受口径差异（INFO）
 *  时区列族：timestamp/timestamptz/timetz/time/date/interval（时间语义近族）
 *  文本列族：text/varchar/char（TEXT 无长度 vs VARCHAR(n) 有长度，存储一致）
 *  其余族各自独立：uuid/numeric(int)/float/boolean/json/… */
function typeFamily(t) {
  const base = normalizeType(t);
  if (!base) return "";
  if (["timestamp", "timestamptz", "timetz", "time", "date", "interval"].includes(base)) return "time";
  if (["text", "varchar", "char"].includes(base)) return "text";
  return base; // 自身族：uuid→"uuid"、int→"int"、numeric→"numeric" 等
}

/** 类型归一化（基类型语义）：去参数/尾缀，合并同义类型 */
function normalizeType(t) {
  let s = (t ?? "").toLowerCase().replace(/"/g, "").trim();
  if (!s) return "";
  s = s.replace(/^[a-z_][a-z0-9_]*\./, "").trim(); // 去 schema 限定前缀（public.vector → vector）
  s = s.replace(/\s+default\b.*$/i, "").replace(/\s+references\b.*$/i, "").replace(/\s+generated\b.*$/i, "").trim();
  s = s.replace(/\s+not\s+null\b/i, "").replace(/\s+null\b/i, "").replace(/\s+unique\b/i, "").replace(/\s+primary\s+key\b/i, "").replace(/,\s*check\s*\([^)]*\)/i, "").replace(/\s+check\s*\([^)]*\)/i, "").trim();
  s = s.replace(/\([^)]*\)/g, "").trim();
  s = s.replace(/\s+/g, " ").trim();
  const exact = {
    "timestamp with time zone": "timestamptz",
    "timestamp without time zone": "timestamp",
    "time with time zone": "timetz",
    "time without time zone": "time",
    "character varying": "varchar",
    "double precision": "float8",
    "bit varying": "varbit",
  };
  if (exact[s]) return exact[s];
  const map = {
    int: "int", integer: "int", int4: "int",
    bigint: "bigint", int8: "bigint",
    smallint: "smallint", int2: "smallint",
    bool: "boolean", boolean: "boolean",
    float8: "float8", real: "float4", float4: "float4", float: "float4",
    decimal: "numeric", numeric: "numeric",
    varchar: "varchar", char: "char", character: "char", bpchar: "char",
    serial: "serial", bigserial: "bigserial", smallserial: "smallserial",
    timestamptz: "timestamptz", timestamp: "timestamp",
    time: "time", timetz: "timetz", date: "date", interval: "interval",
    uuid: "uuid", json: "json", jsonb: "jsonb", bytea: "bytea", inet: "inet",
    vector: "vector", text: "text", citext: "citext",
  };
  return map[s] ?? s;
}

main();
