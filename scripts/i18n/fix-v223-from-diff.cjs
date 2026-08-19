#!/usr/bin/env node
/**
 * Fix V223 TSC errors using git diff to restore corrupted lines.
 *
 * For each file with TSC errors:
 * 1. Get git diff HEAD -- file
 * 2. Find corrupted lines (lines starting with +)
 * 3. Find corresponding original lines (lines starting with -)
 * 4. Apply correct i18n.t() to original line
 * 5. Replace corrupted line with fixed version
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WEB_ROOT = path.resolve(__dirname, '../../apps/web/src');
const I18N_DIR = path.join(WEB_ROOT, 'i18n', 'locales', 'zh');
const REPO_ROOT = path.resolve(__dirname, '../..');

// Load zh translations and build reverse map
const zhMap = {};
const reverseMap = {};
for (const file of fs.readdirSync(I18N_DIR)) {
  if (!file.endsWith('.json')) continue;
  const data = JSON.parse(fs.readFileSync(path.join(I18N_DIR, file), 'utf-8'));
  function flatten(obj, prefix) {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) flatten(v, key);
      else if (typeof v === 'string') {
        zhMap[key] = v;
        if (!reverseMap[v]) reverseMap[v] = key;
      }
    }
  }
  flatten(data, '');
}

const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf]/;

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
  if (!fs.existsSync(fullPath)) continue;

  // Get git diff
  let diff;
  try {
    diff = execSync(`git diff HEAD -- apps/web/src/${relPath}`, { cwd: REPO_ROOT, encoding: 'utf-8' });
  } catch (e) {
    continue;
  }

  if (!diff.trim()) continue;

  // Parse diff hunks to find corrupted + lines and their original - lines
  const lines = diff.split('\n');
  const replacements = []; // {corruptedLine, fixedLine}

  let i = 0;
  while (i < lines.length) {
    // Skip diff header lines
    if (
      lines[i].startsWith('diff ') ||
      lines[i].startsWith('index ') ||
      lines[i].startsWith('---') ||
      lines[i].startsWith('+++')
    ) {
      i++;
      continue;
    }
    if (lines[i].startsWith('@@')) {
      i++;
      continue;
    }

    // Find pairs: - line followed by + line (corruption)
    if (lines[i].startsWith('-')) {
      const origLine = lines[i].substring(1);
      // Check if next line is a + line
      if (i + 1 < lines.length && lines[i + 1].startsWith('+')) {
        const newLine = lines[i + 1].substring(1);
        // Check if the + line is corrupted
        const isCorrupted =
          /i18n\.t\(i18n\.t\(/.test(newLine) || // nested i18n.t
          /i18n\.t\([^)]*\)\}\s*`\s*\(/.test(newLine) || // broken template
          /i18n\.t\([^)]*\)\}\s*`\s*\)/.test(newLine) || // broken template
          /'[a-z]+i18n\.t\(/i.test(newLine) || // string corruption
          /numberi18n\.t\(/i.test(newLine) || // specific string corruption
          (newLine.includes('i18n.t(') && newLine.includes("'))") && !origLine.includes('i18n.t(')) || // unterminated string
          (newLine.includes('` ') && newLine.includes(' : ') && newLine.includes('i18n.t(')); // broken ternary in template

        if (isCorrupted && CJK_RE.test(origLine)) {
          // Apply correct i18n to the original line
          const fixedLine = applyCorrectI18n(origLine, reverseMap);
          if (fixedLine !== origLine) {
            replacements.push({ origLine, newLine, fixedLine });
          }
        }
        i += 2;
        continue;
      }
    }
    i++;
  }

  if (replacements.length === 0) continue;

  // Apply replacements to current file content
  let content = fs.readFileSync(fullPath, 'utf-8');
  let fileFixed = 0;

  for (const r of replacements) {
    // Find the corrupted line in the current content
    const corruptedTrimmed = r.newLine.trim();
    const contentLines = content.split('\n');

    for (let j = 0; j < contentLines.length; j++) {
      if (contentLines[j].trim() === corruptedTrimmed) {
        // Preserve indentation from the corrupted line
        const indent = contentLines[j].match(/^(\s*)/)[1];
        contentLines[j] = indent + r.fixedLine.trimStart();
        fileFixed++;
        break;
      }
    }
    content = contentLines.join('\n');
  }

  if (fileFixed > 0) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`FIXED: ${relPath} (${fileFixed}/${replacements.length} lines)`);
    totalFixed += fileFixed;
  } else {
    console.log(`PARTIAL: ${relPath} (0/${replacements.length} matched in content)`);
  }
}

console.log(`\nTotal lines fixed: ${totalFixed}`);

function applyCorrectI18n(line, reverseMap) {
  let result = line;
  const CJK_PATTERN = /[\u4e00-\u9fff\u3400-\u4dbf，。、：；！？（）·…\-—]+/g;
  let m;
  const matches = [];

  while ((m = CJK_PATTERN.exec(line)) !== null) {
    const text = m[0];
    const before = line.substring(0, m.index);
    // Skip comments
    const trimmed = before.trim();
    if (trimmed.endsWith('//') || trimmed.endsWith('*') || trimmed.startsWith('//')) continue;
    matches.push({ text, index: m.index, end: m.index + text.length });
  }

  // Apply in reverse order to preserve indices
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    const key = reverseMap[match.text];

    // If no exact match, try partial matching
    if (!key) {
      // Try to find a key whose value contains this text
      for (const [k, v] of Object.entries(reverseMap)) {
        if (v === match.text) {
          /* found */ break;
        }
      }
      continue; // Skip if no key found
    }

    const before = result.substring(0, match.index);
    const after = result.substring(match.end);

    // Determine context
    const inTemplate = (before.match(/`/g) || []).length % 2 === 1;
    const singleQuotes = (before.match(/'/g) || []).length;
    const inSingleString = singleQuotes % 2 === 1;
    const inJsxText = before.trimEnd().endsWith('>') && !before.trimEnd().endsWith('/>');

    const replacement = "${i18n.t('" + key + "')}";

    if (inTemplate) {
      result = before + replacement + after;
    } else if (inJsxText) {
      result = before + "{i18n.t('" + key + "')}" + after;
    } else if (inSingleString) {
      // Inside single-quoted string: need to close string, add i18n.t(), reopen
      // This is complex - skip for now
      continue;
    } else {
      // Default: wrap in {}
      result = before + "{i18n.t('" + key + "')}" + after;
    }
  }

  return result;
}
