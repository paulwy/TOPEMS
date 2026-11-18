#!/usr/bin/env node
/**
 * 待应用迁移的「未应用证据」前置检查（[Gate PENDING-DDL]）
 *
 * 背景：生产 public._sqlx_migrations 含批量导入行，success=t 只证明「被登记过」，
 * 不证明「在本库执行过」。前置检查不能用账本水位，只能用 anchor 基线的 schema diff。
 *
 * 三类判定（互不替代，按迁移内容自动选择）：
 *   1) 表级 DDL 指纹：CREATE TABLE / DROP TABLE / ADD COLUMN
 *      —— 未应用时 CREATE 目标不存在、DROP 目标存在、新增列不存在。
 *   2) RLS 指纹（policy-only 迁移）：从 DO 块的 ARRAY['schema.table', ...] 与静态
 *      ALTER TABLE ... ENABLE/FORCE ROW LEVEL SECURITY 抽目标表，逐表断言
 *        a. relforcerowsecurity 与 anchor 快照一致（本批应为 false）
 *        b. relrowsecurity 与 anchor 快照一致
 *        c. 现存策略名集合与 anchor 快照一致（即仍为旧策略）
 *      anchor 快照取自 database/baseline/prod_schema_<anchor>.sql.gz（pg_dump）。
 *   3) 数据指纹：无 DDL/RLS 的纯 INSERT 种子迁移，断言目标行尚未补齐
 *      （当前缺口数 > 0；全量补齐即视为已应用）。
 *
 * 总账断言：--expect-policies <n> 校验 pg_policy 总数（锚点 1039；14 条窗口后 1050）。
 *
 * 用法：
 *   node scripts/migration/check-pending-ddl.mjs --anchor 20261117235500 \
 *     --defer 20261118124000,20261118160000 --db "$MIGRATE_URL"
 *   node scripts/migration/check-pending-ddl.mjs --versions 20261014000000 --db ...
 *   node scripts/migration/check-pending-ddl.mjs --anchor ... --expect-policies 1039
 *
 * 目标库解析：--db → MIGRATION_DDL_DB_URL → DATABASE_URL → .env 的 MIGRATE_URL。
 * 全程 default_transaction_read_only=on，只读。
 *
 * 退出码：0 全部 PASS/SKIP-DEFERRED；1 存在 FAIL；2 参数/连接错误。
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const MIG_DIR = path.join(REPO_ROOT, "database/migrations");
const BASE_DIR = path.join(REPO_ROOT, "database/baseline");
const TAG = "[Gate PENDING-DDL]";

// ---------------------------------------------------------------------------
// 参数
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const o = { anchor: "", versions: "", defer: "", db: "", schema: "", expectPolicies: 0, post: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--anchor": o.anchor = next(); break;
      case "--versions": o.versions = next(); break;
      case "--defer": o.defer = next(); break;
      case "--db": o.db = next(); break;
      case "--anchor-schema": o.schema = next(); break;
      case "--expect-policies": o.expectPolicies = Number(next()); break;
      case "--post": o.post = true; break;
      case "--json": o.json = true; break;
      case "-h": case "--help": console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0]); process.exit(0);
      default: console.error(`未知参数: ${a}`); process.exit(2);
    }
  }
  return o;
}

function resolveDb(explicit) {
  if (explicit) return explicit;
  if (process.env.MIGRATION_DDL_DB_URL) return process.env.MIGRATION_DDL_DB_URL;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envFile = path.join(REPO_ROOT, ".env");
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
      const m = /^\s*MIGRATE_URL\s*=\s*(.+)\s*$/.exec(line);
      if (m) return m[1].replace(/^["']|["']$/g, "");
    }
  }
  return "";
}

// ---------------------------------------------------------------------------
// SQL 文本处理
// ---------------------------------------------------------------------------
function stripComments(sql) {
  return sql
    .split(/\r?\n/)
    .map((l) => l.replace(/--.*$/, ""))
    .join("\n");
}

// DO $tag$ ... $tag$; 块内的动态 SQL 不参与静态签名（表名多为变量拼接）。
function stripDoBlocks(sql) {
  return sql.replace(/\bDO\s+\$[A-Za-z0-9_]*\$[\s\S]*?\$[A-Za-z0-9_]*\$\s*;/gi, "");
}

const Q = String.raw`(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_$]*))`;
const CREATE_TABLE = new RegExp(String.raw`CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:${Q}\s*\.\s*)?${Q}`, "gi");
const DROP_TABLE = new RegExp(String.raw`DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:${Q}\s*\.\s*)?${Q}`, "gi");
const ADD_COLUMN = new RegExp(
  String.raw`ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?(?:${Q}\s*\.\s*)?${Q}\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?${Q}`,
  "gi",
);
const TEMP_TABLE = new RegExp(
  String.raw`CREATE\s+(?:TEMP|TEMPORARY)\s+(?:UNLOGGED\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:${Q}\s*\.\s*)?${Q}`,
  "gi",
);

function ddlSignatures(text) {
  const sql = stripDoBlocks(stripComments(text));
  const creates = [];
  const drops = [];
  const columns = [];
  const temp = new Set();
  for (const m of sql.matchAll(TEMP_TABLE)) temp.add(m[3] || m[4]);
  for (const m of sql.matchAll(CREATE_TABLE)) {
    const name = m[3] || m[4];
    if (!temp.has(name)) creates.push({ schema: m[1] || m[2], name });
  }
  for (const m of sql.matchAll(DROP_TABLE)) {
    const name = m[3] || m[4];
    if (!temp.has(name)) drops.push({ schema: m[1] || m[2], name });
  }
  for (const m of sql.matchAll(ADD_COLUMN)) {
    columns.push({ schema: m[1] || m[2], table: m[3] || m[4], column: m[5] || m[6] });
  }
  return { creates, drops, columns };
}

const QUALIFIED = /'([A-Za-z_][A-Za-z0-9_$]*\.[A-Za-z_][A-Za-z0-9_$]*)'/g;

// RLS 目标表：DO 块里的 ARRAY[...] 表名 + 静态 ALTER TABLE ... ENABLE/FORCE RLS。
// 保留 DO 块（表名就在块内的数组字面量里），只去注释。
function rlsTargets(text) {
  const sql = stripComments(text);
  const set = new Set();
  for (const m of sql.matchAll(/ARRAY\s*\[([^\]]*)\]/g)) {
    for (const s of m[1].matchAll(QUALIFIED)) set.add(s[1]);
  }
  for (const m of sql.matchAll(
    /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?([A-Za-z_][A-Za-z0-9_$]*\.[A-Za-z_][A-Za-z0-9_$]*)\s+(?:ENABLE|FORCE)\s+ROW\s+LEVEL\s+SECURITY/gi,
  )) {
    set.add(m[1]);
  }
  return [...set].sort();
}

// RENAME 目标：DO 块内 `ALTER TABLE <schema>.%I RENAME TO %I` + `'<prefix>' || t`
// 同名副本改名（如 flow.<t> → flow._deprecated_<t>）在 DO 里动态执行，
// 但「原名是否仍在」是可静态判定的：未应用时原名存在、改名目标不存在。
function renameTargets(text) {
  const sql = stripComments(text);
  const out = [];
  for (const m of sql.matchAll(
    /ALTER\s+TABLE\s+([A-Za-z_][\w$]*)\.%I\s+RENAME\s+TO\s+%I([\s\S]{0,120}?)\)/gi,
  )) {
    const prefix = /'([A-Za-z_][\w$]*)'\s*\|\|\s*t/.exec(m[2]);
    if (!prefix) continue;
    // 取该 EXECUTE 之前最近的 ARRAY[...] 名单（副本表名不带 schema 前缀）
    let arr = null;
    for (const a of sql.matchAll(/ARRAY\s*\[([^\]]*)\]/g)) {
      if (a.index >= m.index) break;
      arr = a;
    }
    if (!arr) continue;
    for (const s of arr[1].matchAll(/'([A-Za-z_][\w$]*)'/g)) {
      out.push({ schema: m[1], name: s[1], to: prefix[1] + s[1] });
    }
  }
  const seen = new Set();
  return out
    .filter((x) => {
      const k = `${x.schema}.${x.name}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

// 纯数据种子：INSERT INTO <表> (code, ...) VALUES ('a:b', ...)
function insertCodes(text) {
  const sql = stripComments(text);
  const out = [];
  for (const m of sql.matchAll(/INSERT\s+INTO\s+([A-Za-z_][\w$]*\.[A-Za-z_][\w$]*)\s*\(([^)]*)\)\s*VALUES([\s\S]*?)ON\s+CONFLICT/gi)) {
    const cols = m[2].split(",").map((c) => c.trim());
    if (!cols.includes("code")) continue;
    for (const s of m[3].matchAll(/'([a-z][a-z0-9_]*:[a-z][a-z0-9_]*)'/g)) out.push({ table: m[1], code: s[1] });
  }
  return out;
}

// ---------------------------------------------------------------------------
// anchor 快照（pg_dump 结构文件）
// ---------------------------------------------------------------------------
function loadAnchor(anchor, explicitPath) {
  const p = explicitPath || path.join(BASE_DIR, `prod_schema_${anchor}.sql.gz`);
  if (!fs.existsSync(p)) return { path: p, missing: true, enabled: new Map(), forced: new Map(), policies: new Map() };
  const buf = p.endsWith(".gz") ? zlib.gunzipSync(fs.readFileSync(p)) : fs.readFileSync(p);
  const enabled = new Set();
  const forced = new Set();
  const policies = new Map();
  for (const raw of buf.toString("utf8").split(/\r?\n/)) {
    let m = /^ALTER TABLE (?:ONLY )?([A-Za-z_][\w$]*\.[A-Za-z_][\w$]*) (ENABLE|FORCE) ROW LEVEL SECURITY;/.exec(raw);
    if (m) (m[2] === "ENABLE" ? enabled : forced).add(m[1]);
    m = /^CREATE POLICY (\S+) ON ([A-Za-z_][\w$]*\.[A-Za-z_][\w$]*)/.exec(raw);
    if (m) {
      if (!policies.has(m[2])) policies.set(m[2], new Set());
      policies.get(m[2]).add(m[1]);
    }
  }
  return { path: p, missing: false, enabled, forced, policies };
}

// ---------------------------------------------------------------------------
// psql（只读）
// ---------------------------------------------------------------------------
function psql(db, sql) {
  return execFileSync("psql", [db, "-X", "-q", "-A", "-t", "-F", "\t", "-v", "ON_ERROR_STOP=1", "-c", sql], {
    encoding: "utf8",
    env: { ...process.env, PGOPTIONS: "-c default_transaction_read_only=on" },
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function liveRls(db, tables) {
  if (!tables.length) return new Map();
  const values = tables.map((t) => `('${t.replace(/'/g, "''")}')`).join(",");
  const sql = `
    SELECT v.t,
           CASE WHEN c.oid IS NULL THEN 'missing' ELSE c.relrowsecurity::text END,
           CASE WHEN c.oid IS NULL THEN 'missing' ELSE c.relforcerowsecurity::text END,
           COALESCE((SELECT string_agg(p.polname, ',' ORDER BY p.polname)
                       FROM pg_policy p WHERE p.polrelid = c.oid), '')
      FROM (VALUES ${values}) v(t)
      LEFT JOIN pg_class c ON c.oid = to_regclass(v.t)`;
  const out = psql(db, sql);
  const map = new Map();
  for (const line of out.split(/\r?\n/)) {
    if (!line) continue;
    const f = line.split("\t");
    map.set(f[0], { rls: f[1], forced: f[2], policies: f[3] ? f[3].split(",").sort() : [] });
  }
  return map;
}

function setsEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((x, i) => x === b[i]);
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------
const opts = parseArgs(process.argv.slice(2));
const db = resolveDb(opts.db);
if (!db) {
  console.error(`${TAG} 缺少数据库连接：--db / MIGRATION_DDL_DB_URL / DATABASE_URL / .env MIGRATE_URL`);
  process.exit(2);
}

let versions = [];
const deferred = new Set(opts.defer.split(",").map((s) => s.trim()).filter(Boolean));
if (opts.post) {
  // 窗口后只做总账断言（策略总数），逐版本「未应用」期望在此阶段已反转，不能复用。
  if (!(opts.expectPolicies > 0)) {
    console.error(`${TAG} --post 需配合 --expect-policies <n>`);
    process.exit(2);
  }
} else if (opts.versions) {
  versions = opts.versions.split(",").map((s) => s.trim()).filter(Boolean);
} else {
  if (!/^\d{14}$/.test(opts.anchor)) {
    console.error(`${TAG} --anchor 需为 14 位版本号（或改用 --versions）`);
    process.exit(2);
  }
  versions = fs
    .readdirSync(MIG_DIR)
    .filter((f) => /^\d{14}_.*\.sql$/.test(f))
    .map((f) => f.slice(0, 14))
    .filter((v) => Number(v) > Number(opts.anchor))
    .sort();
}

const results = [];
let pasTotal = 0;
let failTotal = 0;

for (const v of versions) {
  const file = fs.readdirSync(MIG_DIR).find((f) => f.startsWith(`${v}_`) && f.endsWith(".sql"));
  const rec = { version: v, file: file || "", verdict: "SKIP", assertions: 0, fails: 0, reason: "", kind: "" };

  if (!file) {
    rec.verdict = "FAIL";
    rec.reason = "迁移文件缺失";
    rec.fails = 1;
  } else if (deferred.has(v)) {
    rec.reason = "本窗口显式 defer";
  } else {
    const text = fs.readFileSync(path.join(MIG_DIR, file), "utf8");
    const ddl = ddlSignatures(text);
    const rls = rlsTargets(text);
    const renames = renameTargets(text);
    const codes = insertCodes(text);

    if (ddl.creates.length || ddl.drops.length || ddl.columns.length) {
      rec.kind = "DDL";
      const checks = [];
      for (const t of ddl.creates) {
        const expr = t.schema ? `'${t.schema}.${t.name}'` : `'${t.name}'`;
        const present = psql(db, `SELECT to_regclass(${expr}) IS NOT NULL`) === "t";
        checks.push({ key: `CREATE ${t.schema ? t.schema + "." : ""}${t.name}`, ok: !present, expect: "不存在" });
      }
      for (const t of ddl.drops) {
        const expr = t.schema ? `'${t.schema}.${t.name}'` : `'${t.name}'`;
        const present = psql(db, `SELECT to_regclass(${expr}) IS NOT NULL`) === "t";
        checks.push({ key: `DROP ${t.schema ? t.schema + "." : ""}${t.name}`, ok: present, expect: "存在" });
      }
      for (const c of ddl.columns) {
        const tbl = c.schema ? `${c.schema}.${c.table}` : c.table;
        const exists =
          psql(
            db,
            `SELECT EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = to_regclass('${tbl}') AND a.attname = '${c.column}' AND a.attnum > 0 AND NOT a.attisdropped)`,
          ) === "t";
        checks.push({ key: `ADD COLUMN ${tbl}.${c.column}`, ok: !exists, expect: "不存在" });
      }
      rec.assertions = checks.length;
      rec.fails = checks.filter((c) => !c.ok).length;
      rec.details = checks;
      rec.verdict = rec.fails ? "FAIL" : "PASS";
    } else if (rls.length) {
      rec.kind = "RLS";
      const anchor = loadAnchor(opts.anchor, opts.schema);
      const live = liveRls(db, rls);
      const checks = [];
      for (const t of rls) {
        const l = live.get(t);
        if (!l || l.rls === "missing") {
          checks.push({ key: `${t} 存在性`, ok: false, expect: "表存在" });
          continue;
        }
        const aRls = anchor.enabled.has(t) ? "true" : "false";
        const aForce = anchor.forced.has(t) ? "true" : "false";
        const aPol = [...(anchor.policies.get(t) || [])].sort();
        checks.push({ key: `${t} relrowsecurity`, ok: l.rls === aRls, expect: `anchor=${aRls}` });
        checks.push({ key: `${t} relforcerowsecurity`, ok: l.forced === aForce, expect: `anchor=${aForce}` });
        checks.push({
          key: `${t} 策略集合`,
          ok: setsEqual(l.policies, aPol),
          expect: `anchor=[${aPol.join(",")}] live=[${l.policies.join(",")}]`,
        });
      }
      rec.assertions = checks.length;
      rec.fails = checks.filter((c) => !c.ok).length;
      rec.details = checks;
      rec.verdict = rec.fails ? "FAIL" : "PASS";
      if (anchor.missing) rec.reason = `anchor 快照缺失：${anchor.path}`;
    } else if (renames.length) {
      rec.kind = "RENAME";
      const checks = [];
      for (const r of renames) {
        const oldPresent = psql(db, `SELECT to_regclass('${r.schema}.${r.name}') IS NOT NULL`) === "t";
        checks.push({ key: `${r.schema}.${r.name} 原名仍在`, ok: oldPresent, expect: "存在（未改名）" });
        const newPresent = psql(db, `SELECT to_regclass('${r.schema}.${r.to}') IS NOT NULL`) === "t";
        checks.push({ key: `${r.schema}.${r.to} 未生成`, ok: !newPresent, expect: "不存在" });
      }
      rec.assertions = checks.length;
      rec.fails = checks.filter((c) => !c.ok).length;
      rec.details = checks;
      rec.verdict = rec.fails ? "FAIL" : "PASS";
    } else if (codes.length) {
      rec.kind = "DATA";
      const list = codes.map((c) => `'${c.code.replace(/'/g, "''")}'`).join(",");
      const existing = Number(psql(db, `SELECT count(*) FROM ${codes[0].table} WHERE code IN (${list})`));
      const missing = codes.length - existing;
      rec.assertions = 1;
      rec.details = [{ key: `${codes[0].table} 缺失码数`, ok: missing > 0, expect: `>0（总 ${codes.length}，已存在 ${existing}）` }];
      if (missing > 0) {
        rec.verdict = "PASS";
      } else if (/ON\s+CONFLICT[\s\S]*?DO\s+NOTHING/i.test(text)) {
        // 数据已全量存在且迁移幂等：应用是空操作，不构成「重复应用」风险。
        rec.verdict = "NOOP";
        rec.reason = `数据已全量存在（${existing}/${codes.length}），文件为 ON CONFLICT DO NOTHING → 应用是幂等空操作`;
      } else {
        rec.fails = 1;
        rec.verdict = "FAIL";
        rec.reason = "数据已全量存在且迁移非幂等，重复应用会冲突";
      }
    } else {
      rec.reason = "无表级 DDL / RLS 目标表 / RENAME 目标 / 数据种子（仅 TEMP 表或 DO 内不可静态解析的动态 DDL），需人工确认";
    }
  }

  if (rec.verdict === "PASS") pasTotal++;
  if (rec.verdict === "FAIL") failTotal++;
  results.push(rec);
}

// 总账断言
let policyNote = "";
if (opts.expectPolicies > 0) {
  const actual = Number(psql(db, "SELECT count(*) FROM pg_policy"));
  const ok = actual === opts.expectPolicies;
  policyNote = `${TAG} 策略总数：期望 ${opts.expectPolicies}，实际 ${actual} → ${ok ? "PASS" : "FAIL"}`;
  if (!ok) failTotal++;
  else pasTotal++;
}

if (opts.json) {
  console.log(JSON.stringify({ results, policyNote, pass: pasTotal, fail: failTotal }, null, 2));
} else {
  for (const r of results) {
    const mark = { PASS: "PASS", FAIL: "FAIL", NOOP: "NOOP", SKIP: "SKIP" }[r.verdict] || "SKIP";
    const detail =
      r.verdict === "SKIP" || r.verdict === "NOOP"
        ? r.reason
        : r.verdict === "PASS"
          ? `${r.kind} 断言 ${r.assertions} 条全部通过`
          : `${r.kind} 断言 ${r.assertions} 条，失败 ${r.fails} 条`;
    console.log(`  ${mark} ${r.version} ${r.file} —— ${detail}`);
    if (r.verdict === "FAIL" && r.details) {
      for (const d of r.details.filter((x) => !x.ok)) console.log(`         · ${d.key} 期望 ${d.expect}`);
    }
    if (r.reason && r.verdict === "FAIL") console.log(`         ! ${r.reason}`);
  }
  if (policyNote) console.log(policyNote);
  const count = (v) => results.filter((r) => r.verdict === v).length;
  console.log(
    `${TAG} 结果：PASS ${pasTotal} / FAIL ${failTotal} / NOOP ${count("NOOP")} / SKIP ${count("SKIP")}`,
  );
}

process.exit(failTotal > 0 ? 1 : 0);
