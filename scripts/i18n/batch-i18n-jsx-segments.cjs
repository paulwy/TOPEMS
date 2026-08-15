#!/usr/bin/env node
/**
 * JSX Segment-aware i18n replacement
 *
 * Handles cases SAFE script missed:
 * 1. JSX text starting with English but has Chinese: >CSV 格式<
 * 2. JSX text with {interpolation}: 草稿 ({n}) → {i18n.t('...')} ({n})
 * 3. {expr} + 中文: {n}个 → {n}{i18n.t('...')}
 *
 * NEVER touches type blocks, whitelist files, bracket access
 */
const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '../../apps/web/src');
const I18N_DIR = path.join(WEB_ROOT, 'i18n', 'locales');

const args = process.argv.slice(2);
const dirIdx = args.indexOf('--dir');
const targetDir = dirIdx !== -1 ? args[dirIdx + 1] : '';
const modIdx = args.indexOf('--module');
const moduleName = modIdx !== -1 ? args[modIdx + 1] : '';
const dryRun = args.includes('--dry');
const verbose = args.includes('--verbose');

const CJK_CHARS = '\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff';
const CJK_RE = new RegExp(`[${CJK_CHARS}]`);

const WHITELIST_REL = [
  'utils/ai/ui-recommender.ts',
  'utils/apiPath.ts',
  'config/ai-templates.ts',
];

function isWhitelisted(p) {
  const rel = path.relative(WEB_ROOT, p).replace(/\\/g, '/');
  if (WHITELIST_REL.some(w => rel.includes(w))) return true;
  const bn = path.basename(p).toLowerCase();
  return bn.includes('mock') || bn === '_mock.ts';
}
function fileLabel(p) {
  const b = path.basename(p).replace(/\.[mc]?[tj]sx?$/, '');
  return b.replace(/(.)([A-Z][a-z]+)/g, '$1_$2').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}
