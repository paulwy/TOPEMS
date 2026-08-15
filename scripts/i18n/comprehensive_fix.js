#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * 综合清洗：处理剩余 3 类假 en 值
 * 1. 路径前缀混入：去掉 zh/en 值里的 "xxx." 前缀，保留纯值
 * 2. EN: 前缀：去掉 "EN:" 前缀
 * 3. JSX 片段 key：从 en.json 删除这些 key（源码本就不该有）
 * 4. 清洗后重新查翻译记忆
 */
'use strict';

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

function deleteByPath(obj, dotPath) {
  const keys = dotPath.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!cur[k] || typeof cur[k] !== 'object') return false;
    cur = cur[k];
  }
  return delete cur[keys[keys.length - 1]];
}

// 提取路径前缀后的纯值
function stripPrefix(s) {
  // "bimoduledetail.改进" -> "改进"
  // "bianalytics.供应链" -> "供应链"
  // 但 "bireport.bi_报表" -> "bi_报表" (第二个 . 后)
  const m = s.match(/^([a-z_][a-z0-9_]*(?:\.[a-z_0-9]+)*)\.(.+)$/);
  if (m && CJK_RE.test(m[2])) return m[2];
  return s;
}

function extractVars(s) {
  const vars = [];
  let placeholder = s.replace(/\$\{[^}]+\}/g, m => { vars.push(m); return `\x00VAR${vars.length - 1}\x00`; });
  placeholder = placeholder.replace(/\{\{[^}]+\}\}/g, m => { vars.push(m); return `\x00VAR${vars.length - 1}\x00`; });
  return { placeholder, vars };
}
function restoreVars(s, vars) {
  return s.replace(/\x00VAR(\d+)\x00/g, (_, i) => vars[parseInt(i)]);
}

