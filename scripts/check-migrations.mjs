#!/usr/bin/env node
import { readdirSync, statSync } from 'node:fs';
import { join, basename, extname, relative } from 'node:path';
import { execSync } from 'node:child_process';

const MIGRATIONS_DIR = join(process.cwd(), 'database', 'migrations');

const RE_EARLY = /^(\d{3})-([A-Za-z0-9][A-Za-z0-9_-]*)\.sql$/;
const RE_NEW = /^(\d{8})(\d{6})_(.+)\.sql$/;

const errors = [];
const warnings = [];

function scanFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  const nonSql = [];
  for (const e of entries) {
    if (e.isDirectory()) continue;
    const name = e.name;
    if (extname(name) !== '.sql') {
      nonSql.push(name);
    } else {
      files.push(name);
    }
  }
  return { files, nonSql };
}

function checkNonSql(nonSql) {
  for (const n of nonSql) {
    errors.push(`非 .sql 文件: ${n}`);
  }
}

function classify(files) {
  const early = [];
  const neu = [];
  const unrecognized = [];
  for (const f of files) {
    const mEarly = f.match(RE_EARLY);
    if (mEarly) {
      early.push({ file: f, num: parseInt(mEarly[1], 10) });
      continue;
    }
    const mNew = f.match(RE_NEW);
    if (mNew) {
      neu.push({
        file: f,
        date: mNew[1],
        seq: parseInt(mNew[2], 10),
      });
      continue;
    }
    unrecognized.push(f);
  }
  return { early, neu, unrecognized };
}

function checkNaming(unrecognized) {
  for (const f of unrecognized) {
    errors.push(`命名不符合规范: ${f}（应为 NNN-description.sql 或 YYYYMMDDNNNNNN_*.sql）`);
  }
}

function checkEarlySeq(early) {
  const sorted = [...early].sort((a, b) => a.num - b.num);
  const seen = new Set();
  const dups = [];
  for (const item of sorted) {
    if (seen.has(item.num)) {
      dups.push(item.num);
    }
    seen.add(item.num);
  }
  if (dups.length > 0) {
    errors.push(`早期格式重复序号: ${dups.join(', ')}`);
  }
  const nums = sorted.map((x) => x.num);
  if (nums.length > 0) {
    const expected = [];
    for (let i = 1; i <= nums.length; i++) expected.push(i);
    const missing = [];
    for (const n of expected) {
      if (!nums.includes(n)) missing.push(n);
    }
    if (missing.length > 0) {
      errors.push(`早期格式序号不连续，缺失: ${missing.map((x) => String(x).padStart(3, '0')).join(', ')}`);
    }
    const extras = nums.filter((n) => n > nums.length);
    if (extras.length > 0 && missing.length === 0) {
      errors.push(`早期格式序号不连续，超前: ${extras.map((x) => String(x).padStart(3, '0')).join(', ')}`);
    }
  }
}

function pad6(n) {
  return String(n).padStart(6, '0');
}

function collapseRanges(nums) {
  if (nums.length === 0) return '';
  const parts = [];
  let lo = nums[0];
  let hi = nums[0];
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] === hi + 1) {
      hi = nums[i];
    } else {
      parts.push(lo === hi ? pad6(lo) : `${pad6(lo)}..${pad6(hi)}`);
      lo = hi = nums[i];
    }
  }
  parts.push(lo === hi ? pad6(lo) : `${pad6(lo)}..${pad6(hi)}`);
  return parts.join(', ');
}

function checkNewSeq(neu) {
  const byDate = new Map();
  for (const item of neu) {
    if (!byDate.has(item.date)) byDate.set(item.date, []);
    byDate.get(item.date).push(item);
  }
  for (const [date, items] of byDate) {
    const sorted = [...items].sort((a, b) => a.seq - b.seq);
    const seen = new Set();
    const dups = [];
    for (const it of sorted) {
      if (seen.has(it.seq)) dups.push(it.seq);
      seen.add(it.seq);
    }
    if (dups.length > 0) {
      errors.push(`新格式 ${date} 重复序号: ${dups.map(pad6).join(', ')}`);
    }
    const seqs = sorted.map((x) => x.seq);
    const min = seqs[0];
    const max = seqs[seqs.length - 1];
    const missing = [];
    for (let s = min; s <= max; s++) {
      if (!seen.has(s)) missing.push(s);
    }
    if (missing.length > 0) {
      errors.push(
        `新格式 ${date} 序号不连续: 范围 [${pad6(min)}..${pad6(max)}] 缺失 ${missing.length} 个 → ${collapseRanges(missing)}`
      );
    }
  }
}

