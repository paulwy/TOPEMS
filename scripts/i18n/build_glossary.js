#!/usr/bin/env node
/**
 * Phase-1: i18n 术语对照表 + 多译统计构建脚本
 *
 * 输入：apps/web/src/i18n/locales/zh/*.json 与 en/*.json（66 对命名空间）
 * 输出（scripts/i18n/ 下）：
 *   1. glossary_raw.json    : 中文词 → { 译法1: count, 译法2: count }
 *   2. glossary_multi.csv   : 多译候选（同一中文 ≥2 种译法，按「出现次数 × 译法种类数」降序）
 *   3. glossary_freq.csv    : 高频中文词 Top N（不管是否多译），按总出现次数降序
 *
 * 词组级覆盖：
 *   - 精确匹配层：对 zh 整句做"整句→译法"，先收集
 *   - 子串匹配层：中文词按 2/3/4-gram 切分，出现 ≥3 次才算高频子串，用于发现复合术语
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ZH_DIR = path.join(__dirname, '..', '..', 'apps', 'web', 'src', 'i18n', 'locales', 'zh');
const EN_DIR = path.join(__dirname, '..', '..', 'apps', 'web', 'src', 'i18n', 'locales', 'en');
const OUT_DIR = __dirname;

/** 递归提取所有叶子字符串值（dot-path → value） */
function flatten(obj, prefix = '', out = new Map()) {
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? prefix + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      flatten(v, p, out);
    } else if (typeof v === 'string') {
      out.set(p, v);
    }
  }
  return out;
}

/** 中文 2/3/4-gram 切分（仅针对 CJK 字符区间） */
function* ngrams(s, n) {
  if (!s) return;
  const chars = [...s]; // Unicode-safe
  for (let i = 0; i + n <= chars.length; i++) {
    const slice = chars.slice(i, i + n);
    // 所有字符必须是 CJK 汉字（不含标点/数字/字母/空白/emoji）
    if (slice.every(ch => /^\p{Script=Han}$/u.test(ch))) {
      yield slice.join('');
    }
  }
}

/** 对中文句子判断「业务化」：长度 ≥2 且含有中文 */
function isZhToken(s) {
  return typeof s === 'string' && s.length >= 2 && /\p{Script=Han}/u.test(s);
}

