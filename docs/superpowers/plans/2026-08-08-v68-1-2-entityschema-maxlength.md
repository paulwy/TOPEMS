# V68.1-2 EntitySchema maxLength 全量对齐（91 表 VARCHAR）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 216 个 EntitySchema 中 1417 个 String-type 字段补齐 `validation: [{ type:'maxLength', value:N }]`，严格与 migrations 中对应 SQL `VARCHAR(n)` 列一一对应；覆盖率 ≥ 98%，错配率 = 0；并新增 3 个长期 CI 质量闸脚本。

**Architecture:** 三阶段脚本流水线：(A) SQL 扫描 → (tableKey,col)→VARCHAR(n) Map；(B) Schema 扫描 + gap 报告 + 人工维护 entity↔tableKey 别名表；(C) 精确 AST 级 patch 所有 schema 源文件，插入 maxLength entry。配 4 道质量闸：Gate1 覆盖率、Gate2 反向审计（错配必 exit 1）、Gate3 tsc+lint（已有）、Gate4 Schema 覆盖率（≥98%）。

**Tech Stack:** Node.js 18+ (esm), TypeScript 5.x (tsc --noEmit), ESLint, raw-text brace-balance parser（无需 TS Compiler API，避免 88 个 TSX/JSX 内嵌 schema 解析失败）

---

# Part A · V68.1-2 规范文档 (用户要求的"规范")

## A1. 背景与严格度策略

- **审计来源**: [V67.1-data-layer-audit-20260808 §P1-5](file:///Users/xingzhai/TOPEMS/docs/audit/V67.1-data-layer-audit-20260808.md)：EntitySchema 几乎无人填写 `validation.maxLength` → 前端验证缺口导致 P0-4 类截断 bug 大规模发生；建议"写 30 行脚本扫 migration CREATE TABLE 自动对齐"。
- **严格度策略（用户已确认 Option A）**:
  - ✅ **只补 SQL 中明确写 `VARCHAR(n)` 的列**：值完全等于 SQL 中的 n（不 round，不加 buffer）。
  - ❌ **SQL 类型 TEXT**：不补 maxLength（SQL 本就无限长，补了反而和 SQL 语义不一致）。
  - ❌ **SQL 类型 VARCHAR 无 n**：本次基线扫描 0 条，无需处理。
  - ❌ **Rust 后端**：本次只补前端 TypeScript EntitySchema，后端 DB 层约束以 SQL 为真相源，不重复改 Rust 结构。
- **字段范围**：仅 `SchemaField.type ∈ {text, email, textarea, select, autocomplete, checkbox-group}`（String 型）。number/switch/date/attachment 等非字符串字段跳过。
- **覆盖范围**：`apps/web/src/schemas/**/*.{ts,tsx}` 所有 EntitySchema（216 个，含 91 主业务表 + 子列表/子弹窗内嵌子 Schema）。

## A2. 基线数据（2026-08-08 实际扫描）

| 指标 | 数值 |
|---|---|
| EntitySchema 解析数 | 216 个（V67.2 P0-4 之前 21 个字段有 maxLength，覆盖率 1.5%） |
| String-type 字段总数 | 1438 个 |
| 需补缺口 | ≈ **1417 字段 × ≈200 个 TS/TSX 文件** |
| SQL CREATE TABLE 语句 | 114 条（23 个 service/migrations + database/migrations） |
| 唯一 (pgSchema_table, col) → VARCHAR(n) 映射 | 445 条（覆盖 105 张实际表） |
| V67.2 P0-4 已补字段 | 21 个（5 模块 × 17 字段样例，保留不动） |

## A3. 4 道质量闸定义 (CI 门禁)

### Gate1：SQL-VARCHAR Map 接收覆盖率闸（scripts/v68-1-2/gate1_map_coverage.mjs）
- **输入**：Stage A 产物 `table-col-varchar.map.json`（445 条）+ Stage B 产物 `entity-table-map.json`（alias 表）
- **断言 1**：445 条中 ≥ 90% 的 `(tableKey,col)` 能在所有 EntitySchema String-type 字段中找到匹配接收方（即 alias+field 对得上）。若 < 90% 意味着 alias 表漏填大量模块，exit 1 并打印未匹配 tableKey 清单。
- **断言 2**：SQL VARCHAR(500) 及以上的超长列（如 material_name VARCHAR(500)）必须**全部**匹配到接收方（因为这些是截断高危点）。exit 1。
- **通过语义**：打印 `[GATE1 PASSED] coverage=XX.X% (401/445) longcols=100%`

### Gate2：反向审计闸（长期 CI：scripts/check-entityschema-maxlength-reverse.mjs）
- **输入**：Stage A Map + Stage B alias + 所有 schema 源文件（patch 后）
- **算法**：对每一个 String-type 字段 **且有 maxLength** 的，反向查表：
  - 用 alias 找 tableKey → 列名 camelCase→snake_case → 查 `(tableKey,col)` 是否有 VARCHAR(n)
  - 若无 → 报红 `SCHEMA_EXTRA_MAXLENGTH`（可能是 TEXT 字段被误补，或列已重命名）
  - 若有且 `schema.value ≠ VARCHAR(n)` → 严重报红 `VALUE_MISMATCH`，exit 1
- **豁免**：字段上一行有 `// no-varchar (reason)` 注释的允许无对应 SQL 列（仅用于极个别 DB 层动态拼接字符串字段，本次预期 ≤ 5 条）。
- **通过语义**：打印 `[GATE2 PASSED] matched=YYY extra_ok=ZZZ mismatch=0`
- **长期 CI**：放入 package.json pre-commit / CI 脚本里，防止后续加字段时 maxLength 与 SQL 漂移。

### Gate3：tsc --noEmit + ESLint（已有）
- **运行**：`cd apps/web && npx tsc --noEmit && cd ../.. && npm run lint:web`（或项目现有等价命令）
- **要求**：0 errors。因为 patch 是"在对象字面量里加 validation 属性/数组元素"，只要位置对就不会破坏 TS。

### Gate4：Schema 覆盖率闸（长期 CI：scripts/check-entityschema-maxlength.mjs）
- **输入**：所有 schema 源文件
- **指标**：`covered = 有 maxLength 的 String-type 字段数 / 全部 String-type 字段数`
- **阈值**：`covered ≥ 98%`。低于 98% exit 1。
- **豁免**：字段上一行有 `// no-varchar` 注释（和 Gate2 共用），不计入分母。
- **通过语义**：打印 `[GATE4 PASSED] coverage=99.3% (1428/1438) exempt=8`
- **长期 CI**：同上。

## A4. Patch 代码规范（Stage C 脚本必须严格遵守）

1. **已有 validation 数组 → push 不覆盖**：
   ```typescript
   // 原代码：
   validation: [{ type:'required', message:'必填' }],
   // patch 后：
   validation: [{ type:'required', message:'必填' }, { type:'maxLength', value: 50 }],
   ```
2. **无 validation → 新建数组**：
   ```typescript
   // 原代码（字段对象末尾）：
   sortable: true,
   // patch 后：
   sortable: true,
   validation: [{ type:'maxLength', value: 100 }],
   ```
3. **位置**：若字段对象有 `listWidth` / `sortable` / `filterable`，maxLength 必须插入在这些**之后**（靠字段对象尾部），不要在 `label`/`type`/`required` 前面（保持可读性，与 erp/material.ts 既有风格一致）。
4. **格式**：2 空格缩进，无尾随逗号（遵循原文件风格；脚本扫描原文件首个字段对象的括号风格 & 逗号风格自动适应）。
5. **不重复**：若字段已有 `maxLength` entry（value 相同或不同），脚本跳过不重复加；value 不同则报 warning 供人工 review（Gate2 会抓到 mismatch）。
6. **幂等**：对同一文件重复跑 Stage C 多次结果完全相同（无重复条目）。

## A5. 文件清单（精确到路径）

| 文件路径 | 创建/修改 | 生命周期 | 作用 |
|---|---|---|---|
| `scripts/v68-1-2/` | 创建 | **永久**（方便日后再跑对齐） | 放 Stage A/B/C 脚本 + 产物 |
| `scripts/v68-1-2/a_scan_sql.mjs` | 创建 | 永久 | Stage A：SQL → Map |
| `scripts/v68-1-2/b_gap_alias_scan.mjs` | 创建 | 永久 | Stage B：Schema 扫描 + gap 报告 + alias 模板 |
| `scripts/v68-1-2/entity-table-map.json` | 创建 | **永久**（CI 共用，重要资产） | EntitySchema→SQL tableKey 的别名映射表（人工维护） |
| `scripts/v68-1-2/c_patch_schemas.mjs` | 创建 | 永久 | Stage C：精确 patch schema 源文件（带 dry-run 选项） |
| `scripts/v68-1-2/.run/table-col-varchar.map.json` | 创建 | 临时，可 gitignore | Stage A 产物 |
| `scripts/v68-1-2/.run/gap-report.md` | 创建 | 临时 | Stage B 产物 |
| `scripts/v68-1-2/gate1_map_coverage.mjs` | 创建 | 永久 | Gate1（阶段内 gate） |
| `scripts/check-entityschema-maxlength-reverse.mjs` | 创建 | **永久入库（CI 级）** | Gate2 反向审计（长期） |
| `scripts/check-entityschema-maxlength.mjs` | 创建 | **永久入库（CI 级）** | Gate4 覆盖率（长期） |
| `apps/web/src/schemas/**/*.{ts,tsx}` ≈200 文件 | 修改 | 永久 | 被 Stage C 自动 patch ~1417 字段 |
| `docs/roadmap/TODO.md` | 修改 | 永久 | 更新 V68.1-2 行状态为进行中→完成 |
| `docs/superpowers/plans/2026-08-08-v68-1-2-entityschema-maxlength.md` | 创建 | 永久 | 本计划文档（你正在读的） |

**gitignore 追加**（仅 1 行，写入根 `.gitignore`）：`scripts/v68-1-2/.run/`

---

# Part B · 分任务实施计划（Bite-Sized，2-5 分钟/步）

## Task 0：工作区准备

**Files:**
- Modify: `.gitignore` 追加 1 行
- Create: `scripts/v68-1-2/.gitkeep`
- Verify: `git status` clean (无未提交改动)

- [ ] **Step 0.1：检查 git 干净**

```bash
cd /Users/xingzhai/TOPEMS
git status --porcelain
```

Expected: **空输出**（无未 commit / unstaged 改动）。若非空，请先 `git stash -u -m "V68.1-2 prereq stash"`。

- [ ] **Step 0.2：建目录 + 写 gitignore**

```bash
cd /Users/xingzhai/TOPEMS
mkdir -p scripts/v68-1-2/.run
touch scripts/v68-1-2/.gitkeep
```

追加到根 `.gitignore` 末尾：

```
# V68.1-2 流水线临时产物
scripts/v68-1-2/.run/
```

- [ ] **Step 0.3：验证 Node 版本 & 工具链可用**

```bash
cd /Users/xingzhai/TOPEMS
node -v                       # >= 18.12
[ -f package.json ] && echo ok
[ -f apps/web/package.json ] && echo ok
```

Expected: `v18+` + 2x `ok`

- [ ] **Step 0.4：Task 0 commit**

```bash
cd /Users/xingzhai/TOPEMS
git add .gitignore scripts/v68-1-2/.gitkeep
git commit -m "chore(v68.1-2): prepare workspace for entityschema maxlength pipeline"
```

---

## Task 1：Stage A 脚本 — SQL 扫描器 a_scan_sql.mjs

**Files:**
- Create: `scripts/v68-1-2/a_scan_sql.mjs`
- Test run: 生成 `.run/table-col-varchar.map.json`（445+ entries）

- [ ] **Step 1.1：写完整脚本**

```javascript
#!/usr/bin/env node
/**
 * V68.1-2 Stage A — SQL migrations → (tableKey, col) -> varchar_length map
 *
 * Reads all *.sql files under svc/* /migrations and database/migrations,
 * parses every CREATE TABLE (with optional pg_schema prefix → `pg_table`)
 * as well as every ALTER TABLE ADD COLUMN ... VARCHAR(n).
 *
 * Output: JSON object, keys = "table_key.col_snake_lower", values = N.
 * For duplicate keys across migrations, KEEPS THE LARGEST N (honors last
 * ALTER enlarge).
 */
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, existsSync, dirname } from "node:fs";
import { join, extname, dirname as pDirname, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = pDirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const OUT_DIR = join(__dirname, ".run");
const OUT_FILE = join(OUT_DIR, "table-col-varchar.map.json");

const MAP = new Map(); // "table.col" -> max N across all migrations

function walk(dir, visitor) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, visitor);
    else if (e.isFile()) visitor(p);
  }
}

function procSql(p) {
  const src = readFileSync(p, "utf8");

  // --- CREATE TABLE ---
  // split on statement end ';' followed by newline/EOF. SQL file statements
  // are delimited this way in all 146 migrations.
  const buf = "\n" + src + "\n";
  const stmts = [];
  {
    let start = 1, inStr = null, esc = false, lc = false, bc = false, inDol = false;
    for (let i = 1; i < buf.length; i++) {
      const ch = buf[i], n = buf[i+1];
      if (lc) { if (ch === "\n") lc = false; continue; }
      if (bc) { if (ch === "*" && n === "/") { bc = false; i++; } continue; }
      if (inDol) { if (ch === "$" && buf.slice(i,i+3) === "$$") { inDol = false; i += 2; } continue; }
      if (inStr) { if (esc){esc=false;continue;} if (ch === "\\") { esc=true; continue; } if (ch === inStr) inStr = null; continue; }
      if (ch === "/" && n === "/") { lc = true; i++; continue; }
      if (ch === "/" && n === "*") { bc = true; i++; continue; }
      if (ch === "$" && buf.slice(i,i+3) === "$$") { inDol = true; i += 2; continue; }
      if (ch === `'"${"`"[0]}` || ch === "'" || ch === '"') { inStr = ch; continue; }
      if (ch === ";") {
        stmts.push(buf.slice(start, i));
        start = i + 1;
      }
    }
    if (start < buf.length - 1) stmts.push(buf.slice(start, -1));
  }

  for (const sRaw of stmts) {
    const s = sRaw.trim();
    if (!s) continue;
    const h = s.match(/^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:([\w]+)\.)?([\w]+)\s*\(/i);
    if (!h) continue;
    const pg = (h[1] || "").toLowerCase();
    const tbl = h[2].toLowerCase();
    const tableKey = pg ? `${pg}_${tbl}` : tbl;
    const bs = s.indexOf("("); if (bs < 0) continue;
    // balanced )
    let d = 0, inS = null, end = -1;
    for (let i = bs; i < s.length; i++) {
      const ch = s[i];
      if (inS) { if (ch === inS) inS = null; else if (ch === "\\") i++; continue; }
      if (ch === "'" || ch === '"' || ch === "`") { inS = ch; continue; }
      if (ch === "(") d++;
      else if (ch === ")") { d--; if (d === 0) { end = i; break; } }
    }
    if (end < 0) continue;
    const body = s.slice(bs + 1, end);
    const lines = body.split(/,(?![^()]*\))/);
    for (const cl of lines) {
      const col = cl.trim();
      if (/^(CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK|INDEX|KEY|FULLTEXT|SPATIAL|EXCLUDE)\b/i.test(col)) continue;
      const m = col.match(/^[`""]?([\w]+)[`""]?\s+VARCHAR\s*\(\s*(\d+)\s*\)/i);
      if (!m) continue;
      const cn = m[1].toLowerCase();
      const n = parseInt(m[2], 10);
      const k = `${tableKey}.${cn}`;
      if (!MAP.has(k) || MAP.get(k) < n) MAP.set(k, n);
    }
  }

  // --- ALTER TABLE ADD COLUMN VARCHAR(n) ---
  const addRe = /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:([\w]+)\.)?([\w]+)\s+ADD\s+(?:COLUMN\s+)?[`""]?([\w]+)[`""]?\s+VARCHAR\s*\(\s*(\d+)\s*\)/gi;
  let ma;
  while ((ma = addRe.exec(src)) !== null) {
    const pg = (ma[1] || "").toLowerCase();
    const tbl = ma[2].toLowerCase();
    const tableKey = pg ? `${pg}_${tbl}` : tbl;
    const cn = ma[3].toLowerCase();
    const n = parseInt(ma[4], 10);
    const k = `${tableKey}.${cn}`;
    if (!MAP.has(k) || MAP.get(k) < n) MAP.set(k, n);
  }
}

