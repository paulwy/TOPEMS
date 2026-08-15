#!/usr/bin/env node
/**
 * Context-aware line-by-line i18n processor
 * Handles CROSS-LINE JSX text: doesn't rely on >xxx< pattern
 * For any line outside type blocks:
 *   - Finds CJK text segments that are NOT inside {expr}
 *   - NOT object property keys
 *   - NOT bracket access
 *   - NOT inside template expression placeholders
 * Replaces CJK segments with i18n.t()
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

const CJK = '[\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff]';
const CJK_RE = new RegExp(CJK);

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
  let ts = -1, brace = 0;
  const re = /^\s*(export\s+)?(type|interface|enum)\s+\w+\s*(=|\{|<|extends)/;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (ts === -1 && re.test(line)) { ts = i; brace = 0; }
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

function genKey(mn, fl, text, idx) {
  const prefix = `${mn}.${fl}`;
  const clean = text.replace(new RegExp(CJK, 'g'), '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  return `${prefix}.${text.length <= 20 && clean ? `${clean}_${idx}` : `k${idx}`}`;
}

function isObjKeyContext(line, idx) {
  const before = line.substring(0, idx).trimEnd();
  if (before.endsWith('{') || before.endsWith(',') || before.endsWith(';')) {
    const after = line.substring(idx);
    const match = after.match(/^\s*['"]?[\u4e00-\u9fff\w]+['"]?\s*[:：]/);
    return !!match;
  }
  return false;
}

// Split a line into parts: {expr} vs text; replace CJK in text parts
function processCJKLineSegments(line, translations, mn, fl, kcRef) {
  // Skip if line contains no CJK
  if (!CJK_RE.test(line)) return null;
  // Skip if already has i18n.t
  if (/i18n\.t\s*\(/.test(line)) return null;

  // Parse character by character, split into segments: brace-blocks vs text
  const segments = [];
  let i = 0, changed = false;
  let inStr = null, strCh = '';
  let prev = '';

  while (i < line.length) {
    const ch = line[i];

    // Handle string literals: track quoting state to avoid detecting { inside strings
    if ((ch === '"' || ch === "'" || ch === '`') && prev !== '\\') {
      if (inStr === null) { inStr = 'in'; strCh = ch; segments.push({t:'text', s:i}); i++; prev=ch; continue; }
      else if (strCh === ch) { inStr = null; segments.push({t:'text', s:segments[segments.length-1].s, e:i}); segments.pop(); i++; prev=ch; continue; }
    }

    if (inStr) { i++; prev=ch; continue; }

    if (ch === '{') {
      if (segments.length === 0 || segments[segments.length-1].t !== 'text-start') {
        segments.push({t:'text-start', s: i});
      }
      // Find matching }
      let depth = 1, j = i + 1;
      while (j < line.length && depth > 0) {
        if (line[j] === '{') depth++;
        else if (line[j] === '}') depth--;
        else if ((line[j] === '"' || line[j] === "'" || line[j] === '`') && line[j-1] !== '\\') {
          const quote = line[j]; j++;
          while (j < line.length && line[j] !== quote) { if (line[j] === '\\') j++; j++; }
        }
        j++;
      }
      if (segments.length > 0 && segments[segments.length-1].t === 'text-start') {
        segments[segments.length-1].e = i;
        segments[segments.length-1].t = 'text';
      }
      segments.push({ t: 'expr', s: i, e: j });
      i = j;
      prev = '}';
      continue;
    }
    if (segments.length === 0 || segments[segments.length-1].t === 'expr' || segments[segments.length-1].t === 'text') {
      segments.push({ t: 'text-start', s: i });
    }
    prev = ch;
    i++;
  }
  if (segments.length > 0 && segments[segments.length-1].t === 'text-start') {
    segments[segments.length-1].e = line.length;
    segments[segments.length-1].t = 'text';
  }

  // Now process text segments
  const resultParts = [];
  for (const seg of segments) {
    if (seg.t === 'expr') {
      resultParts.push(line.substring(seg.s, seg.e));
      continue;
    }
    const text = line.substring(seg.s, seg.e);
    if (!CJK_RE.test(text)) { resultParts.push(text); continue; }

    // Check if this is object key shorthand
    if (isObjKeyContext(line, seg.s)) { resultParts.push(text); continue; }
    // Check bracket access
    if (/^\s*\[/.test(line.substring(Math.max(0, seg.s - 5)))) { resultParts.push(text); continue; }

    // Find CJK sub-segments within text part
    // Split: extract CJK-containing substrings, preserve other text
    const cjkSegRe = new RegExp(`[a-zA-Z0-9\\s\\-—]*${CJK}[${CJK}\\s\\w：，。、（）()·\\-—\\!！？%／、,.:;#&=<>\\[\\]]*${CJK}?|${CJK}+`, 'g');
    // Simpler: just extract text runs that contain CJK, preserve non-CJK around
    const subParts = [];
    const re2 = new RegExp(`([^${CJK}]*)(${CJK}[${CJK}\\s\\w：，。、（）()·\\-—\\!！？%／、,.:;#&=]*${CJK}?)`, 'g');
    let m, lastEnd = 0;
    while ((m = re2.exec(text)) !== null) {
      if (m.index > lastEnd) subParts.push({cjk: false, s: lastEnd, e: m.index});
      subParts.push({cjk: false, s: m.index, e: m.index + m[1].length, val: m[1]});
      const cjkStart = m.index + m[1].length;
      const cjkEnd = cjkStart + m[2].length;
      if (CJK_RE.test(m[2])) {
        subParts.push({cjk: true, s: cjkStart, e: cjkEnd, val: m[2]});
      } else {
        subParts.push({cjk: false, s: cjkStart, e: cjkEnd, val: m[2]});
      }
      lastEnd = cjkEnd;
    }
    if (lastEnd < text.length) subParts.push({cjk:false, s:lastEnd, e:text.length});

    if (subParts.length === 0 || !subParts.some(sp => sp.cjk)) {
      resultParts.push(text); continue;
    }

    let processedText = '';
    for (const sp of subParts) {
      if (!sp.cjk) { processedText += text.substring(sp.s, sp.e); continue; }
      const val = sp.val.trim();
      if (!val || !CJK_RE.test(val)) { processedText += sp.val; continue; }
      const key = genKey(mn, fl, val, kcRef[0]++);
      if (!(key in translations.zh)) {
        translations.zh[key] = val;
        translations.en[key] = 'TODO: translate';
      }
      const lead = sp.val.match(/^(\s*)/)[1];
      const trail = sp.val.match(/(\s*)$/)[1];
      processedText += `${lead}{i18n.t('${key}')}${trail}`;
      changed = true;
    }
    resultParts.push(processedText);
  }

  if (!changed) return null;
  let result = resultParts.join('');
  if (result !== line) return result;
  return null;
}

function processFile(filePath, mn, translations) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const inType = trackTypeBlocks(lines);
  const fl = fileLabel(filePath);
  const kcRef = [0];
  let count = 0, modified = false;
  const newLines = [...lines];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
    if (trimmed.startsWith('import ')) continue;
    if (inType[i]) continue;
    if (!CJK_RE.test(line)) continue;
    const result = processCJKLineSegments(line, translations, mn, fl, kcRef);
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
if (!targetDir || !moduleName) { console.error('--dir and --module required'); process.exit(1); }
const BASE_DIR = path.join(WEB_ROOT, targetDir);
const files = collectFiles(BASE_DIR);
if (files.length === 0) { console.log('No files'); process.exit(0); }
const translations = { zh: {}, en: {} };
const zhNs = path.join(I18N_DIR, 'zh', `${moduleName}.json`);
const enNs = path.join(I18N_DIR, 'en', `${moduleName}.json`);
translations.zh = loadJson(zhNs);
translations.en = loadJson(enNs);

console.log(`\n🌐 Context-Aware (跨JSX行): ${targetDir} (${files.length} files, ns=${moduleName})`);
let total = 0;
for (const f of files) {
  const r = processFile(f, moduleName, translations);
  if (r.count > 0) {
    total += r.count;
    console.log(`  ✅ ${path.relative(BASE_DIR, f)}: ${r.count}`);
  }
}
if (!dryRun && total > 0) { saveJson(zhNs, translations.zh); saveJson(enNs, translations.en); console.log(`  💾 Saved`); }
console.log(`  Total: ${total}${dryRun ? ' (DRY RUN)' : ''}`);
