#!/usr/bin/env node
/**
 * Simple char-by-char CJK segment extractor for cross-line JSX text
 * Ultra-simple: just find any CJK run + surrounding chars, replace
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

function isCJK(ch) {
  const c = ch.codePointAt(0);
  return (
    (c >= 0x4e00 && c <= 0x9fff) ||
    (c >= 0x3400 && c <= 0x4dbf) ||
    (c >= 0x3300 && c <= 0x33ff) ||
    (c >= 0xf900 && c <= 0xfaff)
  );
}

const WHITELIST_REL = ['utils/ai/ui-recommender.ts', 'utils/apiPath.ts', 'config/ai-templates.ts'];

function isWhitelisted(p) {
  const rel = path.relative(WEB_ROOT, p).replace(/\\/g, '/');
  if (WHITELIST_REL.some((w) => rel.includes(w))) return true;
  const bn = path.basename(p).toLowerCase();
  return bn.includes('mock') || bn === '_mock.ts';
}
function fileLabel(p) {
  const b = path.basename(p).replace(/\.[mc]?[tj]sx?$/, '');
  return b
    .replace(/(.)([A-Z][a-z]+)/g, '$1_$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase();
}
function collectFiles(dir) {
  const r = [];
  if (!fs.existsSync(dir)) return r;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['__tests__', 'node_modules', 'test', 'tests', 'dist', 'build', 'schemas'].includes(e.name)) continue;
      r.push(...collectFiles(fp));
    } else if (
      (e.name.endsWith('.tsx') || e.name.endsWith('.ts')) &&
      !e.name.endsWith('.test.ts') &&
      !e.name.endsWith('.test.tsx') &&
      !e.name.endsWith('.d.ts') &&
      !e.name.endsWith('.stories.tsx')
    ) {
      if (!isWhitelisted(fp)) r.push(fp);
    }
  }
  return r;
}
function loadJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return {};
  }
}
function saveJson(p, d) {
  fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n', 'utf8');
}

function trackTypeBlocks(lines) {
  const inType = new Array(lines.length).fill(false);
  let ts = -1,
    brace = 0;
  const re = /^\s*(export\s+)?(type|interface|enum)\s+\w+\s*(=|\{|<|extends)/;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (ts === -1 && re.test(line)) {
      ts = i;
      brace = 0;
    }
    if (ts !== -1) {
      inType[i] = true;
      for (const ch of line) {
        if (ch === '{' || ch === '(') brace++;
        else if (ch === '}' || ch === ')') brace--;
      }
      if (re.test(line) && line.includes('=') && !line.includes('{') && line.trim().endsWith(';')) ts = -1;
      else if (brace === 0 && (line.trim().endsWith(';') || line.trim() === '};' || line.trim() === '}')) {
        if (i > ts + 1) ts = -1;
      }
    }
  }
  return inType;
}

function ensureImport(lines) {
  const uses = lines.some((l) => /i18n\.t\s*\(/.test(l) && !l.trim().startsWith('import'));
  const has = lines.some((l) => /import\s+i18n\s+from\s+['"]@\/i18n['"]/.test(l));
  if (uses && !has) {
    let last = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) last = i;
      else if (last >= 0 && !lines[i].trim().startsWith('import') && lines[i].trim() !== '') break;
    }
    if (last >= 0) {
      const il = lines[last].trim();
      if (il.includes('{') && !il.includes('}')) {
        for (let i = last + 1; i < lines.length; i++)
          if (lines[i].includes('}')) {
            lines.splice(i + 1, 0, "import i18n from '@/i18n';");
            return true;
          }
      } else {
        lines.splice(last + 1, 0, "import i18n from '@/i18n';");
        return true;
      }
    }
  }
  return false;
}

function genKey(mn, fl, text, idx) {
  const prefix = `${mn}.${fl}`;
  let clean = '';
  for (const ch of text) {
    if (!isCJK(ch) && /[a-zA-Z0-9_]/.test(ch)) clean += ch.toLowerCase();
  }
  clean = clean.replace(/[^a-z0-9_]/g, '');
  return `${prefix}.${text.length <= 20 && clean ? `${clean}_${idx}` : `k${idx}`}`;
}

function findMatchingBrace(line, start) {
  let depth = 1,
    i = start + 1;
  let inStr = null,
    strCh = '';
  while (i < line.length && depth > 0) {
    const ch = line[i],
      prev = line[i - 1];
    if ((ch === '"' || ch === "'" || ch === '`') && prev !== '\\') {
      if (inStr === null) {
        inStr = 'in';
        strCh = ch;
      } else if (strCh === ch) inStr = null;
    } else if (inStr === null) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }
    i++;
  }
  return i;
}

// Extract segments of a line: skip {expr} blocks, process remaining text for CJK runs
function processLine(line, translations, mn, fl, kcRef) {
  if (!/[\u4e00-\u9fff]/.test(line)) return null;
  if (/i18n\.t\s*\(/.test(line)) return null;
  if (/^\s*import\s/.test(line)) return null;

  // Pre-check: is this object property shorthand like "中文键: value"
  // (Allow "label: '中文'" which is fine - only block if CJK is key before :)
  const trimmed = line.trim();
  const propKeyRe = /^[\u4e00-\u9fff][\u4e00-\u9fff\w]*\s*[:：]\s*/;
  if (propKeyRe.test(trimmed)) {
    // Only skip if CJK is before colon (is key), not after
    // Replace CJK in value portion instead of whole line: we will continue
    // but use a modified approach: mark pre-colon as protected
  }

  // Step 1: mark ranges that are {expr} blocks (don't process inside)
  const protectedRanges = [];
  let inStr = null,
    strCh = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i],
      prev = line[i - 1] || '';
    if ((ch === '"' || ch === "'" || ch === '`') && prev !== '\\') {
      if (inStr === null) {
        inStr = 'in';
        strCh = ch;
      } else if (strCh === ch) inStr = null;
    } else if (inStr === null && ch === '{') {
      const end = findMatchingBrace(line, i);
      protectedRanges.push([i, end]);
      i = end - 1;
    }
  }

  function isProtected(idx) {
    return protectedRanges.some(([s, e]) => idx >= s && idx < e);
  }

  // Step 2: find CJK runs + surrounding text (within same unprotected region)
  // Extract CJK segments: look for max [a-zA-Z...]* CJK+ [a-zA-Z... punctuation]* that is contiguous and outside protected
  const out = [];
  let i = 0;
  let anyCJKReplaced = false;
  while (i < line.length) {
    if (isProtected(i)) {
      // find end of protected region
      const pr = protectedRanges.find(([s, e]) => i >= s && i < e);
      if (pr) {
        out.push({ t: 'raw', v: line.substring(i, pr[1]) });
        i = pr[1];
        continue;
      }
    }
    // Scan char
    if (!isCJK(line[i])) {
      // find next CJK or protected
      let j = i;
      while (j < line.length && !isCJK(line[j]) && !isProtected(j)) j++;
      if (j < line.length && isCJK(line[j])) {
        // This non-CJK leads into a CJK run - it might be surrounding text
        // Find the full "segment": letters/spaces/punct + CJK
        // Use a simple greedy approach: from the CJK position, expand backwards and forwards
        // to include letters, spaces, common punctuation but not { } or structural chars
        let start = j;
        while (start > i) {
          const c = line[start - 1];
          if (/[a-zA-Z0-9\s：，。、（）()·\-—!！？%\/、,.:;#&=_~\[\]<>+*\/]/.test(c) && c !== '{' && c !== '}') start--;
          else break;
        }
        let end = j;
        while (end < line.length && !isProtected(end)) {
          const c = line[end];
          if (
            isCJK(c) ||
            (/[a-zA-Z0-9\s：，。、（）()·\-—!！？%\/、,.:;#&=_~\[\]<>+*\/]/.test(c) && c !== '{' && c !== '}')
          )
            end++;
          else break;
        }
        const text = line.substring(start, end);
        if (!/[\u4e00-\u9fff]/.test(text)) {
          out.push({ t: 'raw', v: line[i] });
          i++;
          continue;
        }
        // Output everything before start
        if (start > i) out.push({ t: 'raw', v: line.substring(i, start) });
        const trimmedText = text.trim();
        const key = genKey(mn, fl, trimmedText, kcRef[0]++);
        if (!(key in translations.zh)) {
          translations.zh[key] = trimmedText;
          translations.en[key] = 'TODO: translate';
        }
        const leadWs = text.match(/^(\s*)/)[1];
        const trailWs = text.match(/(\s*)$/)[1];
        // Check if we need wrapping braces: if parent context is JSX text (not in attr or string)
        // Simplest: always wrap in {} if the segment isn't inside a string context
        out.push({ t: 'i18n', v: `${leadWs}{i18n.t('${key}')}${trailWs}` });
        anyCJKReplaced = true;
        i = end;
        continue;
      } else {
        out.push({ t: 'raw', v: line.substring(i, j) });
        i = j;
        continue;
      }
    } else {
      // Starts with CJK directly
      let start = i;
      while (start > 0) {
        const c = line[start - 1];
        if (
          /[a-zA-Z0-9\s：，。、（）()·\-—!！？%\/、,.:;#&=_~\[\]<>+*\/]/.test(c) &&
          c !== '{' &&
          c !== '}' &&
          !isProtected(start - 1)
        )
          start--;
        else break;
      }
      let end = i;
      while (end < line.length && !isProtected(end)) {
        const c = line[end];
        if (
          isCJK(c) ||
          (/[a-zA-Z0-9\s：，。、（）()·\-—!！？%\/、,.:;#&=_~\[\]<>+*\/]/.test(c) && c !== '{' && c !== '}')
        )
          end++;
        else break;
      }
      const text = line.substring(start, end);
      if (start > i) out.push({ t: 'raw', v: line.substring(i, start) });
      const trimmedText = text.trim();
      const key = genKey(mn, fl, trimmedText, kcRef[0]++);
      if (!(key in translations.zh)) {
        translations.zh[key] = trimmedText;
        translations.en[key] = 'TODO: translate';
      }
      const leadWs = text.match(/^(\s*)/)[1];
      const trailWs = text.match(/(\s*)$/)[1];
      out.push({ t: 'i18n', v: `${leadWs}{i18n.t('${key}')}${trailWs}` });
      anyCJKReplaced = true;
      i = end;
      continue;
    }
    i++;
  }
  if (!anyCJKReplaced) return null;
  const result = out.map((o) => o.v).join('');
  return result !== line ? result : null;
}

function processFile(filePath, mn, translations) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const inType = trackTypeBlocks(lines);
  const fl = fileLabel(filePath);
  const kcRef = [0];
  let count = 0,
    modified = false;
  const newLines = [...lines];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
    if (trimmed.startsWith('import ')) continue;
    if (inType[i]) continue;
    // Skip bracket access like obj['中文'] on the key side
    if (/^\s*\[[\s]*["'][\u4e00-\u9fff]/.test(line)) continue;
    const result = processLine(line, translations, mn, fl, kcRef);
    if (result && result !== line) {
      newLines[i] = result;
      count++;
      modified = true;
    }
  }
  if (modified) ensureImport(newLines);
  if (!dryRun && modified) fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
  return { count, fl };
}

// ===== Main =====
if (!targetDir || !moduleName) {
  console.error('--dir and --module required');
  process.exit(1);
}
const BASE_DIR = path.join(WEB_ROOT, targetDir);
const files = collectFiles(BASE_DIR);
if (files.length === 0) {
  console.log('No files');
  process.exit(0);
}
const translations = { zh: {}, en: {} };
const zhNs = path.join(I18N_DIR, 'zh', `${moduleName}.json`);
const enNs = path.join(I18N_DIR, 'en', `${moduleName}.json`);
translations.zh = loadJson(zhNs);
translations.en = loadJson(enNs);

console.log(`\n✨ Simple char CJK: ${targetDir} (${files.length} files, ns=${moduleName})`);
let total = 0;
for (const f of files) {
  const r = processFile(f, moduleName, translations);
  if (r.count > 0) {
    total += r.count;
    console.log(`  ✅ ${path.relative(BASE_DIR, f)}: ${r.count}`);
  }
}
if (!dryRun && total > 0) {
  saveJson(zhNs, translations.zh);
  saveJson(enNs, translations.en);
  console.log(`  💾 Saved`);
}
console.log(`  Total: ${total}${dryRun ? ' (DRY RUN)' : ''}`);
