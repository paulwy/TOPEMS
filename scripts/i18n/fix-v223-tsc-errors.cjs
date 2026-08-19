#!/usr/bin/env node
/**
 * Fix V223 TSC errors by restoring corrupted lines from git HEAD
 * and applying correct i18n replacements.
 *
 * Pattern: The V223 script corrupted template literals like:
 *   Original:  `风险预警${condition ? ` (count)` : ''}`}
 *   Corrupted: `${i18n.t('key')} ` (count)` : ''}`}
 *
 * Strategy: For each corrupted file, read the git HEAD version, find lines
 * with Chinese text, apply correct i18n.t() replacement, and replace
 * the corrupted lines in the current version.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WEB_ROOT = path.resolve(__dirname, '../../apps/web/src');
const I18N_DIR = path.join(WEB_ROOT, 'i18n', 'locales', 'zh');

// Load all zh translations
const zhMap = {};
const zhDir = I18N_DIR;
for (const file of fs.readdirSync(zhDir)) {
  if (!file.endsWith('.json')) continue;
  const data = JSON.parse(fs.readFileSync(path.join(zhDir, file), 'utf-8'));
  function flatten(obj, prefix) {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) flatten(v, key);
      else if (typeof v === 'string') zhMap[key] = v;
    }
  }
  flatten(data, '');
}

// Reverse map: Chinese text -> i18n key
const reverseZhMap = {};
for (const [k, v] of Object.entries(zhMap)) {
  if (!reverseZhMap[v]) reverseZhMap[v] = k;
}

const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf]/;

// Files with TSC errors from V223 corruption
const errorFiles = [
  'ai/agent/v54-agent-panel.tsx',
  'ai/copilot/v55-copilot-panel.tsx',
  'ai/enhancement/v53-ai-panel.tsx',
  'ai/governance/v57-governance-panel.tsx',
  'ai/review/v56-review-panel.tsx',
  'components/bff/BffErrorBoundary.tsx',
  'components/bi/PivotTable.tsx',
  'pages/aps/CapacityDetailPage.tsx',
  'pages/bi/BIAnalyticsPage.tsx',
  'pages/bi/BiIndexPage.tsx',
  'pages/bi/DataAnalysisPage.tsx',
  'pages/lims/LimsInstrumentDataPage/components/ParseTestDialog.tsx',
  'pages/qms/QmsEightDPage.tsx',
  'pages/rd/RsExperimentDetailPage.tsx',
  'pages/report/TemplateManagementPage.tsx',
  'pages/wms/WmsInboundDetailPage.tsx',
  'pages/wms/WmsInventoryMovementDetailPage.tsx',
  'pages/wms/WmsOutboundDetailPage.tsx',
];

let totalFixed = 0;

for (const relPath of errorFiles) {
  const fullPath = path.join(WEB_ROOT, relPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`SKIP (not found): ${relPath}`);
    continue;
  }

  // Get git HEAD version
  let originalContent;
  try {
    originalContent = execSync(`git show HEAD:apps/web/src/${relPath}`, {
      cwd: path.resolve(__dirname, '../..'),
      encoding: 'utf-8',
    });
  } catch (e) {
    console.log(`SKIP (git error): ${relPath}`);
    continue;
  }

  const currentContent = fs.readFileSync(fullPath, 'utf-8');
  const originalLines = originalContent.split('\n');
  const currentLines = currentContent.split('\n');

  // Find lines with corruption: look for nested i18n.t() or broken template literals
  let fileFixed = 0;
  const fixedLines = [...currentLines];

  for (let i = 0; i < currentLines.length; i++) {
    const line = currentLines[i];

    // Detect corruption patterns:
    // 1. Nested i18n.t: i18n.t(i18n.t('key')
    // 2. Broken template: `${i18n.t('key')} ` (expr)` : ''}
    // 3. String corruption: 'wordi18n.t('key')
    const hasNested = /i18n\.t\(i18n\.t\(/.test(line);
    const hasBrokenTpl = /i18n\.t\([^)]*\)\}\s*`\s*\(/.test(line) || /i18n\.t\([^)]*\)\}\s*`\s*\)/.test(line);
    const hasStringCorruption = /'[a-z]+i18n\.t\(/i.test(line) || /numberi18n\.t\(/i.test(line);

    if (!hasNested && !hasBrokenTpl && !hasStringCorruption) continue;

    // Find the corresponding original line
    // Try to match by looking at nearby lines in the original
    const currentTrimmed = line
      .trim()
      .replace(/i18n\.t\([^)]*\)/g, '')
      .replace(/[\s{}()`,]/g, '');
    let bestMatchIdx = -1;
    let bestScore = 0;

    for (let j = 0; j < originalLines.length; j++) {
      const origTrimmed = originalLines[j]
        .trim()
        .replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, '')
        .replace(/[\s{}()`,]/g, '');
      // Calculate similarity
      let score = 0;
      const minLen = Math.min(currentTrimmed.length, origTrimmed.length);
      for (let k = 0; k < minLen; k++) {
        if (currentTrimmed[k] === origTrimmed[k]) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatchIdx = j;
      }
    }

    if (bestMatchIdx < 0 || bestScore < 10) continue;

    const origLine = originalLines[bestMatchIdx];

    // Apply correct i18n replacement to the original line
    // Replace Chinese text with i18n.t() calls
    let fixedLine = origLine;

    // For template literals with Chinese: `中文${expr}` -> `${i18n.t('key')}${expr}`
    // For JSX text: >中文< -> >{i18n.t('key')}<
    // For string values: '中文' -> i18n.t('key') or {i18n.t('key')} in JSX

    // Find Chinese text segments in the original line
    const cjkMatches = [];
    const cjkRe = /[\u4e00-\u9fff\u3400-\u4dbf，。、：；！？（）·…\-—]+/g;
    let m;
    while ((m = cjkRe.exec(origLine)) !== null) {
      const text = m[0];
      // Skip if it's in a comment
      const before = origLine.substring(0, m.index);
      if (before.trim().endsWith('//') || before.trim().endsWith('*')) continue;
      cjkMatches.push({ text, index: m.index, end: m.index + text.length });
    }

    if (cjkMatches.length === 0) continue;

    // For each Chinese text segment, find the translation key
    for (const match of cjkMatches) {
      const key = reverseZhMap[match.text];
      if (key) {
        // Replace the Chinese text with i18n.t() call
        // Context-dependent replacement
        const before = fixedLine.substring(0, match.index);
        const after = fixedLine.substring(match.end);

        // Check if we're inside a template literal
        const inTemplate = (before.match(/`/g) || []).length % 2 === 1;

        // Check if we're inside a JSX text node
        const inJsxText = before.trimEnd().endsWith('>') && !before.trimEnd().endsWith('/>');

        // Check if we're inside a string literal
        const singleQuotes = (before.match(/'/g) || []).length;
        const doubleQuotes = (before.match(/"/g) || []).length;
        const inSingleString = singleQuotes % 2 === 1;
        const inDoubleString = doubleQuotes % 2 === 1;

        if (inTemplate) {
          // Inside template literal: 中文${expr} -> ${i18n.t('key')}${expr}
          fixedLine = before.substring(0, match.index) + "${i18n.t('" + key + "')}" + after;
        } else if (inSingleString) {
          // Inside single-quoted string: replace with i18n.t() outside string
          // This is tricky - skip for now, handle manually
          continue;
        } else if (inJsxText) {
          // JSX text: >中文< -> >{i18n.t('key')}<
          fixedLine = before.substring(0, match.index) + "{i18n.t('" + key + "')}" + after;
        } else {
          // String value: '中文' -> i18n.t('key') or {i18n.t('key')}
          // Check if it's in a JSX attribute value
          if (before.trimEnd().match(/=\s*$/)) {
            // JSX attribute: label='中文' -> label={i18n.t('key')}
            fixedLine = before.substring(0, match.index) + "{i18n.t('" + key + "')}" + after;
          } else {
            // Regular string value
            fixedLine = before.substring(0, match.index) + "i18n.t('" + key + "')" + after;
          }
        }
      }
    }

    if (fixedLine !== origLine && fixedLine !== line) {
      // Preserve indentation
      const origIndent = origLine.match(/^(\s*)/)[1];
      fixedLines[i] = origIndent + fixedLine.trimStart();
      fileFixed++;
    }
  }

  if (fileFixed > 0) {
    fs.writeFileSync(fullPath, fixedLines.join('\n'), 'utf-8');
    console.log(`FIXED: ${relPath} (${fileFixed} lines)`);
    totalFixed += fileFixed;
  } else {
    console.log(`NO CHANGES: ${relPath}`);
  }
}

console.log(`\nTotal lines fixed: ${totalFixed}`);
