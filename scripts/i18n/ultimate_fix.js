#!/usr/bin/env node
/**
 * 终极修复：从 zh.json 原始值出发查翻译记忆，绕过 en 乱码值
 *
 * 策略：
 * 1. 扫描 en.json 找含中文的叶子
 * 2. 对每个含中文的 en 叶子，找 zh.json 同 path 的值
 * 3. 用翻译记忆库（zh 整句 → en 标准翻译）匹配 zh 值
 * 4. 如果匹配成功，直接替换 en 叶子值
 * 5. 如果不匹配，尝试 zh 子串匹配
 * 6. 剩余输出 pending
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ZH_DIR = path.join(__dirname, '..', '..', 'apps', 'web', 'src', 'i18n', 'locales', 'zh');
const EN_DIR = path.join(__dirname, '..', '..', 'apps', 'web', 'src', 'i18n', 'locales', 'en');

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

function buildTM() {
  const tm = new Map(); // zh_full -> Map(en -> count)
  const nsNames = fs.readdirSync(ZH_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
  const cjkRe = /[\u4e00-\u9fff]/;
  for (const ns of nsNames) {
    const zhObj = JSON.parse(fs.readFileSync(path.join(ZH_DIR, ns + '.json'), 'utf8'));
    const enObj = JSON.parse(fs.readFileSync(path.join(EN_DIR, ns + '.json'), 'utf8'));
    const zhFlat = flatten(zhObj);
    const enFlat = flatten(enObj);
    for (const [p, zhVal] of zhFlat) {
      const zv = (zhVal || '').trim();
      if (!zv || !cjkRe.test(zv)) continue;
      const ev = (enFlat.get(p) || '').trim();
      if (!ev || cjkRe.test(ev)) continue; // en 也是中文的跳过
      let m = tm.get(zv);
      if (!m) { m = new Map(); tm.set(zv, m); }
      m.set(ev, (m.get(ev) || 0) + 1);
    }
  }
  // 取最高频
  const tmBest = new Map();
  for (const [zh, ens] of tm) {
    const best = [...ens.entries()].sort((a, b) => b[1] - a[1])[0];
    tmBest.set(zh, best[0]);
  }
  return tmBest;
}

// 模板变量替换：把 ${xxx} / {{xxx}} 替换为占位符，查翻译记忆后再替换回来
function extractVars(s) {
  const vars = [];
  let placeholder = s.replace(/\$\{[^}]+\}/g, m => { vars.push(m); return `\x00VAR${vars.length-1}\x00`; });
  placeholder = placeholder.replace(/\{\{[^}]+\}\}/g, m => { vars.push(m); return `\x00VAR${vars.length-1}\x00`; });
  return { placeholder, vars };
}
function restoreVars(s, vars) {
  return s.replace(/\x00VAR(\d+)\x00/g, (_, i) => vars[parseInt(i)]);
}

function main() {
  console.log('[1/2] 构建翻译记忆库...');
  const tm = buildTM();
  console.log('  翻译记忆条目:', tm.size);

  console.log('[2/2] 从 zh.json 原始值出发修复...');
  const cjkRe = /[\u4e00-\u9fff]/;
  const nsNames = fs.readdirSync(EN_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));

  let totalFixed = 0;
  let exactMatch = 0;
  let varMatch = 0;
  let stillPending = 0;
  const pendingByNs = {};
  const pendingSamples = [];

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
      if (!ev || !cjkRe.test(ev)) continue; // en 没有中文，跳过

      // 从 zh.json 获取同 path 的原始中文值
      const zhVal = (zhFlat.get(p) || '').trim();
      if (!zhVal) {
        stillPending++;
        pendingByNs[ns] = (pendingByNs[ns] || 0) + 1;
        continue;
      }

      // 1. 精确匹配 zh 值
      const tmHit = tm.get(zhVal);
      if (tmHit) {
        setByPath(enNew, p, tmHit);
        changed = true;
        totalFixed++;
        exactMatch++;
        continue;
      }

      // 2. 模板变量匹配：去除变量后查翻译记忆
      const { placeholder, vars } = extractVars(zhVal);
      if (vars.length > 0) {
        const tmVarHit = tm.get(placeholder);
        if (tmVarHit) {
          const restored = restoreVars(tmVarHit, vars);
          setByPath(enNew, p, restored);
          changed = true;
          totalFixed++;
          varMatch++;
          continue;
        }
        // 也尝试用 zh 值里的变量名查找
        // 如果 zh 是 "加载${source}审计日志失败:"，尝试 "加载XXX审计日志失败:" 模式
      }

      // 3. 子串匹配：如果 zh 值在翻译记忆里有以该 zh 开头/结尾的条目
      // 尝试去除 zh 值里的变量后做模糊匹配
      let found = false;
      if (vars.length > 0) {
        // 用去除变量的 zh 值做 key，在 tm 里找包含该 key 的条目
        for (const [tmZh, tmEn] of tm) {
          if (tmZh === placeholder) {
            const restored = restoreVars(tmEn, vars);
            setByPath(enNew, p, restored);
            changed = true;
            totalFixed++;
            varMatch++;
            found = true;
            break;
          }
        }
      }
      if (found) continue;

      stillPending++;
      pendingByNs[ns] = (pendingByNs[ns] || 0) + 1;
      if (pendingSamples.length < 30) {
        pendingSamples.push({ ns, p, zh: zhVal, en: ev });
      }
    }

    if (changed) {
      fs.writeFileSync(enPath, JSON.stringify(enNew, null, 2) + '\n', 'utf8');
    }
  }

  console.log('\n========== 终极修复结果 ==========');
  console.log('  精确匹配修复      :', exactMatch);
  console.log('  模板变量匹配修复  :', varMatch);
  console.log('  总修复条数        :', totalFixed);
  console.log('  仍待处理          :', stillPending);
  if (stillPending > 0) {
    console.log('  按命名空间        :');
    for (const [ns, c] of Object.entries(pendingByNs).sort((a, b) => b[1] - a[1])) {
      console.log('    ' + ns + ': ' + c);
    }
    console.log('  样本（zh 原始值 → en 乱码值）:');
    for (const s of pendingSamples) {
      console.log('    [' + s.ns + '] zh=' + JSON.stringify(s.zh.slice(0, 40)) + ' en=' + JSON.stringify(s.en.slice(0, 40)));
    }
  }
}

main();
