#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const WEB_ROOT = path.join(PROJECT_ROOT, 'apps/web/src');
const PAGES_DIR = path.join(WEB_ROOT, 'pages');
const EN_DIR = path.join(WEB_ROOT, 'i18n/locales/en');
const ZH_DIR = path.join(WEB_ROOT, 'i18n/locales/zh');
const P7_MODULES = ['components/templates', 'ai', 'microfrontend', 'admin', 'mobile', 'monitor', 'mes'];

const CHINESE_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;
const CJK_RE = /[\u4e00-\u9fff]/;
const VAR_RE = /\{\{[^}]+\}\}|\{[^}]+\}|\$\{[^}]+\}|%[sd]|\{\d+\}/;

function getArgValue(argsList, flag) {
  const eqIdx = argsList.findIndex((a) => a.startsWith(flag + '='));
  if (eqIdx !== -1) return argsList[eqIdx].slice(flag.length + 1);
  const spIdx = argsList.indexOf(flag);
  if (spIdx !== -1 && argsList[spIdx + 1]) return argsList[spIdx + 1];
  return null;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const modeVal = getArgValue(args, '--mode') || 'all';
  const mode = ['hardcode', 'quality', 'all'].includes(modeVal) ? modeVal : 'all';
  const dryRun = args.includes('--dry-run');
  const failFast = args.includes('--fail-fast');
  const reportJsonVal = getArgValue(args, '--report-json');
  const reportJsonPath = reportJsonVal ? path.resolve(reportJsonVal) : null;
  const thresholdOverrideVal = getArgValue(args, '--threshold-override');
  const thresholdOverride = {};
  if (thresholdOverrideVal) {
    for (const pair of thresholdOverrideVal.split(',')) {
      const [name, numStr] = pair.split(':');
      if (!name || !numStr) continue;
      const n = parseInt(numStr, 10);
      if (!Number.isFinite(n)) continue;
      thresholdOverride[name.trim()] = n;
    }
  }
  const jsonMode = args.includes('--json');
  const strictMode = args.includes('--strict');
  const strictAllMode = args.includes('--strict-all');
  const moduleIdx = args.indexOf('--module');
  const targetModule = moduleIdx !== -1 && args[moduleIdx + 1] ? args[moduleIdx + 1] : null;
  const thresholdIdx = args.indexOf('--threshold');
  const perModuleThreshold = thresholdIdx !== -1 && args[thresholdIdx + 1] ? parseInt(args[thresholdIdx + 1], 10) : 0;
  const _strictZeroVal = getArgValue(args, '--strict-zero');
  const STRICT_ZERO = _strictZeroVal
    ? _strictZeroVal
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const _upperBoundVal = getArgValue(args, '--upper-bound');
  const UPPER_BOUND = {};
  if (_upperBoundVal) {
    for (const pair of _upperBoundVal.split(',')) {
      const [name, numStr] = pair.split(':');
      if (!name || !numStr) continue;
      const n = parseInt(numStr, 10);
      if (!Number.isFinite(n)) continue;
      UPPER_BOUND[name.trim()] = n;
    }
  }
  const finalUpperBound = Object.keys(thresholdOverride).length ? { ...UPPER_BOUND, ...thresholdOverride } : UPPER_BOUND;
  const nsIdx = args.indexOf('--ns');
  const TARGET_NS = nsIdx !== -1 && args[nsIdx + 1] ? args[nsIdx + 1] : null;
  return {
    mode,
    dryRun,
    failFast,
    reportJsonPath,
    jsonMode,
    strictMode,
    strictAllMode,
    targetModule,
    perModuleThreshold,
    STRICT_ZERO,
    UPPER_BOUND: finalUpperBound,
    TARGET_NS,
  };
}

