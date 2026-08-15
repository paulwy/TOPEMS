#!/usr/bin/env node
/**
 * Phase-2: i18n glossary 强制对齐脚本
 *
 * 输入：scripts/i18n/glossary.csv（zh_term → standard_en + allowed_aliases + notes）
 *       apps/web/src/i18n/locales/zh/*.json  匹配中文叶子（用叶子原值精确匹配）
 *       apps/web/src/i18n/locales/en/*.json  目标修改对象
 *
 * 替换算法：
 *   对每一个 zh/en 命名空间文件对，提取相同 path 的叶子：
 *     if zh_value === glossary.zh_term (精确匹配)：
 *       if en_value !== standard_en
 *          AND en_value 不在 allowed_aliases 中
 *          AND en_value !== '' (missing)：
 *         → 把 en_value 替换成 standard_en
 *
 * 同时会输出审计报告（scripts/i18n/glossary_apply_report.json），
 * 并在 --dry-run 模式下只报告不写入。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const ZH_DIR = path.join(__dirname, '..', '..', 'apps', 'web', 'src', 'i18n', 'locales', 'zh');
const EN_DIR = path.join(__dirname, '..', '..', 'apps', 'web', 'src', 'i18n', 'locales', 'en');
const CSV_PATH = path.join(__dirname, 'glossary.csv');
const REPORT_PATH = path.join(__dirname, 'glossary_apply_report.json');

/** 读取 glossary.csv 成 map */
function readGlossary(csvPath) {
  const raw = fs.readFileSync(csvPath, 'utf8').replace(/^\ufeff/, '');
  const lines = raw.split(/\r?\n/);
  const glossary = new Map(); // zh_term -> { standard_en, category, allowed:Set, notes }
  for (const line of lines) {
    if (!line.trim()) continue;
    if (/^\s*#/.test(line)) continue;
    // 解析简单 CSV（无嵌套引号 + 逗号组合的复杂情况足够；本 glossary 无这种）
    const cells = line.match(/(".*?"|[^,]+)/g) || [];
    if (cells.length < 2) continue;
    const unquote = s => (s && s.startsWith('"')) ? s.slice(1, -1).replace(/""/g, '"') : (s || '');
    const zh = unquote(cells[0]);
    const en = unquote(cells[1]);
    const cat = unquote(cells[2]);
    const notes = unquote(cells[3]);
    const aliasesRaw = unquote(cells[4]) || '';
    const allowed = new Set(
      aliasesRaw.split(/\s*,\s*/).map(s => s.trim()).filter(Boolean)
    );
    if (!zh || !en) continue;
    // 允许 standard_en 本身（防止反复匹配）
    allowed.add(en);
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

/** 把扁平 Map 还原回嵌套 JSON 对象（保留原对象未 touched 的所有字段） */
function setByPath(obj, dotPath, value) {
  const keys = dotPath.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!cur[k] || typeof cur[k] !== 'object' || Array.isArray(cur[k])) cur[k] = {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
}

function main() {
  const glossary = readGlossary(CSV_PATH);
  console.log('[glossary] 加载词条:', glossary.size);

  const nsNames = fs.readdirSync(ZH_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));

  // 审计统计
  const perNsStats = {}; // ns -> { changes: [ {path, old, new, zh_term, standard_en, category} ] }
  let globalReplacements = 0;
  const globalByCategory = {};
  const perTermStats = new Map(); // zh_term -> count

  for (const ns of nsNames) {
    const zhObj = JSON.parse(fs.readFileSync(path.join(ZH_DIR, ns + '.json'), 'utf8'));
    const enObj = JSON.parse(fs.readFileSync(path.join(EN_DIR, ns + '.json'), 'utf8'));
    // 深拷贝 enObj（用于后续 setByPath 写回）
    const enObjNew = JSON.parse(JSON.stringify(enObj));
    const zhFlat = flatten(zhObj);
    const enFlat = flatten(enObj);
    const stats = [];
    let changed = false;

    for (const [p, zhVal] of zhFlat) {
      const zv = (zhVal || '').trim();
      if (!zv) continue;
      const enVal = (enFlat.get(p) || '').trim();
      if (!enVal) continue;
      const entry = glossary.get(zv);
      if (!entry) continue;
      if (entry.allowed.has(enVal)) continue; // standard_en 或 allowed_aliases 内都保留
      // 需要替换
      stats.push({
        path: ns + '.' + p,
        old_en: enVal,
        new_en: entry.standard_en,
        zh_term: zv,
        category: entry.category || '',
        notes: entry.notes || '',
      });
      setByPath(enObjNew, p, entry.standard_en);
      changed = true;
      globalReplacements++;
      globalByCategory[entry.category || ''] = (globalByCategory[entry.category || ''] || 0) + 1;
      perTermStats.set(zv, (perTermStats.get(zv) || 0) + 1);
    }

    perNsStats[ns] = {
      change_count: stats.length,
      changes: stats,
    };
    if (changed && !DRY_RUN) {
      fs.writeFileSync(path.join(EN_DIR, ns + '.json'), JSON.stringify(enObjNew, null, 2) + '\n', 'utf8');
    }
  }

  // 生成审计报告
  const topTerms = [...perTermStats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50).map(([t, c]) => ({ zh_term: t, count: c }));
  const report = {
    generated_at: new Date().toISOString(),
    mode: DRY_RUN ? 'DRY-RUN' : 'APPLY',
    total_replacements: globalReplacements,
    by_category: globalByCategory,
    by_namespace: Object.fromEntries(
      Object.entries(perNsStats).map(([ns, s]) => [ns, { count: s.change_count, sample: s.changes.slice(0, 5) }])
    ).sort ? Object.fromEntries(
      Object.entries(perNsStats)
        .map(([ns, s]) => [ns, { count: s.change_count, sample: s.changes.slice(0, 5) }])
        .sort((a, b) => b[1].count - a[1].count)
    ) : {},
    top_terms: topTerms,
    full_by_namespace: perNsStats,
  };
  // 修正 by_namespace 为按 count 排序
  const sortedNs = Object.entries(report.by_namespace).sort((a, b) => b[1].count - a[1].count);
  report.by_namespace = Object.fromEntries(sortedNs);
  report.changed_ns_count = sortedNs.filter(([, v]) => v.count > 0).length;

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');

  console.log(`\n[${DRY_RUN ? 'DRY-RUN' : 'APPLY'}] 完成`);
  console.log('  总替换条数          :', globalReplacements);
  console.log('  发生改动的命名空间  :', report.changed_ns_count, '/', nsNames.length);
  console.log('  按分类统计          :', JSON.stringify(globalByCategory));
  console.log('  Top 20 受影响词条   :');
  for (let i = 0; i < Math.min(20, topTerms.length); i++) {
    const t = topTerms[i];
    const std = glossary.get(t.zh_term)?.standard_en || '';
    console.log(`    #${i + 1}  "${t.zh_term}"→"${std}"  ×${t.count}`);
  }
  console.log('  Top 15 受影响命名空间:');
  const nsSorted = Object.entries(report.by_namespace).sort((a, b) => b[1].count - a[1].count);
  for (let i = 0; i < Math.min(15, nsSorted.length); i++) {
    const [ns, v] = nsSorted[i];
    if (v.count === 0) break;
    console.log(`    ${ns}: ${v.count}`);
  }
  console.log('\n审计报告已写入:', REPORT_PATH);
}

main();
