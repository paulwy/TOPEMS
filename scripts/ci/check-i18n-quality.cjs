#!/usr/bin/env node
/**
 * i18n 综合质量门禁（R11 Z-P1 固化）
 *
 * 三项检查：
 *   1. en.json 假 en 值检测 — en 值中残留中文、机翻乱码、中英混杂
 *   2. en/zh key 一致性检查 — 缺 key / 多余 key / 空值
 *   3. JSON 结构一致性 — 禁止同一 en.json 中混合扁平 key (含点号) 与嵌套对象
 *
 * 用法：
 *   node scripts/ci/check-i18n-quality.cjs              # 全量审计，输出统计
 *   node scripts/ci/check-i18n-quality.cjs --strict     # 严格模式：任一项 > 0 则 exit 1
 *   node scripts/ci/check-i18n-quality.cjs --json       # JSON 输出，供 CI summary 使用
 *   node scripts/ci/check-i18n-quality.cjs --ns finance # 仅检查指定命名空间
 *
 * 退出码：
 *   0 = 全部通过
 *   1 = 严格模式下存在违规
 */

const fs = require('fs');
const path = require('path');

// ──────────────────────────── 路径配置 ────────────────────────────
const EN_DIR = path.resolve(__dirname, '../../apps/web/src/i18n/locales/en');
const ZH_DIR = path.resolve(__dirname, '../../apps/web/src/i18n/locales/zh');

// ──────────────────────────── CLI 参数 ────────────────────────────
const args = process.argv.slice(2);
const STRICT = args.includes('--strict');
const JSON_MODE = args.includes('--json');
const nsIdx = args.indexOf('--ns');
const TARGET_NS = nsIdx !== -1 && args[nsIdx + 1] ? args[nsIdx + 1] : null;

// ──────────────────────────── 正则常量 ────────────────────────────
const CJK_RE = /[\u4e00-\u9fff]/;
const VAR_RE = /\{\{[^}]+\}\}|\{[^}]+\}|\$\{[^}]+\}|%[sd]|\{\d+\}/;

// ──────────────────────────── 工具函数 ────────────────────────────

/** 扁平化 JSON 为 Map<dotPath, value> */
function flatten(obj, prefix = '', out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      flatten(v, p, out);
    } else if (typeof v === 'string') {
      out.set(p, v);
    } else if (v !== undefined && v !== null) {
      out.set(p, String(v));
    }
  }
  return out;
}

/** 分类 en 值质量 */
function classifyEn(enVal, zhVal) {
  const ev = (enVal || '').trim();
  const zv = (zhVal || '').trim();
  if (!ev) return 'empty';
  if (!CJK_RE.test(ev)) return 'ok';
  // 含中文 → 细分类型
  if (zv && ev === zv) return 'untranslated';       // en === zh，完全没翻译
  if (zv && (ev.includes(zv) || zv.includes(ev))) return 'partial_machine'; // 机翻残留
  if (/[A-Za-z]{2,}/.test(ev) || VAR_RE.test(ev)) return 'mixed_cjk_en';    // 中英混杂
  if (!/[A-Za-z]/.test(ev)) return 'pure_cjk';       // 纯中文值
  return 'garbage';                                  // 其他乱码
}

/** 检测混合结构 bug：扁平 key (含点号) 与嵌套对象共存 */
function detectMixedStructure(ns, enObj) {
  const issues = [];
  const flatKeys = Object.keys(enObj).filter(k => k.includes('.'));
  if (flatKeys.length === 0) return issues;

  for (const flatKey of flatKeys) {
    const flatVal = enObj[flatKey];
    // 尝试通过嵌套路径取值
    const parts = flatKey.split('.');
    let cur = enObj;
    let found = true;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur || typeof cur !== 'object' || Array.isArray(cur) || !(parts[i] in cur)) {
        found = false;
        break;
      }
      cur = cur[parts[i]];
    }
    const nestedExists = found && cur && typeof cur === 'object' && !Array.isArray(cur) &&
                         (parts[parts.length - 1] in cur);
    const nestedVal = nestedExists ? cur[parts[parts.length - 1]] : undefined;

    if (nestedExists && typeof nestedVal === 'string' && typeof flatVal === 'string') {
      if (nestedVal !== flatVal) {
        issues.push({
          ns,
          key: flatKey,
          flatVal: flatVal.slice(0, 80),
          nestedVal: String(nestedVal).slice(0, 80),
        });
      }
    }
  }
  return issues;
}

// ──────────────────────────── 主逻辑 ────────────────────────────

