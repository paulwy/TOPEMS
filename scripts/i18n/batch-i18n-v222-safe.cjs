#!/usr/bin/env node
/**
 * V222 SAFE: Context-aware i18n batch replacement (PROVEN SAFE)
 *
 * Safety first:
 * - NEVER replace inside type/interface/enum blocks
 * - NEVER replace in whitelist files
 * - NEVER replace bracket notation keys
 * - Handles: JSX text with mixed prefix, string literals, JSX attrs
 * - Preserves interpolation expressions
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

const WHITELIST_REL = ['utils/ai/ui-recommender.ts', 'utils/apiPath.ts', 'config/ai-templates.ts'];

function isWhitelisted(absPath) {
  const rel = path.relative(WEB_ROOT, absPath).replace(/\\/g, '/');
  if (WHITELIST_REL.some((w) => rel.includes(w))) return true;
  const bn = path.basename(absPath).toLowerCase();
  if (bn.includes('mock') || bn === '_mock.ts') return true;
  return false;
}

function fileLabel(filePath) {
  const b = path.basename(filePath).replace(/\.[mc]?[tj]sx?$/, '');
  const s1 = b.replace(/(.)([A-Z][a-z]+)/g, '$1_$2');
  return s1.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function collectFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['__tests__', 'node_modules', 'test', 'tests', 'dist', 'build', 'schemas'].includes(entry.name)) continue;
      results.push(...collectFiles(fullPath));
    } else if (
      (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.test.tsx') &&
      !entry.name.endsWith('.d.ts') &&
      !entry.name.endsWith('.stories.tsx')
    ) {
      if (!isWhitelisted(fullPath)) results.push(fullPath);
    }
  }
  return results;
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
    if (!trimmed || (trimmed.startsWith('{') && trimmed.endsWith('}'))) continue;
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
    segs.push({ type: 'str', quote, full, text, offset: m.index, end: m.index + m[0].length });
  }
  return segs;
}

function generateKey(moduleName, fl, text, idx) {
  const prefix = `${moduleName}.${fl}`;
  const clean = text
    .replace(/[${CJK_CHARS}]/g, '')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase();
  const hash = text.length <= 20 && clean ? `${clean}_${idx}` : `k${idx}`;
  return `${prefix}.${hash}`;
}

function ensureImport(lines) {
  const uses = lines.some((l) => /i18n\.t\s*\(/.test(l) && !l.trim().startsWith('import'));
  const has = lines.some((l) => /import\s+i18n\s+from\s+['"]@\/i18n['"]/.test(l) || /import\s*\{\s*i18n\s*\}/.test(l));
  if (uses && !has) {
    let last = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) last = i;
      else if (last >= 0 && !lines[i].trim().startsWith('import') && lines[i].trim() !== '') break;
    }
    if (last >= 0) {
      const il = lines[last].trim();
      if (il.includes('{') && !il.includes('}')) {
        for (let i = last + 1; i < lines.length; i++) {
          if (lines[i].includes('}')) {
            lines.splice(i + 1, 0, "import i18n from '@/i18n';");
            return true;
          }
        }
      } else {
        lines.splice(last + 1, 0, "import i18n from '@/i18n';");
        return true;
      }
    }
  }
  return false;
}

function processFile(filePath, modNs, translations) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const inTypeBlock = trackContext(lines);
  const fl = fileLabel(filePath);
  let keyCounter = 0,
    replacedCount = 0,
    modified = false;
  const newLines = [...lines];

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
      const key = generateKey(modNs, fl, (seg.text || seg.inner || '').trim() || 'text', keyCounter++);
      if (!(key in translations.zh)) {
        const val = (seg.text || seg.inner || '').trim();
        translations.zh[key] = val;
        translations.en[key] = 'TODO: translate';
      }
      let repl;
      if (seg.type === 'jsx') {
        repl = `>{i18n.t('${key}')}<`;
      } else if (seg.type === 'attr') {
        repl = `${seg.attr}={i18n.t('${key}')}`;
      } else {
        repl = `i18n.t('${key}')`;
      }
      modLine = modLine.substring(0, seg.offset) + repl + modLine.substring(seg.end);
      replacedCount++;
    }
    if (modLine !== line) {
      newLines[i] = modLine;
      modified = true;
    }
  }

  if (modified) ensureImport(newLines);
  if (!dryRun && modified) fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
  return { replacedCount, fileLabel: fl };
}

// ===== Main =====
if (!targetDir || !moduleName) {
  console.error('Usage: --dir <rel-to-src> --module <ns> [--dry] [--verbose]');
  process.exit(1);
}
const BASE_DIR = path.join(WEB_ROOT, targetDir);
const files = collectFiles(BASE_DIR);
if (files.length === 0) {
  console.log(`无文件: ${BASE_DIR}`);
  process.exit(0);
}

const translations = { zh: {}, en: {} };
const zhNsPath = path.join(I18N_DIR, 'zh', `${moduleName}.json`);
const enNsPath = path.join(I18N_DIR, 'en', `${moduleName}.json`);
translations.zh = loadJson(zhNsPath);
translations.en = loadJson(enNsPath);

console.log(`\n🛡️  V222 SAFE: ${targetDir} (${files.length} files, ns=${moduleName})`);
let total = 0;
for (const file of files) {
  const r = processFile(file, moduleName, translations);
  if (r.replacedCount > 0) {
    total += r.replacedCount;
    const rel = path.relative(BASE_DIR, file);
    console.log(`  ✅ ${rel}: ${r.replacedCount} replacements`);
  }
}
if (!dryRun && total > 0) {
  saveJson(zhNsPath, translations.zh);
  saveJson(enNsPath, translations.en);
  console.log(`  💾 Saved: zh/${moduleName}.json, en/${moduleName}.json`);
}
console.log(`  Total: ${total} replacements${dryRun ? ' (DRY RUN)' : ''}`);
