#!/usr/bin/env node
// 国际化硬编码中文检查（V65 阶段四新增）
//
// 用途：
// 1. 扫描 apps/web/src/pages 下 .tsx 文件 JSX 中直接出现的中文（非注释、非 console、非 import）
// 2. 输出 top 20 文件清单，量化 i18n 覆盖率
// 3. CI 门禁：admin 模块硬编码中文必须为 0
//
// 用法：
//   node scripts/ci/check-i18n.cjs                   # 全量检查，输出 top 20
//   node scripts/ci/check-i18n.cjs --json            # 输出 JSON 格式
//   node scripts/ci/check-i18n.cjs --strict          # 严格模式：admin 模块 > 0 则 exit 1
//   node scripts/ci/check-i18n.cjs --strict-all      # 全模块严格模式：任意模块 > 0 则 exit 1
//   node scripts/ci/check-i18n.cjs --module admin     # 仅检查指定模块
//   node scripts/ci/check-i18n.cjs --threshold 5     # 允许每模块最多 N 处硬编码
//
// 退出码：
//   0 = 通过
//   1 = 严格模式下存在硬编码中文超标

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '../../apps/web/src');
const PAGES_DIR = path.join(WEB_ROOT, 'pages');

// CLI 参数解析
const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const strictMode = args.includes('--strict');
const strictAllMode = args.includes('--strict-all');
const moduleIdx = args.indexOf('--module');
const targetModule = moduleIdx !== -1 && args[moduleIdx + 1] ? args[moduleIdx + 1] : null;
const thresholdIdx = args.indexOf('--threshold');
const perModuleThreshold = thresholdIdx !== -1 && args[thresholdIdx + 1] ? parseInt(args[thresholdIdx + 1], 10) : 0;

// --------- R13 V222 P4 NEW CLI ARGS ---------
function getArgValue(argsList, flag) {
  const eqIdx = argsList.findIndex(a => a.startsWith(flag + '='));
  if (eqIdx !== -1) return argsList[eqIdx].slice(flag.length + 1);
  const spIdx = argsList.indexOf(flag);
  if (spIdx !== -1 && argsList[spIdx + 1]) return argsList[spIdx + 1];
  return null;
}
const _strictZeroVal = getArgValue(args, '--strict-zero');
const STRICT_ZERO = _strictZeroVal
  ? _strictZeroVal.split(',').map(s => s.trim()).filter(Boolean)
  : [];
const _upperBoundVal = getArgValue(args, '--upper-bound');
const UPPER_BOUND = {}; // { admin: 500, mobile: 400, ... }
if (_upperBoundVal) {
  for (const pair of _upperBoundVal.split(',')) {
    const [name, numStr] = pair.split(':');
    if (!name || !numStr) continue;
    const n = parseInt(numStr, 10);
    if (!Number.isFinite(n)) continue;
    UPPER_BOUND[name.trim()] = n;
  }
}
const _reportJsonVal = getArgValue(args, '--report-json');
const REPORT_JSON_PATH = _reportJsonVal ? path.resolve(_reportJsonVal) : null;
// --------- R13 V222 P4 DUAL-PATH SCAN ---------
const P7_MODULES = ['components/templates','ai','microfrontend','admin','mobile','monitor','mes'];
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
      if (['__tests__','node_modules','test','tests'].includes(e.name)) continue;
      collectInto(f, out);
    } else if ((e.name.endsWith('.tsx') || e.name.endsWith('.ts')) &&
               !e.name.endsWith('.test.ts') && !e.name.endsWith('.test.tsx') &&
               !e.name.endsWith('.stories.tsx')) {
      out.push(f);
    }
  }
}
// --------- R13 V222 P4 EXPORTABLE PURE COUNT (for vitest guardian) ---------
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
        let m; while ((m = strRe.exec(cleaned)) !== null) count++;
        const jsxRe = />([^<>{}]*[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff][^<>{}]*)</g;
        while ((m = jsxRe.exec(cleaned)) !== null) if (m[1].trim()) count++;
        const atRe = /\b(?:label|title|placeholder|helperText|tooltip|alt|aria-label)\s*=\s*(['"`])((?:\\.|(?!\1).)*?[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff](?:\\.|(?!\1).)*?)\1/g;
        while ((m = atRe.exec(cleaned)) !== null) count++;
      }
    }
    result[mod] = count;
  }
  return result;
}
// Export via Node CJS module interop so vitest ESM can import
if (typeof module !== 'undefined') {
  module.exports = { countByModule, P7_MODULES, STRICT_ZERO_DEFAULTS: STRICT_ZERO.length ? STRICT_ZERO : P7_MODULES.slice(0,3), UPPER_BOUND_DEFAULTS: Object.keys(UPPER_BOUND).length ? UPPER_BOUND : {admin:500,mobile:400,monitor:450,mes:470} };
}

