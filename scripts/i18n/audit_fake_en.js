#!/usr/bin/env node
/* eslint-disable no-console */
// 审计 en.json 中残留的"假 en 值"（实际仍是中文或乱码）
// 输出: 按命名空间 + 按类型分类的统计

const fs = require('fs');
const path = require('path');

const EN_DIR = path.resolve(__dirname, '../../apps/web/src/i18n/locales/en');
const ZH_DIR = path.resolve(__dirname, '../../apps/web/src/i18n/locales/zh');

const CJK_RE = /[\u4e00-\u9fff]/;
// 模板变量: {{name}} {name} ${name} %s %d {0}
const VAR_RE = /\{\{[^}]+\}\}|\{[^}]+\}|\$\{[^}]+\}|%[sd]|\{\d+\}/;
// 路径前缀: foo.bar. 后面跟值
const PREFIX_RE = /^([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)+)\.([\s\S]+)$/;
// 纯英文/标点/数字/模板变量
const PURE_EN_RE = /^[A-Za-z0-9\s\-_.,:;!?'"`()/\\@#$%^&*+=<>{}[\]|~&"'—–\-…·•°©®™✓✗→←↑↓]+$/;

function flatten(obj, prefix = '', out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      flatten(v, p, out);
    } else if (typeof v === 'string') {
      out.set(p, v);
    } else {
      out.set(p, String(v));
    }
  }
  return out;
}

function classify(enVal, zhVal) {
  const ev = (enVal || '').trim();
  const zv = (zhVal || '').trim();
  if (!ev) return 'empty';
  if (!CJK_RE.test(ev)) return 'ok'; // 纯英文/符号
  // en 含中文
  // 1. en === zh 完全没翻译
  if (zv && ev === zv) return 'untranslated';
  // 2. en 是 zh 的子串 / zh 是 en 的子串 (机翻残留)
  if (zv && (ev.includes(zv) || zv.includes(ev))) return 'partial_machine';
  // 3. en 含中文但还有英文/变量 (中英混杂)
  if (/[A-Za-z]{2,}/.test(ev) || VAR_RE.test(ev)) return 'mixed_cjk_en';
  // 4. 纯中文 (没翻译)
  if (!/[A-Za-z]/.test(ev)) return 'pure_cjk';
  // 5. 其他乱码
  return 'garbage';
}

function main() {
  if (!fs.existsSync(EN_DIR)) {
    console.error('EN_DIR not found:', EN_DIR);
    process.exit(1);
  }
  const nsFiles = fs.readdirSync(EN_DIR).filter(f => f.endsWith('.json'));
  const stats = {
    total_leaves: 0,
    ok: 0,
    fake_total: 0,
    by_type: {},
    by_ns: {},
  };
  const samples = { untranslated: [], partial_machine: [], mixed_cjk_en: [], pure_cjk: [], garbage: [] };

  for (const f of nsFiles) {
    const ns = f.replace('.json', '');
    let enObj, zhObj;
    try {
      enObj = JSON.parse(fs.readFileSync(path.join(EN_DIR, f), 'utf8'));
    } catch (e) {
      console.warn('skip (en parse error):', f);
      continue;
    }
    try {
      zhObj = JSON.parse(fs.readFileSync(path.join(ZH_DIR, f), 'utf8'));
    } catch (e) {
      zhObj = {};
    }
    const enFlat = flatten(enObj);
    const zhFlat = flatten(zhObj);
    let nsFake = 0;
    for (const [p, ev] of enFlat) {
      stats.total_leaves++;
      const zv = zhFlat.get(p) || '';
      const t = classify(ev, zv);
      if (t === 'ok') { stats.ok++; continue; }
      if (t === 'empty') { stats.ok++; continue; }
      stats.fake_total++;
      nsFake++;
      stats.by_type[t] = (stats.by_type[t] || 0) + 1;
      if (samples[t].length < 5) {
        samples[t].push({ ns, path: p, en: ev.slice(0, 120), zh: zv.slice(0, 120) });
      }
    }
    if (nsFake > 0) stats.by_ns[ns] = nsFake;
  }

  console.log('==== en.json 假值审计 ====');
  console.log('总叶子数:', stats.total_leaves);
  console.log('OK (纯英文):', stats.ok);
  console.log('假 en 值总数:', stats.fake_total);
  console.log('\n按类型分布:');
  for (const [t, n] of Object.entries(stats.by_type).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${t.padEnd(20)} ${n}`);
  }
  console.log('\n按命名空间分布 (top 20):');
  const nsList = Object.entries(stats.by_ns).sort((a, b) => b[1] - a[1]);
  for (const [ns, n] of nsList.slice(0, 20)) {
    console.log(`  ${ns.padEnd(30)} ${n}`);
  }
  if (nsList.length > 20) console.log(`  ... +${nsList.length - 20} more namespaces`);

  console.log('\n==== 样本 ====');
  for (const [t, arr] of Object.entries(samples)) {
    if (arr.length === 0) continue;
    console.log(`\n[${t}]`);
    for (const s of arr) {
      console.log(`  ${s.ns}:${s.path}`);
      console.log(`    en = ${s.en}`);
      console.log(`    zh = ${s.zh}`);
    }
  }

  // 输出到文件供后续脚本使用
  fs.writeFileSync(
    path.resolve(__dirname, 'audit_fake_en_report.json'),
    JSON.stringify({ stats, by_ns: stats.by_ns, by_type: stats.by_type }, null, 2)
  );
  console.log('\n报告已写入: scripts/i18n/audit_fake_en_report.json');
}

main();
