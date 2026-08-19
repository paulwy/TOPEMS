#!/usr/bin/env node
/**
 * Precise scan: only count REAL UI hardcoded Chinese strings
 * Excludes: comments, type-only strings, bracket notation access, whitelist files
 *
 * CLI:
 *   scan-hardcoded-precise.cjs [paths...]            scan given dirs/files (default: apps/web/src)
 *   --strict                                          exit non-zero when total > 0
 *   --json                                            JSON report to stdout
 *   --json-out <path>                                 write JSON report to file
 *   --details <N>                                     print sample details (0 to disable, default 50)
 */
const fs = require('fs');
const path = require('path');

const WEB_SRC = path.resolve('apps/web/src');
const CJK = /[\u4e00-\u9fff\u3400-\u4dbf]/;
const SKIP_DIRS = ['node_modules', 'dist', 'build', '.git', '__tests__', '__mocks__', 'tests'];
const SKIP_EXT = ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx', '.stories.tsx', '.d.ts'];

const WHITELIST_FILES = [
  'utils/ai/ui-recommender.ts',
  'utils/apiPath.ts',
  'config/ai-templates.ts',
  'components/ehs/EHSBadges.tsx',
  'ai/native/v54-native-panel.tsx',
  'i18n/index.ts',
  'services/ExternalErpAdapters.ts',
  'utils/bff/codegen.ts',
  'utils/observability/performance-bottleneck.ts',
];

const WHITELIST_DIRS = ['api/', 'tmp/', 'context-engine/'];

function parseArgs(argv) {
  const opts = {
    strict: false,
    jsonStdout: false,
    jsonOut: null,
    details: 50,
    paths: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--strict') opts.strict = true;
    else if (a === '--json') opts.jsonStdout = true;
    else if (a === '--json-out' && argv[i + 1]) {
      opts.jsonOut = argv[++i];
    } else if (a === '--details' && argv[i + 1] != null) {
      opts.details = parseInt(argv[++i], 10) || 0;
    } else if (a && !a.startsWith('-')) opts.paths.push(a);
  }
  if (opts.paths.length === 0) opts.paths.push(WEB_SRC);
  return opts;
}

const OPTS = parseArgs(process.argv.slice(2));

function isWhitelisted(relPath) {
  if (WHITELIST_FILES.some((w) => relPath.includes(w))) return true;
  for (const wd of WHITELIST_DIRS) {
    if (relPath.startsWith(wd) || relPath.includes('/' + wd) || relPath.includes(wd.replace('/', ''))) {
      return true;
    }
  }
  return false;
}
function isMockFile(relPath) {
  const name = path.basename(relPath).toLowerCase();
  const dir = path.dirname(relPath).toLowerCase();
  return name.includes('mock') || name.includes('_mock') || dir.includes('mock');
}

function stripComments(line) {
  let result = '';
  let inSingleQuote = false,
    inDoubleQuote = false,
    inBacktick = false,
    inBlockComment = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i],
      next = line[i + 1];
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
      if (ch === '/' && next === '*') {
        inBlockComment = true;
        i++;
        continue;
      }
      if (ch === '/' && next === '/') break;
    }
    if (ch === "'" && !inDoubleQuote && !inBacktick) inSingleQuote = !inSingleQuote;
    else if (ch === '"' && !inSingleQuote && !inBacktick) inDoubleQuote = !inDoubleQuote;
    else if (ch === '`' && !inSingleQuote && !inDoubleQuote) inBacktick = !inBacktick;
    result += ch;
  }
  return result;
}

const stats = {};
const moduleStats = {};
const details = [];
let total = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.includes(entry.name)) continue;
      walk(path.join(dir, entry.name));
    } else if (/\.[mc]?[tj]sx?$/.test(entry.name)) {
      if (SKIP_EXT.some((ext) => entry.name.endsWith(ext))) continue;
      scanFile(path.join(dir, entry.name));
    }
  }
}

