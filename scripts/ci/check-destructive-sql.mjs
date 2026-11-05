#!/usr/bin/env node
/**
 * scripts/ci/check-destructive-sql.mjs
 *
 * 迁移文件「破坏性语句守卫」校验（prod 误跑防线之二）。
 *
 * 目标语句（按语句切分后逐条判定）：
 *   - ALTER TABLE ... ALTER [COLUMN] c TYPE / SET DATA TYPE   （无守卫的类型收敛）
 *   - DROP TABLE ... CASCADE                                  （级联删表）
 *   - ALTER TABLE ... DROP [COLUMN] c                         （删列）
 *   - ALTER TABLE ... DROP CONSTRAINT                         （删约束）
 *   - DROP TABLE（无 CASCADE，附加类目，便于收敛统计）
 *
 * 守卫口径（语句本身或「同一文件内、前 GUARD_WINDOW_LINES 行」窗口内出现任一）：
 *   - to_regclass('schema.table')
 *   - relkind / pg_class 查询
 *   - information_schema 查询
 *   - IF EXISTS（含 DROP TABLE IF EXISTS / DROP COLUMN IF EXISTS 自带守卫）
 *   - DO $$ ... EXISTS ... $$ 块内存在性判断
 *
 * 两档策略（避免既存违规把 main 变红）：
 *   - 文件 sha256 与 `destructive-sql-baseline.json` 一致 → 既存违规，仅报告；
 *   - 文件不在 baseline 或 sha256 变化（本次新增/修改） → 阻断。
 *
 * 用法：
 *   node scripts/ci/check-destructive-sql.mjs                 # 门禁（增量阻断）
 *   node scripts/ci/check-destructive-sql.mjs --report        # 全量报告，不阻断
 *   node scripts/ci/check-destructive-sql.mjs --write-baseline # 重写基线（人工确认后）
 *   node scripts/ci/check-destructive-sql.mjs --check-file <path> # 单文件判定，有违规 exit 1
 *   node scripts/ci/check-destructive-sql.mjs --json          # 机器可读输出
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, basename } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = process.cwd();
const MIG_DIR = join(ROOT, 'database', 'migrations');
const BASELINE_FILE = join(ROOT, 'scripts', 'ci', 'destructive-sql-baseline.json');
const GUARD_WINDOW_LINES = 60; // 守卫回看行距阈值（同文件内）
const SAMPLE_LIMIT = 20;       // 默认输出样例条数上限

const args = process.argv.slice(2);
const REPORT_MODE = args.includes('--report');
const WRITE_BASELINE = args.includes('--write-baseline');
const JSON_MODE = args.includes('--json');
const checkFileIdx = args.indexOf('--check-file');
const CHECK_FILE = checkFileIdx >= 0 ? args[checkFileIdx + 1] : null;

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
    hint: '加 IF EXISTS（DROP TABLE IF EXISTS）并显式声明目标 schema',
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

function scanFile(path, relPath) {
  const raw = readFileSync(path, 'utf-8');
  const stmts = splitStatements(raw);
  const codeLines = stmts.length === 0 ? [] : buildCodeLines(raw);
  const hits = [];
  for (const st of stmts) {
    const stmtCode = st.code;
    // 语句起始行 = 段起始行 + 前导空白/注释占用的行数（避免把文件头注释算进行号）
    const lead = stmtCode.search(/\S/);
    const lineNo = lead < 0 ? st.startLine : st.startLine + (stmtCode.slice(0, lead).match(/\n/g) || []).length;
    for (const d of DETECTORS) {
      if (!d.re.test(stmtCode)) continue;
      const from = Math.max(0, lineNo - GUARD_WINDOW_LINES - 1);
      const windowCode = codeLines.slice(from, st.endLine).join('\n') + '\n' + stmtCode;
      const guard = guardInfo(windowCode);
      if (guard) continue;
      hits.push({
        file: relPath,
        line: lineNo,
        kind: d.kind,
        hint: d.hint,
        snippet: st.text
          .split('\n')
          .filter((l) => !/^\s*--/.test(l))
          .join(' ')
          .replace(/\s+/g, ' ')
          .slice(0, 160),
      });
      break; // 一条语句只记首个命中类目，避免重复计数
    }
  }
  return { raw, hits };
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

// --- 单文件模式（供 apply-forward.sh 调用） -----------------------------------
if (CHECK_FILE) {
  const abs = CHECK_FILE.startsWith('/') ? CHECK_FILE : join(ROOT, CHECK_FILE);
  if (!statSync(abs, { throwIfNoEntry: false })) {
    console.error(`[destructive-sql] 文件不存在: ${CHECK_FILE}`);
    process.exit(2);
  }
  const { hits } = scanFile(abs, CHECK_FILE);
  if (hits.length === 0) {
    console.log(`OK: ${CHECK_FILE}`);
    process.exit(0);
  }
  console.error(`DENY: ${CHECK_FILE} 存在 ${hits.length} 条无守卫高危语句`);
  for (const h of hits) console.error(`  L${h.line} [${h.kind}] ${h.snippet}`);
  process.exit(1);
}

// --- 全量扫描 ---------------------------------------------------------------
const entries = readdirSync(MIG_DIR, { withFileTypes: true })
  .filter((e) => e.isFile() && e.name.endsWith('.sql'))
  .map((e) => e.name)
  .sort();

const baseline = readBaseline();
const baselineFiles = baseline.files || {};
const results = [];
let totalHits = 0;
let grandfatheredFiles = 0;
let blockingFiles = 0;
const blocking = [];
const grandfathered = [];
const staleBaseline = [];

for (const name of entries) {
  const abs = join(MIG_DIR, name);
  const relPath = relative(ROOT, abs);
  const { raw, hits } = scanFile(abs, relPath);
  if (hits.length === 0) continue;
  totalHits += hits.length;
  const digest = sha256(raw);
  const base = baselineFiles[relPath];
  const same = base && base.sha256 === digest;
  if (same) {
    grandfatheredFiles++;
    grandfathered.push({ file: relPath, hits: hits.length, baseHits: base.hits ?? -1 });
  } else {
    blockingFiles++;
    blocking.push({ file: relPath, hits: hits.length, reason: base ? 'modified' : 'new' });
    for (const h of hits) results.push({ ...h, tier: 'BLOCK' });
  }
  if (REPORT_MODE) for (const h of hits) results.push({ ...h, tier: same ? 'REPORT' : 'BLOCK' });
}
for (const relPath of Object.keys(baselineFiles)) {
  if (!entries.includes(basename(relPath))) staleBaseline.push(relPath);
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
  for (const name of entries) {
    const abs = join(MIG_DIR, name);
    const relPath = relative(ROOT, abs);
    const { raw, hits } = scanFile(abs, relPath);
    if (hits.length === 0) continue;
    files[relPath] = {
      sha256: sha256(raw),
      hits: hits.length,
      kinds: hits.reduce((acc, h) => ((acc[h.kind] = (acc[h.kind] || 0) + 1), acc), {}),
    };
  }
  writeFileSync(
    BASELINE_FILE,
    JSON.stringify(
      {
        _comment:
          '既存破坏性语句基线（仅报告不阻断）。仅记录已存在违规的文件 sha256 + 命中数；新增/修改文件自动进入阻断档。重生成：node scripts/ci/check-destructive-sql.mjs --write-baseline',
        guardWindowLines: GUARD_WINDOW_LINES,
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
扫描目录            : database/migrations
扫描文件            : ${summary.scannedFiles}
含高危语句文件      : ${summary.filesWithHits}
无守卫高危语句      : ${summary.totalRiskyStatements}
  既存（仅报告）    : ${grandfatheredFiles} 个文件
  新增/修改（阻断） : ${blockingFiles} 个文件
守卫回看窗口        : ${GUARD_WINDOW_LINES} 行
基线陈旧条目        : ${staleBaseline.length}
`);
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
  else console.log(`FAIL: ${blockingFiles} 个新增/修改文件存在无守卫高危语句。`);
}

process.exit(REPORT_MODE ? 0 : blockingFiles === 0 ? 0 : 1);
