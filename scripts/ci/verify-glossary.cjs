#!/usr/bin/env node
/**
 * CI 门禁：Glossary Top50 术语一致性检查（R11 Z-P1 附加项）
 *
 * 规则（与 apply_glossary.js 完全对齐，保证"写脚本审计 = 修脚本替换"闭环）：
 *   对 zh/en 相同 path 的叶子：
 *     if zh_value ∈ glossary (有标准译法条目)：
 *        if en_value ∉ glossary[zh].allowed (既不是 standard_en，也不在 allowed_aliases 中)：
 *           → 非标准译法，记 1 条违规
 *
 * 空 en 值（missing）不归本脚本管（归 check-i18n-quality.cjs 的 empty_in_en）。
 *
 * 用法：
 *   node scripts/ci/verify-glossary.cjs              # 审计 + 统计 + 样本
 *   node scripts/ci/verify-glossary.cjs --strict     # 违规 > 0 → exit 1（CI 门禁）
 *   node scripts/ci/verify-glossary.cjs --json       # JSON 输出（写 Step Summary）
 *   node scripts/ci/verify-glossary.cjs --term 状态  # 仅查某个具体词条的违规
 */

'use strict';

const fs = require('fs');
const path = require('path');

const EN_DIR = path.resolve(__dirname, '../../apps/web/src/i18n/locales/en');
const ZH_DIR = path.resolve(__dirname, '../../apps/web/src/i18n/locales/zh');
const CSV_PATH = path.resolve(__dirname, '../i18n/glossary.csv');

const args = process.argv.slice(2);
const STRICT = args.includes('--strict');
const JSON_MODE = args.includes('--json');
const termIdx = args.indexOf('--term');
const FILTER_TERM = termIdx !== -1 && args[termIdx + 1] ? args[termIdx + 1] : null;

// ───────────────────────── 工具函数（与 apply_glossary.js 保持一致）─────────────────────────

function readGlossary(csvPath) {
  const raw = fs.readFileSync(csvPath, 'utf8').replace(/^\ufeff/, '');
  const lines = raw.split(/\r?\n/);
  const glossary = new Map();
  for (const line of lines) {
    if (!line.trim()) continue;
    if (/^\s*#/.test(line)) continue;
    const cells = line.match(/(".*?"|[^,]+)/g) || [];
    if (cells.length < 2) continue;
    const unquote = (s) => (s && s.startsWith('"') ? s.slice(1, -1).replace(/""/g, '"') : s || '');
    const zh = unquote(cells[0]);
    const en = unquote(cells[1]);
    const cat = unquote(cells[2]);
    const notes = unquote(cells[3]);
    const aliasesRaw = unquote(cells[4]) || '';
    const allowed = new Set(
      aliasesRaw
        .split(/\s*,\s*/)
        .map((s) => s.trim())
        .filter(Boolean)
    );
    if (!zh || !en) continue;
    allowed.add(en); // standard_en 本身允许
    glossary.set(zh, { standard_en: en, category: cat, allowed, notes });
  }
  return glossary;
}

function flatten(obj, prefix = '', out = new Map()) {
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? prefix + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, p, out);
    else if (typeof v === 'string') out.set(p, v);
  }
  return out;
}

// ───────────────────────── 主逻辑 ─────────────────────────