function collectFilesDual(moduleName) {
  const out = [];
  const d1 = path.join(PAGES_DIR, moduleName);
  if (fs.existsSync(d1)) collectInto(d1, out);
  const d2 = path.join(WEB_ROOT, moduleName);
  if (fs.existsSync(d2)) collectInto(d2, out);
  return out;
}
function collectInto(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['__tests__', 'node_modules', 'test', 'tests'].includes(e.name)) continue;
      collectInto(f, out);
    } else if (
      (e.name.endsWith('.tsx') || e.name.endsWith('.ts')) &&
      !e.name.endsWith('.test.ts') &&
      !e.name.endsWith('.test.tsx') &&
      !e.name.endsWith('.stories.tsx')
    ) {
      out.push(f);
    }
  }
}
async function countByModule(moduleNames) {
  const mods = Array.isArray(moduleNames) ? moduleNames : [moduleNames];
  const result = {};
  for (const mod of mods) {
    const files = collectFilesDual(mod);
    let count = 0;
    for (const fp of files) {
      const c = fs.readFileSync(fp, 'utf8');
      for (const rawLine of c.split('\n')) {
        if (shouldSkipLine(rawLine) || !CHINESE_RE.test(rawLine)) continue;
        const cleaned = rawLine
          .replace(/\bt\s*\(\s*['"`][^'"`]*['"`]/g, '')
          .replace(/i18n\.t\s*\(\s*['"`][^'"`]*['"`]/g, '')
          .replace(/tpl\s*\(\s*['"`][^'"`]*['"`]/g, '');
        const strRe = /(['"`])((?:\\.|(?!\1).)*?[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff](?:\\.|(?!\1).)*?)\1/g;
        let m;
        while ((m = strRe.exec(cleaned)) !== null) count++;
        const jsxRe = />([^<>{}]*[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff][^<>{}]*)</g;
        while ((m = jsxRe.exec(cleaned)) !== null) if (m[1].trim()) count++;
        const atRe =
          /\b(?:label|title|placeholder|helperText|tooltip|alt|aria-label)\s*=\s*(['"`])((?:\\.|(?!\1).)*?[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff](?:\\.|(?!\1).)*?)\1/g;
        while ((m = atRe.exec(cleaned)) !== null) count++;
      }
    }
    result[mod] = count;
  }
  return result;
}
if (typeof module !== 'undefined') {
  module.exports = {
    countByModule,
    P7_MODULES,
  };
}
function collectTsxFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['__tests__', 'node_modules', 'test', 'tests'].includes(entry.name)) continue;
      results.push(...collectTsxFiles(fullPath));
    } else if (
      entry.name.endsWith('.tsx') &&
      !entry.name.endsWith('.test.tsx') &&
      !entry.name.endsWith('.stories.tsx')
    ) {
      results.push(fullPath);
    }
  }
  return results;
}
function shouldSkipLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('//')) return true;
  if (trimmed.startsWith('*') || trimmed.startsWith('/*')) return true;
  if (/^console\./.test(trimmed)) return true;
  if (/^import\s/.test(trimmed)) return true;
  if (/^(export\s+)?(type|interface)\s/.test(trimmed)) return true;
  return false;
}
function findHardcodedChinese(line) {
  const matches = [];
  const cleaned = line
    .replace(/\bt\s*\(\s*['"`][^'"`]*['"`]/g, '')
    .replace(/i18n\.t\s*\(\s*['"`][^'"`]*['"`]/g, '')
    .replace(/tpl\s*\(\s*['"`][^'"`]*['"`]/g, '');
  const stringRe = /(['"`])((?:\\.|(?!\1).)*?[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff](?:\\.|(?!\1).)*?)\1/g;
  let m;
  while ((m = stringRe.exec(cleaned)) !== null) {
    matches.push(m[2]);
  }
  const jsxTextRe = />([^<>{}]*[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff][^<>{}]*)</g;
  while ((m = jsxTextRe.exec(cleaned)) !== null) {
    const text = m[1].trim();
    if (text) matches.push(text);
  }
  const attrRe =
    /\b(?:label|title|placeholder|helperText|tooltip|alt|aria-label)\s*=\s*(['"`])((?:\\.|(?!\1).)*?[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff](?:\\.|(?!\1).)*?)\1/g;
  while ((m = attrRe.exec(cleaned)) !== null) {
    if (!matches.includes(m[2])) matches.push(m[2]);
  }
  return matches;
}
function getModuleName(filePath) {
  const rel = path.relative(PAGES_DIR, filePath);
  const parts = rel.split(path.sep);
  return parts.length > 1 ? parts[0] : 'root';
}

function runHardcodeCheck(opts) {
  const { targetModule, STRICT_ZERO, UPPER_BOUND } = opts;
  let files = collectTsxFiles(PAGES_DIR);
  if (targetModule) {
    files = files.filter((f) => getModuleName(f) === targetModule);
  }
  const moduleStats = {};
  const fileViolations = [];
  let totalCount = 0;
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const module = getModuleName(filePath);
    let fileCount = 0;
    const samples = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (shouldSkipLine(line)) continue;
      const texts = findHardcodedChinese(line);
      if (texts.length > 0) {
        fileCount += texts.length;
        totalCount += texts.length;
        if (samples.length < 3) {
          samples.push({ line: i + 1, texts });
        }
      }
    }
    if (fileCount > 0) {
      fileViolations.push({
        file: path.relative(PROJECT_ROOT, filePath),
        module,
        count: fileCount,
        samples,
      });
      if (!moduleStats[module]) {
        moduleStats[module] = { count: 0, files: new Set() };
      }
      moduleStats[module].count += fileCount;
      moduleStats[module].files.add(filePath);
    }
  }
  fileViolations.sort((a, b) => b.count - a.count);
  const adminCount = moduleStats['admin'] ? moduleStats['admin'].count : 0;
  const gateFailures = [];
  for (const z of STRICT_ZERO) {
    const c = moduleStats[z] ? moduleStats[z].count : 0;
    if (c > 0) gateFailures.push({ type: 'ZERO_EXCEEDED', module: z, actual: c, threshold: 0 });
  }
  for (const [name, bound] of Object.entries(UPPER_BOUND)) {
    const c = moduleStats[name] ? moduleStats[name].count : 0;
    if (c > bound) gateFailures.push({ type: 'BOUND_EXCEEDED', module: name, actual: c, threshold: bound });
  }
  const _gateMods = Array.from(new Set([...STRICT_ZERO, ...Object.keys(UPPER_BOUND)]));
  const _perModule = {};
  for (const m of _gateMods) {
    _perModule[m] = moduleStats[m]
      ? { count: moduleStats[m].count, files: moduleStats[m].files.size }
      : { count: 0, files: 0 };
  }
  for (const [k, v] of Object.entries(moduleStats)) {
    if (!(k in _perModule)) {
      _perModule[k] = { count: v.count, files: v.files.size };
    }
  }
  return {
    filesScanned: files.length,
    totalCount,
    adminCount,
    moduleStats: Object.fromEntries(
      Object.entries(moduleStats).map(([k, v]) => [k, { count: v.count, files: v.files.size }])
    ),
    topFiles: fileViolations.slice(0, 20).map((v) => ({
      file: v.file,
      module: v.module,
      count: v.count,
      samples: v.samples,
    })),
    strictZero: STRICT_ZERO,
    upperBound: UPPER_BOUND,
    perModule: _perModule,
    gateFailures,
    allOk: gateFailures.length === 0,
    fileViolations,
  };
}

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
function classifyEn(enVal, zhVal) {
  const ev = (enVal || '').trim();
  const zv = (zhVal || '').trim();
  if (!ev) return 'empty';
  if (!CJK_RE.test(ev)) return 'ok';
  if (zv && ev === zv) return 'untranslated';
  if (zv && (ev.includes(zv) || zv.includes(ev))) return 'partial_machine';
  if (/[A-Za-z]{2,}/.test(ev) || VAR_RE.test(ev)) return 'mixed_cjk_en';
  if (!/[A-Za-z]/.test(ev)) return 'pure_cjk';
  return 'garbage';
}
function detectMixedStructure(ns, enObj) {
  const issues = [];
  const flatKeys = Object.keys(enObj).filter((k) => k.includes('.'));
  if (flatKeys.length === 0) return issues;
  for (const flatKey of flatKeys) {
    const flatVal = enObj[flatKey];
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
    const nestedExists =
      found && cur && typeof cur === 'object' && !Array.isArray(cur) && parts[parts.length - 1] in cur;
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

function runR12SevenInOne() {
  let failures = 0;
  const report = [];
  try {
    if (!fs.existsSync(EN_DIR)) throw new Error('EN_DIR missing');
    let empty = 0,
      nul = 0;
    for (const f of fs.readdirSync(EN_DIR)) {
      if (!f.endsWith('.json')) continue;
      const o = JSON.parse(fs.readFileSync(path.join(EN_DIR, f)));
      (function w(x) {
        if (typeof x === 'string') {
          if (x === '') empty++;
          return;
        }
        if (x === null) {
          nul++;
          return;
        }
        if (Array.isArray(x)) return x.forEach(w);
        if (x && typeof x === 'object') for (const k of Object.keys(x)) w(x[k]);
      })(o);
    }
    const ok = empty + nul === 0;
    if (!ok) failures++;
    report.push({
      title: 'R12-Z1 · EN missing strict',
      ok,
      code: ok ? 0 : 1,
      tail: `empty=${empty} null=${nul} SUM=${empty + nul}`,
    });
  } catch (e) {
    failures++;
    report.push({ title: 'R12-Z1 · EN missing', ok: false, code: 2, tail: String(e).slice(0, 120) });
  }
  (function () {
    try {
      const res = spawnSync(process.execPath, ['scripts/ci/verify-glossary.cjs'], {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        timeout: 60_000,
      });
      const ok = res.status === 0;
      if (!ok) failures++;
      report.push({
        title: 'R12-Z2 · Glossary Top50 strict',
        ok,
        code: res.status ?? (res.error ? 3 : 0),
        tail:
          (res.stdout || '').split('\n').filter(Boolean).slice(-2).join(' | ') || String(res.error || '').slice(0, 100),
      });
    } catch (e) {
      failures++;
      report.push({ title: 'R12-Z2 · Glossary', ok: false, code: 3, tail: String(e).slice(0, 120) });
    }
  })();
  (function () {
    try {
      const lintScript = 'scripts/i18n/lint-styleguide.cjs';
      if (!fs.existsSync(lintScript)) {
        report.push({
          title: 'R12-Z3 · Style Guide Lint HIGH=0 / MEDIUM≤50',
          ok: true,
          code: 0,
          tail: 'skipped — lint-styleguide.cjs removed in P3 consolidation',
        });
      } else {
        const res = spawnSync(
          process.execPath,
          [lintScript, '--json', '--sample', '0', '--max-high', '0', '--max-medium', '50'],
          { cwd: PROJECT_ROOT, encoding: 'utf8', timeout: 120_000 }
        );
        let summary = null;
        try {
          summary = JSON.parse(res.stdout).summary;
        } catch (_) {}
        const lintExit = res.status ?? (res.error ? 3 : 0);
        const ok = lintExit === 0 && summary && summary.HIGH === 0 && summary.MEDIUM <= 50;
        if (!ok) failures++;
        report.push({
          title: 'R12-Z3 · Style Guide Lint HIGH=0 / MEDIUM≤50',
          ok,
          code: lintExit,
          tail: summary
            ? `HIGH=${summary.HIGH} MEDIUM=${summary.MEDIUM} LOW=${summary.LOW}`
            : (res.stderr || res.stdout).slice(0, 160),
        });
      }
    } catch (e) {
      failures++;
      report.push({ title: 'R12-Z3 lint', ok: false, code: 3, tail: String(e).slice(0, 120) });
    }
  })();
  return {
    failures,
    report,
    allOk: failures === 0,
  };
}

function runQualityCheck(opts) {
  const { TARGET_NS } = opts;
  const dirErrors = [];
  if (!fs.existsSync(EN_DIR)) dirErrors.push('EN_DIR not found: ' + EN_DIR);
  if (!fs.existsSync(ZH_DIR)) dirErrors.push('ZH_DIR not found: ' + ZH_DIR);
  const summary = {
    namespaces_scanned: 0,
    fake_en: { total: 0, by_type: {}, by_ns: {}, samples: [] },
    key_mismatch: {
      total: 0,
      missing_in_en: 0,
      missing_in_zh: 0,
      empty_in_en: 0,
      empty_in_zh: 0,
      by_ns: {},
      samples: [],
    },
    mixed_structure: { total: 0, by_ns: {}, issues: [] },
  };
  let strictFail = false;
  if (dirErrors.length === 0) {
    let nsFiles = fs.readdirSync(EN_DIR).filter((f) => f.endsWith('.json'));
    if (TARGET_NS) nsFiles = nsFiles.filter((f) => f.replace('.json', '') === TARGET_NS);
    for (const f of nsFiles) {
      const ns = f.replace('.json', '');
      summary.namespaces_scanned++;
      let enObj, zhObj;
      try {
        enObj = JSON.parse(fs.readFileSync(path.join(EN_DIR, f), 'utf8'));
      } catch (e) {
        continue;
      }
      try {
        zhObj = JSON.parse(fs.readFileSync(path.join(ZH_DIR, f), 'utf8'));
      } catch (e) {
        zhObj = {};
      }
      const enFlat = flatten(enObj);
      const zhFlat = flatten(zhObj);
      const allKeys = new Set([...enFlat.keys(), ...zhFlat.keys()]);
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
            summary.key_mismatch.samples.push({ ns, path: k, issue: 'missing_in_en', zh: zv ? zv.slice(0, 80) : '' });
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
            summary.key_mismatch.samples.push({ ns, path: k, issue: 'missing_in_zh', en: ev ? ev.slice(0, 80) : '' });
          }
        } else if (zv === '') {
          summary.key_mismatch.empty_in_zh++;
          summary.key_mismatch.total++;
          nsKeyMis++;
        }
      }
      if (nsKeyMis > 0) summary.key_mismatch.by_ns[ns] = nsKeyMis;
      const mixIssues = detectMixedStructure(ns, enObj);
      if (mixIssues.length > 0) {
        summary.mixed_structure.total += mixIssues.length;
        summary.mixed_structure.by_ns[ns] = mixIssues.length;
        summary.mixed_structure.issues.push(...mixIssues.slice(0, 5));
      }
    }
    const hasFake = summary.fake_en.total > 0;
    const hasMixed = summary.mixed_structure.total > 0;
    strictFail = hasFake || hasMixed;
  }
  const sevenInOne = runR12SevenInOne();
  return {
    dirErrors,
    summary,
    strictFail,
    sevenInOne,
  };
}

function printHardcodeHuman(h) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  国际化硬编码中文检查');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  扫描文件数: ${h.filesScanned}`);
  console.log(`  硬编码中文总数: ${h.totalCount}`);
  console.log(`  admin 模块硬编码: ${h.adminCount}`);
  console.log('');
  console.log('模块分布:');
  Object.entries(h.moduleStats)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([k, v]) => {
      const marker = k === 'admin' && v.count > 0 ? ' ❌' : '';
      console.log(`  ${k}: ${v.count} 处 (${v.files} 文件)${marker}`);
    });
  console.log('');
  console.log(`Top ${Math.min(20, h.topFiles.length)} 文件:`);
  h.topFiles.forEach((v, i) => {
    const marker = v.module === 'admin' ? ' ❌' : '';
    console.log(`  ${i + 1}. [${v.module}] ${v.file}: ${v.count} 处${marker}`);
    if (v.samples) {
      v.samples.forEach((s) => {
        console.log(`      L${s.line}: ${s.texts.join(', ')}`);
      });
    }
  });
  console.log('═══════════════════════════════════════════════════════════');
  if (h.strictZero.length > 0 || Object.keys(h.upperBound).length > 0) {
    console.log('\n── R13 P4 7-in-1 Gate ──');
    console.log(
      `  ZERO modules  (${h.strictZero.length}): ${h.strictZero
        .map((z) => `${z}:${h.moduleStats[z] ? h.moduleStats[z].count : 0}${(h.moduleStats[z] ? h.moduleStats[z].count : 0) === 0 ? ' ✅' : ' ❌'}`)
        .join(' | ')}`
    );
    console.log(
      `  BOUND modules (${Object.keys(h.upperBound).length}): ${Object.entries(h.upperBound)
        .map(
          ([n, b]) =>
            `${n}:${h.moduleStats[n] ? h.moduleStats[n].count : 0}/${b}${(h.moduleStats[n] ? h.moduleStats[n].count : 0) <= b ? ' ✅' : ' ❌'}`
        )
        .join(' | ')}`
    );
    console.log(`  Failures: ${h.gateFailures.length}`);
    if (h.gateFailures.length) {
      for (const f of h.gateFailures)
        console.log(`    ❌ ${f.type} ${f.module}: actual=${f.actual} threshold=${f.threshold}`);
    } else {
      console.log(`  ✅ 7/7 modules ALL GREEN within gate`);
    }
  }
}

function printQualityHuman(q) {
  if (q.dirErrors.length) {
    q.dirErrors.forEach((e) => console.error(e));
  }
  const s = q.summary;
  console.log('═'.repeat(58));
  console.log('  i18n 综合质量审计');
  console.log('═'.repeat(58));
  console.log(`  扫描命名空间: ${s.namespaces_scanned}`);
  console.log('');
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
  console.log(`③ 混合结构 bug: ${s.mixed_structure.total} 处`);
  if (s.mixed_structure.total === 0) {
    console.log('   ✅ 无扁平/嵌套不一致');
  } else {
    for (const [ns, n] of Object.entries(s.mixed_structure.by_ns)) {
      console.log(`     · ${ns.padEnd(26)} ${n}`);
    }
  }
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
  if (q.sevenInOne) {
    const W = process.stdout.columns || 96;
    const bar = '═'.repeat(W);
    console.log('\n' + bar);
    console.log('  R12 X-P0 Phase-2C — i18n 7-in-1 Strict Gate Summary');
    console.log(bar);
    let idx = 0;
    for (const r of q.sevenInOne.report) {
      idx++;
      console.log(`  ${r.ok ? '✅' : '❌'}  [#${idx}] ${r.title}`);
      console.log(`         exit=${r.code}  tail: ${r.tail}`);
    }
    console.log(bar);
    console.log(
      `  7-in-1 Gate Result: ${q.sevenInOne.allOk ? '✅ PASS (0 failures)' : '❌ FAIL (' + q.sevenInOne.failures + ' failures)'}`
    );
    console.log(bar);
  }
}

function renderReport(opts, hardcodeResult, qualityResult) {
  const { mode, jsonMode, reportJsonPath, dryRun } = opts;
  const generatedAt = new Date().toISOString();
  const combined = {
    mode,
    generatedAt,
    hardcode: mode !== 'quality' ? hardcodeResult : undefined,
    quality: mode !== 'hardcode' ? qualityResult : undefined,
  };
  if (reportJsonPath) {
    const outJson = {
      mode,
      generatedAt,
      hardcode: mode !== 'quality'
        ? {
            filesScanned: hardcodeResult.filesScanned,
            totalCount: hardcodeResult.totalCount,
            adminCount: hardcodeResult.adminCount,
            moduleStats: hardcodeResult.moduleStats,
            topFiles: hardcodeResult.topFiles.map((f) => ({
              file: f.file,
              module: f.module,
              count: f.count,
            })),
            perModule: hardcodeResult.perModule,
            strictZero: hardcodeResult.strictZero,
            upperBound: hardcodeResult.upperBound,
            gateFailures: hardcodeResult.gateFailures,
            allOk: hardcodeResult.allOk,
          }
        : null,
      quality: mode !== 'hardcode'
        ? {
            dirErrors: qualityResult.dirErrors,
            summary: qualityResult.summary,
            strictFail: qualityResult.strictFail,
            sevenInOne: qualityResult.sevenInOne,
          }
        : null,
    };
    fs.mkdirSync(path.dirname(reportJsonPath), { recursive: true });
    fs.writeFileSync(reportJsonPath, JSON.stringify(outJson, null, 2) + '\n', 'utf8');
  }
  if (jsonMode) {
    const out = {
      mode,
      generatedAt,
      hardcode: mode !== 'quality'
        ? {
            totalCount: hardcodeResult.totalCount,
            adminCount: hardcodeResult.adminCount,
            moduleStats: hardcodeResult.moduleStats,
            topFiles: hardcodeResult.topFiles.map((f) => ({ file: f.file, module: f.module, count: f.count })),
          }
        : null,
      quality: mode !== 'hardcode' ? qualityResult.summary : null,
    };
    console.log(JSON.stringify(out, null, 2));
    return;
  }
  if (mode !== 'quality') printHardcodeHuman(hardcodeResult);
  if (mode === 'all') console.log('\n');
  if (mode !== 'hardcode') printQualityHuman(qualityResult);
  if (dryRun) {
    console.log('\n[dry-run] 报告生成完毕，不触发 exit 非零。');
    if (reportJsonPath) console.log(`[dry-run] Report JSON -> ${path.relative(process.cwd(), reportJsonPath)}`);
  }
}

function main() {
  const opts = parseArgs(process.argv);
  let hardcodeResult = null;
  let qualityResult = null;
  if (opts.mode !== 'quality') {
    hardcodeResult = runHardcodeCheck(opts);
  }
  if (opts.mode !== 'hardcode') {
    qualityResult = runQualityCheck(opts);
  }
  renderReport(opts, hardcodeResult, qualityResult);
  if (opts.dryRun) {
    process.exitCode = 0;
    return;
  }
  let hasFail = false;
  if (opts.mode !== 'quality') {
    if (!hardcodeResult.allOk) hasFail = true;
  }
  if (opts.mode !== 'hardcode') {
    if (qualityResult.strictFail || !qualityResult.sevenInOne.allOk) hasFail = true;
    if (qualityResult.dirErrors.length) hasFail = true;
  }
  if (opts.failFast) {
    if (hasFail) {
      process.exit(1);
    }
    process.exitCode = 0;
    return;
  }
  process.exitCode = hasFail ? 1 : 0;
}

main();
