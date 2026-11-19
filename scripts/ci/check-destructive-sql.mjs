#!/usr/bin/env node
/**
 * scripts/ci/check-destructive-sql.mjs
 *
 * 迁移文件「破坏性语句守卫」校验（prod 误跑防线之二）。
 *
 * 目标语句（按语句切分后逐条判定）：
 *   - DELETE FROM                                             （D1：误删活跃行）
 *   - UPDATE ... SET                                          （D2：批量误更新/误软删）
 *   - TRUNCATE                                                （D3：一律阻断，无豁免）
 *   - ALTER TABLE ... ALTER [COLUMN] c TYPE / SET DATA TYPE   （无守卫的类型收敛）
 *   - DROP TABLE ... CASCADE                                  （级联删表，一律阻断）
 *   - ALTER TABLE ... DROP [COLUMN] c                         （删列，需标记）
 *   - ALTER TABLE ... DROP CONSTRAINT                         （删约束）
 *   - DROP TABLE（需标记，禁止 CASCADE）
 *
 * 判定口径：
 *   - DDL 守卫窗口：语句本身或「同一文件内、前 GUARD_WINDOW_LINES 行」出现
 *     to_regclass / relkind / pg_class / information_schema / IF EXISTS / DO$$ EXISTS；
 *   - D1/D2：必须有 WHERE（且非 WHERE TRUE / 1=1 / OR TRUE），并在语句前
 *     MARKER_WINDOW_LINES 行内提供完整豁免标记（max-rows + backup）；
 *   - D3：TRUNCATE 不接受任何迁移内豁免；
 *   - D4/D5：DDL 守卫仍需 IF EXISTS/存在性判断，另需完整豁免标记（rows-at-review=0 + backup），
 *     并显式 schema.table；CASCADE 一律阻断。
 *
 * 豁免标记（紧邻语句之前、连续不超过 MARKER_WINDOW_LINES 行、无空行）：
 *   -- destructive-gate: allow
 *   -- destructive-kind: DELETE|UPDATE|DROP TABLE|DROP COLUMN
 *   -- destructive-reason: ...（≥10 字）
 *   -- destructive-owner: ...
 *   -- destructive-ticket: ...
 *   -- destructive-expires: YYYY-MM-DD（不早于当天，不超过今天+180 天）
 *   -- destructive-max-rows: N（DELETE/UPDATE 必填，N=0 表示 fail-closed：出现 1 行即拒绝）
 *   -- destructive-rows-at-review: 0（DROP 必填）
 *   -- destructive-backup: ...（DELETE/UPDATE/DROP 必填）
 *
 * 最小合法示例（标记必须紧邻语句之前 12 行内；同一文件的同类语句各写一组）：
 *   -- destructive-gate: allow
 *   -- destructive-kind: DELETE
 *   -- destructive-reason: 生产实测 0 行的遗留码清理（≥10 字）
 *   -- destructive-owner: iam
 *   -- destructive-ticket: IAM-PERM-20261119
 *   -- destructive-expires: 2027-05-10
 *   -- destructive-max-rows: 0
 *   -- destructive-backup: 窗口前 pg_dump -t public.core_permissions
 *   DELETE FROM public.core_permissions WHERE code IN ('legacy_code');
 *   -- 说明：max-rows=0 不会放行任何非空删除；预演统计到 >0 即拒绝执行。
 *
 * 两档策略（避免既存违规把 main 变红）：
 *   - 文件 sha256 与 `destructive-sql-baseline.json` 一致，且版本在台账中可豁免
 *     （非 pending/to_apply，且已应用或已登记处置）→ 既存违规，仅报告；
 *   - 文件不在 baseline 或 sha256 变化（本次新增/修改）→ 阻断。
 *   - `--strict`：忽略基线，任何命中一律阻断（prod 运行时必须使用）。
 *
 * 运行时开关（prod 专用）：
 *   `--check-file <path> --strict`：文件含完整豁免标记时仍返回非 0，提示必须传 --allow-destructive；
 *   `--check-file <path> --strict --approve-ticket=<ticket>[,<ticket>...] --plan-file=<json>`：
 *     --approve-ticket 支持逗号列表；文件内每个标记的 destructive-ticket 都必须被显式列出，
 *     任何未列出的票据仍然 DENY（不降低审批数量、不引入默认放行）。一致时输出待执行计划（含 max-rows / SQL）。
 *     计划中 `temp=true` 仅表示预演可跳过行数统计（pg_temp.* 或本文件 CREATE TEMP TABLE 建出的对象）；
 *     静态命中、标记与票据校验不因 temp 放宽。
 *   TRUNCATE 无任何运行时开关。
 *
 * 用法：
 *   node scripts/ci/check-destructive-sql.mjs                 # 门禁（增量阻断）
 *   node scripts/ci/check-destructive-sql.mjs --report        # 全量报告，不阻断
 *   node scripts/ci/check-destructive-sql.mjs --strict        # 忽略基线，全量阻断
 *   node scripts/ci/check-destructive-sql.mjs --dir <path>    # 指定扫描目录（可重复；默认 database/migrations）
 *   node scripts/ci/check-destructive-sql.mjs --write-baseline # 重写基线（人工确认后）
 *   node scripts/ci/check-destructive-sql.mjs --check-file <path> # 单文件判定，有违规 exit 1
 *   node scripts/ci/check-destructive-sql.mjs --json          # 机器可读输出
 */

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, basename } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = process.cwd();
const MIG_DIR = join(ROOT, 'database', 'migrations');
const BASELINE_FILE = join(ROOT, 'scripts', 'ci', 'destructive-sql-baseline.json');
const MANIFEST_FILE = join(ROOT, 'database', 'migration_manifest.yaml');
const GUARD_WINDOW_LINES = 60; // 守卫回看行距阈值（同文件内）
const MARKER_WINDOW_LINES = 12; // 豁免标记必须紧邻语句之前
const SAMPLE_LIMIT = 20;       // 默认输出样例条数上限

