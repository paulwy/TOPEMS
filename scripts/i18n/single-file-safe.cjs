#!/usr/bin/env node
/**
 * Single-file SAFE i18n replacement (V222-derived)
 * Usage: node scripts/i18n/single-file-safe.cjs --file <rel-to-src> --ns <namespace> [--dry]
 *
 * Safety:
 *  - Skip type/interface/enum blocks
 *  - Skip bracket notation
 *  - Skip import lines
 *  - Skip comment lines
 *  - Only JsxText (>text<) and simple JSX attr (label="text") and simple string literals
 *  - zh.json: original Chinese
 *  - en.json: "TODO: translate"
 *  - Uses i18n.t('ns:key') syntax (import i18n from '@/i18n' auto-added)
 */

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '../../apps/web/src');
const I18N_DIR = path.join(WEB_ROOT, 'i18n', 'locales');

const args = process.argv.slice(2);
const fileIdx = args.indexOf('--file');
const nsIdx = args.indexOf('--ns');
const dryRun = args.includes('--dry');
const verbose = args.includes('--verbose');

if (fileIdx === -1 || nsIdx === -1) {
  console.error('Usage: node single-file-safe.cjs --file <rel-to-src> --ns <namespace> [--dry]');
  process.exit(1);
}
const REL_FILE = args[fileIdx + 1];
const NS = args[nsIdx + 1];
const ABS_FILE = path.join(WEB_ROOT, REL_FILE);

if (!fs.existsSync(ABS_FILE)) {
  console.error(`❌ File not found: ${ABS_FILE}`);
  process.exit(1);
}

const CJK_CHARS = '\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff';
const CJK_RE = new RegExp(`[${CJK_CHARS}]`);

const WHITELIST_REL = ['utils/ai/ui-recommender.ts', 'utils/apiPath.ts', 'config/ai-templates.ts'];

function isWhitelisted(relPath) {
  if (WHITELIST_REL.some((w) => relPath.includes(w))) return true;
  if (relPath.startsWith('pages/bi/')) return true;
  const bn = path.basename(relPath).toLowerCase();
  if (bn.includes('mock')) return true;
  return false;
}

if (isWhitelisted(REL_FILE)) {
  console.error(`❌ File is whitelisted: ${REL_FILE}`);
  process.exit(2);
}