function main() {
  if (!fs.existsSync(EN_DIR)) {
    console.error('EN_DIR not found:', EN_DIR);
    process.exit(2);
  }
  if (!fs.existsSync(ZH_DIR)) {
    console.error('ZH_DIR not found:', ZH_DIR);
    process.exit(2);
  }

  let nsFiles = fs.readdirSync(EN_DIR).filter(f => f.endsWith('.json'));
  if (TARGET_NS) nsFiles = nsFiles.filter(f => f.replace('.json', '') === TARGET_NS);

  // ── 统计容器 ──
  const summary = {
    namespaces_scanned: 0,
    fake_en: { total: 0, by_type: {}, by_ns: {}, samples: [] },
    key_mismatch: {
      total: 0,
      missing_in_en: 0,   // zh 有但 en 没有
      missing_in_zh: 0,   // en 有但 zh 没有
      empty_in_en: 0,
      empty_in_zh: 0,
      by_ns: {},
      samples: [],
    },
    mixed_structure: { total: 0, by_ns: {}, issues: [] },
  };

  for (const f of nsFiles) {
    const ns = f.replace('.json', '');
    summary.namespaces_scanned++;

    let enObj, zhObj;
    try { enObj = JSON.parse(fs.readFileSync(path.join(EN_DIR, f), 'utf8')); }
    catch (e) { console.warn('skip (en parse error):', f); continue; }
    try { zhObj = JSON.parse(fs.readFileSync(path.join(ZH_DIR, f), 'utf8')); }
    catch (e) { zhObj = {}; }

    const enFlat = flatten(enObj);
    const zhFlat = flatten(zhObj);
    const allKeys = new Set([...enFlat.keys(), ...zhFlat.keys()]);

    // ── 检查 1：假 en 值 ──
    let nsFake = 0;
    for (const [p, ev] of enFlat) {
      const zv = zhFlat.get(p) || '';
      const t = classifyEn(ev, zv);
      if (t === 'ok' || t === 'empty') continue;
      nsFake++;
      summary.fake_en.total++;
      summary.fake_en.by_type[t] = (summary.fake_en.by_type[t] || 0) + 1;
      if (summary.fake_en.samples.length < 10) {
        summary.fake_en.samples.push({ ns, path: p, type: t, en: ev.slice(0, 100), zh: zv.slice(0, 100) });
      }
    }
    if (nsFake > 0) summary.fake_en.by_ns[ns] = nsFake;

    // ── 检查 2：key 一致性 ──
    let nsKeyMis = 0;
    for (const k of allKeys) {
      const inEn = enFlat.has(k);
      const inZh = zhFlat.has(k);
      const ev = inEn ? (enFlat.get(k) || '').trim() : null;
      const zv = inZh ? (zhFlat.get(k) || '').trim() : null;

      if (!inEn) {
        summary.key_mismatch.missing_in_en++;
        summary.key_mismatch.total++;
        nsKeyMis++;
        if (summary.key_mismatch.samples.length < 10) {
          summary.key_mismatch.samples.push({ ns, path: k, issue: 'missing_in_en', zh: zv.slice(0, 80) });
        }
      } else if (ev === '') {
        summary.key_mismatch.empty_in_en++;
        summary.key_mismatch.total++;
        nsKeyMis++;
        if (summary.key_mismatch.samples.length < 10) {
          summary.key_mismatch.samples.push({ ns, path: k, issue: 'empty_in_en' });
        }
      }

      if (!inZh) {
        summary.key_mismatch.missing_in_zh++;
        summary.key_mismatch.total++;
        nsKeyMis++;
        if (summary.key_mismatch.samples.length < 10) {
          summary.key_mismatch.samples.push({ ns, path: k, issue: 'missing_in_zh', en: ev.slice(0, 80) });
        }
      } else if (zv === '') {
        summary.key_mismatch.empty_in_zh++;
        summary.key_mismatch.total++;
        nsKeyMis++;
      }
    }
    if (nsKeyMis > 0) summary.key_mismatch.by_ns[ns] = nsKeyMis;

    // ── 检查 3：混合结构 ──
    const mixIssues = detectMixedStructure(ns, enObj);
    if (mixIssues.length > 0) {
      summary.mixed_structure.total += mixIssues.length;
      summary.mixed_structure.by_ns[ns] = mixIssues.length;
      summary.mixed_structure.issues.push(...mixIssues.slice(0, 5));
    }
  }

  // ── 输出 ──
  if (JSON_MODE) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    printHumanReadable(summary);
  }

  // ── 严格模式门禁 ──
  if (STRICT) {
    const hasFake = summary.fake_en.total > 0;
    const hasKeyMis = summary.key_mismatch.total > 0;
    const hasMixed = summary.mixed_structure.total > 0;

    if (!JSON_MODE) {
      console.log('\n' + '═'.repeat(58));
      console.log('  CI 严格门禁');
      console.log('═'.repeat(58));
      console.log(`  假 en 值:      ${summary.fake_en.total}  → ${hasFake ? '❌ FAIL (> 0)' : '✅ PASS'}`);
      console.log(`  key 不一致:    ${summary.key_mismatch.total}  → ${hasKeyMis ? '⚠️ WARN (可容忍)' : '✅ PASS'}`);
      console.log(`  混合结构 bug:  ${summary.mixed_structure.total}  → ${hasMixed ? '❌ FAIL (> 0)' : '✅ PASS'}`);
      console.log('═'.repeat(58));
    }

    // key 不一致只警告不阻断（允许渐进补全），假 en 值 + 混合结构必须阻断
    if (hasFake || hasMixed) {
      if (!JSON_MODE) {
        console.error('\n❌ i18n 质量门禁未通过，请修复后再提交。');
        if (hasFake) console.error('   · 修复假 en 值：运行 `node scripts/i18n/audit_fake_en.js` 查看详情');
        if (hasMixed) console.error('   · 修复混合结构：运行 `node scripts/i18n/sync_flat_nested.js`');
      }
      process.exit(1);
    }
    if (!JSON_MODE) console.log('\n✅ i18n 质量门禁通过。');
  }
}