function scanFile(filePath) {
  let rel = path.relative(WEB_SRC, filePath);
  // Fall back to basename if file is outside WEB_SRC (e.g. diff mode with absolute paths outside project)
  if (rel.startsWith('..') || path.isAbsolute(rel)) rel = path.basename(filePath);
  if (isWhitelisted(rel) || isMockFile(rel)) return;
  if (/\/(locales|i18n)\//.test(rel)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!CJK.test(rawLine)) continue;
    if (rawLine.trim() === '') continue;

    const line = stripComments(rawLine);
    if (!CJK.test(line)) continue;
    const trimmed = line.trim();
    if (trimmed === '') continue;

    if (trimmed.startsWith('import ') || trimmed.startsWith('import\t')) continue;
    if (/^\s*(export\s+)?(type|interface|enum)\s/.test(trimmed)) continue;
    if (trimmed.startsWith('*') || trimmed.startsWith('/*') || trimmed.startsWith('*/')) continue;
    if (trimmed.startsWith('{/*')) continue;
    if (/\b(console|logger)\s*\.\s*(log|info|warn|error|debug|trace)\s*\(/.test(line)) continue;

    if (line.includes('i18n.t(') || /\bt\s*\(\s*['"`]/.test(line)) continue;

    if (/\[['"`][\u4e00-\u9fff]/.test(line) || /[\u4e00-\u9fff]['"`]\]/.test(line)) continue;

    const parts = rel.split('/');
    const module = parts[0];
    const subModule = parts.length > 1 ? parts.slice(0, 2).join('/') : module;

    if (!stats[module]) stats[module] = 0;
    stats[module]++;
    if (!moduleStats[subModule]) moduleStats[subModule] = 0;
    moduleStats[subModule]++;
    total++;
    details.push({ file: rel, line: i + 1, content: trimmed.slice(0, 120) });
  }
}

for (const p of OPTS.paths) {
  const abs = path.resolve(p);
  if (!fs.existsSync(abs)) continue;
  const stat = fs.statSync(abs);
  if (stat.isDirectory()) walk(abs);
  else if (/\.[mc]?[tj]sx?$/.test(abs)) {
    // 直接传文件路径时，仍然先跑一次 SKIP_EXT + SKIP_DIRS 过滤，
    // 否则 pre-commit 把 *.test.tsx / __tests__/*.tsx 作为参数传入会被直接扫描，
    // 造成 3000+ "硬编码中文 mock 翻译文本" 的误报。
    const name = path.basename(abs);
    if (SKIP_EXT.some((ext) => name.endsWith(ext))) continue;
    const parts = path.dirname(path.relative(WEB_SRC, abs) || name).split(/[\\/]/);
    if (parts.some((d) => SKIP_DIRS.includes(d))) continue;
    scanFile(abs);
  }
}

const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);
const sortedSub = Object.entries(moduleStats)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 30);
const report = {
  scan_paths: OPTS.paths,
  total,
  by_module: stats,
  top_submodules: Object.fromEntries(sortedSub),
  details,
  namespaces_scanned: Object.keys(stats).length,
};

if (OPTS.jsonOut) {
  fs.writeFileSync(path.resolve(OPTS.jsonOut), JSON.stringify(report, null, 2));
}
if (OPTS.jsonStdout) {
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  process.exit(OPTS.strict && report.total > 0 ? 1 : 0);
}

console.log(`\n=== Precise Hardcoded Chinese Scan (UI only) ===`);
console.log(`Scan paths: ${OPTS.paths.join(', ')}`);
console.log(`Total: ${total} lines\n`);
console.log('--- By Module ---');
for (const [mod, count] of sorted) console.log(`  ${mod}: ${count}`);
console.log('\n--- Top 30 Sub-modules ---');
for (const [mod, count] of sortedSub) console.log(`  ${mod}: ${count}`);
if (OPTS.details > 0) {
  console.log(`\n--- Sample details (first ${Math.min(OPTS.details, details.length)}) ---`);
  for (const d of details.slice(0, OPTS.details)) console.log(`  ${d.file}:${d.line} | ${d.content}`);
}
const detailPath = path.resolve(__dirname, 'scan-precise-details.json');
fs.writeFileSync(detailPath, JSON.stringify(details, null, 2));
console.log(`\n💾 Full details saved to ${path.relative(process.cwd(), detailPath)} (${details.length} entries)`);

if (OPTS.strict && total > 0) {
  console.error(`\n❌ Strict mode FAILED: ${total} hardcoded CJK UI strings detected.`);
  process.exit(1);
}
