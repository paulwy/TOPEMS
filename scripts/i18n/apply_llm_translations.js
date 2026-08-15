#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * 回填 LLM 翻译结果到 en.json
 * 1. 加载 llm_translations.json 构建 zh→en 映射
 * 2. 扫描 en.json 含中文的叶子
 * 3. 取 zh.json 同 path 值，清洗路径前缀
 * 4. 查映射表替换
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
  // 先检查是否是直接 key（处理 key 本身含点号的扁平结构）
  if (Object.prototype.hasOwnProperty.call(obj, dotPath)) {
    obj[dotPath] = value;
    return;
  }
  const keys = dotPath.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!cur[k] || typeof cur[k] !== 'object' || Array.isArray(cur[k])) cur[k] = {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
}

function stripPrefix(s) {
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

function main() {
  console.log('[1/3] 加载 LLM 翻译结果...');
  const tm = new Map();
  const files = ['llm_translations.json', 'llm_translations_round2.json'];
  for (const f of files) {
    const fp = path.join(__dirname, f);
    if (!fs.existsSync(fp)) continue;
    const translations = JSON.parse(fs.readFileSync(fp, 'utf8'));
    for (const { zh, en } of translations) {
      tm.set(zh, en);
      const stripped = stripPrefix(zh);
      if (stripped !== zh) tm.set(stripped, en);
    }
  }
  console.log('  翻译映射条目:', tm.size);

  console.log('[2/3] 扫描 en.json 并回填...');
  const nsNames = fs.readdirSync(EN_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
  let totalFixed = 0;
  let stillPending = 0;
  const pendingByNs = {};
  const pendingSamples = [];
  const stillPendingZh = new Set();

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

    for (const [p, enVal] of enFlat) {
      const ev = (enVal || '').trim();
      if (!ev || !CJK_RE.test(ev)) continue;

      let zhVal = (zhFlat.get(p) || '').trim();
      if (!zhVal) {
        stillPending++;
        pendingByNs[ns] = (pendingByNs[ns] || 0) + 1;
        continue;
      }

      // 去路径前缀
      const zhStripped = stripPrefix(zhVal);
      if (zhStripped !== zhVal) zhVal = zhStripped;

      // 1. 精确匹配
      const hit = tm.get(zhVal);
      if (hit && !CJK_RE.test(hit)) {
        setByPath(enNew, p, hit);
        changed = true;
        totalFixed++;
        continue;
      }

      // 2. 模板变量匹配
      const { placeholder, vars } = extractVars(zhVal);
      if (vars.length > 0) {
        const varHit = tm.get(placeholder);
        if (varHit && !CJK_RE.test(varHit)) {
          const restored = restoreVars(varHit, vars);
          setByPath(enNew, p, restored);
          changed = true;
          totalFixed++;
          continue;
        }
      }

      // 3. 去 EN: 前缀后再查翻译表
      const enClean = ev.replace(/^EN:\s*/i, '').trim();
      if (enClean && CJK_RE.test(enClean)) {
        // 去前缀后仍是中文，查翻译表
        const enCleanStripped = stripPrefix(enClean);
        const hit2 = tm.get(enCleanStripped) || tm.get(enClean);
        if (hit2 && !CJK_RE.test(hit2)) {
          setByPath(enNew, p, hit2);
          changed = true;
          totalFixed++;
          continue;
        }
      } else if (enClean) {
        // 去前缀后是纯英文，直接用
        setByPath(enNew, p, enClean);
        changed = true;
        totalFixed++;
        continue;
      }

      stillPending++;
      pendingByNs[ns] = (pendingByNs[ns] || 0) + 1;
      stillPendingZh.add(zhVal);
      if (pendingSamples.length < 30) {
        pendingSamples.push({ ns, p, zh: zhVal, en: ev });
      }
    }

    if (changed) {
      fs.writeFileSync(enPath, JSON.stringify(enNew, null, 2) + '\n', 'utf8');
    }
  }

  console.log('\n========== LLM 翻译回填结果 ==========');
  console.log('  回填修复         :', totalFixed);
  console.log('  仍待处理         :', stillPending);
  console.log('  唯一未匹配 zh 值 :', stillPendingZh.size);
  if (stillPending > 0) {
    console.log('\n  按命名空间:');
    for (const [ns, c] of Object.entries(pendingByNs).sort((a, b) => b[1] - a[1])) {
      console.log('    ' + ns + ': ' + c);
    }
    console.log('\n  样本:');
    for (const s of pendingSamples) {
      console.log('    [' + s.ns + '] zh=' + JSON.stringify(s.zh.slice(0, 60)) + ' en=' + JSON.stringify(s.en.slice(0, 60)));
    }
  }
}

main();