function loadJson(filepath) {
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch {
    return {};
  }
}
function saveJson(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function fileLabel(filePath) {
  const b = path.basename(filePath).replace(/\.[mc]?[tj]sx?$/, '');
  const s1 = b.replace(/(.)([A-Z][a-z]+)/g, '$1_$2');
  return s1.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function trackContext(lines) {
  const inTypeBlock = new Array(lines.length).fill(false);
  let depth = 0,
    typeStart = -1;
  let braceDepth = 0;
  const typeStartRe = /^\s*(export\s+)?(type|interface|enum)\s+\w+\s*(=|\{|<|extends)/;
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (typeStart === -1 && typeStartRe.test(line)) {
      typeStart = i;
      depth = 0;
      braceDepth = 0;
    }
    if (typeStart !== -1) {
      inTypeBlock[i] = true;
      for (const ch of line) {
        if (ch === '{' || ch === '(') {
          depth++;
          braceDepth++;
        } else if (ch === '}' || ch === ')') {
          depth--;
          braceDepth--;
        }
      }
      if (typeStartRe.test(line) && line.includes('=') && !line.includes('{') && line.trim().endsWith(';')) {
        typeStart = -1;
      } else if (braceDepth === 0 && (line.trim().endsWith(';') || line.trim() === '};' || line.trim() === '}')) {
        if (depth <= 0 || i > typeStart + 1) {
          typeStart = -1;
        }
      }
    }
  }
  return inTypeBlock;
}

function hasI18nT(line) {
  return /i18n\.t\s*\(/.test(line) || /\bt\s*\(\s*['"`]/.test(line);
}
function isBracketAccess(text, line, idx) {
  const before = line.substring(0, idx).trimEnd();
  return before.endsWith('[');
}

function extractJSXTextSegments(line) {
  const segs = [];
  const re = />([^<]*[${CJK_CHARS}][^<]*)</g;
  let m;
  while ((m = re.exec(line)) !== null) {
    const inner = m[1];
    if (!CJK_RE.test(inner)) continue;
    const trimmed = inner.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) continue;
    segs.push({ type: 'jsx', full: m[0], inner, offset: m.index, end: m.index + m[0].length });
  }
  return segs;
}

function extractJSXAttrSegments(line) {
  const segs = [];
  const re = /(\w+)=("([^"]*[${CJK_CHARS}][^"]*)"|'([^']*[${CJK_CHARS}][^']*)')/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    const text = m[3] || m[4];
    if (!CJK_RE.test(text)) continue;
    segs.push({
      type: 'attr',
      attr: m[1],
      quote: m[2][0],
      full: m[0],
      text,
      offset: m.index,
      end: m.index + m[0].length,
    });
  }
  return segs;
}

function extractStringSegments(line) {
  const segs = [];
  const re = /("([^"\\]|\\.)*[${CJK_CHARS}]([^"\\]|\\.)*"|'([^'\\]|\\.)*[${CJK_CHARS}]([^'\\]|\\.)*')/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    const full = m[0];
    const quote = full[0];
    const text = full.slice(1, -1);
    if (!CJK_RE.test(text)) continue;
    const before = line.substring(0, m.index);
    if (/i18n\.t\s*\(\s*$/.test(before) || /\bt\s*\(\s*$/.test(before)) continue;
    if (isBracketAccess(text, line, m.index + 1)) continue;
    const trimmedBefore = before.trim();
    if (trimmedBefore.endsWith(':') || trimmedBefore.endsWith(',')) {
      const propMatch = before.match(/(\w+)\s*:\s*$/);
      if (propMatch) continue;
    }
    segs.push({ type: 'str', quote, full, text, offset: m.index, end: m.index + m[0].length });
  }
  return segs;
}

function generateKey(fl, text, idx) {
  const prefix = `${fl}`;
  const clean = text
    .replace(/[${CJK_CHARS}]/g, '')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase();
  const hash = text.length <= 20 && clean.length >= 2 ? `${clean}_${idx}` : `k${idx}`;
  return `${prefix}.${hash}`;
}

function ensureI18nImport(lines) {
  const usesI18n = lines.some((l) => /i18n\.t\s*\(/.test(l) && !l.trim().startsWith('import'));
  const hasImport = lines.some(
    (l) => /import\s+i18n\s+from\s+['"]@\/i18n['"]/.test(l) || /import\s*\{\s*i18n\s*\}/.test(l)
  );
  if (usesI18n && !hasImport) {
    let lastImport = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) lastImport = i;
      else if (lastImport >= 0 && !lines[i].trim().startsWith('import') && lines[i].trim() !== '') break;
    }
    if (lastImport >= 0) {
      lines.splice(lastImport + 1, 0, "import i18n from '@/i18n';");
      return true;
    }
  }
  return false;
}

const content = fs.readFileSync(ABS_FILE, 'utf-8');
const lines = content.split('\n');
const inTypeBlock = trackContext(lines);
const fl = fileLabel(ABS_FILE);

const zhNsPath = path.join(I18N_DIR, 'zh', `${NS}.json`);
const enNsPath = path.join(I18N_DIR, 'en', `${NS}.json`);
const translations = { zh: loadJson(zhNsPath), en: loadJson(enNsPath) };

let keyCounter = 0,
  replacedCount = 0,
  modified = false;
const newLines = [...lines];
const replacedKeys = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
  if (trimmed.startsWith('import ') || trimmed.startsWith('import\t')) continue;
  if (inTypeBlock[i]) continue;
  if (!CJK_RE.test(line) || hasI18nT(line)) continue;

  const segs = [];
  for (const s of extractStringSegments(line)) segs.push(s);
  for (const s of extractJSXAttrSegments(line)) {
    const overlap = segs.some((x) => !(s.end <= x.offset || s.offset >= x.end));
    if (!overlap) segs.push(s);
  }
  for (const s of extractJSXTextSegments(line)) {
    const overlap = segs.some((x) => !(s.end <= x.offset || s.offset >= x.end));
    if (!overlap) segs.push(s);
  }
  if (segs.length === 0) continue;

  let modLine = line;
  segs.sort((a, b) => b.offset - a.offset);
  for (const seg of segs) {
    const rawText = (seg.text || seg.inner || '').trim() || 'text';
    const key = generateKey(fl, rawText, keyCounter++);
    const fullKey = `${NS}:${key}`;
    if (!(key in translations.zh)) {
      translations.zh[key] = rawText;
      translations.en[key] = 'TODO: translate';
    }
    let repl;
    if (seg.type === 'jsx') {
      repl = `>{i18n.t('${fullKey}')}<`;
    } else if (seg.type === 'attr') {
      repl = `${seg.attr}={i18n.t('${fullKey}')}`;
    } else {
      repl = `i18n.t('${fullKey}')`;
    }
    modLine = modLine.substring(0, seg.offset) + repl + modLine.substring(seg.end);
    replacedCount++;
    replacedKeys.push(fullKey);
  }
  if (modLine !== line) {
    newLines[i] = modLine;
    modified = true;
  }
}

if (modified) ensureI18nImport(newLines);

if (!dryRun && modified) {
  fs.writeFileSync(ABS_FILE, newLines.join('\n'), 'utf-8');
  saveJson(zhNsPath, translations.zh);
  saveJson(enNsPath, translations.en);
}

console.log(
  JSON.stringify(
    {
      file: REL_FILE,
      ns: NS,
      replaced: replacedCount,
      modified,
      keys: replacedKeys,
      zhPath: zhNsPath,
      enPath: enNsPath,
      dry: dryRun,
    },
    null,
    2
  )
);