// 中文字符正则（CJK 统一表意文字 + 扩展 A + 兼容表意文字）
const CHINESE_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;

// 递归收集所有 .tsx 文件
function collectTsxFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['__tests__', 'node_modules', 'test', 'tests'].includes(entry.name)) continue;
      results.push(...collectTsxFiles(fullPath));
    } else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx') && !entry.name.endsWith('.stories.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

// 判断某行是否应跳过（注释、console、import、type 声明等）
function shouldSkipLine(line) {
  const trimmed = line.trim();
  // 空行
  if (!trimmed) return true;
  // 单行注释
  if (trimmed.startsWith('//')) return true;
  // 多行注释块内的行
  if (trimmed.startsWith('*') || trimmed.startsWith('/*')) return true;
  // console 语句
  if (/^console\./.test(trimmed)) return true;
  // import 语句
  if (/^import\s/.test(trimmed)) return true;
  // export type / interface 声明（类型定义中的中文注释不算）
  if (/^(export\s+)?(type|interface)\s/.test(trimmed)) return true;
  return false;
}

// 提取行中的中文字符串（排除 t() 调用内的内容）
function findHardcodedChinese(line) {
  const matches = [];
  // 先移除 t('...') 和 t("...") 调用中的内容
  const cleaned = line
    .replace(/\bt\s*\(\s*['"`][^'"`]*['"`]/g, '')
    .replace(/i18n\.t\s*\(\s*['"`][^'"`]*['"`]/g, '')
    .replace(/tpl\s*\(\s*['"`][^'"`]*['"`]/g, '');

  // 查找包含中文的字符串字面量
  // 匹配 '中文' "中文" `中文` 以及 JSX 文本节点中的中文
  const stringRe = /(['"`])((?:\\.|(?!\1).)*?[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff](?:\\.|(?!\1).)*?)\1/g;
  let m;
  while ((m = stringRe.exec(cleaned)) !== null) {
    matches.push(m[2]);
  }

  // 查找 JSX 文本节点中的中文（> 中文 < 或 >中文<）
  const jsxTextRe = />([^<>{}]*[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff][^<>{}]*)</g;
  while ((m = jsxTextRe.exec(cleaned)) !== null) {
    const text = m[1].trim();
    if (text) matches.push(text);
  }

  // 查找属性值中的中文（非 t() 调用） title='中文' label="中文"
  const attrRe = /\b(?:label|title|placeholder|helperText|tooltip|alt|aria-label)\s*=\s*(['"`])((?:\\.|(?!\1).)*?[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff](?:\\.|(?!\1).)*?)\1/g;
  while ((m = attrRe.exec(cleaned)) !== null) {
    // 避免重复添加（已被 stringRe 匹配的）
    if (!matches.includes(m[2])) matches.push(m[2]);
  }

  return matches;
}

// 获取模块名（pages 下的第一级目录）
function getModuleName(filePath) {
  const rel = path.relative(PAGES_DIR, filePath);
  const parts = rel.split(path.sep);
  return parts.length > 1 ? parts[0] : 'root';
}

function main() {
  let files = collectTsxFiles(PAGES_DIR);

  // 按模块过滤
  if (targetModule) {
    files = files.filter((f) => getModuleName(f) === targetModule);
  }

  const moduleStats = {}; // { admin: { count, files: Set } }
  const fileViolations = []; // [{ file, module, count, samples: [{ line, texts }] }]
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
        file: path.relative(path.resolve(__dirname, '../..'), filePath),
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

  // 按违规数排序
  fileViolations.sort((a, b) => b.count - a.count);

  const adminCount = moduleStats['admin'] ? moduleStats['admin'].count : 0;

  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          totalCount,
          adminCount,
          moduleStats: Object.fromEntries(
            Object.entries(moduleStats).map(([k, v]) => [k, { count: v.count, files: v.files.size }])
          ),
          topFiles: fileViolations.slice(0, 20).map((v) => ({
            file: v.file,
            module: v.module,
            count: v.count,
          })),
        },
        null,
        2
      )
    );
  } else {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  国际化硬编码中文检查');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  扫描文件数: ${files.length}`);
    console.log(`  硬编码中文总数: ${totalCount}`);
    console.log(`  admin 模块硬编码: ${adminCount}`);
    console.log(`  严格模式: ${strictMode ? '开启 (admin)' : strictAllMode ? '开启 (全模块)' : '关闭'}`);
    if (perModuleThreshold > 0) {
      console.log(`  每模块阈值: ${perModuleThreshold}`);
    }
    console.log('');

    console.log('模块分布:');
    Object.entries(moduleStats)
      .sort((a, b) => b[1].count - a[1].count)
      .forEach(([k, v]) => {
        const marker = k === 'admin' && v.count > 0 ? ' ❌' : '';
        console.log(`  ${k}: ${v.count} 处 (${v.files.size} 文件)${marker}`);
      });

    console.log('');
    console.log(`Top ${Math.min(20, fileViolations.length)} 文件:`);
    fileViolations.slice(0, 20).forEach((v, i) => {
      const marker = v.module === 'admin' ? ' ❌' : '';
      console.log(`  ${i + 1}. [${v.module}] ${v.file}: ${v.count} 处${marker}`);
      v.samples.forEach((s) => {
        console.log(`      L${s.line}: ${s.texts.join(', ')}`);
      });
    });
    console.log('═══════════════════════════════════════════════════════════');
  }

  // 严格模式：admin 模块 > 0 则失败
  if (strictMode && adminCount > 0) {
    console.error(`\n❌ admin 模块存在 ${adminCount} 处硬编码中文，需清零`);
    process.exit(1);
  }

  // 全模块严格模式：任意模块 > 阈值则失败
  if (strictAllMode) {
    const failingModules = Object.entries(moduleStats).filter(([name, stats]) => {
      const limit = perModuleThreshold > 0 ? perModuleThreshold : 0;
      return stats.count > limit;
    });
    if (failingModules.length > 0) {
      console.error(`\n❌ ${failingModules.length} 个模块硬编码中文超标:`);
      failingModules.forEach(([name, stats]) => {
        const limit = perModuleThreshold > 0 ? perModuleThreshold : 0;
        console.error(`   ${name}: ${stats.count} 处 (阈值 ${limit})`);
      });
      process.exit(1);
    }
  }

  // ---- R13 V222 P4: strict-zero / upper-bound gates ----
  const gateFailures = [];
  for (const z of STRICT_ZERO) {
    const c = moduleStats[z] ? moduleStats[z].count : 0;
    if (c > 0) gateFailures.push({ type: 'ZERO_EXCEEDED', module: z, actual: c, threshold: 0 });
  }
  for (const [name, bound] of Object.entries(UPPER_BOUND)) {
    const c = moduleStats[name] ? moduleStats[name].count : 0;
    if (c > bound) gateFailures.push({ type: 'BOUND_EXCEEDED', module: name, actual: c, threshold: bound });
  }

  // ---- R13 V222 P4: report-json ----
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
  const gateResult = {
    timestamp: new Date().toISOString(),
    phase: 'R13-V222-P4-Gate',
    totalCount,
    perModule: _perModule,
    strictZero: STRICT_ZERO,
    upperBound: UPPER_BOUND,
    failures: gateFailures,
    allOk: gateFailures.length === 0,
  };
  if (REPORT_JSON_PATH) {
    fs.mkdirSync(path.dirname(REPORT_JSON_PATH), { recursive: true });
    fs.writeFileSync(REPORT_JSON_PATH, JSON.stringify(gateResult, null, 2) + '\n', 'utf8');
  }

  // Print P4 gate summary (always) if any strict gate was enabled
  if (STRICT_ZERO.length > 0 || Object.keys(UPPER_BOUND).length > 0) {
    console.log('\n── R13 P4 7-in-1 Gate ──');
    console.log(`  ZERO modules  (${STRICT_ZERO.length}): ${STRICT_ZERO.map(z => `${z}:${moduleStats[z]?moduleStats[z].count:0}${(moduleStats[z]?moduleStats[z].count:0)===0?' ✅':' ❌'}`).join(' | ')}`);
    console.log(`  BOUND modules (${Object.keys(UPPER_BOUND).length}): ${Object.entries(UPPER_BOUND).map(([n,b])=>`${n}:${moduleStats[n]?moduleStats[n].count:0}/${b}${(moduleStats[n]?moduleStats[n].count:0)<=b?' ✅':' ❌'}`).join(' | ')}`);
    console.log(`  Failures: ${gateFailures.length}`);
    if (gateFailures.length) {
      for (const f of gateFailures) console.log(`    ❌ ${f.type} ${f.module}: actual=${f.actual} threshold=${f.threshold}`);
      process.exitCode = 1;
    } else {
      console.log(`  ✅ 7/7 modules ALL GREEN within gate`);
    }
    if (REPORT_JSON_PATH) console.log(`  Report JSON -> ${path.relative(process.cwd(), REPORT_JSON_PATH)}`);
  }
}

main();