const args = process.argv.slice(2);
const REPORT_MODE = args.includes('--report');
const WRITE_BASELINE = args.includes('--write-baseline');
const JSON_MODE = args.includes('--json');
const STRICT_MODE = args.includes('--strict');
const checkFileIdx = args.indexOf('--check-file');
const CHECK_FILE = checkFileIdx >= 0 ? args[checkFileIdx + 1] : null;
const DIRS = args.reduce((acc, a, i) => (a === '--dir' && args[i + 1] ? acc.concat(args[i + 1]) : acc), []);
const approveArg = args.find((a) => a.startsWith('--approve-ticket='));
const APPROVE_TICKET_RAW = approveArg ? approveArg.slice('--approve-ticket='.length) : null;
// 逗号列表：文件内每条标记的 ticket 必须被显式列出；未列出的票据仍然 DENY。
const APPROVE_TICKETS = APPROVE_TICKET_RAW
  ? APPROVE_TICKET_RAW.split(',').map((t) => t.trim()).filter(Boolean)
  : [];
const planArg = args.find((a) => a.startsWith('--plan-file='));
const PLAN_FILE = planArg ? planArg.slice('--plan-file='.length) : null;

// --- 语句切分：忽略注释 / 单引号字符串（保留 $$ 块内代码） ---------------------
function splitStatements(raw) {
  const stmts = [];
  let buf = '';       // 原文（用于片段展示）
  let code = '';      // 去注释 / 去字符串内容（用于判定，等长换行）
  let line = 1;
  let startLine = 1;
  let i = 0;
  let inLineComment = false;
  let blockDepth = 0;
  let inSQuote = false;
  let inDQuote = false;
  let dollarTag = null;

  const push = () => {
    const text = buf.trim();
    if (text) stmts.push({ text, code, startLine, endLine: line });
    buf = '';
    code = '';
    startLine = line;
  };

  while (i < raw.length) {
    const ch = raw[i];
    const next = raw[i + 1];

    if (ch === '\n') {
      line++;
      buf += ch;
      code += ch; // 换行必须保留，保证 code 行号与原文对齐（注释/字符串内容已置换为空格）
      inLineComment = false;
      i++;
      continue;
    }

    if (inLineComment) {
      buf += ch;
      code += ' ';
      i++;
      continue;
    }
    if (blockDepth > 0) {
      buf += ch;
      code += ' ';
      if (ch === '/' && next === '*') { blockDepth++; buf += next; code += ' '; i += 2; continue; }
      if (ch === '*' && next === '/') { blockDepth--; buf += next; code += ' '; i += 2; continue; }
      i++;
      continue;
    }
    if (dollarTag) {
      buf += ch;
      code += ch;
      if (ch === '$' && raw.startsWith(dollarTag, i)) {
        const tag = dollarTag;
        dollarTag = null;
        // 把开启标签剩余字符补齐（首个 $ 已写入）
        for (let k = 1; k < tag.length; k++) { buf += raw[i + k]; code += raw[i + k]; }
        i += tag.length;
        continue;
      }
      i++;
      continue;
    }
    if (inSQuote) {
      buf += ch;
      code += ch === '\n' ? '\n' : ' ';
      if (ch === "'" && next === "'") { buf += next; code += ' '; i += 2; continue; }
      if (ch === "'") inSQuote = false;
      i++;
      continue;
    }
    if (inDQuote) {
      buf += ch;
      code += ch;
      if (ch === '"' && next === '"') { buf += next; code += '"'; i += 2; continue; }
      if (ch === '"') inDQuote = false;
      i++;
      continue;
    }

    // 非引用/注释状态
    if (ch === '-' && next === '-') { inLineComment = true; buf += '--'; code += '  '; i += 2; continue; }
    if (ch === '/' && next === '*') { blockDepth = 1; buf += '/*'; code += '  '; i += 2; continue; }
    if (ch === "'") { inSQuote = true; buf += ch; code += ch; i++; continue; }
    if (ch === '"') { inDQuote = true; buf += ch; code += ch; i++; continue; }
    if (ch === '$') {
      const m = raw.slice(i).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (m) { dollarTag = m[0]; buf += m[0]; code += m[0]; i += m[0].length; continue; }
    }
    if (ch === ';') { buf += ch; code += ch; push(); i++; continue; }

    buf += ch;
    code += ch;
    i++;
  }
  push();
  return stmts;
}

