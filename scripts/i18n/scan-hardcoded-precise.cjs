#!/usr/bin/env node
/**
 * Precise scan: only count REAL UI hardcoded Chinese strings
 * Excludes: comments, type-only strings, bracket notation access, whitelist files
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
  'schemas/crm/customerSegmentation.ts',
  'services/ExternalErpAdapters.ts',
  'utils/bff/codegen.ts',
  'schemas/workflow/approval.ts',
  'utils/observability/performance-bottleneck.ts',
];

const WHITELIST_DIRS = [
  'api/',
  'pages/bi/',
  'tmp/',
  'context-engine/',
];

function isWhitelisted(relPath) {
  if (WHITELIST_FILES.some(w => relPath.includes(w))) return true;
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
  let inSingleQuote = false, inDoubleQuote = false, inBacktick = false, inBlockComment = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i], next = line[i + 1];
    if (inBlockComment) {
      if (ch === '*' && next === '/') { inBlockComment = false; i++; }
      continue;
    }
    if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
      if (ch === '/' && next === '*') { inBlockComment = true; i++; continue; }
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
      if (SKIP_EXT.some(ext => entry.name.endsWith(ext))) continue;
      scanFile(path.join(dir, entry.name));
    }
  }
}

function scanFile(filePath) {
  const rel = path.relative(WEB_SRC, filePath);
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
    if (/\b(console|logger)\s*\.\s*(log|info|warn|error|debug|trace)\s*\(/.test(line)) continue;

    if (line.includes('i18n.t(') || (/\bt\s*\(\s*['"`]/.test(line))) continue;

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

walk(WEB_SRC);
console.log(`\n=== Precise Hardcoded Chinese Scan (UI only) ===`);
console.log(`Total: ${total} lines\n`);
console.log('--- By Module ---');
const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);
for (const [mod, count] of sorted) console.log(`  ${mod}: ${count}`);
console.log('\n--- Top 30 Sub-modules ---');
const sortedSub = Object.entries(moduleStats).sort((a, b) => b[1] - a[1]).slice(0, 30);
for (const [mod, count] of sortedSub) console.log(`  ${mod}: ${count}`);
console.log('\n--- Sample details (first 50) ---');
for (const d of details.slice(0, 50)) console.log(`  ${d.file}:${d.line} | ${d.content}`);
fs.writeFileSync(path.resolve(__dirname, 'scan-precise-details.json'), JSON.stringify(details, null, 2));
console.log(`\n💾 Full details saved to scripts/i18n/scan-precise-details.json (${details.length} entries)`);
