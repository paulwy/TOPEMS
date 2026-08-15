#!/usr/bin/env node
/* eslint-disable no-console */
// 扫描剩余假 en 值的 zh 原始值分布，决定修复策略
const fs = require('fs');
const path = require('path');

const EN_DIR = path.resolve(__dirname, '../../apps/web/src/i18n/locales/en');
const ZH_DIR = path.resolve(__dirname, '../../apps/web/src/i18n/locales/zh');
const CJK_RE = /[\u4e00-\u9fff]/;

function flatten(obj, prefix = '', out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, p, out);
    else if (typeof v === 'string') out.set(p, v);
  }
  return out;
}

function main() {
  const nsFiles = fs.readdirSync(EN_DIR).filter(f => f.endsWith('.json'));
  const zhFreq = new Map(); // zh_value -> [{ns, path, en}, ...]
  const jsxKeys = []; // JSX 片段 key
  const enPrefixKeys = []; // EN: 前缀
  const pathPrefixKeys = []; // 路径前缀混入

  for (const f of nsFiles) {
    const ns = f.replace('.json', '');
    const enObj = JSON.parse(fs.readFileSync(path.join(EN_DIR, f), 'utf8'));
    const zhObj = fs.existsSync(path.join(ZH_DIR, f)) ? JSON.parse(fs.readFileSync(path.join(ZH_DIR, f), 'utf8')) : {};
    const enFlat = flatten(enObj);
    const zhFlat = flatten(zhObj);

    for (const [p, ev] of enFlat) {
      const e = (ev || '').trim();
      if (!e || !CJK_RE.test(e)) continue;
      const zv = (zhFlat.get(p) || '').trim();

      // JSX 片段
      if (/(<\/|\/>|\n\s*>)/.test(e) && e.length > 50) {
        jsxKeys.push({ ns, path: p, en: e.slice(0, 80), zh: zv.slice(0, 80) });
        continue;
      }
      // EN: 前缀
      if (/^EN:/i.test(e)) {
        enPrefixKeys.push({ ns, path: p, en: e, zh: zv });
        continue;
      }
      // 路径前缀混入 (zh 也带前缀)
      if (/^[a-z_]+\.[\u4e00-\u9fff]/.test(zv)) {
        pathPrefixKeys.push({ ns, path: p, en: e, zh: zv });
      }

      // 收集 zh 值频率
      if (!zhFreq.has(zv)) zhFreq.set(zv, []);
      zhFreq.get(zv).push({ ns, path: p, en: e });
    }
  }

  // 唯一 zh 值
  const uniqueZh = [...zhFreq.entries()].sort((a, b) => b[1].length - a[1].length);
  console.log('==== 剩余假值 zh 原始值分布 ====');
  console.log('唯一 zh 值数量:', uniqueZh.length);
  console.log('总假值数:', uniqueZh.reduce((s, [, arr]) => s + arr.length, 0));
  console.log('\n高频 zh 值 (top 30, 出现 ≥2 次):');
  let multiCount = 0;
  for (const [zh, arr] of uniqueZh.slice(0, 30)) {
    if (arr.length < 2) break;
    multiCount += arr.length;
    console.log(`  [${arr.length}次] zh=${JSON.stringify(zh.slice(0, 50))}  en样本=${JSON.stringify(arr[0].en.slice(0, 50))}`);
  }
  const singleCount = uniqueZh.filter(([, arr]) => arr.length === 1).length;
  console.log(`\n出现 ≥2 次的 zh 值: ${uniqueZh.filter(([, a]) => a.length >= 2).length} 个 (覆盖 ${multiCount} 条假值)`);
  console.log(`仅出现 1 次的 zh 值: ${singleCount} 个`);

  console.log(`\n==== 其他类型 ====`);
  console.log('JSX 片段 key:', jsxKeys.length);
  console.log('EN: 前缀:', enPrefixKeys.length);
  console.log('路径前缀混入:', pathPrefixKeys.length);

  // 输出待 LLM 翻译的唯一 zh 值
  const toTranslate = uniqueZh
    .filter(([, arr]) => arr.length >= 1)
    .map(([zh]) => zh)
    .filter(zh => zh && !/(<\/|\/>|\n\s*>)/.test(zh) && zh.length < 200);
  fs.writeFileSync(
    path.resolve(__dirname, 'remaining_zh_for_llm.json'),
    JSON.stringify(toTranslate, null, 2)
  );
  console.log(`\n待翻译唯一 zh 值已写入: scripts/i18n/remaining_zh_for_llm.json (${toTranslate.length} 条)`);
}

main();