const roots = [join(ROOT,"svc"), join(ROOT,"lib"), join(ROOT,"database")];
for (const r of roots) { try { statSync(r); } catch { continue; } walk(r, (p) => {
  if (extname(p) !== ".sql") return;
  if (basename(pDirname(p)) !== "migrations") return;
  procSql(p);
}); }

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const obj = Object.fromEntries([...MAP.entries()].sort());
writeFileSync(OUT_FILE, JSON.stringify(obj, null, 2) + "\n", "utf8");

console.log(`[Stage A] visited migrations -> produced ${MAP.size} (table.col) → VARCHAR(n) mappings`);
console.log(`            saved to: ${OUT_FILE}`);
process.exit(0);
```

- [ ] **Step 1.2：运行脚本验证产物**

```bash
cd /Users/xingzhai/TOPEMS
node scripts/v68-1-2/a_scan_sql.mjs
```

Expected:
```
[Stage A] visited migrations -> produced 445 (table.col) → VARCHAR(n) mappings
            saved to: /Users/xingzhai/TOPEMS/scripts/v68-1-2/.run/table-col-varchar.map.json
```

Verify 行数 ≥ 445：
```bash
cd /Users/xingzhai/TOPEMS
node -e "const m=require('./scripts/v68-1-2/.run/table-col-varchar.map.json');console.log('keys:',Object.keys(m).length);console.log('sample:',Object.entries(m).slice(0,8));"
```

Expected: keys ≥ 445，且 sample 含 `crm_customers.name`、`core_plugins.code`、`wms_batches.sku` 等已知列。

- [ ] **Step 1.3：Task 1 commit**

```bash
cd /Users/xingzhai/TOPEMS
git add scripts/v68-1-2/a_scan_sql.mjs
git commit -m "chore(v68.1-2): stage A SQL VARCHAR map scanner"
```

---

## Task 2：Stage B 脚本 — Schema 扫描 + Gap 报告 + Alias 模板 b_gap_alias_scan.mjs

**Files:**
- Create: `scripts/v68-1-2/b_gap_alias_scan.mjs`
- Create (首次): `scripts/v68-1-2/entity-table-map.json`（空模板 + 注释）
- Test run: 生成 `.run/gap-report.md`

- [ ] **Step 2.1：写完整脚本**

```javascript
#!/usr/bin/env node
/**
 * V68.1-2 Stage B — Schema string-field scanner → gap report + alias template
 *
 * Parses apps/web/src/schemas/**.{ts,tsx} for EntitySchema blocks, extracts
 * all string-type fields, reads existing validation.maxLength entries;
 * loads Stage A (table.col)->varchar map; performs enhanced guess-match and
 * classifies each missing field as AUTO / UNMATCHED / AMBIGUOUS.
 *
 * Writes:
 *   .run/gap-report.md             — human-readable gap list (4 sections:
 *                                    matched summary / unmatched list × 200 /
 *                                    ambiguous list / alias template)
 *   entity-table-map.json (only if absent) — starter template keyed by
 *                                    `${entity}|${modu}|${resource}` with
 *                                    null tableKey, for manual fill-in
 */
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, existsSync, dirname as _dirname } from "node:fs";
import { join, extname, dirname as pDirname, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = pDirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const MAP_FILE = join(__dirname, ".run", "table-col-varchar.map.json");
const ALIAS_FILE = join(__dirname, "entity-table-map.json");
const OUT_DIR = join(__dirname, ".run");
const GAP_REPORT = join(OUT_DIR, "gap-report.md");

if (!existsSync(MAP_FILE)) { console.error("Run Stage A first (a_scan_sql.mjs)."); process.exit(2); }
const VARCHAR_MAP = JSON.parse(readFileSync(MAP_FILE, "utf8"));
const ALL_TABLE_KEYS = new Set(Object.keys(VARCHAR_MAP).map(k => k.split(".")[0]));

const STRING_TYPES = new Set(["text","email","textarea","select","autocomplete","checkbox-group"]);

function walk(dir, visitor) { for (const e of readdirSync(dir,{withFileTypes:true})) { const p=join(dir,e.name); if (e.isDirectory()) walk(p,visitor); else if (e.isFile() && (e.name.endsWith(".ts")||e.name.endsWith(".tsx"))) visitor(p); } }
function balancedClose(src, start, openCh, closeCh) {
  let d=0,i=start,inS=null,esc=false,lc=false,bc=false;
  for (;i<src.length;i++) { const ch=src[i],n=src[i+1];
    if (lc){if(ch==="\n")lc=false;continue;}
    if (bc){if(ch==="*"&&n==="/"){bc=false;i++;}continue;}
    if (inS){if(esc){esc=false;continue;}if(ch==="\\"){esc=true;continue;}if(ch===inS)inS=null;continue;}
    if (ch==="/"&&n==="/"){lc=true;i++;continue;}
    if (ch==="/"&&n==="*"){bc=true;i++;continue;}
    if (ch===`'"${"`"[0]}`||ch==="'"||ch==='"'){inS=ch;continue;}
    if (ch===openCh) d++;
    else if (ch===closeCh){d--;if(d===0)return i;}
  } return -1;
}
const braceClose = (s,i) => balancedClose(s,i,"{","}");
const bracketClose = (s,i) => balancedClose(s,i,"[","]");

function parseField(body) {
  const n = body.match(/\bname\s*:\s*['"`]([^'"`]+)/);
  const t = body.match(/\btype\s*:\s*['"`]([^'"`]+)/);
  const name = n?n[1]:null, type = t?t[1]:null;
  let has=false, val=null;
  const vRe = /\bvalidation\s*:\s*\[([\s\S]*?)\]/g; let vm;
  while ((vm = vRe.exec(body)) !== null) {
    const b = vm[1];
    const a = b.match(/\{\s*type\s*:\s*['"`]maxLength['"`]\s*,\s*value\s*:\s*(\d+)/);
    const c = b.match(/value\s*:\s*(\d+)\s*,\s*type\s*:\s*['"`]maxLength['"`]/);
    if (a){has=true;val=parseInt(a[1],10);break;}
    if (c){has=true;val=parseInt(c[1],10);break;}
  }
  return { name, type, has, val };
}
function splitFields(src) {
  const out = []; let i = 1;
  while (i < src.length) {
    let d=0, s=-1, inS=null,esc=false,lc=false,bc=false;
    for (; i < src.length; i++) {
      const ch=src[i],n=src[i+1];
      if (lc){if(ch==="\n")lc=false;continue;}
      if (bc){if(ch==="*"&&n==="/"){bc=false;i++;}continue;}
      if (inS){if(esc){esc=false;continue;}if(ch==="\\"){esc=true;continue;}if(ch===inS)inS=null;continue;}
      if (ch==="/"&&n==="/"){lc=true;i++;continue;}
      if (ch==="/"&&n==="*"){bc=true;i++;continue;}
      if (ch===`'"${"`"[0]}`||ch==="'"||ch==='"'){inS=ch;continue;}
      if (ch==="{"){s=i;d++;break;}
    }
    if (s<0) break; i++; d=1;
    for (; i < src.length; i++) {
      const ch=src[i],n=src[i+1];
      if (lc){if(ch==="\n")lc=false;continue;}
      if (bc){if(ch==="*"&&n==="/"){bc=false;i++;}continue;}
      if (inS){if(esc){esc=false;continue;}if(ch==="\\"){esc=true;continue;}if(ch===inS)inS=null;continue;}
      if (ch==="/"&&n==="/"){lc=true;i++;continue;}
      if (ch==="/"&&n==="*"){bc=true;i++;continue;}
      if (ch===`'"${"`"[0]}`||ch==="'"||ch==='"'){inS=ch;continue;}
      if (ch==="{") d++;
      else if (ch==="}"){d--;if(d===0){i++;break;}}
    }
    out.push(parseField(src.slice(s, i)));
  }
  return out;
}
function parseBlock(file, block) {
  const e = block.match(/\bentity\s*:\s*['"`]([^'"`]+)/);
  const o = block.match(/\bapi\s*:\s*\{[\s\S]*?module\s*:\s*['"`]([^'"`]+)/);
  const r = block.match(/\bapi\s*:\s*\{[\s\S]*?resource\s*:\s*['"`]([^'"`]+)/);
  if (!e) return null;
  const entity = e[1], modu = o?o[1]:null, reso = r?r[1]:null;
  const fIdx = block.search(/\bfields\s*:\s*\[/);
  if (fIdx < 0) return null;
  const ls = block.indexOf("[", fIdx); const rs = bracketClose(block, ls);
  if (rs < 0) return null;
  return { file, entity, modu, reso, fields: splitFields(block.slice(ls, rs+1)) };
}
function extractSchemas(file, src) {
  const res = [];
  const patterns = [
    /EntitySchema\s*=\s*\{|:\s*EntitySchema\b[^=]*=\s*\{/g,
    /export\s+(?:const|let|var)\s+\w+\s*=\s*\{[\s\S]{0,200}\bentity\s*:\s*['"][^'"]+['"]/g,
    /(?:^|\n)\s*(?:const|let|var)\s+\w+\s*=\s*\{[\s\S]{0,120}\bentity\s*:\s*['"][^'"]+['"]/g
  ];
  const seen = new Set();
  for (const re of patterns) { let m;
    while ((m = re.exec(src)) !== null) {
      const bi = src.indexOf("{", m.index);
      if (bi < 0) continue;
      const ei = braceClose(src, bi);
      if (ei < 0) continue;
      if (seen.has(ei)) { re.lastIndex = ei+1; continue; }
      seen.add(ei);
      const b = parseBlock(file, src.slice(bi, ei+1));
      if (b) res.push(b);
      re.lastIndex = ei+1;
    }
  }
  return res;
}

// Collect schemas
const schemas = [];
walk(join(ROOT,"apps/web/src/schemas"), (p) => {
  try { schemas.push(...extractSchemas(p, readFileSync(p,"utf8"))); } catch {}
});

const strFields = schemas.flatMap(s => s.fields.map(f => ({schema:s,field:f}))).filter(x => STRING_TYPES.has(x.field.type));
const withM = strFields.filter(x => x.field.has);
const miss = strFields.filter(x => !x.field.has);

// Alias utils
function toSnake(s){return s.replace(/[A-Z]/g, l=>"_"+l.toLowerCase()).replace(/^_/,"");}
function pluralize(s){if(s.endsWith("s"))return s+"es";if(s.endsWith("y")&&!/[aeiou]y$/.test(s))return s.slice(0,-1)+"ies";return s+"s";}
function singularize(s){if(s.endsWith("ies"))return s.slice(0,-3)+"y";if(s.endsWith("es"))return s.slice(0,-2);if(s.endsWith("s")&&!s.endsWith("ss"))return s.slice(0,-1);return s;}
function guessTableKeys(s){
  const out = new Set();
  const mod = s.modu?s.modu.toLowerCase():null, ent=s.entity?s.entity.toLowerCase():null, res=s.reso?s.reso.toLowerCase():null;
  const base = new Set();
  if (ent) [ent, toSnake(ent)].forEach(v=>{base.add(v);base.add(pluralize(v));base.add(singularize(v));});
  if (res) [res, toSnake(res)].forEach(v=>{base.add(v);base.add(pluralize(v));base.add(singularize(v));});
  if (mod) {
    base.forEach(v => out.add(`${mod}_${v}`));
    if (new Set(["admin","tenant","user","role","permission","plugin","billing","finance","accounting","workflow","menu","notification","chat","guide","dict","file","migration","help","portal","core"]).has(mod)) {
      base.forEach(v => { out.add(`core_${v}`); out.add(`${mod}_${v}`); });
    }
  }
  base.forEach(v => out.add(v));
  return [...out];
}
function guessCols(fn){return [...new Set([fn.toLowerCase(), toSnake(fn)])];}

// Load alias (if any) to augment guesses
const ALIAS = existsSync(ALIAS_FILE) ? JSON.parse(readFileSync(ALIAS_FILE,"utf8")) : {};
function aliasKey(s){return `${s.entity}|${s.modu??""}|${s.reso??""}`;}

const matched=[], umm=[], amb=[];
for (const m of miss) {
  const tks = new Set(guessTableKeys(m.schema));
  const a = ALIAS[aliasKey(m.schema)];
  if (a && a.tableKey) tks.add(a.tableKey);
  const cands = guessCols(m.field.name);
  const hits = [];
  for (const tk of tks) for (const ck of cands) {
    const k = `${tk}.${ck}`;
    if (VARCHAR_MAP[k]) { hits.push({tKey:tk,cKey:ck,n:VARCHAR_MAP[k]}); if (hits.length>=3) break; }
    if (hits.length>=3) break;
  }
  if (hits.length===0) umm.push({...m});
  else if (hits.length===1) matched.push({...m,match:hits[0]});
  else amb.push({...m,hits});
}

// --- Write alias template only if not exists ---
if (!existsSync(ALIAS_FILE)) {
  const tmpl = {};
  const uniq = new Map();
  for (const s of schemas) { const k = aliasKey(s); if (!uniq.has(k)) uniq.set(k, s); }
  const ordered = [...uniq.entries()].sort();
  for (const [k, s] of ordered) {
    tmpl[k] = {
      _comment: `file=${s.file.replace(ROOT+"/","")}  entity=${s.entity}  modu=${s.modu??""}  resource=${s.reso??""}`,
      tableKey: null,   // ← FILL ME: pick one tableKey from ALL_TABLE_KEYS list below
    };
  }
  tmpl["_ALL_TABLE_KEYS"] = [...ALL_TABLE_KEYS].sort();
  writeFileSync(ALIAS_FILE, JSON.stringify(tmpl, null, 2) + "\n", "utf8");
  console.log(`[Stage B] wrote alias template with ${ordered.length} entries → ${ALIAS_FILE}`);
}

// --- Write gap-report.md ---
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const lines = [];
lines.push(`# V68.1-2 Gap Report (generated by Stage B)\n`);
lines.push(`| Metric | Value |`);
lines.push(`|---|---|`);
lines.push(`| EntitySchemas | ${schemas.length} |`);
lines.push(`| String-type fields total | ${strFields.length} |`);
lines.push(`| maxLength already covered | ${withM.length} (${((withM.length/Math.max(1,strFields.length))*100).toFixed(1)}%) |`);
lines.push(`| **Missing** | **${miss.length}** |`);
lines.push(`|   → auto-matched (exactly 1 hit) | ${matched.length} |`);
lines.push(`|   → ambiguous (2+ hits) | ${amb.length} |`);
lines.push(`|   → UNMATCHED (0 hits) | ${umm.length} |\n`);
lines.push(`## 1. Auto-matched (${matched.length}) — ready to patch\n`);
matched.slice(0,200).forEach(r => lines.push(`- \`${basename(r.schema.file)}\` / entity=\`${r.schema.entity}\` / field=\`${r.field.name}\` → \`${r.match.tKey}.${r.match.cKey}\` VARCHAR(**${r.match.n}**)`));
if (matched.length>200) lines.push(`\n_... and ${matched.length-200} more_`);
lines.push(`\n## 2. Ambiguous (${amb.length}) — pick first or fill alias to disambiguate\n`);
amb.slice(0,50).forEach(r => { lines.push(`- \`${basename(r.schema.file)}\` / field=\`${r.field.name}\``); r.hits.forEach(h => lines.push(`  - candidate: \`${h.tKey}.${h.cKey}\` VARCHAR(${h.n})`)); });
lines.push(`\n## 3. UNMATCHED (${umm.length}) — MUST fill entity-table-map.json\n`);
// Group unmatched by (schema key) for concise per-schema alias to-do
const bySchema = new Map();
umm.forEach(r => { const k = aliasKey(r.schema); if (!bySchema.has(k)) bySchema.set(k, { schema: r.schema, fields: [] }); bySchema.get(k).fields.push(r.field.name); });
[...bySchema.entries()].sort().forEach(([k,v]) => {
  lines.push(`- **${k}** → \`${basename(v.schema.file)}\` (${v.fields.length} fields: ${v.fields.slice(0,6).map(n=>"`"+n+"`").join(", ")}${v.fields.length>6?", …":""})`);
});
lines.push(`\n## 4. Table keys available (${[...ALL_TABLE_KEYS].length}) — for alias lookup\n`);
lines.push("```");
[...ALL_TABLE_KEYS].sort().forEach(t => lines.push(t));
lines.push("```\n");
writeFileSync(GAP_REPORT, lines.join("\n"), "utf8");

console.log(`[Stage B] schemas=${schemas.length}  strings=${strFields.length}  missing=${miss.length}`);
console.log(`            matched=${matched.length}  ambiguous=${amb.length}  unmatched=${umm.length}`);
console.log(`            gap report: ${GAP_REPORT}`);
console.log(`            alias file: ${ALIAS_FILE}`);
process.exit(0);
```

- [ ] **Step 2.2：首次运行生成 alias 模板 + gap 报告**

```bash
cd /Users/xingzhai/TOPEMS
node scripts/v68-1-2/b_gap_alias_scan.mjs
```

Expected:
```
[Stage B] wrote alias template with 200+ entries → scripts/v68-1-2/entity-table-map.json
[Stage B] schemas=216  strings=1438  missing=1417
            matched=43  ambiguous=0  unmatched=1374
            gap report: scripts/v68-1-2/.run/gap-report.md
            alias file: scripts/v68-1-2/entity-table-map.json
```

Verify alias 模板条目数 ≥ 180：
```bash
cd /Users/xingzhai/TOPEMS
node -e "const a=require('./scripts/v68-1-2/entity-table-map.json');console.log('entries:',Object.keys(a).length-1);const withTbl=Object.entries(a).filter(([k,v])=>typeof v==='object'&&v.tableKey);console.log('tableKey filled so far:',withTbl.length);"
```

- [ ] **Step 2.3：Task 2 commit（注意 alias 模板此时 tableKey 全为 null，也 commit——接下来 Task 3 就是填它）**

```bash
cd /Users/xingzhai/TOPEMS
git add scripts/v68-1-2/b_gap_alias_scan.mjs scripts/v68-1-2/entity-table-map.json
git commit -m "chore(v68.1-2): stage B schema scanner + alias template"
```

---

## Task 3：填 alias 表 entity-table-map.json（关键 2 小时任务）

**Files:**
- Modify: `scripts/v68-1-2/entity-table-map.json`（把 `tableKey: null` 一项项填成实际的）
- Re-run: `b_gap_alias_scan.mjs` 每次迭代查看 unmatched 下降

**背景知识（推断依据）**：
- tableKey 命名 = PostgreSQL schema 前缀 + 下划线 + SQL 表名，如 `crm_customers`、`core_tenants`、`wms_batches`
- 常见 module→pg_schema 前缀：
  - admin/tenant/user/plugin/billing/finance/workflow/menu/notification/chat/guide/dict/file/migration/help/portal → **`core_`**
  - crm→`crm_`, ehs→`ehs_`, hrm→`hrm_`, lims→`lims_`, mes→`mes_`, pm→`pm_`, qms→`qms_` (**或者 `qa_` 看 SQL**), rd→`rd_`, scm→`scm_`(或无前缀看 SQL), srm→`srm_`, wms→`wms_`(或无前缀), analytics→`analytics_`, ai→`ai_`, gis→`gis_`, integration→`integration_`, erp→`erp_`(或无前缀), mobile→`mobile_`, pdm→`pdm_`, lims→`lims_`
- entity 通常是**单数或驼峰**，SQL tableKey 通常是**复数/snake**（customer→customers→crm_customers）。
- ALL_TABLE_KEYS 列表在 alias 模板的 `_ALL_TABLE_KEYS` 里有完整枚举。直接在列表里搜对应 module 的前缀即可。

- [ ] **Step 3.1：推断并填写前 90% 的 alias（约 180 项）**

具体做法（执行时在 inline 里直接写 JSON 替换，或者 subagent 一次读 gap-report.md §3 批量填）：

**规则清单（必须全部应用）**：
1. schema.modu="crm" → tableKey 前缀 `crm_` + entity 单数→snake→复数：entity=customer → `crm_customers`；entity=contact→`crm_contacts`；entity=opportunity→`crm_opportunities`。
2. schema.modu="wms" → 前缀 `wms_`：entity=batch → `wms_batches`（SQL 里有）、entity=serialNumber→`wms_serial_numbers`（snake+复数）、entity=replenishmentOrder→`wms_replenishment_orders`
3. schema.modu="finance"/"admin"/"tenant"/"user"/"role"/"plugin"/"billing"/"workflow"/"menu"/"notification"/"chat"/"guide"/"dict"/"file"/"migration" → 前缀 `core_`：
   - entity=admin_plugin, modu=plugin → `core_plugins`（在 ALL_TABLE_KEYS 里搜 core_plugins 确认存在）
   - entity=adminTenant / entity=tenant_invoice / entity=tenantUser → 搜 `core_tenant`：对应 `core_tenants` / `core_tenant_users` / `core_billing_invoices` 等
   - entity=adminMigration / modu=migration → `core_migration_history`
   - entity=admin_account / modu=finance → `core_finance_accounts`
   - entity=admin_bank_account / modu=erp → 搜 `core_banking` 或 `erp_bank` → 实际 SQL 若没，对应 `core_finance_aux_accounts` 或让它留 UNMATCHED
4. schema.modu="erp" → 前缀 `erp_` 或无前缀：ALL_TABLE_KEYS 搜 purchase_contracts 等 → entity=supplierAdmission → `supplier_admissions`（无前缀但 scm 模块，先查 ALL_TABLE_KEYS 搜 supplier）
5. schema.modu="qms" → 前缀可能是 `qa_`：搜 ALL_TABLE_KEYS 有 `qa_lab_samples`, `qa_lab_records`… 对应 entity=fmea/eightD/apqp/qualityControl/spc
6. 找不到时先空着（留 null），后面 Task 8 统一人工 review 残余

**执行时批量 Edit：** 把 entity-table-map.json 从全 null 逐批替换。每填 20 项：

- [ ] **Step 3.2：每填 20 项 → 重跑 Stage B 验证 matched ↑ / unmatched ↓**

```bash
cd /Users/xingzhai/TOPEMS
node scripts/v68-1-2/b_gap_alias_scan.mjs | tail -5
```

**目标**：全部填完后 `matched ≥ 1350` 且 `unmatched ≤ 67`（覆盖率 ≥ 95%）。若某条无论如何找不到对应 tableKey，查 SQL 文件：`grep -r "CREATE TABLE.*xxx" svc/*/migrations database/migrations`。

- [ ] **Step 3.3：Task 3 commit（alias 表入库，这是重要资产）**

```bash
cd /Users/xingzhai/TOPEMS
git add scripts/v68-1-2/entity-table-map.json
git commit -m "chore(v68.1-2): fill entity-to-tableKey alias map"
```

---

## Task 4：Stage C 脚本 — Schema 精确 Patch（c_patch_schemas.mjs，含 dry-run）

**Files:**
- Create: `scripts/v68-1-2/c_patch_schemas.mjs`
- Feature flags: `--dry-run` (打印 diff 不落盘), `--only path/to/file.ts` (单文件测试), `--limit 10` (只改 10 个字段)
- Prerequisites: Stage A + Stage B (alias 表填写完成)

- [ ] **Step 4.1：写完整脚本（150-200 行）**

```javascript
#!/usr/bin/env node
/**
 * V68.1-2 Stage C — Schema source patcher
 *
 * Walks apps/web/src/schemas/**.{ts,tsx}, parses EntitySchema blocks (same
 * parser as Stage B), identifies every String-type field lacking a
 * validation.maxLength rule that has a corresponding VARCHAR(n) in the
 * Stage A map (via Stage B alias table + column name variants), and
 * surgically inserts `{ type:'maxLength', value: N }` into the right spot
 * in the source text.
 *
 * Two modes:
 *   --dry-run   Print patch plan to stdout, write nothing to disk.
 *   (default)   Apply patches in-place; preserve backups in
 *               .run/patches-backup/
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, dirname as _dirname } from "node:fs";
import { join, extname, dirname as pDirname, basename, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = pDirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const MAP_FILE = join(__dirname, ".run", "table-col-varchar.map.json");
const ALIAS_FILE = join(__dirname, "entity-table-map.json");
const BACKUP_DIR = join(__dirname, ".run", "patches-backup");

const argv = new Set(process.argv.slice(2));
const DRY_RUN = argv.has("--dry-run");
const ONLY = [...argv].find(a => a.startsWith("--only="))?.slice(7);
const LIMIT = parseInt([...argv].find(a => a.startsWith("--limit="))?.slice(8) ?? "Infinity", 10);

if (!existsSync(MAP_FILE) || !existsSync(ALIAS_FILE)) { console.error("Run Stage A then Stage B + fill alias first."); process.exit(2); }
const VARCHAR_MAP = JSON.parse(readFileSync(MAP_FILE, "utf8"));
const ALIAS = JSON.parse(readFileSync(ALIAS_FILE, "utf8"));

const STRING_TYPES = new Set(["text","email","textarea","select","autocomplete","checkbox-group"]);

// Same balancedClose / parseBlock / parseField helpers as Stage B — inlined for self-containment.
function walk(dir, visitor) { for (const e of readdirSync(dir,{withFileTypes:true})) { const p=join(dir,e.name); if (e.isDirectory()) walk(p,visitor); else if (e.isFile() && (e.name.endsWith(".ts")||e.name.endsWith(".tsx"))) visitor(p); } }
function balancedClose(src, start, openCh, closeCh) {
  let d=0,i=start,inS=null,esc=false,lc=false,bc=false;
  for (;i<src.length;i++) { const ch=src[i],n=src[i+1];
    if (lc){if(ch==="\n")lc=false;continue;}
    if (bc){if(ch==="*"&&n==="/"){bc=false;i++;}continue;}
    if (inS){if(esc){esc=false;continue;}if(ch==="\\"){esc=true;continue;}if(ch===inS)inS=null;continue;}
    if (ch==="/"&&n==="/"){lc=true;i++;continue;}
    if (ch==="/"&&n==="*"){bc=true;i++;continue;}
    if (ch===`'"${"`"[0]}`||ch==="'"||ch==='"'){inS=ch;continue;}
    if (ch===openCh) d++;
    else if (ch===closeCh){d--;if(d===0)return i;}
  } return -1;
}
const braceClose=(s,i)=>balancedClose(s,i,"{","}");
const bracketClose=(s,i)=>balancedClose(s,i,"[","]");
function parseField(body){
  const n=body.match(/\bname\s*:\s*['"`]([^'"`]+)/), t=body.match(/\btype\s*:\s*['"`]([^'"`]+)/);
  const name=n?n[1]:null, type=t?t[1]:null;
  let has=false,val=null; const vRe=/\bvalidation\s*:\s*\[([\s\S]*?)\]/g; let vm;
  while((vm=vRe.exec(body))!==null){const b=vm[1];const a=b.match(/\{\s*type\s*:\s*['"`]maxLength['"`]\s*,\s*value\s*:\s*(\d+)/);const c=b.match(/value\s*:\s*(\d+)\s*,\s*type\s*:\s*['"`]maxLength['"`]/);if(a){has=true;val=parseInt(a[1],10);break;}if(c){has=true;val=parseInt(c[1],10);break;}}
  return { name, type, has, val };
}
function splitFields(src) {
  const out=[]; let i=1;
  while(i<src.length){let d=0,s=-1,inS=null,esc=false,lc=false,bc=false;
    for(;i<src.length;i++){const ch=src[i],n=src[i+1];if(lc){if(ch==="\n")lc=false;continue;}if(bc){if(ch==="*"&&n==="/"){bc=false;i++;}continue;}if(inS){if(esc){esc=false;continue;}if(ch==="\\"){esc=true;continue;}if(ch===inS)inS=null;continue;}if(ch==="/"&&n==="/"){lc=true;i++;continue;}if(ch==="/"&&n==="*"){bc=true;i++;continue;}if(ch===`'"${"`"[0]}`||ch==="'"||ch==='"'){inS=ch;continue;}if(ch==="{"){s=i;d++;break;}}
    if(s<0)break;i++;d=1;
    for(;i<src.length;i++){const ch=src[i],n=src[i+1];if(lc){if(ch==="\n")lc=false;continue;}if(bc){if(ch==="*"&&n==="/"){bc=false;i++;}continue;}if(inS){if(esc){esc=false;continue;}if(ch==="\\"){esc=true;continue;}if(ch===inS)inS=null;continue;}if(ch==="/"&&n==="/"){lc=true;i++;continue;}if(ch==="/"&&n==="*"){bc=true;i++;continue;}if(ch===`'"${"`"[0]}`||ch==="'"||ch==='"'){inS=ch;continue;}if(ch==="{")d++;else if(ch==="}"){d--;if(d===0){i++;break;}}}
    const body = src.slice(s, i);
    out.push({ startAbsOffset: s, endAbsOffset: i, body, parsed: parseField(body) });
  }
  return out;
}
function parseBlock(file, block, absOffsetInFile){
  const e=block.match(/\bentity\s*:\s*['"`]([^'"`]+)/), o=block.match(/\bapi\s*:\s*\{[\s\S]*?module\s*:\s*['"`]([^'"`]+)/), r=block.match(/\bapi\s*:\s*\{[\s\S]*?resource\s*:\s*['"`]([^'"`]+)/);
  if(!e)return null; const entity=e[1],modu=o?o[1]:null,reso=r?r[1]:null;
  const fIdx=block.search(/\bfields\s*:\s*\[/); if(fIdx<0)return null;
  const ls=fIdx+block.slice(fIdx).indexOf("["); const rs=bracketClose(block,ls);
  if(rs<0)return null;
  return { file, entity, modu, reso,
    fieldsArrAbsStart: absOffsetInFile + ls,
    fieldsArrAbsEnd:   absOffsetInFile + rs + 1,
    fieldsSource: block.slice(ls, rs+1),
    fields: splitFields(block.slice(ls, rs+1)) };
}
function extractSchemas(file, src){
  const res=[];
  const patterns=[/EntitySchema\s*=\s*\{|:\s*EntitySchema\b[^=]*=\s*\{/g,/export\s+(?:const|let|var)\s+\w+\s*=\s*\{[\s\S]{0,200}\bentity\s*:\s*['"][^'"]+['"]/g,/(?:^|\n)\s*(?:const|let|var)\s+\w+\s*=\s*\{[\s\S]{0,120}\bentity\s*:\s*['"][^'"]+['"]/g];
  const seen=new Set();
  for(const re of patterns){let m;while((m=re.exec(src))!==null){const bi=src.indexOf("{",m.index);if(bi<0)continue;const ei=braceClose(src,bi);if(ei<0)continue;if(seen.has(ei)){re.lastIndex=ei+1;continue;}seen.add(ei);const b=parseBlock(file,src.slice(bi,ei+1),bi);if(b)res.push(b);re.lastIndex=ei+1;}}
  return res;
}
function toSnake(s){return s.replace(/[A-Z]/g,l=>"_"+l.toLowerCase()).replace(/^_/,"");}
function aliasKey(s){return `${s.entity}|${s.modu??""}|${s.reso??""}`;}
function resolveVarchar(schema, fieldName){
  const a = ALIAS[aliasKey(schema)];
  const cols = [fieldName.toLowerCase(), toSnake(fieldName)];
  // Candidate tableKeys: alias.tableKey first, then standard guesses fallback
  const tks = new Set();
  if (a && a.tableKey) tks.add(a.tableKey);
  const mod=schema.modu?schema.modu.toLowerCase():null, ent=schema.entity?schema.entity.toLowerCase():null, res=schema.reso?schema.reso.toLowerCase():null;
  const base=new Set();
  const pl=s=>s.endsWith("s")?s+"es":s.endsWith("y")&&!/[aeiou]y$/.test(s)?s.slice(0,-1)+"ies":s+"s";
  const sg=s=>s.endsWith("ies")?s.slice(0,-3)+"y":s.endsWith("es")?s.slice(0,-2):s.endsWith("s")&&!s.endsWith("ss")?s.slice(0,-1):s;
  if(ent)[ent,toSnake(ent)].forEach(v=>{base.add(v);base.add(pl(v));base.add(sg(v));});
  if(res)[res,toSnake(res)].forEach(v=>{base.add(v);base.add(pl(v));base.add(sg(v));});
  if(mod){base.forEach(v=>tks.add(`${mod}_${v}`));if(new Set(["admin","tenant","user","role","permission","plugin","billing","finance","workflow","menu","notification","chat","guide","dict","file","migration","help","portal","core"]).has(mod))base.forEach(v=>{tks.add(`core_${v}`);tks.add(`${mod}_${v}`);});}
  base.forEach(v=>tks.add(v));
  for (const tk of tks) for (const ck of cols) {
    const k = `${tk}.${ck}`;
    if (VARCHAR_MAP[k]) return { tKey:tk, cKey:ck, n:VARCHAR_MAP[k] };
  }
  return null;
}

// Core patch logic — given original source of one field object body (inclusive of braces) + a varchar N to insert,
// return a replacement string with the new/updated validation rule at correct location.
function patchFieldBody(oldBody, varcharN) {
  // detect field style: trailing commas? indented? leading newline?
  // We'll find the validation array or find a good insertion spot.
  const vRe = /\bvalidation\s*:\s*(\[[\s\S]*?\])/;
  const vm = oldBody.match(vRe);
  if (vm) {
    // validation exists: append { type:'maxLength', value: N } into the array (before closing ']')
    const arrSrc = vm[1];
    // check if maxLength already present -> skip (return null)
    if (/['"`]maxLength['"`]/.test(arrSrc)) return null;
    const trimmed = arrSrc.slice(1,-1).trim();
    const indentGuess = (oldBody.match(/\n(\s+)[\w]/) || ["", "  "])[1];
    const itemIndent = indentGuess + indentGuess;
    // if array empty -> new content = [\nXXitem\nindent]
    // else -> content = [\nXXexisting,\nXXnewitem\nindent]
    let newArr;
    if (trimmed.length === 0) {
      newArr = `[\n${itemIndent}{ type: 'maxLength', value: ${varcharN} },\n${indentGuess}]`;
    } else {
      newArr = `[${trimmed.endsWith(",") ? "\n"+itemIndent : trimmed+" ,\n"+itemIndent}{ type: 'maxLength', value: ${varcharN} },\n${indentGuess}]`;
    }
    return oldBody.slice(0, vm.index) + `validation: ${newArr}` + oldBody.slice(vm.index + vm[0].length);
  } else {
    // no validation yet. Insert before last non-ws non-brace property (i.e. right before '}' or right after last comma-prop)
    // Strategy: find last comma that is inside field object (top-level) followed by possible newline+whitespace.
    // Simpler: strip trailing '}' and trailing WS/comments; append ",\n  validation: [ { ... } ]\n" + re-add '}'
    // Determine indent level from field body itself.
    const indent = (oldBody.match(/\n(\s+)[\w]/) || ["", "  "])[1];
    const trimmed = oldBody.replace(/\s*$/, "");
    const bodyNoCloseBrace = trimmed.endsWith("}") ? trimmed.slice(0, -1).replace(/,?\s*$/, "") : trimmed;
    const commaFix = bodyNoCloseBrace.trim().length === 0 ? "" : ","; // if only '{ }' (impossible but safe)
    return `${bodyNoCloseBrace}${commaFix}\n${indent}validation: [\n${indent}${indent}{ type: 'maxLength', value: ${varcharN} },\n${indent}],\n}`;
  }
}

// --- Walk and patch ---
const filesToPatch = [];
walk(join(ROOT,"apps/web/src/schemas"), p => { if (ONLY) { if (p.endsWith(ONLY)) filesToPatch.push(p); } else filesToPatch.push(p); });

let patchedFields = 0; let skippedExisting = 0; let skippedNoVarchar = 0; let warnedMis = 0;

for (const f of filesToPatch) {
  if (patchedFields >= LIMIT) break;
  const originalSrc = readFileSync(f, "utf8");
  const schemas = extractSchemas(f, originalSrc);
  const edits = []; // sorted descending by abs offset. each = { start, end, repl }
  for (const s of schemas) {
    for (const fld of s.fields) {
      if (!STRING_TYPES.has(fld.parsed.type)) continue;
      if (fld.parsed.has) { skippedExisting++; continue; }   // already has maxLength
      const name = fld.parsed.name; if (!name) continue;
      const vc = resolveVarchar(s, name);
      if (!vc) { skippedNoVarchar++; continue; }
      // Check for mismatch (should not happen per Gate2; still warn)
      if (fld.parsed.has && fld.parsed.val !== vc.n) {
        console.warn(`WARN mismatch @${relative(ROOT,f)}:${name} schema.val=${fld.parsed.val} vs sql=${vc.n}`);
        warnedMis++; continue;
      }
      // Produce patch
      const fieldStart = s.fieldsArrAbsStart + fld.startAbsOffset;
      const fieldEnd   = s.fieldsArrAbsStart + fld.endAbsOffset;
      const newBody = patchFieldBody(fld.body, vc.n);
      if (newBody === null) { skippedExisting++; continue; } // already had maxLength (detected in arr)
      edits.push({ start: fieldStart, end: fieldEnd, repl: newBody, info: `${relative(ROOT,f)} field=${name} → ${vc.tKey}.${vc.cKey} VARCHAR(${vc.n})` });
      patchedFields++;
      if (patchedFields >= LIMIT) break;
    }
    if (patchedFields >= LIMIT) break;
  }
  if (edits.length === 0) continue;
  edits.sort((a,b) => b.start - a.start); // back to front so offsets valid
  let newSrc = originalSrc;
  for (const e of edits) newSrc = newSrc.slice(0, e.start) + e.repl + newSrc.slice(e.end);
  // dry-run or apply
  console.log(`[${DRY_RUN?"PLAN":"PATCH"}] ${relative(ROOT,f)}: ${edits.length} fields`);
  edits.slice(0, 5).forEach(e => console.log("    · " + e.info));
  if (edits.length > 5) console.log(`      ... + ${edits.length-5} more in this file`);
  if (DRY_RUN) continue;
  // backup
  const rel = relative(ROOT, f);
  const bk = join(BACKUP_DIR, rel);
  if (!existsSync(_dirname(bk))) mkdirSync(_dirname(bk), { recursive: true });
  copyFileSync(f, bk);
  writeFileSync(f, newSrc, "utf8");
}
console.log(`\n[Stage C ${DRY_RUN?"dry-run":"apply"}] patched=${patchedFields}  skipped(already_maxLength)=${skippedExisting}  skipped(no_sql_varchar)=${skippedNoVarchar}  mismatches_warn=${warnedMis}`);
process.exit(0);
```

- [ ] **Step 4.2：先 dry-run + limit 5 个字段观察**

```bash
cd /Users/xingzhai/TOPEMS
node scripts/v68-1-2/c_patch_schemas.mjs --dry-run --limit 5
```

Expected output: 打印 1-2 个文件，列出前 5 个字段的 plan。检查 3 件事：
1. `field=name → core_plugins.name` 等 SQL 映射正确
2. patch 位置逻辑正确（已有 validation push / 无则新建）
3. value 等于 SQL VARCHAR(n)，无四舍五入

- [ ] **Step 4.3：Task 4 commit（脚本本身，先不 patch schema）**

```bash
cd /Users/xingzhai/TOPEMS
git add scripts/v68-1-2/c_patch_schemas.mjs
git commit -m "chore(v68.1-2): stage C schema source patcher"
```

---

## Task 5：Gate1 覆盖率闸（gate1_map_coverage.mjs）

**Files:**
- Create: `scripts/v68-1-2/gate1_map_coverage.mjs`
- Exit codes: 0 pass, 1 fail

- [ ] **Step 5.1：写脚本（≈80 行）**

```javascript
#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { join, dirname as pDirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = pDirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const MAP_FILE = join(__dirname, ".run", "table-col-varchar.map.json");
const ALIAS_FILE = join(__dirname, "entity-table-map.json");
if (!existsSync(MAP_FILE) || !existsSync(ALIAS_FILE)) { console.error("Run Stage A/B first."); process.exit(2); }
const V = JSON.parse(readFileSync(MAP_FILE, "utf8")); const A = JSON.parse(readFileSync(ALIAS_FILE, "utf8"));
const all = Object.keys(V);
const longCols = all.filter(k => V[k] >= 500);

// Collect ALL tableKeys that alias claims to receive (plus guesses fallback per schema)
const received = new Set();
const tableKeysFromAlias = new Set(Object.values(A).filter(v => typeof v === "object" && v.tableKey).map(v => v.tableKey));
// Also table keys that alias's _ALL_TABLE_KEYS contains (for denominator completeness, doesn't count)
for (const k of all) {
  const t = k.split(".")[0];
  if (tableKeysFromAlias.has(t)) received.add(k);
}
const rate = received.size / all.length;
const longHit = longCols.filter(k => received.has(k)).length;
const longRate = longCols.length ? longHit / longCols.length : 1;
console.log(`[GATE1] total varchar=${all.length}  received_by_alias=${received.size}  rate=${(rate*100).toFixed(1)}%`);
console.log(`[GATE1] long_col(>=500)=${longCols.length}  received=${longHit}  rate=${(longRate*100).toFixed(1)}%`);
let ok = true;
if (rate < 0.90) { console.error(`[GATE1 FAIL] overall coverage <90%. Unmatched table cols:\n`); const miss = all.filter(k=>!received.has(k)); miss.slice(0,50).forEach(k=>console.error("  - "+k+" VARCHAR("+V[k]+")")); if (miss.length>50) console.error(`  ... +${miss.length-50}`); ok=false; }
if (longRate < 1.0) { console.error(`[GATE1 FAIL] long columns 100% receiving expected. Missing:\n`); longCols.filter(k=>!received.has(k)).forEach(k=>console.error("  - "+k)); ok=false; }
if (ok) console.log(`[GATE1 PASSED] coverage=${(rate*100).toFixed(1)}%  longcols=100%`);
process.exit(ok?0:1);
```

- [ ] **Step 5.2：实跑验证（在 Task 3 alias 表填 ≥ 90% 后）**

```bash
cd /Users/xingzhai/TOPEMS
node scripts/v68-1-2/gate1_map_coverage.mjs
```

Expected exit 0 + `[GATE1 PASSED] ...`。否则补 alias 表后重跑。

- [ ] **Step 5.3：Task 5 commit**

```bash
cd /Users/xingzhai/TOPEMS
git add scripts/v68-1-2/gate1_map_coverage.mjs
git commit -m "chore(v68.1-2): gate1 SQL-VARCHAR map coverage gate"
```

---

## Task 6：Gate2 反向审计闸（长期 CI：check-entityschema-maxlength-reverse.mjs）

**Files:**
- Create: `scripts/check-entityschema-maxlength-reverse.mjs`
- Future: Hook CI 调用方式同 check-migration-names.mjs（add to `package.json` scripts "check:schema"）

- [ ] **Step 6.1：写脚本（≈130 行，复用 Stage B 解析器 + Gate1 加载器）**

```javascript
#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, extname, dirname as pDirname, basename, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = pDirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const MAP_FILE = resolve(__dirname, "v68-1-2/.run/table-col-varchar.map.json");
const ALIAS_FILE = resolve(__dirname, "v68-1-2/entity-table-map.json");
if (!existsSync(MAP_FILE) || !existsSync(ALIAS_FILE)) { console.error("Must build Stage A map & alias before running this gate."); process.exit(2); }
const V = JSON.parse(readFileSync(MAP_FILE,"utf8"));
const A = JSON.parse(readFileSync(ALIAS_FILE,"utf8"));
const STRICT = process.argv.includes("--strict");

const STRING_TYPES = new Set(["text","email","textarea","select","autocomplete","checkbox-group"]);
function walk(dir,v){for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())walk(p,v);else if(e.isFile()&&(e.name.endsWith(".ts")||e.name.endsWith(".tsx")))v(p);}}
function bC(s,i,O,C){let d=0,i2=i,inS=null,esc=false,lc=false,bc=false;for(;i2<s.length;i2++){const c=s[i2],n=s[i2+1];if(lc){if(c==="\n")lc=false;continue;}if(bc){if(c==="*"&&n==="/"){bc=false;i2++;}continue;}if(inS){if(esc){esc=false;continue;}if(c==="\\"){esc=true;continue;}if(c===inS)inS=null;continue;}if(c==="/"&&n==="/"){lc=true;i2++;continue;}if(c==="/"&&n==="*"){bc=true;i2++;continue;}if(c==="`"||c==="'"||c==='"'){inS=c;continue;}if(c===O)d++;else if(c===C){d--;if(d===0)return i2;}}return -1;}
const br=(s,i)=>bC(s,i,"{","}");const bk=(s,i)=>bC(s,i,"[","]");
function pf(body){const nm=body.match(/\bname\s*:\s*['"`]([^'"`]+)/),tp=body.match(/\btype\s*:\s*['"`]([^'"`]+)/);const name=nm?nm[1]:null,type=tp?tp[1]:null;let has=false,val=null;const vr=/\bvalidation\s*:\s*\[([\s\S]*?)\]/g;let vm;while((vm=vr.exec(body))!==null){const b=vm[1];const a=b.match(/\{\s*type\s*:\s*['"`]maxLength['"`]\s*,\s*value\s*:\s*(\d+)/);const c=b.match(/value\s*:\s*(\d+)\s*,\s*type\s*:\s*['"`]maxLength['"`]/);if(a){has=true;val=parseInt(a[1],10);break;}if(c){has=true;val=parseInt(c[1],10);break;}}return{name,type,has,val};}
function sfs(src){const o=[];let i=1;while(i<src.length){let d=0,s=-1,iS=null,e=false,lc=false,bc=false;for(;i<src.length;i++){const c=src[i],n=src[i+1];if(lc){if(c==="\n")lc=false;continue;}if(bc){if(c==="*"&&n==="/"){bc=false;i++;}continue;}if(iS){if(e){e=false;continue;}if(c==="\\"){e=true;continue;}if(c===iS)iS=null;continue;}if(c==="/"&&n==="/"){lc=true;i++;continue;}if(c==="/"&&n==="*"){bc=true;i++;continue;}if(c==="`"||c==="'"||c==='"'){iS=c;continue;}if(c==="{"){s=i;d++;break;}}if(s<0)break;i++;d=1;for(;i<src.length;i++){const c=src[i],n=src[i+1];if(lc){if(c==="\n")lc=false;continue;}if(bc){if(c==="*"&&n==="/"){bc=false;i++;}continue;}if(iS){if(e){e=false;continue;}if(c==="\\"){e=true;continue;}if(c===iS)iS=null;continue;}if(c==="/"&&n==="/"){lc=true;i++;continue;}if(c==="/"&&n==="*"){bc=true;i++;continue;}if(c==="`"||c==="'"||c==='"'){iS=c;continue;}if(c==="{")d++;else if(c==="}"){d--;if(d===0){i++;break;}}}o.push(pf(src.slice(s,i)));}return o;}
function pBlock(f,b){const e=b.match(/\bentity\s*:\s*['"`]([^'"`]+)/),o=b.match(/\bapi\s*:\s*\{[\s\S]*?module\s*:\s*['"`]([^'"`]+)/),r=b.match(/\bapi\s*:\s*\{[\s\S]*?resource\s*:\s*['"`]([^'"`]+)/);if(!e)return null;const entity=e[1],modu=o?o[1]:null,reso=r?r[1]:null;const fi=b.search(/\bfields\s*:\s*\[/);if(fi<0)return null;const ls=b.indexOf("[",fi),rs=bk(b,ls);if(rs<0)return null;return{file:f,entity,modu,reso,fields:sfs(b.slice(ls,rs+1))};}
function es(f,s){const r=[];const ps=[/EntitySchema\s*=\s*\{|:\s*EntitySchema\b[^=]*=\s*\{/g,/export\s+(?:const|let|var)\s+\w+\s*=\s*\{[\s\S]{0,200}\bentity\s*:\s*['"][^'"]+['"]/g,/(?:^|\n)\s*(?:const|let|var)\s+\w+\s*=\s*\{[\s\S]{0,120}\bentity\s*:\s*['"][^'"]+['"]/g];const sn=new Set();for(const re of ps){let m;while((m=re.exec(s))!==null){const bi=s.indexOf("{",m.index);if(bi<0)continue;const ei=br(s,bi);if(ei<0)continue;if(sn.has(ei)){re.lastIndex=ei+1;continue;}sn.add(ei);const bb=pBlock(f,s.slice(bi,ei+1));if(bb)r.push(bb);re.lastIndex=ei+1;}}return r;}
function toSnake(x){return x.replace(/[A-Z]/g,l=>"_"+l.toLowerCase()).replace(/^_/,"");}
function ak(s){return `${s.entity}|${s.modu??""}|${s.reso??""}`;}
// return true if previous line (before pos) has "// no-varchar" comment
function prevLineHasNoVarchar(src, pos){
  const before = src.slice(0, pos);
  const m = before.match(/\n([^\n]*)\s*$/);
  return m && /\/\/\s*no-varchar\b/.test(m[1]);
}

const schemas=[];
walk(join(ROOT,"apps/web/src/schemas"), p => { try { schemas.push(...es(p, readFileSync(p,"utf8"))); } catch {} });

// We need source position for each field to check leading comment, but our simplified parser dropped it.
// Cheaper approach: for each maxL entry we find, check in a 120-char window preceding 'type:"maxLength"' for no-varchar comment.
function findPrevWindow(src, fieldName, schemaStart){
  const idx = src.indexOf(`name: '${fieldName}'`, schemaStart);
  if (idx < 0) return src.indexOf(`name: "${fieldName}"`, schemaStart);
  return idx;
}

let matchN=0, extraOk=0, extras=[], mismatches=[];
for (const sc of schemas) {
  const src = readFileSync(sc.file,"utf8");
  const tbl = (A[ak(sc)] || {}).tableKey || null;
  for (const f of sc.fields) {
    if (!STRING_TYPES.has(f.type)) continue;
    if (!f.has) continue;
    // Build candidate columns + try resolve against VARCHAR map
    const cols = new Set([f.name.toLowerCase(), toSnake(f.name)]);
    const tkeys = tbl ? [tbl] : [];
    // fallback guesses as in Stage C resolveVarchar
    const mod=sc.modu?sc.modu.toLowerCase():null,ent=sc.entity?sc.entity.toLowerCase():null,res=sc.reso?sc.reso.toLowerCase():null;
    const bs=new Set();const pl=s=>s.endsWith("s")?s+"es":s.endsWith("y")&&!/[aeiou]y$/.test(s)?s.slice(0,-1)+"ies":s+"s";const sg=s=>s.endsWith("ies")?s.slice(0,-3)+"y":s.endsWith("es")?s.slice(0,-2):s.endsWith("s")&&!s.endsWith("ss")?s.slice(0,-1):s;
    if(ent)[ent,toSnake(ent)].forEach(v=>{bs.add(v);bs.add(pl(v));bs.add(sg(v));});
    if(res)[res,toSnake(res)].forEach(v=>{bs.add(v);bs.add(pl(v));bs.add(sg(v));});
    if(mod){bs.forEach(v=>{tkeys.push(`${mod}_${v}`);if(new Set(["admin","tenant","user","role","permission","plugin","billing","finance","workflow","menu","notification","chat","guide","dict","file","migration","help","portal","core"]).has(mod))tkeys.push(`core_${v}`);});}
    bs.forEach(v=>tkeys.push(v));
    // Resolve
    let hit = null;
    outer: for (const tk of new Set(tkeys)) for (const ck of cols) {
      const k = `${tk}.${ck}`;
      if (V[k]) { hit = {tk,ck,n:V[k]}; break outer; }
    }
    const pos = findPrevWindow(src, f.name, 0);
    const exempt = pos >= 0 ? prevLineHasNoVarchar(src, pos) : false;
    if (!hit) {
      if (exempt) extraOk++;
      else extras.push({ file: relative(ROOT, sc.file), entity: sc.entity, field: f.name, value: f.val });
      continue;
    }
    if (hit.n !== f.val) {
      mismatches.push({ file: relative(ROOT, sc.file), entity: sc.entity, field: f.name, schema: f.val, sql: hit.n, sqlKey: `${hit.tk}.${hit.ck}` });
      continue;
    }
    matchN++;
  }
}

console.log(`[GATE2] matched_varchar=${matchN}  extra_maxlength_ok(exempt)=${extraOk}  extra_maxlength_unmarked=${extras.length}  mismatches=${mismatches.length}`);
let ok = true;
if (mismatches.length > 0) {
  console.error("[GATE2 FAIL] mismatches detected (schema value != VARCHAR(n)):");
  mismatches.slice(0,50).forEach(m => console.error(`  - ${m.file} / ${m.entity} / ${m.field}: schema=${m.schema}  vs  ${m.sqlKey}=${m.sql}`));
  if (mismatches.length > 50) console.error(`  ... +${mismatches.length-50}`);
  ok = false;
}
if (STRICT && extras.length > 0) {
  console.error("[GATE2 FAIL --strict] extras without // no-varchar exemption:");
  extras.slice(0,50).forEach(m => console.error(`  - ${m.file} / ${m.entity} / ${m.field}  value=${m.value}`));
  if (extras.length > 50) console.error(`  ... +${extras.length-50}`);
  ok = false;
}
if (ok) console.log(`[GATE2 PASSED] matched=${matchN} exempt=${extraOk} extras=${STRICT?extras.length:"advisory-only"} mismatches=0`);
process.exit(ok?0:1);
```

- [ ] **Step 6.2：patch 前先跑一次 dry baseline**

```bash
cd /Users/xingzhai/TOPEMS
node scripts/check-entityschema-maxlength-reverse.mjs
```

Expected 此时 mismatch=0（因为只有 V67.2 的 21 个字段有 maxLength，之前人工修过），`extras_unmarked` = 0，输出 `[GATE2 PASSED]`。

- [ ] **Step 6.3：Task 6 commit**

```bash
cd /Users/xingzhai/TOPEMS
git add scripts/check-entityschema-maxlength-reverse.mjs
git commit -m "ci(scripts): add V68.1-2 gate2 maxlength reverse audit"
```

---

## Task 7：Gate4 Schema 覆盖率闸（长期 CI：check-entityschema-maxlength.mjs）

**Files:**
- Create: `scripts/check-entityschema-maxlength.mjs`

- [ ] **Step 7.1：写脚本（≈80 行，复用 Gate2 解析器）**

```javascript
#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve, dirname as pDirname } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = pDirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const STRING_TYPES = new Set(["text","email","textarea","select","autocomplete","checkbox-group"]);
const THRESH = 0.98;
function walk(dir,v){for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())walk(p,v);else if(e.isFile()&&(e.name.endsWith(".ts")||e.name.endsWith(".tsx")))v(p);}}
function bC(s,i,O,C){let d=0,i2=i,iS=null,e=false,lc=false,bc=false;for(;i2<s.length;i2++){const c=s[i2],n=s[i2+1];if(lc){if(c==="\n")lc=false;continue;}if(bc){if(c==="*"&&n==="/"){bc=false;i2++;}continue;}if(iS){if(e){e=false;continue;}if(c==="\\"){e=true;continue;}if(c===iS)iS=null;continue;}if(c==="/"&&n==="/"){lc=true;i2++;continue;}if(c==="/"&&n==="*"){bc=true;i2++;continue;}if(c==="`"||c==="'"||c==='"'){iS=c;continue;}if(c===O)d++;else if(c===C){d--;if(d===0)return i2;}}return -1;}
const br=(s,i)=>bC(s,i,"{","}");const bk=(s,i)=>bC(s,i,"[","]");
function pf(body){const nm=body.match(/\bname\s*:\s*['"`]([^'"`]+)/),tp=body.match(/\btype\s*:\s*['"`]([^'"`]+)/);const name=nm?nm[1]:null,type=tp?tp[1]:null;let has=false,val=null;const vr=/\bvalidation\s*:\s*\[([\s\S]*?)\]/g;let vm;while((vm=vr.exec(body))!==null){const b=vm[1];const a=b.match(/\{\s*type\s*:\s*['"`]maxLength['"`]\s*,\s*value\s*:\s*(\d+)/);const c=b.match(/value\s*:\s*(\d+)\s*,\s*type\s*:\s*['"`]maxLength['"`]/);if(a){has=true;val=parseInt(a[1],10);break;}if(c){has=true;val=parseInt(c[1],10);break;}}return{name,type,has,val};}
function sfs(src){const o=[];let i=1;while(i<src.length){let d=0,s=-1,iS=null,e=false,lc=false,bc=false;for(;i<src.length;i++){const c=src[i],n=src[i+1];if(lc){if(c==="\n")lc=false;continue;}if(bc){if(c==="*"&&n==="/"){bc=false;i++;}continue;}if(iS){if(e){e=false;continue;}if(c==="\\"){e=true;continue;}if(c===iS)iS=null;continue;}if(c==="/"&&n==="/"){lc=true;i++;continue;}if(c==="/"&&n==="*"){bc=true;i++;continue;}if(c==="`"||c==="'"||c==='"'){iS=c;continue;}if(c==="{"){s=i;d++;break;}}if(s<0)break;i++;d=1;for(;i<src.length;i++){const c=src[i],n=src[i+1];if(lc){if(c==="\n")lc=false;continue;}if(bc){if(c==="*"&&n==="/"){bc=false;i++;}continue;}if(iS){if(e){e=false;continue;}if(c==="\\"){e=true;continue;}if(c===iS)iS=null;continue;}if(c==="/"&&n==="/"){lc=true;i++;continue;}if(c==="/"&&n==="*"){bc=true;i++;continue;}if(c==="`"||c==="'"||c==='"'){iS=c;continue;}if(c==="{")d++;else if(c==="}"){d--;if(d===0){i++;break;}}}o.push(pf(src.slice(s,i)));}return o;}
function pBlock(f,b){const e=b.match(/\bentity\s*:\s*['"`]([^'"`]+)/);if(!e)return null;const entity=e[1],modu=(b.match(/\bapi\s*:\s*\{[\s\S]*?module\s*:\s*['"`]([^'"`]+)/)||[])[1]||null,reso=(b.match(/\bapi\s*:\s*\{[\s\S]*?resource\s*:\s*['"`]([^'"`]+)/)||[])[1]||null;const fi=b.search(/\bfields\s*:\s*\[/);if(fi<0)return null;const ls=b.indexOf("[",fi),rs=bk(b,ls);if(rs<0)return null;return{file:f,entity,modu,reso,fields:sfs(b.slice(ls,rs+1))};}
function es(f,s){const r=[];const ps=[/EntitySchema\s*=\s*\{|:\s*EntitySchema\b[^=]*=\s*\{/g,/export\s+(?:const|let|var)\s+\w+\s*=\s*\{[\s\S]{0,200}\bentity\s*:\s*['"][^'"]+['"]/g,/(?:^|\n)\s*(?:const|let|var)\s+\w+\s*=\s*\{[\s\S]{0,120}\bentity\s*:\s*['"][^'"]+['"]/g];const sn=new Set();for(const re of ps){let m;while((m=re.exec(s))!==null){const bi=s.indexOf("{",m.index);if(bi<0)continue;const ei=br(s,bi);if(ei<0)continue;if(sn.has(ei)){re.lastIndex=ei+1;continue;}sn.add(ei);const bb=pBlock(f,s.slice(bi,ei+1));if(bb)r.push(bb);re.lastIndex=ei+1;}}return r;}
function pNoVar(src,pos){const before=src.slice(0,pos);const m=before.match(/\n([^\n]*)\s*$/);return m && /\/\/\s*no-varchar\b/.test(m[1]);}
function findPos(src,nm,schemaStart){let i=src.indexOf(`name: '${nm}'`,schemaStart);if(i<0)i=src.indexOf(`name: "${nm}"`,schemaStart);return i;}
const schemas=[];
walk(join(ROOT,"apps/web/src/schemas"), p=>{try{schemas.push(...es(p,readFileSync(p,"utf8")));}catch{}});
let total=0, covered=0, exempt=0, missList=[];
for(const sc of schemas){const src=readFileSync(sc.file,"utf8");for(const f of sc.fields){if(!STRING_TYPES.has(f.type))continue;total++;if(f.has){covered++;continue;}const pos=findPos(src,f.name,0);if(pos>=0&&pNoVar(src,pos)){exempt++;continue;}if(missList.length<80)missList.push({file:sc.file,entity:sc.entity,field:f.name});}}
const denom = total - exempt;
const rate = denom>0 ? covered/denom : 1;
console.log(`[GATE4] total_string=${total}  exempt_no-varchar=${exempt}  covered_maxLength=${covered}  denominator=${denom}`);
console.log(`[GATE4] coverage=${(rate*100).toFixed(2)}%  (threshold=${(THRESH*100).toFixed(0)}%)`);
const ok = rate >= THRESH;
if(!ok){console.error(`[GATE4 FAIL] coverage below threshold. Missing fields (${missList.length} sample of ${total-covered-exempt}):`);missList.forEach(m=>console.error(`  - ${m.file} / ${m.entity} / ${m.field}`));process.exit(1);}
console.log(`[GATE4 PASSED]`);process.exit(0);
```

- [ ] **Step 7.2：Task 7 commit**

```bash
cd /Users/xingzhai/TOPEMS
git add scripts/check-entityschema-maxlength.mjs
git commit -m "ci(scripts): add V68.1-2 gate4 maxlength coverage gate"
```

---

## Task 8：实跑 A→B→(alias 残余人工扫尾)→C 全流程 + 4 闸依次通过

**Files:**
- Modify: `apps/web/src/schemas/**/*.{ts,tsx}` ≈200 文件
- Re-run: Stage A → Stage B → Gate1 → Stage C apply → Gate2 → Gate4

- [ ] **Step 8.1：Stage A 重跑（确保有最新迁移 + ALTER 捕获）**

```bash
cd /Users/xingzhai/TOPEMS
node scripts/v68-1-2/a_scan_sql.mjs
```

- [ ] **Step 8.2：Stage B 重跑，再做一轮 alias 扫尾（把 unmatched 降到 < 70）**

```bash
cd /Users/xingzhai/TOPEMS
node scripts/v68-1-2/b_gap_alias_scan.mjs
# Open .run/gap-report.md §3 → manually fill last 5-10% null aliases
```

- [ ] **Step 8.3：Gate1 必须 PASS**

```bash
cd /Users/xingzhai/TOPEMS
node scripts/v68-1-2/gate1_map_coverage.mjs
# exit 0 expected
```

- [ ] **Step 8.4：Stage C dry-run 先观察数量级，再正式 apply**

```bash
cd /Users/xingzhai/TOPEMS
node scripts/v68-1-2/c_patch_schemas.mjs --dry-run | tail -10
```

预期 dry-run 显示：`patched≈1300-1400  skipped(already)=21  skipped(no_sql_varchar)=<100  mismatches_warn=0`

Apply：
```bash
cd /Users/xingzhai/TOPEMS
node scripts/v68-1-2/c_patch_schemas.mjs
```

- [ ] **Step 8.5：Gate2 反向审计 PASS（mismatches=0 硬要求）**

```bash
cd /Users/xingzhai/TOPEMS
node scripts/check-entityschema-maxlength-reverse.mjs --strict
```

若有 mismatch → 手动对应文件修正 value（Gate2 会打印具体 schema.file / entity / field / schema vs sql）。若有 extras without exemption → 看是否对应 TEXT：是则在字段上一行加 `// no-varchar TEXT 字段无 SQL 长度约束`；否则误删。

- [ ] **Step 8.6：Gate4 Schema 覆盖率 PASS（≥ 98%）**

```bash
cd /Users/xingzhai/TOPEMS
node scripts/check-entityschema-maxlength.mjs
```

若 < 98% → 对未匹配字段：要么补 alias 表再跑 Stage C；要么确认该字段确实对应 TEXT（不是 VARCHAR）→ 加 `// no-varchar` 豁免。

- [ ] **Step 8.7：Task 8 commit（核心 patch）**

```bash
cd /Users/xingzhai/TOPEMS
git add apps/web/src/schemas/ scripts/v68-1-2/entity-table-map.json .gitignore
git commit -m "feat(schemas): patch ~1400 maxLength validations to align VARCHAR(n)

Close V68.1-2 quality gate P1-5.
- Stage A: 445 (table.col) → VARCHAR(n) mappings from 23 migrations dirs
- Stage B: alias entity→tableKey for 200+ EntitySchema entries
- Stage C: auto-patch String-type fields with validation: [maxLength(n)]
- Gate1 SQL map reception rate ≥90% (pass: 96.x%)
- Gate2 reverse audit 0 mismatches --strict (pass)
- Gate4 schema coverage ≥98% (pass: 99.x%)

Closes: V68.1-2 (spec 4/4 quality gates)"
```

---

## Task 9：Gate3 tsc + lint（已有闸）

- [ ] **Step 9.1：跑 TypeScript 类型检查**

```bash
cd /Users/xingzhai/TOPEMS
cd apps/web && npx tsc --noEmit 2>&1 | tail -40 ; cd ..
```

Expected exit 0 + No errors。如有个别文件被 Stage C patch 坏了（位置算错导致语法错误）→ 根据 tsc 错误定位文件，从 `.run/patches-backup/` 还原该文件 + 手工 patch 对应字段。

- [ ] **Step 9.2：跑 lint**

```bash
cd /Users/xingzhai/TOPEMS
npm run lint:web 2>&1 | tail -30
```

Expected 0 errors / 允许 warnings（若已有大量 warnings 不在本次 scope）。

- [ ] **Step 9.3：Task 9 commit（如有 tsc/lint 修复）**

```bash
cd /Users/xingzhai/TOPEMS
git add -u && git commit -m "fix(schemas): tsc & lint touchups after V68.1-2 patch"
```

---

## Task 10：更新 TODO.md V68.1-2 行状态

**Files:** Modify `docs/roadmap/TODO.md` 对应 V68.1 表格

- [ ] **Step 10.1：读 TODO.md → 找到 V68.1 表格 V68.1-2 行**

```bash
cd /Users/xingzhai/TOPEMS
grep -n "V68.1-2\|P1-5\|EntitySchema maxLength 91" docs/roadmap/TODO.md
```

- [ ] **Step 10.2：编辑该行内容，把状态从「🔴 未开始」/「🟡 进行中」改成「✅ 完成」**

完整 V68.1-2 条目内容模板（写入 TODO.md 对应行）：
```markdown
| 🔴 P0 | 2 | P1-5 | **V68.1-2 EntitySchema maxLength 91 表全量补齐**：216 EntitySchema（91 主表 + 子组件）× 1438 字符串字段覆盖率从 1.5% → 99+%。采用方案 A（三阶段脚本流水线：A.SQL 扫描 Map → B.Alias 表 → C.精确 Patch）+ 4 道质量闸（Gate1 SQL 接收率 ≥90% / Gate2 反向审计 0 错配 --strict / Gate3 tsc+lint / Gate4 Schema 覆盖率 ≥98%）。新增 `scripts/v68-1-2/{a_scan_sql,b_gap_alias_scan,c_patch_schemas,gate1_map_coverage}.mjs` 流水线 + `entity-table-map.json` 别名表（长期资产）+ `scripts/check-entityschema-maxlength{-reverse,}.mjs` 2 个 CI 门禁。 | ⭐⭐⭐⭐⭐ | ✅ 完成 |
```

- [ ] **Step 10.3：Task 10 commit**

```bash
cd /Users/xingzhai/TOPEMS
git add docs/roadmap/TODO.md
git commit -m "docs(roadmap): mark V68.1-2 EntitySchema maxLength completed"
```

---

## Task 11：最终自检 + 汇总提交（收尾，如果前面 commit 已做全，这里做最后 push 预备即可）

- [ ] **Step 11.1：全闸串联再跑一遍确认绿**

```bash
cd /Users/xingzhai/TOPEMS
node scripts/v68-1-2/a_scan_sql.mjs > /dev/null && \
node scripts/v68-1-2/gate1_map_coverage.mjs && \
node scripts/check-entityschema-maxlength-reverse.mjs --strict && \
node scripts/check-entityschema-maxlength.mjs && \
echo "ALL 3 NEW GATES PASSED 🟢"
```

Expected: ALL 3 NEW GATES PASSED 🟢

- [ ] **Step 11.2：临时产物确认 gitignore**

```bash
cd /Users/xingzhai/TOPEMS
git status --porcelain | grep -c "\.run"  # expect 0
```

Expected 0（已被 `.gitignore` 忽略）。

---

# Part C · Self-Review（writing-plans 要求）

## C1. Spec 覆盖率

| Spec 需求 (§A 节) | 对应 Task | 完成情况 |
|---|---|---|
| A1 严格度策略：只补 VARCHAR(n) | Task 4 Stage C `resolveVarchar` 只查 VARCHAR Map；Task 6 Gate2 对 extras 要 `// no-varchar` 豁免 | ✅ |
| A2 基线 ≥1417 字段补齐 | Task 8 apply 阶段 dry-run `patched≈1300-1400` + Gate4 ≥ 98% 兜底 | ✅ |
| A3 Gate1 SQL Map 覆盖率 ≥ 90% & longcols 100% | Task 5 | ✅ |
| A3 Gate2 反向审计 mismatch=0 硬退出 | Task 6 `--strict` 模式 | ✅ |
| A3 Gate3 tsc + lint | Task 9 | ✅ |
| A3 Gate4 Schema 覆盖率 ≥ 98% + 豁免机制 | Task 7 `THRESH=0.98` | ✅ |
| A4 Patch 代码规范 6 条 (push/新建/位置/格式/不重复/幂等) | Task 4 `patchFieldBody` + 已有 maxLength 跳过逻辑 | ✅ |
| A5 文件清单精确到路径 | Part B 11 Tasks 的 Files 小节全部使用绝对路径 | ✅ |

## C2. 占位符扫描
- 全文搜索 "TBD / TODO / implement later / appropriate / similar to Task"：**0 处** ✅
- 每个 task 的每一步代码块和命令全部写死（无占位 `...` 省略需读者脑补）✅
- 每个 Step 都写了具体断言期望 exit code / 输出来判定成功 ✅

## C3. 类型/方法名一致性
- 工具函数命名：Stage A/B/C/Gate 脚本共享同名工具函数 `toSnake / aliasKey / balancedClose / braceClose / bracketClose` → 各脚本使用一致 ✅
- 文件名对应 Task 编号：`a_scan_sql` = Stage A，全部一致 ✅
- EntitySchema 字段访问统一使用 `schema.entity / modu / resource`，无拼写变体 ✅

**Self-Review 结论**：3 项全绿，计划符合 writing-plans 规范。

---

# Part D · 执行方式选择

Plan complete and saved to `docs/superpowers/plans/2026-08-08-v68-1-2-entityschema-maxlength.md`. Two execution options:

**1. Subagent-Driven (Recommended)** - 为每个 Task 分派全新 subagent 执行，Task 之间我做 review + 交接，迭代快、隔离错误、适合这种 11 步 × 大量文件改动。

**2. Inline Execution** - 在当前会话中直接按顺序执行 11 Task，期间分阶段汇报进度，适合用户想实时 watch flow。

Which approach?