function checkNoModify() {
  let nameStatus = '';
  try {
    nameStatus = execSync('git diff --name-status HEAD -- database/migrations/', {
      encoding: 'utf-8',
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'ignore'],
    });
  } catch {
    return;
  }
  if (!nameStatus.trim()) return;

  // Only flag M (modified) entries.
  // D (delete), A (add), R (rename), C (copy) are all structural changes,
  // not content modifications to existing migrations.
  // Content-modifying an existing migration is the only forbidden operation.
  const contentModified = [];
  let renameCount = 0;
  for (const line of nameStatus.split('\n')) {
    if (!line.trim()) continue;
    const m = line.match(/^([MADRCU])\s+(.+)$/);
    if (!m) continue;
    const status = m[1];
    if (status === 'M') {
      contentModified.push(m[2]);
    } else if (status === 'R' || status === 'D') {
      renameCount++;
    }
  }

  for (const f of contentModified) {
    errors.push(`禁止修改已提交的迁移（内容变更）: ${f}`);
  }

  if (contentModified.length === 0 && renameCount > 0) {
    warnings.push(
      `检测到 ${renameCount} 个历史迁移文件重命名（纯结构，无内容修改）。建议后续提交时用 git mv 让 git 识别为 rename。`
    );
  }
}

function reportJson(stats) {
  const report = {
    pass: errors.length === 0,
    stats,
    errors,
    warnings,
  };
  console.log(JSON.stringify(report, null, 2));
}

function reportText(stats) {
  console.log('');
  console.log('='.repeat(60));
  console.log('  TOPEMS Migration Gate — database/migrations/');
  console.log('='.repeat(60));
  console.log(`  扫描目录      : ${relative(process.cwd(), MIGRATIONS_DIR)}`);
  console.log(`  总 SQL 文件   : ${stats.total}`);
  console.log(`    早期格式    : ${stats.earlyCount}  (NNN-description.sql)`);
  console.log(`    新格式      : ${stats.newCount}  (YYYYMMDDNNNNNN_*.sql)`);
  console.log(`    未识别      : ${stats.unrecognizedCount}`);
  console.log(`    非 .sql 文件: ${stats.nonSqlCount}`);
  console.log(`  错误          : ${errors.length}`);
  console.log(`  警告          : ${warnings.length}`);
  console.log('-'.repeat(60));

  if (errors.length === 0) {
    console.log('  ✅ PASS — 全部检查通过');
  } else {
    for (const e of errors) console.log(`  ❌ ${e}`);
  }
  if (warnings.length > 0) {
    for (const w of warnings) console.log(`  ⚠️  ${w}`);
  }
  console.log('='.repeat(60));
  console.log('');
}

// ---------- main ----------
if (!statSync(MIGRATIONS_DIR, { throwIfNoEntry: false })) {
  console.error(`[check-migrations] 目录不存在: ${MIGRATIONS_DIR}`);
  process.exit(1);
}

const { files, nonSql } = scanFiles(MIGRATIONS_DIR);
checkNonSql(nonSql);

const { early, neu, unrecognized } = classify(files);
checkNaming(unrecognized);
checkEarlySeq(early);
checkNewSeq(neu);
checkNoModify();

const stats = {
  total: files.length,
  earlyCount: early.length,
  newCount: neu.length,
  unrecognizedCount: unrecognized.length,
  nonSqlCount: nonSql.length,
};

reportText(stats);

if (process.argv.includes('--json')) {
  reportJson(stats);
}

process.exit(errors.length === 0 ? 0 : 1);
