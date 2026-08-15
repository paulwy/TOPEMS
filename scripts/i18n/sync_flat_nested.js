#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * 检查并同步混合结构：对每个 en.json，如果根对象有扁平 key（含点号），
 * 且对应的嵌套路径也有值，则用嵌套路径的值覆盖扁平 key。
 * 同时如果嵌套路径无值但扁平 key 有值，则用扁平 key 的值填充嵌套路径。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const EN_DIR = path.join(__dirname, '..', '..', 'apps', 'web', 'src', 'i18n', 'locales', 'en');
const CJK_RE = /[\u4e00-\u9fff]/;

function getNested(obj, dotPath) {
  const keys = dotPath.split('.');
  let cur = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[k];
  }
  return cur;
}

function setNested(obj, dotPath, value) {
  const keys = dotPath.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!cur[k] || typeof cur[k] !== 'object') cur[k] = {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
}

function main() {
  const nsFiles = fs.readdirSync(EN_DIR).filter(f => f.endsWith('.json'));
  let totalSynced = 0;
  let totalFlatWithCjk = 0;
  let totalNestedFixed = 0;

  for (const f of nsFiles) {
    const ns = f.replace('.json', '');
    const enPath = path.join(EN_DIR, f);
    const enObj = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const flatKeys = Object.keys(enObj).filter(k => k.includes('.'));
    if (flatKeys.length === 0) continue;

    let changed = false;
    let nsSynced = 0;
    let nsFlatCjk = 0;
    let nsNestedFixed = 0;

    for (const flatKey of flatKeys) {
      const flatVal = enObj[flatKey];
      const nestedVal = getNested(enObj, flatKey);

      if (nestedVal !== undefined && typeof nestedVal === 'string') {
        // 嵌套路径有值
        if (flatVal !== nestedVal) {
          // 用嵌套值覆盖扁平 key
          enObj[flatKey] = nestedVal;
          changed = true;
          nsSynced++;
          if (CJK_RE.test(flatVal || '') && !CJK_RE.test(nestedVal)) {
            nsFlatCjk++;
          }
        }
      } else if (flatVal !== undefined && typeof flatVal === 'string') {
        // 嵌套路径无值，但扁平 key 有值 → 填充嵌套路径
        setNested(enObj, flatKey, flatVal);
        changed = true;
        nsNestedFixed++;
      }
    }

    if (changed) {
      fs.writeFileSync(enPath, JSON.stringify(enObj, null, 2) + '\n', 'utf8');
    }
    totalSynced += nsSynced;
    totalFlatWithCjk += nsFlatCjk;
    totalNestedFixed += nsNestedFixed;
    if (nsSynced > 0 || nsNestedFixed > 0) {
      console.log(`  [${ns}] 同步扁平 key: ${nsSynced} (其中含中文扁平 key 被英文嵌套值覆盖: ${nsFlatCjk}), 填充嵌套: ${nsNestedFixed}`);
    }
  }

  console.log('\n========== 混合结构同步结果 ==========');
  console.log('  扁平 key 被嵌套值覆盖:', totalSynced);
  console.log('  其中含中文扁平 key 被修复:', totalFlatWithCjk);
  console.log('  嵌套路径被扁平值填充:', totalNestedFixed);
}

main();
