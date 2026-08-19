#!/usr/bin/env node
/**
 * Precise targeted i18n replacer using scan output
 * Only replaces specific lines that are CONFIRMED UI hardcoding
 * Safe: uses line numbers from scan-precise-details.json
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../apps/web/src');
const I18N_DIR = path.join(ROOT, 'i18n', 'locales');
const DETAILS = path.join(__dirname, 'scan-precise-details.json');
const args = process.argv.slice(2);
const dry = args.includes('--dry');

function isCJK(ch) {
  const c = ch.codePointAt(0);
  return (
    (c >= 0x4e00 && c <= 0x9fff) ||
    (c >= 0x3400 && c <= 0x4dbf) ||
    (c >= 0x3300 && c <= 0x33ff) ||
    (c >= 0xf900 && c <= 0xfaff)
  );
}
function loadJson(p, def = {}) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return def;
  }
}
function saveJson(p, d) {
  fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n', 'utf8');
}
function fileLabel(p) {
  const b = path.basename(p).replace(/\.[mc]?[tj]sx?$/, '');
  return b
    .replace(/(.)([A-Z][a-z]+)/g, '$1_$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase();
}
function genKey(ns, fl, text, idx) {
  let clean = '';
  for (const ch of text) {
    if (/[a-zA-Z0-9_]/.test(ch) && !isCJK(ch)) clean += ch.toLowerCase();
  }
  clean = clean.replace(/[^a-z0-9_]/g, '');
  const short = text.length <= 30;
  const suf = short && clean ? `${clean}_${idx}` : `k${idx}`;
  return `${ns}.${fl}.${suf}`;
}
function getNs(filepath) {
  const rel = path.relative(ROOT, filepath).replace(/\\/g, '/');
  const top = rel.split('/')[0];
  const valid = [
    'components',
    'pages',
    'ai',
    'microfrontend',
    'config',
    'utils',
    'hooks',
    'theme',
    'layouts',
    'services',
    'intelligent-ops',
    'dev-platform',
    'design-system',
    'api',
  ];
  return valid.includes(top) ? top : 'common';
}

// White-list filters: skip these from processing
function isWhitelistEntry(item) {
  const p = item.file;
  const l = item.content || '';
  // Skip files outside ROOT (tmp/, scripts/, etc.)
  const abs = path.join(ROOT, p);
  if (!fs.existsSync(abs)) return true;
  if (!abs.startsWith(ROOT + path.sep) && !abs.startsWith(ROOT + '/')) return true;
  // Pages BI mock data: known mock (big numbers, data-heavy files)
  if (p.includes('pages/bi/')) {
    // Conservative: skip all BI - most likely mock data (per classification: pages/bi=145 lines)
    return true;
  }
  // schemas/: type definitions only
  if (p.startsWith('schemas/')) return true;
  // sw.ts = service worker, codegen.ts = code generation script, not UI
  if (p === 'sw.ts' || p.includes('codegen.ts') || p.includes('performance-bottleneck.ts')) return true;
  // src/tmp/: temp generated scripts
  if (p.startsWith('tmp/')) return true;
  // services/ExternalErpAdapters = backend service messages (non-UI)
  if (p.includes('ExternalErpAdapters')) return true;
  // AI regex lines: contains /pattern/ with Chinese chars used for regex
  if (
    (l.includes('/[') || l.includes('^(\\') || l.includes('/^(请|帮我|我想')) &&
    l.match(/\/[^/]*[\u4e00-\u9fff][^/]*\//)
  )
    return true;
  if (l.startsWith('/') && l.includes('|') && /[)(|?*^$]/.test(l)) return true;
  // Object key CJK: like  "XX": value  or  {XX:  (bracket notation or object literal key before colon)
  const tri = l.trim();
  if (/^[\u4e00-\u9fff][^"'`{}=]*[:：]\s*/.test(tri) && !tri.includes('return') && !tri.includes('=>')) return true;
  // Type union literal position  "'普通发票' | '专"
  if (tri.startsWith("'") || tri.startsWith('"')) {
    const first = tri.match(/^(['"`])[^\1]*\1\s*\|/);
    if (first) return true;
  }
  return false;
}

// ---- Process one specific line safely ----
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

function safeReplaceLine(line, translations, ns, fl, kcRef) {
  // Step 1: find protected {expr} ranges
  const prot = [];
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
      prot.push([i, end]);
      i = end - 1;
    }
  }
  const inProt = (idx) => prot.some(([s, e]) => idx >= s && idx < e);

  // Step 2: simple walk: find CJK runs outside protected regions
  // For each CJK run, create: [start..end) range around it including ASCII neighbors/punct but NOT { }
  const results = [];
  let i = 0;
  const canIncl = (c) =>
    (isCJK(c) || /[a-zA-Z0-9\s：，。、（）()·\-—!！？%\/、,.:;#&=_~\[\]<>+*\/]/.test(c)) && c !== '{' && c !== '}';
  while (i < line.length) {
    if (inProt(i)) {
      const pr = prot.find(([s, e]) => i >= s && i < e);
      if (pr) {
        results.push({ t: 'raw', v: line.substring(i, pr[1]) });
        i = pr[1];
        continue;
      }
    }
    if (!isCJK(line[i])) {
      i++;
      continue;
    }
    // Expand
    let s = i,
      e = i + 1;
    while (s > 0 && !inProt(s - 1) && canIncl(line[s - 1])) s--;
    while (e < line.length && !inProt(e) && canIncl(line[e])) e++;
    if (s < i) results.push({ t: 'raw', v: line.substring(results.length ? 0 : i, s) });
    const text = line.substring(s, e);
    const tri = text.trim();
    const key = genKey(ns, fl, tri, kcRef[0]++);
    if (!(key in translations.zh)) {
      translations.zh[key] = tri;
      translations.en[key] = 'TODO: translate';
    }
    const lead = text.match(/^(\s*)/)[1];
    const trail = text.match(/(\s*)$/)[1];
    results.push({ t: 'i18n', v: `${lead}{i18n.t('${key}')}${trail}` });
    i = e;
  }
  if (results.length === 0) return null;
  // Finalize: prepend anything before first result start
  // (Actually results already covers segments sequentially, but let's re-do sequential walk)
  let out = '',
    pos = 0,
    anyRepl = false;
  // Simple approach: re-walk to be safe, this time output raw text before every CJK replacement region
  i = 0;
  while (i < line.length) {
    if (inProt(i)) {
      const pr = prot.find(([s, e]) => i >= s && i < e);
      if (pr) {
        out += line.substring(i, pr[1]);
        i = pr[1];
        continue;
      }
    }
    if (!isCJK(line[i])) {
      out += line[i];
      i++;
      continue;
    }
    let s = i,
      e = i + 1;
    while (s > 0 && !inProt(s - 1) && canIncl(line[s - 1])) s--;
    while (e < line.length && !inProt(e) && canIncl(line[e])) e++;
    if (s > pos) out += line.substring(pos, s);
    const text = line.substring(s, e);
    const tri = text.trim();
    const key = genKey(ns, fl, tri, 0);
    const nk = Object.keys(translations.zh).indexOf(key);
    if (!(key in translations.zh)) {
      translations.zh[key] = tri;
      translations.en[key] = 'TODO: translate';
    }
    const lead = text.match(/^(\s*)/)[1];
    const trail = text.match(/(\s*)$/)[1];
    out += `${lead}{i18n.t('${key}')}${trail}`;
    anyRepl = true;
    pos = e;
    i = e;
  }
  if (pos < line.length) out += line.substring(pos);
  return anyRepl && out !== line ? out : null;
}

// ========== MAIN ==========
const items = loadJson(DETAILS, []);
if (!Array.isArray(items) || items.length === 0) {
  console.error('No scan data');
  process.exit(1);
}
const uiOnly = items.filter((x) => !isWhitelistEntry(x));
console.log(`Entries: ${items.length} total, ${uiOnly.length} non-whitelist candidates`);
console.log(`Files affected: ${new Set(uiOnly.map((i) => i.file)).size}`);

const translations = {
  components: { zh: {}, en: {} },
  pages: { zh: {}, en: {} },
  ai: { zh: {}, en: {} },
  microfrontend: { zh: {}, en: {} },
  hooks: { zh: {}, en: {} },
  theme: { zh: {}, en: {} },
  config: { zh: {}, en: {} },
  utils: { zh: {}, en: {} },
  layouts: { zh: {}, en: {} },
  common: { zh: {}, en: {} },
};
// Preload existing
for (const ns of Object.keys(translations)) {
  translations[ns].zh = loadJson(path.join(I18N_DIR, 'zh', `${ns}.json`), {});
  translations[ns].en = loadJson(path.join(I18N_DIR, 'en', `${ns}.json`), {});
}
// Group items by file
const byFile = {};
for (const it of uiOnly) {
  byFile[it.file] = byFile[it.file] || [];
  byFile[it.file].push(it);
}
// Track per-file changes
const kcMap = {}; // per (ns, fl) key counter
let totalRepl = 0;
const changedFiles = [];

for (const [relFile, entries] of Object.entries(byFile)) {
  const absFile = path.join(ROOT, relFile);
  if (!fs.existsSync(absFile)) continue;
  const content = fs.readFileSync(absFile, 'utf8');
  const lines = content.split('\n');
  const ns = getNs(relFile);
  const fl = fileLabel(relFile);
  const mapKey = `${ns}|${fl}`;
  if (!kcMap[mapKey]) kcMap[mapKey] = 0;
  const kcRef = [kcMap[mapKey]];
  let fileMod = false;
  const newLines = [...lines];
  // Get sorted line numbers to process (1-based from scan)
  const lineNums = [...new Set(entries.map((e) => e.line - 0).filter((x) => x > 0 && x <= lines.length))].sort(
    (a, b) => a - b
  );
  for (const ln0 of lineNums) {
    const idx = ln0 - 1;
    const originalLine = lines[idx];
    const trimmed = originalLine.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
    if (trimmed.startsWith('import ')) continue;
    const res = safeReplaceLine(originalLine, translations[ns], ns, fl, kcRef);
    if (res && res !== originalLine) {
      newLines[idx] = res;
      fileMod = true;
      totalRepl++;
    }
  }
  if (fileMod) {
    // Ensure import
    const uses = newLines.some((l) => /i18n\.t\s*\(/.test(l));
    const hasImp = newLines.some((l) => /import\s+i18n\s+from\s+['"]@\/i18n['"]/.test(l));
    if (uses && !hasImp) {
      let lastImp = -1;
      for (let ii = 0; ii < newLines.length; ii++) {
        if (newLines[ii].trim().startsWith('import ')) lastImp = ii;
        else if (lastImp >= 0 && newLines[ii].trim() !== '' && !newLines[ii].trim().startsWith('import ')) break;
      }
      if (lastImp >= 0) newLines.splice(lastImp + 1, 0, "import i18n from '@/i18n';");
    }
    changedFiles.push(relFile);
    console.log(`  ✅ ${relFile}: ${entries.length} entries, modified`);
    if (!dry) fs.writeFileSync(absFile, newLines.join('\n'), 'utf8');
  }
  kcMap[mapKey] = kcRef[0];
}

console.log(`\n✅ Total: ${totalRepl} replacements in ${changedFiles.length} files${dry ? ' (DRY RUN)' : ''}`);
if (!dry) {
  for (const ns of Object.keys(translations)) {
    saveJson(path.join(I18N_DIR, 'zh', `${ns}.json`), translations[ns].zh);
    saveJson(path.join(I18N_DIR, 'en', `${ns}.json`), translations[ns].en);
  }
  console.log('💾 All translation files saved');
}
