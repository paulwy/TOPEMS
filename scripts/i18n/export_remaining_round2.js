#!/usr/bin/env node
/* eslint-disable no-console */
// 导出剩余待翻译的唯一 zh 值
const fs = require('fs');
const path = require('path');

const ZH_DIR = path.join(__dirname, '..', '..', 'apps', 'web', 'src', 'i18n', 'locales', 'zh');
const EN_DIR = path.join(__dirname, '..', '..', 'apps', 'web', 'src', 'i18n', 'locales', 'en');
const CJK_RE = /[\u4e00-\u9fff]/;

function flatten(obj, prefix = '', out = new Map()) {
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? prefix + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, p, out);
    else if (typeof v === 'string') out.set(p, v);
  }
  return out;
}

function stripPrefix(s) {
  const m = s.match(/^([a-z_][a-z0-9_]*(?:\.[a-z_0-9]+)*)\.(.+)$/);
  if (m && CJK_RE.test(m[2])) return m[2];
  return s;
}

function main() {
  const translations = JSON.parse(fs.readFileSync(path.join(__dirname, 'llm_translations.json'), 'utf8'));
  const tm = new Set();
  for (const { zh } of translations) {
    tm.add(zh);
    tm.add(stripPrefix(zh));
  }

  const nsNames = fs.readdirSync(EN_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
  const pendingZh = new Map(); // zh -> count

  for (const ns of nsNames) {
    const zhPath = path.join(ZH_DIR, ns + '.json');
    const enPath = path.join(EN_DIR, ns + '.json');
    if (!fs.existsSync(zhPath)) continue;
    const zhObj = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
    const enObj = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const zhFlat = flatten(zhObj);
    const enFlat = flatten(enObj);

    for (const [p, enVal] of enFlat) {
      const ev = (enVal || '').trim();
      if (!ev || !CJK_RE.test(ev)) continue;
      let zhVal = (zhFlat.get(p) || '').trim();
      if (!zhVal) continue;
      const stripped = stripPrefix(zhVal);
      if (stripped !== zhVal) zhVal = stripped;
      if (tm.has(zhVal)) continue;
      // 模板变量版本也检查
      const zhNoVar = zhVal.replace(/\{\{[^}]+\}\}/g, '{{x}}').replace(/\$\{[^}]+\}/g, '${x}');
      if (tm.has(zhNoVar)) continue;
      pendingZh.set(zhVal, (pendingZh.get(zhVal) || 0) + 1);
    }
  }

  const arr = [...pendingZh.entries()].sort((a, b) => b[1] - a[1]);
  console.log('剩余唯一 zh 值:', arr.length);
  arr.forEach(([zh, n], i) => console.log((i + 1) + '. [' + n + '] ' + JSON.stringify(zh)));

  fs.writeFileSync(
    path.join(__dirname, 'pending_llm_translate_round2.json'),
    JSON.stringify(arr.map(([zh]) => zh), null, 2)
  );
  console.log('\n已写入: scripts/i18n/pending_llm_translate_round2.json');
}

main();
