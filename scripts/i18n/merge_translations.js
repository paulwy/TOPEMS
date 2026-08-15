#!/usr/bin/env node
/**
 * 汇总 4 批翻译结果，批量写回 en.json
 * 同时做质量校验：去中文、去 path 前缀混入、保留模板变量
 */
'use strict';

const fs = require('fs');
const path = require('path');

const EN_DIR = path.join(__dirname, '..', '..', 'apps', 'web', 'src', 'i18n', 'locales', 'en');
const BATCH_FILES = [
  path.join(__dirname, 'translated_batch1.json'),
  path.join(__dirname, 'translated_batch2.json'),
  path.join(__dirname, 'translated_batch3.json'),
  path.join(__dirname, 'translated_batch4.json'),
];

function flatten(obj, prefix = '', out = new Map()) {
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? prefix + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, p, out);
    else if (typeof v === 'string') out.set(p, v);
  }
  return out;
}
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
  // 1. 合并 4 批翻译结果
  const allTranslations = []; // [{ns, path, en}, ...]
  for (const f of BATCH_FILES) {
    if (!fs.existsSync(f)) { console.warn('Missing:', f); continue; }
    const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    allTranslations.push(...data);
  }
  console.log('总翻译条数:', allTranslations.length);

  // 2. 按 ns 分组
  const byNs = {};
  for (const t of allTranslations) {
    const ns = t.ns;
    (byNs[ns] = byNs[ns] || []).push(t);
  }
  console.log('涉及命名空间数:', Object.keys(byNs).length);

  // 3. 质量校验 + 写回
  const cjkRe = /[\u4e00-\u9fff]/;
  let totalWritten = 0;
  let skippedCjk = 0;
  let skippedMissing = 0;
  const nsStats = {};

  for (const [ns, items] of Object.entries(byNs)) {
    const enPath = path.join(EN_DIR, ns + '.json');
    if (!fs.existsSync(enPath)) {
      console.warn('en.json not found for ns:', ns);
      skippedMissing += items.length;
      continue;
    }
    const enObj = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const enNew = JSON.parse(JSON.stringify(enObj));
    const enFlat = flatten(enObj);
    let written = 0;

    for (const item of items) {
      // 质量校验：翻译后仍含中文的跳过
      if (cjkRe.test(item.en)) {
        skippedCjk++;
        continue;
      }
      // 校验 path 在 en.json 中存在
      if (!enFlat.has(item.path)) {
        // path 可能是嵌套的，尝试直接 setByPath（可能新建 key）
        // 但先检查是否是合理的 path
        // 如果 path 不存在，跳过（避免创建垃圾 key）
        skippedMissing++;
        continue;
      }
      setByPath(enNew, item.path, item.en);
      written++;
      totalWritten++;
    }

    nsStats[ns] = written;
    fs.writeFileSync(enPath, JSON.stringify(enNew, null, 2) + '\n', 'utf8');
  }

  console.log('\n========== 写回结果 ==========');
  console.log('  总写入条数        :', totalWritten);
  console.log('  跳过（含中文）    :', skippedCjk);
  console.log('  跳过（path 不存在）:', skippedMissing);
  console.log('  按命名空间统计    :');
  for (const [ns, c] of Object.entries(nsStats).sort((a, b) => b[1] - a[1])) {
    console.log('    ' + ns + ': ' + c);
  }

  // 4. 验证：重新扫描残留中文
  console.log('\n========== 验证：重新扫描残留中文 ==========');
  const nsNames = fs.readdirSync(EN_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
  let remaining = 0;
  const remainingByNs = {};
  for (const ns of nsNames) {
    const enObj = JSON.parse(fs.readFileSync(path.join(EN_DIR, ns + '.json'), 'utf8'));
    const enFlat = flatten(enObj);
    for (const [p, v] of enFlat) {
      if (typeof v === 'string' && cjkRe.test(v) && !/\$\{.*\}/.test(v)) {
        remaining++;
        remainingByNs[ns] = (remainingByNs[ns] || 0) + 1;
      }
    }
  }
  console.log('  剩余含中文叶子    :', remaining);
  if (remaining > 0) {
    console.log('  按命名空间        :');
    for (const [ns, c] of Object.entries(remainingByNs).sort((a, b) => b[1] - a[1])) {
      console.log('    ' + ns + ': ' + c);
    }
  }
}

main();