function main() {
  const nsNames = fs.readdirSync(ZH_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));

  // ---------- 1. 叶子级配对：zh 整句 → { en_phrase: count } ----------
  const exactZhToEns = new Map(); // zh_full -> Map(en_value -> count)
  // 词组级：对 zh 整句含有的子串做 ngram 聚合
  const ngramZhToEns = new Map(); // ngram_zh -> Map(en_full -> count)
  const ngramFreq = new Map();    // ngram_zh -> total occurrence (across sentences)
  // 反向：en → zh（用于发现反向多译，例如同一个英语词对应多个中文）
  const enToZhs = new Map();
  // 全叶子总配对
  let totalPairs = 0;
  let skippedNonZh = 0;

  for (const ns of nsNames) {
    const zhObj = JSON.parse(fs.readFileSync(path.join(ZH_DIR, ns + '.json'), 'utf8'));
    const enObj = JSON.parse(fs.readFileSync(path.join(EN_DIR, ns + '.json'), 'utf8'));
    const zhFlat = flatten(zhObj);
    const enFlat = flatten(enObj);

    for (const [p, zhVal] of zhFlat) {
      const enVal = (enFlat.get(p) || '').trim();
      const zv = zhVal.trim();
      if (!zv || !enVal) continue;
      if (!isZhToken(zv)) { skippedNonZh++; continue; }
      totalPairs++;

      // ---- 精确层 ----
      let m1 = exactZhToEns.get(zv);
      if (!m1) { m1 = new Map(); exactZhToEns.set(zv, m1); }
      m1.set(enVal, (m1.get(enVal) || 0) + 1);

      // ---- 反向 en -> zh ----
      let rm = enToZhs.get(enVal);
      if (!rm) { rm = new Map(); enToZhs.set(enVal, rm); }
      rm.set(zv, (rm.get(zv) || 0) + 1);

      // ---- 词组 ngram 层 ----
      for (const n of [2, 3, 4]) {
        for (const gram of ngrams(zv, n)) {
          let m2 = ngramZhToEns.get(gram);
          if (!m2) { m2 = new Map(); ngramZhToEns.set(gram, m2); }
          m2.set(enVal, (m2.get(enVal) || 0) + 1);
          ngramFreq.set(gram, (ngramFreq.get(gram) || 0) + 1);
        }
      }
    }
  }

  // ---------- 2. 统计：精确层 Top 多译 ----------
  // 精确层多译候选：同一 zh 对应 ≥2 种译法
  const exactMulti = [];
  for (const [zh, ens] of exactZhToEns) {
    if (ens.size < 2) continue;
    const total = [...ens.values()].reduce((a, b) => a + b, 0);
    const variants = [...ens.entries()].sort((a, b) => b[1] - a[1]);
    exactMulti.push({
      zh,
      total_count: total,
      variant_count: variants.length,
      // 严重度：出现次数高 + 译法种类多
      severity: total * variants.length,
      variants,
    });
  }
  exactMulti.sort((a, b) => b.severity - a.severity);

  // ---------- 3. 统计：ngram 层 Top 多译（高频子串 + 多种译法）----------
  const ngramMulti = [];
  for (const [gram, ens] of ngramZhToEns) {
    const freq = ngramFreq.get(gram) || 0;
    if (freq < 5) continue; // 低于 5 次不考虑（噪声过滤）
    if (ens.size < 2) continue; // 多种译法才算多译
    const variants = [...ens.entries()].sort((a, b) => b[1] - a[1]);
    ngramMulti.push({
      zh_ngram: gram,
      occurrence_freq: freq,
      variant_count: variants.length,
      severity: freq * variants.length,
      variants,
    });
  }
  ngramMulti.sort((a, b) => b.severity - a.severity);

  // ---------- 4. 高频中文词（不管是否多译，总出现次数降序）----------
  const freqList = [];
  for (const [zh, ens] of exactZhToEns) {
    const total = [...ens.values()].reduce((a, b) => a + b, 0);
    freqList.push({ zh, total_count: total, variant_count: ens.size });
  }
  freqList.sort((a, b) => b.total_count - a.total_count);

  // ---------- 5. 反向：多义词（同一英文对应多中文，可能是术语）----------
  const enMultiZh = [];
  for (const [en, zhs] of enToZhs) {
    if (zhs.size < 2) continue;
    // 过滤太短/无意义英文（长度 < 4 或全大写 2 字母缩写 OK 但单字母/符号跳过）
    if (en.length < 3) continue;
    if (!/[A-Za-z]/.test(en)) continue;
    const total = [...zhs.values()].reduce((a, b) => a + b, 0);
    const variants = [...zhs.entries()].sort((a, b) => b[1] - a[1]);
    enMultiZh.push({
      en,
      total_count: total,
      variant_count: variants.length,
      severity: total * variants.length,
      variants,
    });
  }
  enMultiZh.sort((a, b) => b.severity - a.severity);

  // ---------- 输出 JSON 原始数据 ----------
  const rawPath = path.join(OUT_DIR, 'glossary_raw.json');
  fs.writeFileSync(rawPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    stats: {
      total_pairs: totalPairs,
      skipped_non_zh: skippedNonZh,
      exact_zh_unique: exactZhToEns.size,
      exact_multi_zh_entries: exactMulti.length,
      ngram_234_unique: ngramZhToEns.size,
      ngram_multi_high_freq_entries: ngramMulti.length,
      en_multi_zh_entries: enMultiZh.length,
    },
    exact_multi_top100: exactMulti.slice(0, 100),
    ngram_multi_top100: ngramMulti.slice(0, 100),
    freq_top200: freqList.slice(0, 200),
    en_multi_zh_top100: enMultiZh.slice(0, 100),
  }, null, 2));
  console.log('[OK]', rawPath);

  // ---------- 输出 CSV：glossary_multi.csv（人工锁定 Top50 的主要依据）----------
  // 合并 exact_multi（优先，因为整句更可信）与 ngram_multi（补充），去重
  const csvHeader = [
    'rank',
    'category', // EXACT or NGRAM
    'zh_term',
    'total_count',
    'variant_count',
    'severity_score',
    'top_variant_1_en (count)',
    'top_variant_2_en (count)',
    'top_variant_3_en (count)',
    'other_variants',
  ];
  const csvRows = [csvHeader.join(',')];
  let rank = 0;
  const seen = new Set();
  const merged = [
    ...exactMulti.slice(0, 60).map(e => ({ ...e, cat: 'EXACT', zh_key: e.zh })),
    ...ngramMulti.slice(0, 60).map(e => ({ ...e, cat: 'NGRAM', zh_key: e.zh_ngram, total_count: e.occurrence_freq })),
  ].sort((a, b) => b.severity - a.severity);

  for (const item of merged) {
    if (seen.has(item.zh_key)) continue;
    seen.add(item.zh_key);
    rank++;
    if (rank > 80) break;
    const vars = [...item.variants];
    const v1 = vars[0] ? `${vars[0][0].replace(/"/g,'""')} (${vars[0][1]})` : '';
    const v2 = vars[1] ? `${vars[1][0].replace(/"/g,'""')} (${vars[1][1]})` : '';
    const v3 = vars[2] ? `${vars[2][0].replace(/"/g,'""')} (${vars[2][1]})` : '';
    const others = vars.slice(3).map(v => `${v[0]}(${v[1]})`).join(' | ').replace(/"/g,'""');
    csvRows.push([
      rank,
      item.cat,
      `"${item.zh_key.replace(/"/g,'""')}"`,
      item.total_count,
      item.variant_count,
      item.severity,
      `"${v1}"`,
      `"${v2}"`,
      `"${v3}"`,
      `"${others}"`,
    ].join(','));
  }
  const multiCsv = path.join(OUT_DIR, 'glossary_multi.csv');
  fs.writeFileSync(multiCsv, '\ufeff' + csvRows.join('\n'), 'utf8');
  console.log('[OK]', multiCsv, `(${csvRows.length - 1} rows)`);

  // ---------- 输出 CSV：glossary_freq.csv（高频中文词）----------
  const freqHeader = ['rank', 'zh_term', 'total_count', 'variant_count', 'top_en_translation'];
  const freqRows = [freqHeader.join(',')];
  for (let i = 0; i < Math.min(300, freqList.length); i++) {
    const item = freqList[i];
    const ens = exactZhToEns.get(item.zh) || new Map();
    const topEn = [...ens.entries()].sort((a, b) => b[1] - a[1])[0];
    freqRows.push([
      i + 1,
      `"${item.zh.replace(/"/g,'""')}"`,
      item.total_count,
      item.variant_count,
      topEn ? `"${topEn[0].replace(/"/g,'""')} (${topEn[1]})"` : '',
    ].join(','));
  }
  const freqCsv = path.join(OUT_DIR, 'glossary_freq.csv');
  fs.writeFileSync(freqCsv, '\ufeff' + freqRows.join('\n'), 'utf8');
  console.log('[OK]', freqCsv, `(${freqRows.length - 1} rows)`);

  // ---------- 控制台摘要 ----------
  console.log('\n========== 统计摘要 ==========');
  console.log('总叶子配对            :', totalPairs);
  console.log('跳过（无中文/短）     :', skippedNonZh);
  console.log('精确层多译条目（≥2译）:', exactMulti.length);
  console.log('ngram 高频多译条目    :', ngramMulti.length);
  console.log('反向多义（en→多zh）   :', enMultiZh.length);
  console.log('\nTop 20 EXACT 多译严重度:');
  for (let i = 0; i < 20 && i < exactMulti.length; i++) {
    const e = exactMulti[i];
    const vs = e.variants.slice(0, 3).map(([en, c]) => `"${en}"×${c}`).join(' / ');
    console.log(`  #${i + 1} [sev=${e.severity}] "${e.zh}" (${e.total_count}次/${e.variant_count}译): ${vs}`);
  }
  console.log('\nTop 20 NGRAM 多译严重度:');
  for (let i = 0; i < 20 && i < ngramMulti.length; i++) {
    const e = ngramMulti[i];
    const vs = e.variants.slice(0, 3).map(([en, c]) => `"${en}"×${c}`).join(' / ');
    console.log(`  #${i + 1} [sev=${e.severity}] "${e.zh_ngram}" (freq=${e.occurrence_freq}/${e.variant_count}译): ${vs}`);
  }
}

main();
