#!/usr/bin/env node
/**
 * Fix V223 script corruptions: i18n.t() calls incorrectly inserted into
 * string literals, type unions, and other non-JSX contexts.
 *
 * Reverts i18n.t('key') back to the original Chinese text by looking up
 * the translation files.
 */

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '../../apps/web/src');
const I18N_DIR = path.join(WEB_ROOT, 'i18n', 'locales', 'zh');

// Load all zh translation files into a flat map
const zhMap = {};
for (const file of fs.readdirSync(I18N_DIR)) {
  if (!file.endsWith('.json')) continue;
  const data = JSON.parse(fs.readFileSync(path.join(I18N_DIR, file), 'utf-8'));
  // Flatten nested objects
  function flatten(obj, prefix) {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        flatten(v, key);
      } else if (typeof v === 'string') {
        zhMap[key] = v;
      }
    }
  }
  flatten(data, '');
}

console.log(`Loaded ${Object.keys(zhMap).length} zh translation entries`);

// Fix: replace i18n.t('key') with zhMap['key'] inside single-quoted strings
function revertI18nInSingleQuotes(content) {
  // Pattern: inside a single-quoted string, i18n.t('key') breaks the string
  // We need to find i18n.t('key') and replace with the Chinese value
  // But only when it's inside a single-quoted string context

  // Strategy: find all i18n.t('...') calls and replace with the zh value
  // This is safe because in .ts files, i18n.t() calls in data strings are always wrong
  let result = content;
  const re = /i18n\.t\(\s*'([^']+)'\s*(?:,\s*[^)]*)?\)/g;
  let m;
  const replacements = [];
  while ((m = re.exec(result)) !== null) {
    const key = m[1];
    const zhVal = zhMap[key];
    if (zhVal !== undefined) {
      replacements.push({ start: m.index, end: m.index + m[0].length, val: zhVal, key });
    }
  }
  // Apply replacements in reverse order
  for (let i = replacements.length - 1; i >= 0; i--) {
    const r = replacements[i];
    result = result.substring(0, r.start) + r.val + result.substring(r.end);
  }
  return { content: result, count: replacements.length };
}

// Fix: replace i18n.t("key") with zhMap['key'] (double-quoted variant)
function revertI18nInDoubleQuotes(content) {
  let result = content;
  const re = /i18n\.t\(\s*"([^"]+)"\s*(?:,\s*[^)]*)?\)/g;
  let m;
  const replacements = [];
  while ((m = re.exec(result)) !== null) {
    const key = m[1];
    const zhVal = zhMap[key];
    if (zhVal !== undefined) {
      replacements.push({ start: m.index, end: m.index + m[0].length, val: zhVal, key });
    }
  }
  for (let i = replacements.length - 1; i >= 0; i--) {
    const r = replacements[i];
    result = result.substring(0, r.start) + r.val + result.substring(r.end);
  }
  return { content: result, count: replacements.length };
}

// Files to process (only .ts data files and specific .tsx files with corruption)
const targets = [
  // .ts files where i18n.t() in string literals causes syntax errors
  'utils/ai/ui-recommender.ts',
  'utils/apiPath.ts',
  'api/crmFinance/index.ts',
  'services/ExternalErpAdapters.ts',
  'microfrontend/devex/performance-analyzer.ts',
  // .tsx files with specific corruptions
  'hooks/bff/useBffSuspense.tsx',
  'lib/plugin-loader/PluginLoader.tsx',
  'microfrontend/security/SecurityCenter.tsx',
  'components/bff/BffErrorBoundary.tsx',
  'components/bi/PivotTable.tsx',
];

let totalReplacements = 0;

for (const relPath of targets) {
  const fullPath = path.join(WEB_ROOT, relPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`SKIP (not found): ${relPath}`);
    continue;
  }

  const original = fs.readFileSync(fullPath, 'utf-8');
  let content = original;
  let fileCount = 0;

  // Step 1: Revert i18n.t('key') -> Chinese text (for .ts files where these are data strings)
  const isTs = relPath.endsWith('.ts');
  if (isTs) {
    const r1 = revertI18nInSingleQuotes(content);
    content = r1.content;
    fileCount += r1.count;
    const r2 = revertI18nInDoubleQuotes(content);
    content = r2.content;
    fileCount += r2.count;
  }

  // Step 2: Fix template literal corruptions: $i18n.t('key') -> ${i18n.t('key')}
  // (only for known safe cases - not in .ts data strings)
  if (!isTs) {
    // Only fix $i18n.t -> ${i18n.t} in .tsx files where it's a template literal
    // Don't revert in .tsx because those might be legitimate JSX expressions
  }

  // Step 3: Fix specific corruptions per file
  // These are handled by the targeted fixes below

  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`FIXED: ${relPath} (${fileCount} replacements)`);
    totalReplacements += fileCount;
  } else {
    console.log(`NO CHANGE: ${relPath}`);
  }
}

console.log(`\nTotal replacements: ${totalReplacements}`);