function buildTM() {
  const tm = new Map();
  const nsNames = fs.readdirSync(ZH_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
  for (const ns of nsNames) {
    const zhObj = JSON.parse(fs.readFileSync(path.join(ZH_DIR, ns + '.json'), 'utf8'));
    const enObj = JSON.parse(fs.readFileSync(path.join(EN_DIR, ns + '.json'), 'utf8'));
    const zhFlat = flatten(zhObj);
    const enFlat = flatten(enObj);
    for (const [p, zhVal] of zhFlat) {
      const zv = (zhVal || '').trim();
      if (!zv || !CJK_RE.test(zv)) continue;
      const ev = (enFlat.get(p) || '').trim();
      if (!ev || CJK_RE.test(ev)) continue;
      let m = tm.get(zv);
      if (!m) { m = new Map(); tm.set(zv, m); }
      m.set(ev, (m.get(ev) || 0) + 1);
    }
  }
  const tmBest = new Map();
  for (const [zh, ens] of tm) {
    const best = [...ens.entries()].sort((a, b) => b[1] - a[1])[0];
    tmBest.set(zh, best[0]);
  }
  return tmBest;
}

function main() {
  console.log('[1/4] 构建翻译记忆库...');
  const tm = buildTM();
  console.log('  翻译记忆条目:', tm.size);

  const nsNames = fs.readdirSync(EN_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
  let totalFixed = 0;
  let totalDeleted = 0;
  let stillPending = 0;
  const pendingByNs = {};
  const pendingSamples = [];
  const pendingZhSet = new Set();

  for (const ns of nsNames) {
    const zhPath = path.join(ZH_DIR, ns + '.json');
    const enPath = path.join(EN_DIR, ns + '.json');
    if (!fs.existsSync(zhPath)) continue;
    const zhObj = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
    const enObj = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const enNew = JSON.parse(JSON.stringify(enObj));
    const zhFlat = flatten(zhObj);
    const enFlat = flatten(enObj);
    let changed = false;
    let deletedInNs = 0;

    // 第一遍：收集要删除的 JSX key
    const keysToDelete = [];
    for (const [p, enVal] of enFlat) {
      const ev = (enVal || '').trim();
      if (!ev || !CJK_RE.test(ev)) continue;
      // JSX 片段：含 </ /> 或多行 > 的代码
      if (/(<\/|\/>|^>\s*\n|\n\s*>)/.test(ev) && ev.length > 50) {
        keysToDelete.push(p);
      }
    }
    for (const p of keysToDelete) {
      if (deleteByPath(enNew, p)) {
        totalDeleted++;
        deletedInNs++;
        changed = true;
      }
    }

    // 第二遍：修复剩余假值
    // 重新 flatten enNew（删除后）
    const enNewFlat = flatten(enNew);
    for (const [p, enVal] of enNewFlat) {
      const ev = (enVal || '').trim();
      if (!ev || !CJK_RE.test(ev)) continue;

      let zhVal = (zhFlat.get(p) || '').trim();
      if (!zhVal) {
        stillPending++;
        pendingByNs[ns] = (pendingByNs[ns] || 0) + 1;
        continue;
      }

      // 1. 去 EN: 前缀
      let enClean = ev.replace(/^EN:\s*/i, '').trim();

      // 2. zh 值去路径前缀
      let zhClean = stripPrefix(zhVal);
      // 也处理 zh 值本身是 "xxx.中文" 的情况
      if (zhClean !== zhVal) {
        zhVal = zhClean;
      }

      // 3. 精确匹配 zh 值（清洗后）
      const tmHit = tm.get(zhVal);
      if (tmHit && !CJK_RE.test(tmHit)) {
        setByPath(enNew, p, tmHit);
        changed = true;
        totalFixed++;
        continue;
      }

      // 4. 模板变量匹配
      const { placeholder, vars } = extractVars(zhVal);
      if (vars.length > 0) {
        const tmVarHit = tm.get(placeholder);
        if (tmVarHit && !CJK_RE.test(tmVarHit)) {
          const restored = restoreVars(tmVarHit, vars);
          setByPath(enNew, p, restored);
          changed = true;
          totalFixed++;
          continue;
        }
      }

      // 5. 如果 en 清洗后已经是纯英文（去 EN: 前缀后），保留
      if (!CJK_RE.test(enClean) && enClean) {
        setByPath(enNew, p, enClean);
        changed = true;
        totalFixed++;
        continue;
      }

      // 6. 仍待处理：收集唯一 zh 值供 LLM 翻译
      stillPending++;
      pendingByNs[ns] = (pendingByNs[ns] || 0) + 1;
      pendingZhSet.add(zhVal);
      if (pendingSamples.length < 50) {
        pendingSamples.push({ ns, p, zh: zhVal, en: ev });
      }
    }

    if (changed) {
      fs.writeFileSync(enPath, JSON.stringify(enNew, null, 2) + '\n', 'utf8');
    }
    if (deletedInNs > 0) {
      console.log(`  [${ns}] 删除 ${deletedInNs} 个 JSX 片段 key`);
    }
  }

  console.log('\n========== 综合清洗结果 ==========');
  console.log('  翻译记忆修复      :', totalFixed);
  console.log('  删除 JSX key      :', totalDeleted);
  console.log('  仍待 LLM 翻译     :', stillPending);
  console.log('  唯一 zh 值        :', pendingZhSet.size);

  if (stillPending > 0) {
    console.log('\n  按命名空间:');
    for (const [ns, c] of Object.entries(pendingByNs).sort((a, b) => b[1] - a[1])) {
      console.log('    ' + ns + ': ' + c);
    }
  }

  // 输出待 LLM 翻译的唯一 zh 值
  const toTranslate = [...pendingZhSet].filter(zh => zh && !/(<\/|\/>|^>\s*\n|\n\s*>)/.test(zh));
  fs.writeFileSync(
    path.resolve(__dirname, 'pending_llm_translate.json'),
    JSON.stringify(toTranslate, null, 2)
  );
  console.log('\n待翻译唯一 zh 值已写入: scripts/i18n/pending_llm_translate.json (' + toTranslate.length + ' 条)');
}

main();