// --- 高危语句检测 -------------------------------------------------------------
const DETECTORS = [
  {
    kind: 'delete_from',
    re: /^\s*DELETE\s+FROM\b/i,
    hint: 'DELETE 必须有固定行条件 WHERE，并在语句前紧邻位置提供完整豁免标记（max-rows + backup）',
  },
  {
    kind: 'update_set',
    re: /^\s*UPDATE\s+[\w".]+\s+SET\b/i,
    hint: 'UPDATE 必须有固定行条件 WHERE，并在语句前紧邻位置提供完整豁免标记（max-rows + backup）',
  },
  {
    kind: 'truncate',
    re: /^\s*TRUNCATE\s+(?:TABLE\s+)?/i,
    hint: 'TRUNCATE 一律阻断：改用 DELETE+WHERE（带标记）或新表切换',
  },
  {
    kind: 'alter_column_type',
    re: /\bALTER\s+TABLE\b[\s\S]*?\bALTER\s+(?:COLUMN\s+)?[\w".]+\s+(?:SET\s+DATA\s+TYPE|TYPE)\b/i,
    hint: '改为幂等前向迁移：先 to_regclass 判表/列存在（或 DO $$ ... IF EXISTS），否则拆到基线之后的新迁移',
  },
  {
    kind: 'drop_table_cascade',
    re: /\bDROP\s+TABLE\b[\s\S]*?\bCASCADE\b/i,
    hint: '去掉 CASCADE，改 DROP TABLE IF EXISTS + 显式依赖清理；prod 侧禁止级联删除',
  },
  {
    kind: 'drop_constraint',
    re: /\bALTER\s+TABLE\b[\s\S]*?\bDROP\s+CONSTRAINT\b/i,
    hint: '加 IF EXISTS（DROP CONSTRAINT IF EXISTS）或 pg_constraint 存在性守卫',
  },
  {
    kind: 'drop_column',
    re: /\bALTER\s+TABLE\b[\s\S]*?\bDROP\s+COLUMN\b/i,
    hint: '加 IF EXISTS（ALTER TABLE ... DROP COLUMN IF EXISTS）或 DO $$ 存在性守卫',
  },
  {
    kind: 'drop_table',
    re: /\bDROP\s+TABLE\b/i,
    hint: '加 IF EXISTS + 显式 schema + rows-at-review=0 + backup 标记；禁止 CASCADE',
  },
];

const GUARD_RES = [
  [/to_regclass\s*\(/i, 'to_regclass'],
  [/\brelkind\b/i, 'relkind'],
  [/\bpg_class\b/i, 'pg_class'],
  [/\bpg_constraint\b/i, 'pg_constraint'],
  [/\bpg_attribute\b/i, 'pg_attribute'],
  [/\binformation_schema\b/i, 'information_schema'],
  [/\bIF\s+EXISTS\b/i, 'IF EXISTS'],
  [/pg_catalog/i, 'pg_catalog'],
];

function guardInfo(windowCode) {
  for (const [re, label] of GUARD_RES) if (re.test(windowCode)) return label;
  if (/\bDO\s+\$/i.test(windowCode) && /\bEXISTS\b/i.test(windowCode)) return 'DO$$ EXISTS';
  return null;
}

// --- 豁免标记解析 -------------------------------------------------------------
const MARKER_START = '-- destructive-gate: allow';
const MARKER_REQUIRED = [
  'destructive-kind', 'destructive-reason', 'destructive-owner',
  'destructive-ticket', 'destructive-expires',
];

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function plusDays(isoDate, n) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function parseMarker(lines) {
  let end = lines.length - 1;
  while (end >= 0 && lines[end].trim() === '') end--;
  if (end < 0) return null;
  const collected = [];
  for (let i = end; i >= 0 && collected.length < MARKER_WINDOW_LINES; i--) {
    const t = lines[i].trim();
    if (t === '') break;
    if (!/^--\s+destructive-[a-z-]+:/.test(t)) break;
    collected.unshift(t);
  }
  if (collected.length === 0 || !collected[0].includes(MARKER_START)) return null;

  const marker = {};
  for (const line of collected) {
    const m = line.match(/^--\s+(destructive-[a-z-]+):\s*(.+)$/);
    if (m) marker[m[1]] = m[2].trim();
  }
  for (const f of MARKER_REQUIRED) if (!marker[f]) return { invalid: `缺少 ${f}` };
  if (marker['destructive-gate'] !== 'allow') return { invalid: 'destructive-gate 必须为 allow' };
  if (marker['destructive-reason'].length < 10) return { invalid: 'destructive-reason 少于 10 个字符' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(marker['destructive-expires'])) {
    return { invalid: 'destructive-expires 必须是 YYYY-MM-DD' };
  }
  const expires = marker['destructive-expires'];
  const today = todayUtc();
  if (expires < today) return { invalid: '豁免标记已过期' };
  if (expires > plusDays(today, 180)) return { invalid: '豁免标记有效期不得超过 180 天' };

  const kind = marker['destructive-kind'];
  if (kind === 'TRUNCATE') return { invalid: 'TRUNCATE 不接受豁免标记' };
  if (!['DELETE', 'UPDATE', 'DROP TABLE', 'DROP COLUMN'].includes(kind)) {
    return { invalid: `destructive-kind 非法：${kind}` };
  }
  if (kind === 'DELETE' || kind === 'UPDATE') {
    const n = Number(marker['destructive-max-rows']);
    if (!Number.isInteger(n) || n < 0) return { invalid: '缺少或非法 destructive-max-rows' };
    if (!marker['destructive-backup']) return { invalid: '缺少 destructive-backup' };
  }
  if (kind === 'DROP TABLE' || kind === 'DROP COLUMN') {
    if (marker['destructive-rows-at-review'] !== '0') return { invalid: 'destructive-rows-at-review 必须为 0' };
    if (!marker['destructive-backup']) return { invalid: '缺少 destructive-backup' };
  }
  return marker;
}

function hasDangerousWhere(code) {
  return /\bWHERE\s+(?:TRUE|1\s*=\s*1)\b|\bOR\s+(?:TRUE|1\s*=\s*1)\b/i.test(code);
}

function normalizeKind(kind) {
  if (kind === 'delete_from') return 'DELETE';
  if (kind === 'update_set') return 'UPDATE';
  if (kind === 'drop_table' || kind === 'drop_table_cascade') return 'DROP TABLE';
  if (kind === 'drop_column') return 'DROP COLUMN';
  if (kind === 'truncate') return 'TRUNCATE';
  return null;
}

function targetTable(stmtCode) {
  const m = stmtCode.match(/\b(?:DROP\s+TABLE|ALTER\s+TABLE)\s+(?:IF\s+EXISTS\s+)?([\w".]+)/i);
  return m ? m[1] : null;
}

function explicitSchema(stmtCode) {
  const t = targetTable(stmtCode);
  return !!(t && t.includes('.'));
}

// --- 临时对象识别（仅用于破坏性预演的行数统计） -------------------------------
// 口径：显式 pg_temp[.N] 前缀，或本文件内 CREATE [GLOBAL|LOCAL] TEMP[ORARY] TABLE 声明的名字。
// 静态判定（命中、标记、票据）完全不使用该结果，避免放宽真实表的破坏性拦截。
const TEMP_CREATE_RE =
  /\bCREATE\s+(?:(?:GLOBAL|LOCAL)\s+)?(?:TEMP|TEMPORARY)\s+(?:UNLOGGED\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?("(?:[^"]|"")*"|[\w$]+)(?:\s*\.\s*("(?:[^"]|"")*"|[\w$]+))?/gi;

function normIdent(s) {
  return s.replace(/^"+|"+$/g, '').replace(/""/g, '"').toLowerCase();
}

function tempTablesIn(raw) {
  const set = new Set();
  for (const m of raw.matchAll(TEMP_CREATE_RE)) {
    if (m[2]) {
      const schema = normIdent(m[1]);
      const name = normIdent(m[2]);
      set.add(name);
      set.add(`${schema}.${name}`);
    } else {
      set.add(normIdent(m[1]));
    }
  }
  return set;
}

function isTempTarget(target, temps) {
  if (!target) return false;
  const parts = target.split('.').map(normIdent);
  const name = parts[parts.length - 1];
  const schema = parts.length > 1 ? parts[parts.length - 2] : null;
  // 显式 schema 只认 pg_temp[N]；普通 schema 即使与临时表同名也不得豁免。
  if (schema) return schema === 'pg_temp' || /^pg_temp_\d+$/.test(schema);
  return temps.has(name);
}

function dmlTarget(stmtCode) {
  const del = stmtCode.match(/^\s*DELETE\s+FROM\s+([\w".]+)/i);
  if (del) return del[1];
  const upd = stmtCode.match(/^\s*UPDATE\s+([\w".]+)\s+SET\b/i);
  return upd ? upd[1] : null;
}

// --- 逐语句扫描 ---------------------------------------------------------------
function scanFile(path, relPath) {
  const raw = readFileSync(path, 'utf-8');
  const stmts = splitStatements(raw);
  const temps = tempTablesIn(raw);
  const codeLines = stmts.length === 0 ? [] : buildCodeLines(raw);
  const rawLines = raw.split('\n');
  const hits = [];
  const approvals = [];
  for (const st of stmts) {
    const stmtCode = st.code;
    // 语句起始行 = 段起始行 + 前导空白/注释占用的行数（避免把文件头注释算进行号）
    const lead = stmtCode.search(/\S/);
    const lineNo = lead < 0 ? st.startLine : st.startLine + (stmtCode.slice(0, lead).match(/\n/g) || []).length;
    const snippet = st.text
      .split('\n')
      .filter((l) => !/^\s*--/.test(l))
      .join(' ')
      .replace(/\s+/g, ' ')
      .slice(0, 160);
    const leadLines = rawLines.slice(Math.max(0, lineNo - 1 - MARKER_WINDOW_LINES), lineNo - 1);
    const marker = parseMarker(leadLines);

    for (const d of DETECTORS) {
      if (!d.re.test(stmtCode)) continue;

      if (d.kind === 'truncate') {
        hits.push({ file: relPath, line: lineNo, kind: d.kind, hint: d.hint, snippet });
        break;
      }

      if (d.kind === 'delete_from' || d.kind === 'update_set') {
        if (!/\bWHERE\b/i.test(stmtCode) || hasDangerousWhere(stmtCode)) {
          hits.push({ file: relPath, line: lineNo, kind: `${d.kind}_missing_where`, hint: d.hint, snippet });
          break;
        }
        if (!marker) {
          hits.push({ file: relPath, line: lineNo, kind: `${d.kind}_no_marker`, hint: d.hint, snippet });
          break;
        }
        if (marker.invalid) {
          hits.push({ file: relPath, line: lineNo, kind: `${d.kind}_bad_marker`, hint: `${marker.invalid}；${d.hint}`, snippet });
          break;
        }
        if (normalizeKind(d.kind) !== marker['destructive-kind']) {
          hits.push({ file: relPath, line: lineNo, kind: `${d.kind}_marker_kind`, hint: `标记 destructive-kind=${marker['destructive-kind']} 与语句类型不符`, snippet });
          break;
        }
        approvals.push({
          file: relPath,
          line: lineNo,
          kind: normalizeKind(d.kind),
          maxRows: Number(marker['destructive-max-rows']),
          ticket: marker['destructive-ticket'],
          backup: marker['destructive-backup'],
          sql: st.text
            .split('\n')
            .filter((l) => !/^\s*--/.test(l))
            .join('\n')
            .trim()
            .replace(/;\s*$/, ''),
          table: dmlTarget(stmtCode),
          temp: isTempTarget(dmlTarget(stmtCode), temps),
        });
        break;
      }

      // CASCADE 一律阻断（即使有守卫/标记）
      if (d.kind === 'drop_table_cascade') {
        hits.push({ file: relPath, line: lineNo, kind: 'drop_table_cascade', hint: 'prod 禁止 DROP TABLE ... CASCADE', snippet });
        break;
      }
      if ((d.kind === 'drop_table' || d.kind === 'drop_column') && !explicitSchema(stmtCode)) {
        hits.push({ file: relPath, line: lineNo, kind: `${d.kind}_no_schema`, hint: 'DROP 目标必须显式 schema.table', snippet });
        break;
      }

      const from = Math.max(0, lineNo - GUARD_WINDOW_LINES - 1);
      const windowCode = codeLines.slice(from, st.endLine).join('\n') + '\n' + stmtCode;
      const guard = guardInfo(windowCode);

      if (d.kind === 'drop_table' || d.kind === 'drop_column') {
        if (!guard) {
          hits.push({ file: relPath, line: lineNo, kind: d.kind, hint: d.hint, snippet });
          break;
        }
        if (!marker) {
          hits.push({ file: relPath, line: lineNo, kind: `${d.kind}_no_marker`, hint: d.hint, snippet });
          break;
        }
        if (marker.invalid) {
          hits.push({ file: relPath, line: lineNo, kind: `${d.kind}_bad_marker`, hint: `${marker.invalid}；${d.hint}`, snippet });
          break;
        }
        if (normalizeKind(d.kind) !== marker['destructive-kind']) {
          hits.push({ file: relPath, line: lineNo, kind: `${d.kind}_marker_kind`, hint: `标记 destructive-kind=${marker['destructive-kind']} 与语句类型不符`, snippet });
          break;
        }
        approvals.push({
          file: relPath,
          line: lineNo,
          kind: normalizeKind(d.kind),
          maxRows: 0,
          ticket: marker['destructive-ticket'],
          backup: marker['destructive-backup'],
          sql: null,
          table: targetTable(stmtCode),
          temp: isTempTarget(targetTable(stmtCode), temps),
        });
        break;
      }

      if (guard) continue;
      hits.push({ file: relPath, line: lineNo, kind: d.kind, hint: d.hint, snippet });
      break; // 一条语句只记首个命中类目，避免重复计数
    }
  }
  return { raw, hits, approvals };
}

// 与 splitStatements 同步的轻量版：注释/字符串置空，保留行号
function buildCodeLines(raw) {
  const lines = [];
  let cur = '';
  let i = 0;
  let inLineComment = false;
  let blockDepth = 0;
  let inSQuote = false;
  let dollarTag = null;
  while (i < raw.length) {
    const ch = raw[i];
    const next = raw[i + 1];
    if (ch === '\n') { lines.push(cur); cur = ''; inLineComment = false; i++; continue; }
    if (inLineComment) { cur += ' '; i++; continue; }
    if (blockDepth > 0) {
      if (ch === '/' && next === '*') { blockDepth++; cur += '  '; i += 2; continue; }
      if (ch === '*' && next === '/') { blockDepth--; cur += '  '; i += 2; continue; }
      cur += ' '; i++; continue;
    }
    if (dollarTag) {
      if (ch === '$' && raw.startsWith(dollarTag, i)) {
        cur += dollarTag;
        i += dollarTag.length;
        dollarTag = null;
        continue;
      }
      cur += ch;
      i++;
      continue;
    }
    if (inSQuote) {
      if (ch === "'" && next === "'") { cur += '  '; i += 2; continue; }
      if (ch === "'") { inSQuote = false; cur += ch; i++; continue; }
      cur += ' '; i++; continue;
    }
    if (ch === '-' && next === '-') { inLineComment = true; cur += '  '; i += 2; continue; }
    if (ch === '/' && next === '*') { blockDepth = 1; cur += '  '; i += 2; continue; }
    if (ch === "'") { inSQuote = true; cur += ch; i++; continue; }
    if (ch === '$') {
      const m = raw.slice(i).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (m) { dollarTag = m[0]; cur += m[0]; i += m[0].length; continue; }
    }
    cur += ch;
    i++;
  }
  lines.push(cur);
  return lines;
}

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function readBaseline() {
  try {
    return JSON.parse(readFileSync(BASELINE_FILE, 'utf-8'));
  } catch {
    return { guardWindowLines: GUARD_WINDOW_LINES, files: {} };
  }
}

// --- 台账（manifest）只读解析：仅 entries 段 + pending_forward_patches ---
function readManifest() {
  const out = { dispositions: new Map(), entryVersions: new Set(), pendingVersions: new Set(), prodAnchor: 0 };
  let text = '';
  try {
    text = readFileSync(MANIFEST_FILE, 'utf-8');
  } catch {
    return out;
  }
  const [entriesText, pendingText = ''] = text.split('\npending_forward_patches:');
  for (const m of entriesText.matchAll(/- version:\s*"(\d{14})"[\s\S]*?disposition:\s*(\w+)/g)) {
    out.entryVersions.add(m[1]);
    out.dispositions.set(m[1], m[2]);
  }
  for (const m of pendingText.matchAll(/- version:\s*"(\d{14})"/g)) out.pendingVersions.add(m[1]);
  const anchorMatch = text.match(/current_prod:[\s\S]*?anchor:\s*"(\d{14})"/);
  if (anchorMatch) out.prodAnchor = Number(anchorMatch[1]);
  return out;
}

const MANIFEST = readManifest();
const GATEABLE_DISPOSITIONS = new Set(['excluded', 'superseded', 'obsolete', 'forwarded', 'hold', 'applied']);
const PROD_ANCHOR = MANIFEST.prodAnchor || 0;

function versionOf(relPath) {
  return basename(relPath).split('_')[0];
}

// 历史文件「仅报告」准入：不得是待应用版本，且必须已应用或已登记处置。
function isGrandfathorable(relPath) {
  const v = versionOf(relPath);
  if (MANIFEST.pendingVersions.has(v)) return false;
  if (MANIFEST.entryVersions.has(v)) {
    const d = MANIFEST.dispositions.get(v);
    return GATEABLE_DISPOSITIONS.has(d) && d !== 'to_apply';
  }
  // 不在台账中：视为历史已应用；新版本（> 台账声明的生产锚点）不得进基线
  if (PROD_ANCHOR && Number(v) > PROD_ANCHOR) return false;
  return true;
}

// TRUNCATE 更严：只有已入账（这里近似为「不在台账」的旧版本）可进基线。
function isTruncateBaselineEligible(relPath) {
  const v = versionOf(relPath);
  if (MANIFEST.entryVersions.has(v) || MANIFEST.pendingVersions.has(v)) return false;
  return PROD_ANCHOR && Number(v) <= PROD_ANCHOR;
}

// --- 单文件模式（供 apply-forward.sh 调用） -----------------------------------
if (CHECK_FILE) {
  const abs = CHECK_FILE.startsWith('/') ? CHECK_FILE : join(ROOT, CHECK_FILE);
  if (!statSync(abs, { throwIfNoEntry: false })) {
    console.error(`[destructive-sql] 文件不存在: ${CHECK_FILE}`);
    process.exit(2);
  }
  const raw = readFileSync(abs);
  const { hits, approvals } = scanFile(abs, CHECK_FILE);

  if (hits.length > 0) {
    if (!STRICT_MODE) {
      const rel = relative(ROOT, abs);
      const base = (readBaseline().files || {})[rel];
      if (base && base.sha256 === sha256(raw) && isGrandfathorable(rel)) {
        console.log(`OK(baseline): ${CHECK_FILE}（${hits.length} 条既存违规，仅报告）`);
        process.exit(0);
      }
    }
    console.error(`DENY: ${CHECK_FILE} 存在 ${hits.length} 条破坏性语句`);
    for (const h of hits) console.error(`  L${h.line} [${h.kind}] ${h.snippet}`);
    console.error(`  修法：加 WHERE + 紧邻 ${MARKER_WINDOW_LINES} 行豁免标记；TRUNCATE 不接受任何豁免。`);
    process.exit(1);
  }

  if (approvals.length > 0) {
    if (APPROVE_TICKETS.length === 0) {
      console.error(`DENY: ${CHECK_FILE} 含 ${approvals.length} 条带豁免标记的破坏性语句`);
      console.error('  运行时必须显式传 --allow-destructive=<version>，并设置 PROD_CHANGE_TICKET；');
      console.error('  PROD_CHANGE_TICKET 可为逗号列表，但每个标记票据都必须被显式列出。');
      console.error('  TRUNCATE 无任何运行时开关。');
      process.exit(1);
    }
    const mismatched = approvals.filter((a) => !APPROVE_TICKETS.includes(a.ticket));
    if (mismatched.length > 0) {
      console.error(`DENY: ${CHECK_FILE} 有 ${mismatched.length} 条标记的 destructive-ticket 未被显式列出`);
      for (const a of mismatched) console.error(`  L${a.line} ticket=${a.ticket} 已列出=${APPROVE_TICKETS.join(',')}`);
      process.exit(1);
    }
    if (PLAN_FILE) {
      writeFileSync(
        PLAN_FILE,
        JSON.stringify(
          {
            file: CHECK_FILE,
            ticket: APPROVE_TICKETS.join(','),
            statements: approvals.map((a) => ({
              kind: a.kind,
              line: a.line,
              maxRows: a.maxRows,
              backup: a.backup,
              table: a.table,
              temp: !!a.temp,
              sql: a.sql,
            })),
          },
          null,
          2
        ) + '\n'
      );
    }
    console.log(`APPROVE: ${CHECK_FILE} ${approvals.length} 条（ticket=${APPROVE_TICKETS.join(',')}${PLAN_FILE ? `，plan=${PLAN_FILE}` : ''}）`);
    process.exit(0);
  }

  console.log(`OK: ${CHECK_FILE}`);
  process.exit(0);
}

// --- 全量扫描 ---------------------------------------------------------------
const scanDirs = DIRS.length > 0 ? DIRS.map((d) => (d.startsWith('/') ? d : join(ROOT, d))) : [MIG_DIR];
const entries = [];
for (const dir of scanDirs) {
  if (!existsSync(dir)) {
    console.error(`[destructive-sql] 扫描目录不存在: ${dir}`);
    process.exit(2);
  }
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isFile() && e.name.endsWith('.sql')) entries.push(join(dir, e.name));
  }
}
entries.sort();

const baseline = readBaseline();
const baselineFiles = baseline.files || {};
const results = [];
let totalHits = 0;
let grandfatheredFiles = 0;
let blockingFiles = 0;
let approvedStatements = 0;
const blocking = [];
const grandfathered = [];
const staleBaseline = [];

for (const abs of entries) {
  const relPath = relative(ROOT, abs);
  const { raw, hits, approvals } = scanFile(abs, relPath);
  approvedStatements += approvals.length;
  if (hits.length === 0) continue;
  totalHits += hits.length;
  const digest = sha256(raw);
  const base = baselineFiles[relPath];
  const same = !STRICT_MODE && base && base.sha256 === digest && isGrandfathorable(relPath);
  if (same) {
    grandfatheredFiles++;
    grandfathered.push({ file: relPath, hits: hits.length, baseHits: base.hits ?? -1 });
  } else {
    blockingFiles++;
    blocking.push({ file: relPath, hits: hits.length, reason: base ? (STRICT_MODE ? 'strict' : 'modified') : 'new' });
    if (!REPORT_MODE) for (const h of hits) results.push({ ...h, tier: 'BLOCK' });
  }
  if (REPORT_MODE) for (const h of hits) results.push({ ...h, tier: same ? 'REPORT' : 'BLOCK' });
}
const entryBasenames = new Set(entries.map((p) => basename(p)));
if (DIRS.length === 0) {
  for (const relPath of Object.keys(baselineFiles)) {
    if (!entryBasenames.has(basename(relPath))) staleBaseline.push(relPath);
  }
}

const summary = {
  scannedFiles: entries.length,
  filesWithHits: grandfatheredFiles + blockingFiles,
  totalRiskyStatements: totalHits,
  grandfatheredFiles,
  blockingFiles,
  staleBaselineEntries: staleBaseline.length,
  guardWindowLines: GUARD_WINDOW_LINES,
};

if (WRITE_BASELINE) {
  const files = {};
  const ungateable = [];
  for (const abs of entries) {
    const relPath = relative(ROOT, abs);
    const { raw, hits } = scanFile(abs, relPath);
    if (hits.length === 0) continue;
    if (!isGrandfathorable(relPath)) {
      ungateable.push(`${relPath} [未登记/待应用] ${hits.length} 条`);
      continue;
    }
    if (hits.some((h) => h.kind === 'truncate') && !isTruncateBaselineEligible(relPath)) {
      ungateable.push(`${relPath} [TRUNCATE 未入账]`);
      continue;
    }
    files[relPath] = {
      sha256: sha256(raw),
      hits: hits.length,
      kinds: hits.reduce((acc, h) => ((acc[h.kind] = (acc[h.kind] || 0) + 1), acc), {}),
    };
  }
  if (ungateable.length > 0) {
    console.error(`拒绝写入基线：${ungateable.length} 个文件不满足「历史已应用或已登记处置」准入`);
    for (const u of ungateable.slice(0, 20)) console.error(`  ✗ ${u}`);
    console.error('请先修正这些文件的语句/标记，或在 migration_manifest.yaml 登记处置后再重生成。');
    process.exit(1);
  }
  writeFileSync(
    BASELINE_FILE,
    JSON.stringify(
      {
        _comment:
          '既存破坏性语句基线（仅报告不阻断）。仅记录已存在违规的文件 sha256 + 命中数；新增/修改文件自动进入阻断档；待应用版本（manifest pending_forward_patches / to_apply）禁止进入基线。重生成：node scripts/ci/check-destructive-sql.mjs --write-baseline',
        guardWindowLines: GUARD_WINDOW_LINES,
        markerWindowLines: MARKER_WINDOW_LINES,
        generatedAt: new Date().toISOString(),
        files,
      },
      null,
      2
    ) + '\n'
  );
  console.log(`WROTE ${relative(ROOT, BASELINE_FILE)} (${Object.keys(files).length} files)`);
  process.exit(0);
}

if (JSON_MODE) {
  console.log(JSON.stringify({ pass: blockingFiles === 0, summary, blocking, grandfathered, staleBaseline, findings: results }, null, 2));
} else {
  console.log(`\
Destructive SQL guard gate
---------------------------
扫描目录            : ${scanDirs.map((d) => relative(ROOT, d) || d).join(', ')}
扫描文件            : ${summary.scannedFiles}
含破坏性语句文件    : ${summary.filesWithHits}
破坏性语句          : ${summary.totalRiskyStatements}
  既存（仅报告）    : ${grandfatheredFiles} 个文件
  新增/修改（阻断） : ${blockingFiles} 个文件
  带豁免标记（运行时需 --allow-destructive）: ${approvedStatements} 条
守卫回看窗口        : ${GUARD_WINDOW_LINES} 行
标记回看窗口        : ${MARKER_WINDOW_LINES} 行
基线陈旧条目        : ${staleBaseline.length}
${STRICT_MODE ? '严格模式            : 是（忽略既有基线）' : ''}`);
  if (blocking.length > 0) {
    console.log('阻断明细（本次新增/修改文件）:');
    for (const b of blocking) console.log(`  ❌ [${b.reason}] ${b.file} — ${b.hits} 条`);
  }
  const samples = REPORT_MODE ? results : results.slice(0, SAMPLE_LIMIT);
  if (samples.length > 0) {
    console.log(`${REPORT_MODE ? '' : `\n阻断样例（前 ${SAMPLE_LIMIT} 条，全量用 --report）:`}`);
    for (const h of samples) {
      console.log(`  ${h.tier === 'BLOCK' ? '❌' : '⚠️ '} ${h.file}:${h.line} [${h.kind}] ${h.snippet}`);
      if (h.tier === 'BLOCK') console.log(`      → ${h.hint}`);
    }
  }
  if (grandfathered.length > 0 && !REPORT_MODE) {
    console.log(`\n既存违规（grandfathered，仅报告）文件 ${grandfathered.length} 个，前 10:`);
    for (const g of grandfathered.slice(0, 10)) console.log(`  · ${g.file} — ${g.hits} 条（基线 ${g.baseHits}）`);
  }
  if (staleBaseline.length > 0) {
    console.log(`\n⚠️  基线中存在已删除文件（建议 --write-baseline 重生）: ${staleBaseline.slice(0, 5).join(', ')}${staleBaseline.length > 5 ? ' ...' : ''}`);
  }
  if (REPORT_MODE) console.log('\nREPORT 模式：不阻断（exit 0）');
  else if (blockingFiles === 0) console.log('PASS.');
  else console.log(`FAIL: ${blockingFiles} 个新增/修改文件存在破坏性语句。`);
}

process.exit(REPORT_MODE ? 0 : blockingFiles === 0 ? 0 : 1);