function printHumanReadable(s) {
  console.log('═'.repeat(58));
  console.log('  i18n 综合质量审计');
  console.log('═'.repeat(58));
  console.log(`  扫描命名空间: ${s.namespaces_scanned}`);
  console.log('');

  // ── 假 en 值 ──
  console.log(`① 假 en 值残留: ${s.fake_en.total} 处`);
  if (s.fake_en.total === 0) {
    console.log('   ✅ 全部清零');
  } else {
    console.log('   按类型分布:');
    for (const [t, n] of Object.entries(s.fake_en.by_type).sort((a, b) => b[1] - a[1])) {
      console.log(`     · ${t.padEnd(18)} ${n}`);
    }
    const nsList = Object.entries(s.fake_en.by_ns).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (nsList.length > 0) {
      console.log('   Top 命名空间:');
      for (const [ns, n] of nsList) console.log(`     · ${ns.padEnd(26)} ${n}`);
    }
  }
  console.log('');

  // ── key 不一致 ──
  console.log(`② key 一致性偏差: ${s.key_mismatch.total} 处`);
  const km = s.key_mismatch;
  if (km.total === 0) {
    console.log('   ✅ en/zh 完全对齐');
  } else {
    console.log(`   · en 缺 key:       ${km.missing_in_en}`);
    console.log(`   · zh 缺 key:       ${km.missing_in_zh}`);
    console.log(`   · en 空值:         ${km.empty_in_en}`);
    console.log(`   · zh 空值:         ${km.empty_in_zh}`);
  }
  console.log('');

  // ── 混合结构 ──
  console.log(`③ 混合结构 bug: ${s.mixed_structure.total} 处`);
  if (s.mixed_structure.total === 0) {
    console.log('   ✅ 无扁平/嵌套不一致');
  } else {
    for (const [ns, n] of Object.entries(s.mixed_structure.by_ns)) {
      console.log(`     · ${ns.padEnd(26)} ${n}`);
    }
  }

  // ── 样本（仅当有违规时）──
  if (s.fake_en.samples.length > 0 || s.key_mismatch.samples.length > 0 || s.mixed_structure.issues.length > 0) {
    console.log('');
    console.log('─'.repeat(58));
    console.log('  违规样本 (最多各 10 条)');
    console.log('─'.repeat(58));

    if (s.fake_en.samples.length > 0) {
      console.log('\n【假 en 值样本】');
      for (const x of s.fake_en.samples) {
        console.log(`  ${x.ns}:${x.path}`);
        console.log(`    type=${x.type}  en="${x.en}"`);
      }
    }
    if (s.key_mismatch.samples.length > 0) {
      console.log('\n【key 不一致样本】');
      for (const x of s.key_mismatch.samples) {
        console.log(`  ${x.ns}:${x.path} → ${x.issue}`);
      }
    }
    if (s.mixed_structure.issues.length > 0) {
      console.log('\n【混合结构样本】');
      for (const x of s.mixed_structure.issues) {
        console.log(`  ${x.ns}:${x.key}`);
        console.log(`    flat="${x.flatVal}"  nested="${x.nestedVal}"`);
      }
    }
  }
}

main();
