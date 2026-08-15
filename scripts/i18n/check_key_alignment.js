#!/usr/bin/env node
/* eslint-disable no-console */
// 检查 en.json 和 zh.json 的 key 是否对齐（只检查嵌套路径，不检查扁平 key）
const fs = require('fs');
const path = require('path');

const EN_DIR = path.resolve(__dirname, '../../apps/web/src/i18n/locales/en');
const ZH_DIR = path.resolve(__dirname, '../../apps/web/src/i18n/locales/zh');

function flatten(obj, prefix = '', out = new Set()) {
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? prefix + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, p, out);
    else out.add(p);
  }
  return out;
}

function main() {
  const nsFiles = fs.readdirSync(EN_DIR).filter(f => f.endsWith('.json'));
  let totalMissingInEn = 0;
  let totalMissingInZh = 0;
  const report = [];

  for (const f of nsFiles) {
    const ns = f.replace('.json', '');
    const enPath = path.join(EN_DIR, f);
    const zhPath = path.join(ZH_DIR, f);
    if (!fs.existsSync(zhPath)) continue;

    const enObj = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const zhObj = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
    const enKeys = flatten(enObj);
    const zhKeys = flatten(zhObj);

    const missingInEn = [...zhKeys].filter(k => !enKeys.has(k));
    const missingInZh = [...enKeys].filter(k => !zhKeys.has(k));

    if (missingInEn.length > 0 || missingInZh.length > 0) {
      report.push({ ns, missingInEn: missingInEn.length, missingInZh: missingInZh.length });
      totalMissingInEn += missingInEn.length;
      totalMissingInZh += missingInZh.length;
    }
  }

  console.log('==== en/zh key 对齐检查 ====');
  console.log('en 缺少 zh 有的 key:', totalMissingInEn);
  console.log('zh 缺少 en 有的 key:', totalMissingInZh);
  if (report.length > 0) {
    console.log('\n不对齐的命名空间:');
    for (const r of report.sort((a, b) => b.missingInEn + b.missingInZh - a.missingInEn - a.missingInZh)) {
      console.log(`  ${r.ns}: en 缺 ${r.missingInEn}, zh 缺 ${r.missingInZh}`);
    }
  } else {
    console.log('✓ 所有命名空间 key 完全对齐');
  }
}

main();