function collectFiles(dir) {
  const r = [];
  if (!fs.existsSync(dir)) return r;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['__tests__','node_modules','test','tests','dist','build','schemas'].includes(e.name)) continue;
      r.push(...collectFiles(fp));
    } else if ((e.name.endsWith('.tsx') || e.name.endsWith('.ts')) &&
               !e.name.endsWith('.test.ts') && !e.name.endsWith('.test.tsx') &&
               !e.name.endsWith('.d.ts') && !e.name.endsWith('.stories.tsx')) {
      if (!isWhitelisted(fp)) r.push(fp);
    }
  }
  return r;
}
function loadJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; } }
function saveJson(p, d) { fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n', 'utf8'); }

function trackTypeBlocks(lines) {
  const inType = new Array(lines.length).fill(false);
  let ts = -1, depth = 0, brace = 0;
  const re = /^\s*(export\s+)?(type|interface|enum)\s+\w+\s*(=|\{|<|extends)/;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (ts === -1 && re.test(line)) { ts = i; depth = 0; brace = 0; }
    if (ts !== -1) {
      inType[i] = true;
      for (const ch of line) {
        if (ch === '{' || ch === '(') { depth++; brace++; }
        else if (ch === '}' || ch === ')') { depth--; brace--; }
      }
      if (re.test(line) && line.includes('=') && !line.includes('{') && line.trim().endsWith(';')) ts = -1;
      else if (brace === 0 && (line.trim().endsWith(';') || line.trim() === '};' || line.trim() === '}')) {
        if (depth <= 0 || i > ts + 1) ts = -1;
      }
    }
  }
  return inType;
}

function ensureImport(lines) {
  const uses = lines.some(l => /i18n\.t\s*\(/.test(l) && !l.trim().startsWith('import'));
  const has = lines.some(l => /import\s+i18n\s+from\s+['"]@\/i18n['"]/.test(l));
  if (uses && !has) {
    let last = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) last = i;
      else if (last >= 0 && !lines[i].trim().startsWith('import') && lines[i].trim() !== '') break;
    }
    if (last >= 0) {
      const il = lines[last].trim();
      if (il.includes('{') && !il.includes('}')) {
        for (let i = last + 1; i < lines.length; i++) if (lines[i].includes('}')) {
          lines.splice(i + 1, 0, "import i18n from '@/i18n';"); return true;
        }
      } else { lines.splice(last + 1, 0, "import i18n from '@/i18n';"); return true; }
    }
  }
  return false;
}

function generateKey(mn, fl, text, idx) {
  const prefix = `${mn}.${fl}`;
  const clean = text.replace(new RegExp(`[${CJK_CHARS}]`, 'g'), '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  return `${prefix}.${text.length <= 20 && clean ? `${clean}_${idx}` : `k${idx}`}`;
}

// Parse JSX text content, split into parts: text segments vs {expr}
// For each text segment that contains CJK, replace with i18n.t()
// Returns the reconstructed inner content
function processJSXInner(inner, translations, mn, fl, kcRef) {
  if (!CJK_RE.test(inner)) return null;
  const parts = [];
  let i = 0, changed = false;
  while (i < inner.length) {
    if (inner[i] === '{') {
      let depth = 1, j = i + 1;
      while (j < inner.length && depth > 0) {
        if (inner[j] === '{') depth++;
        else if (inner[j] === '}') depth--;
        j++;
      }
      parts.push({ type: 'expr', val: inner.substring(i, j) });
      i = j;
    } else {
      let j = i;
      while (j < inner.length && inner[j] !== '{') j++;
      const txt = inner.substring(i, j);
      if (CJK_RE.test(txt)) {
        const trimmed = txt.trim();
        if (trimmed.length > 0) {
          const key = generateKey(mn, fl, trimmed, kcRef[0]++);
          if (!(key in translations.zh)) {
            translations.zh[key] = trimmed;
            translations.en[key] = 'TODO: translate';
          }
          const leadWs = txt.match(/^(\s*)/)[1];
          const trailWs = txt.match(/(\s*)$/)[1];
          parts.push({ type: 'i18n', val: `${leadWs}{i18n.t('${key}')}${trailWs}` });
          changed = true;
          i = j;
          continue;
        }
      }
      parts.push({ type: 'text', val: txt });
      i = j;
    }
  }
  if (!changed) return null;
  // Reconstruct
  // For single part that is pure i18n with no ws: output directly
  // Otherwise join parts; if adjacent parts then need wrapping only if there are expr+i18n mix
  let result = parts.map(p => p.val).join('');
  // Wrap result in braces if it contains any i18n call AND is not already all-wrapped
  if (result.includes('i18n.t(') && !/^\s*\{.*\}\s*$/.test(result)) {
    result = `{${result}}`;
  }
  return result;
}

function processFile(filePath, mn, translations) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const inType = trackTypeBlocks(lines);
  const fl = fileLabel(filePath);
  const kcRef = [0];
  let replacedCount = 0, modified = false;
  const newLines = [...lines];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
    if (trimmed.startsWith('import ') || inType[i]) continue;
    if (!CJK_RE.test(line) || /i18n\.t\s*\(/.test(line)) continue;

    // Pattern 1: JSX text: > ... <
    const jsxRe = />[^<]*[${CJK_CHARS}][^<]*</g;
    const jsxMatches = [];
    let m;
    while ((m = jsxRe.exec(line)) !== null) {
      const innerFull = m[0];
      const inner = innerFull.substring(1, innerFull.length - 1);
      const result = processJSXInner(inner, translations, mn, fl, kcRef);
      if (result) {
        jsxMatches.push({ full: innerFull, offset: m.index, replacement: `>${result}<` });
        replacedCount++;
      }
    }
    if (jsxMatches.length > 0) {
      jsxMatches.sort((a, b) => b.offset - a.offset);
      for (const match of jsxMatches) {
        line = line.substring(0, match.offset) + match.replacement + line.substring(match.offset + match.full.length);
      }
      modified = true;
    }

    // Pattern 2: JSX attributes with CJK but not already processed (e.g. value="中文{expr}")
    const attrRe = /(\w+)=("([^"]*[${CJK_CHARS}][^"]*)"|'([^']*[${CJK_CHARS}][^']*)')/g;
    const attrMatches = [];
    while ((m = attrRe.exec(line)) !== null) {
      const text = m[3] || m[4];
      const quote = m[2][0];
      if (!CJK_RE.test(text)) continue;
      const before = line.substring(0, m.index);
      if (/i18n\.t\s*\(\s*$/.test(before)) continue;
      // If contains ${} interpolation in template string (only if backtick - but here it's " or ')
      if (text.includes('${')) continue; // Skip complex cases
      const attr = m[1];
      // Only safe if attr has no interpolation (text-only with CJK, no {})
      if (!text.includes('{')) {
        const key = generateKey(mn, fl, text.trim(), kcRef[0]++);
        if (!(key in translations.zh)) {
          translations.zh[key] = text.trim();
          translations.en[key] = 'TODO: translate';
        }
        attrMatches.push({
          full: m[0],
          offset: m.index,
          replacement: `${attr}={i18n.t('${key}')}`
        });
        replacedCount++;
      }
    }
    if (attrMatches.length > 0) {
      let hasOverlap = false;
      for (const am of attrMatches) {
        for (const jm of jsxMatches) {
          if (!(am.offset + am.full.length <= jm.offset || am.offset >= jm.offset + jm.full.length)) {
            hasOverlap = true; break;
          }
        }
        if (hasOverlap) break;
      }
      if (!hasOverlap) {
        attrMatches.sort((a, b) => b.offset - a.offset);
        for (const match of attrMatches) {
          line = line.substring(0, match.offset) + match.replacement + line.substring(match.offset + match.full.length);
        }
        modified = true;
      }
    }

    if (line !== newLines[i]) newLines[i] = line;
  }

  if (modified) ensureImport(newLines);
  if (!dryRun && modified) fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
  return { replacedCount, fl };
}

// ===== Main =====
if (!targetDir || !moduleName) { console.error('--dir and --module required'); process.exit(1); }
const BASE_DIR = path.join(WEB_ROOT, targetDir);
const files = collectFiles(BASE_DIR);
if (files.length === 0) { console.log('No files'); process.exit(0); }

const translations = { zh: {}, en: {} };
const zhNs = path.join(I18N_DIR, 'zh', `${moduleName}.json`);
const enNs = path.join(I18N_DIR, 'en', `${moduleName}.json`);
translations.zh = loadJson(zhNs);
translations.en = loadJson(enNs);

console.log(`\n🧩 JSX Segment: ${targetDir} (${files.length} files, ns=${moduleName})`);
let total = 0;
for (const f of files) {
  const r = processFile(f, moduleName, translations);
  if (r.replacedCount > 0) {
    total += r.replacedCount;
    console.log(`  ✅ ${path.relative(BASE_DIR, f)}: ${r.replacedCount}`);
  }
}
if (!dryRun && total > 0) { saveJson(zhNs, translations.zh); saveJson(enNs, translations.en); console.log(`  💾 Saved zh/${moduleName}.json, en/${moduleName}.json`); }
console.log(`  Total: ${total}${dryRun ? ' (DRY RUN)' : ''}`);