function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error('glossary.csv not found:', CSV_PATH);
    process.exit(2);
  }
  const glossary = readGlossary(CSV_PATH);
  const nsFiles = fs.readdirSync(EN_DIR).filter((f) => f.endsWith('.json'));

  const summary = {
    glossary_terms_loaded: glossary.size,
    namespaces_scanned: 0,
    total_violations: 0,
    by_term: new Map(), // zh_term → count
    by_ns: new Map(), // ns → count
    by_category: new Map(), // category → count
    samples: [], // { ns, path, zh_term, standard_en, actual_en, category }
  };

  for (const f of nsFiles) {
    const ns = f.replace('.json', '');
    summary.namespaces_scanned++;

    let zhObj, enObj;
    try {
      zhObj = JSON.parse(fs.readFileSync(path.join(ZH_DIR, f), 'utf8'));
    } catch {
      zhObj = {};
    }
    try {
      enObj = JSON.parse(fs.readFileSync(path.join(EN_DIR, f), 'utf8'));
    } catch {
      continue;
    }

    const zhFlat = flatten(zhObj);
    const enFlat = flatten(enObj);

    for (const [p, zhValRaw] of zhFlat) {
      const zv = (zhValRaw || '').trim();
      if (!zv) continue;
      if (FILTER_TERM && zv !== FILTER_TERM) continue;
      const entry = glossary.get(zv);
      if (!entry) continue; // 中文词不在 glossary，跳过

      const enVal = (enFlat.get(p) || '').trim();
      if (!enVal) continue; // 空 en 值归 missing 检查，不归 glossary
      if (entry.allowed.has(enVal)) continue; // 允许的标准/别名

      // 非标准译法，记录违规
      summary.total_violations++;
      summary.by_term.set(zv, (summary.by_term.get(zv) || 0) + 1);
      summary.by_ns.set(ns, (summary.by_ns.get(ns) || 0) + 1);
      summary.by_category.set(entry.category, (summary.by_category.get(entry.category) || 0) + 1);

      if (summary.samples.length < 15) {
        summary.samples.push({
          ns,
          path: p,
          zh_term: zv,
          standard_en: entry.standard_en,
          actual_en: enVal.slice(0, 80),
          category: entry.category,
        });
      }
    }
  }

  // Map → Object 便于 JSON 序列化
  const report = {
    ...summary,
    by_term: Object.fromEntries([...summary.by_term.entries()].sort((a, b) => b[1] - a[1])),
    by_ns: Object.fromEntries([...summary.by_ns.entries()].sort((a, b) => b[1] - a[1])),
    by_category: Object.fromEntries([...summary.by_category.entries()].sort((a, b) => b[1] - a[1])),
  };

  if (JSON_MODE) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHuman(report);
  }

  if (STRICT && report.total_violations > 0) {
    if (!JSON_MODE) {
      console.error('\n❌ Glossary 一致性门禁未通过：存在 ' + report.total_violations + ' 处非标准译法。');
      console.error('   修复：运行 `node scripts/i18n/apply_glossary.js` 自动对齐，然后跑 TSC 验证。');
    }
    process.exit(1);
  }
  if (!JSON_MODE && STRICT) console.log('\n✅ Glossary 一致性门禁通过：无 TopN 术语非标准译法。');
}

function printHuman(r) {
  console.log('═'.repeat(60));
  console.log('  Glossary TopN 术语一致性审计');
  console.log('═'.repeat(60));
  console.log(`  加载 glossary 词条: ${r.glossary_terms_loaded}`);
  console.log(`  扫描命名空间: ${r.namespaces_scanned}`);
  console.log(`  非标准译法总数: ${r.total_violations}`);
  console.log('');

  if (r.total_violations === 0) {
    console.log('✅ 所有 glossary 标准译法 100% 一致，无违规。');
  } else {
    console.log('① 按违规词条 Top 10:');
    Object.entries(r.by_term)
      .slice(0, 10)
      .forEach(([term, n]) => console.log(`   · ${term.padEnd(12)} ${String(n).padStart(4)} 处`));
    console.log('');
    console.log('② 按命名空间 Top 10:');
    Object.entries(r.by_ns)
      .slice(0, 10)
      .forEach(([ns, n]) => console.log(`   · ${ns.padEnd(26)} ${String(n).padStart(4)} 处`));
    console.log('');
    console.log('③ 按类别:');
    Object.entries(r.by_category).forEach(([cat, n]) =>
      console.log(`   · ${cat.padEnd(16)} ${String(n).padStart(4)} 处`)
    );
    console.log('');
    console.log('④ 违规样本 (最多 15):');
    r.samples.forEach((s) => {
      console.log(`   [${s.ns}] ${s.path}`);
      console.log(`     zh="${s.zh_term}"  standard="${s.standard_en}"  actual="${s.actual_en}"  (${s.category})`);
    });
  }
}

main();
