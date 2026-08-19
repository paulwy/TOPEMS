#!/usr/bin/env node
/**
 * Single-file V3: Whole-file regex replacement (multi-line safe within JSX tags)
 * + context tracking (skip types, import, comments, regex)
 * Handles:
 *   - <Tag>中文 {expr} 中文</Tag>   (multi-line OK)
 *   - attr="中文"  attr='中文'
 *   - plain string literals "中文" / '中文' (not prop names, not bracket)
 *   - patterns like ¥{expr}万 with interpolation => ¥{{v}}万
 *   - 0-30天, {expr} - 可视化图表 etc.
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
  console.error(JSON.stringify({ error: 'Usage: --file <rel> --ns <ns> [--dry] [--verbose]' }));
  process.exit(1);
}
const REL_FILE = args[fileIdx + 1];
const NS = args[nsIdx + 1];
const ABS_FILE = path.join(WEB_ROOT, REL_FILE);

if (!fs.existsSync(ABS_FILE)) {
  console.error(JSON.stringify({ error: 'not found' }));
  process.exit(1);
}

const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf]/;
const WHITELIST = ['utils/ai/ui-recommender.ts', 'utils/apiPath.ts', 'config/ai-templates.ts'];

function isWL(rel) {
  if (rel.startsWith('pages/bi/')) return true;
  if (WHITELIST.some((w) => rel.includes(w))) return true;
  if (path.basename(rel).toLowerCase().includes('mock')) return true;
  return false;
}
if (isWL(REL_FILE)) {
  console.error(JSON.stringify({ error: 'whitelisted' }));
  process.exit(2);
}

function loadJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return {};
  }
}
function saveJSON(p, d) {
  fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n', 'utf8');
}
function flabel(fp) {
  const b = path.basename(fp).replace(/\.[mc]?[tj]sx?$/, '');
  return b
    .replace(/(.)([A-Z][a-z]+)/g, '$1_$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase();
}

const zhNsPath = path.join(I18N_DIR, 'zh', `${NS}.json`);
const enNsPath = path.join(I18N_DIR, 'en', `${NS}.json`);
const translations = { zh: loadJSON(zhNsPath), en: loadJSON(enNsPath) };
const fl = flabel(ABS_FILE);
let kc = 0;
const replacedKeys = [];
let totalRep = 0;

function genKey(tpl) {
  const clean = (tpl || '')
    .replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, '')
    .replace(/[\{\}]/g, '')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase();
  const h = (tpl || '').length <= 40 && clean.length >= 2 ? `${clean}_${kc}` : `k${kc}`;
  kc++;
  return `${fl}.${h}`;
}
function addKey(k, zh, en) {
  if (!(k in translations.zh)) {
    translations.zh[k] = zh;
    translations.en[k] = en || 'TODO: translate';
  }
}
function tCall(k, vars) {
  const fk = `${NS}:${k}`;
  replacedKeys.push(fk);
  totalRep++;
  if (vars && vars.length) {
    const arg = ', { ' + vars.map((v) => `${v.name}: (${v.expr})`).join(', ') + ' }';
    return `i18n.t('${fk}'${arg})`;
  }
  return `i18n.t('${fk}')`;
}

/**
 * Parse mixed text like "¥{expr}万 {expr2} 后缀"
 * => template: "¥{{v0}}万 {{v1}} 后缀"
 */
function parseMixed(text) {
  if (!CJK_RE.test(text)) return null;
  const parts = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === '{') {
      let depth = 1,
        j = i + 1;
      while (j < text.length && depth > 0) {
        if (text[j] === '{') depth++;
        else if (text[j] === '}') depth--;
        j++;
      }
      parts.push({ t: 'e', v: text.substring(i + 1, j - 1) });
      i = j;
    } else {
      let j = i;
      while (j < text.length && text[j] !== '{') j++;
      parts.push({ t: 's', v: text.substring(i, j) });
      i = j;
    }
  }
  const hasCJK = parts.some((p) => p.t === 's' && CJK_RE.test(p.v));
  if (!hasCJK) return null;
  return parts;
}
function partsToTplCall(parts) {
  if (parts.length === 1 && parts[0].t === 's') {
    const txt = parts[0].v.trim() ? parts[0].v : parts[0].v;
    const k = genKey(txt);
    addKey(k, txt);
    return { k, call: tCall(k, null), replaced: 1 };
  }
  let tpl = '';
  const vars = [];
  let vi = 0;
  for (const p of parts) {
    if (p.t === 's') tpl += p.v;
    else {
      const name = `v${vi++}`;
      tpl += `{{${name}}}`;
      vars.push({ name, expr: p.v });
    }
  }
  const tplFinal = tpl;
  const k = genKey(tplFinal);
  addKey(k, tplFinal);
  return { k, call: tCall(k, vars), replaced: 1 };
}

// ========= Build exclude ranges (types, comments, imports, regex literals, bracket keys, prop names) =========
function buildExcludeRanges(src) {
  const excl = [];
  let sqi = false,
    dqi = false,
    bti = false;
  let inLine = false,
    inBlock = false;
  let i = 0;
  const n = src.length;
  while (i < n) {
    const ch = src[i],
      nx = src[i + 1];
    if (inBlock) {
      if (ch === '*' && nx === '/') {
        inBlock = false;
        excl.push([i - 1, i + 1]);
        i += 2;
        continue;
      }
      excl.push([i, i + 1]);
      i++;
      continue;
    }
    if (inLine) {
      if (ch === '\n') {
        inLine = false;
        i++;
        continue;
      }
      excl.push([i, i + 1]);
      i++;
      continue;
    }
    if (!sqi && !dqi && !bti) {
      if (ch === '/' && nx === '*') {
        inBlock = true;
        excl.push([i, i + 2]);
        i += 2;
        continue;
      }
      if (ch === '/' && nx === '/') {
        inLine = true;
        excl.push([i, i + 2]);
        i += 2;
        continue;
      }
    }
    if (ch === "'" && !dqi && !bti) sqi = !sqi;
    else if (ch === '"' && !sqi && !bti) dqi = !dqi;
    else if (ch === '`' && !sqi && !dqi) bti = !bti;
    i++;
  }
  return excl;
}
function inExcl(excl, pos) {
  let lo = 0,
    hi = excl.length - 1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    const [a, b] = excl[m];
    if (pos < a) hi = m - 1;
    else if (pos >= b) lo = m + 1;
    else return true;
  }
  return false;
}

function buildLineExcludes(src) {
  const lines = src.split('\n');
  const ranges = [];
  let acc = 0;
  let inType = false,
    brace = 0,
    paren = 0,
    typeStartLine = -1;
  const tRE = /^\s*(export\s+)?(type|interface|enum)\s+\w+\s*(=|\{|<|extends)/;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const startOff = acc;
    const endOff = acc + line.length + 1;
    acc = endOff;
    if (!inType && tRE.test(line)) {
      inType = true;
      brace = 0;
      paren = 0;
      typeStartLine = li;
    }
    if (inType) {
      ranges.push([startOff, endOff]);
      for (const ch of line) {
        if (ch === '{') brace++;
        else if (ch === '}') brace--;
        if (ch === '(') paren++;
        else if (ch === ')') paren--;
      }
      if (tRE.test(line) && line.includes('=') && !line.includes('{') && line.trim().endsWith(';')) inType = false;
      else if (brace === 0 && (line.trim().endsWith(';') || line.trim() === '};' || line.trim() === '}')) {
        if (li > typeStartLine + 0) inType = false;
      }
    }
    const t = line.trim();
    if (t.startsWith('import ') || t.startsWith('import\t')) ranges.push([startOff, endOff - 1]);
  }
  return ranges;
}

function isExcluded(excl1, excl2, pos, end) {
  for (const [a, b] of excl2) if (end > a && pos < b) return true;
  return inExcl(excl1, pos) || inExcl(excl1, Math.max(0, end - 1));
}

// ========== main ==========
let src = fs.readFileSync(ABS_FILE, 'utf8');
const exclComment = buildExcludeRanges(src);
exclComment.sort((a, b) => a[0] - b[0]);
const exclTypeLine = buildLineExcludes(src);

const isExcl = (s, e) => isExcluded(exclComment, exclTypeLine, s, e);

// 1) JSX attribute: word="CJK..." or word='CJK...'
{
  const re =
    /(\w[\w-]*)=("([^"\\]|\\.)*[\u4e00-\u9fff\u3400-\u4dbf]([^"\\]|\\.)*"|'([^'\\]|\\.)*[\u4e00-\u9fff\u3400-\u4dbf]([^'\\]|\\.)*')/g;
  const matches = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    const pos = m.index,
      end = m.index + m[0].length;
    if (isExcl(pos, end)) continue;
    const attr = m[1];
    const full = m[0];
    const q = full[full.indexOf('=') + 1];
    const txt = m[3] !== undefined ? (m[3] ?? '') : (m[5] ?? '');
    if (!CJK_RE.test(txt)) continue;
    matches.push({ pos, end, attr, txt });
  }
  for (let mi = matches.length - 1; mi >= 0; mi--) {
    const x = matches[mi];
    const parts = parseMixed(x.txt);
    if (!parts) continue;
    const r = partsToTplCall(parts);
    const repl = `${x.attr}={${r.call}}`;
    src = src.substring(0, x.pos) + repl + src.substring(x.end);
  }
}

// 2) JSX inner text: > ... CJK ... < (may span lines)
{
  const re = />([^<>]*[\u4e00-\u9fff\u3400-\u4dbf][^<>]*)</g;
  const matches = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    const pos = m.index,
      end = m.index + m[0].length;
    if (isExcl(pos, end)) continue;
    const inner = m[1];
    if (!CJK_RE.test(inner)) continue;
    if (inner.trim() === '') continue;
    const trimmed = inner.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}') && !CJK_RE.test(trimmed.slice(1, -1))) continue;
    matches.push({ pos, end, inner });
  }
  for (let mi = matches.length - 1; mi >= 0; mi--) {
    const x = matches[mi];
    const parts = parseMixed(x.inner);
    if (!parts) continue;
    const r = partsToTplCall(parts);
    const repl = `>{${r.call}}<`;
    src = src.substring(0, x.pos) + repl + src.substring(x.end);
  }
}

// 3) Plain string literals (not prop names, not bracket keys, not in t() already)
{
  const re =
    /("([^"\\]|\\.)*[\u4e00-\u9fff\u3400-\u4dbf]([^"\\]|\\.)*"|'([^'\\]|\\.)*[\u4e00-\u9fff\u3400-\u4dbf]([^'\\]|\\.)*')/g;
  const matches = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    const pos = m.index,
      end = m.index + m[0].length;
    if (isExcl(pos, end)) continue;
    const full = m[0];
    const txt = full.slice(1, -1);
    if (!CJK_RE.test(txt)) continue;
    const before = src.substring(0, pos);
    if (/(i18n\.t|\bt)\s*\(\s*$/.test(before)) continue;
    const tb = before.trimEnd();
    if (tb.endsWith('[')) continue;
    if (/[\w$]\s*:\s*$/.test(tb)) continue;
    matches.push({ pos, end, txt });
  }
  for (let mi = matches.length - 1; mi >= 0; mi--) {
    const x = matches[mi];
    const parts = parseMixed(x.txt);
    if (!parts) continue;
    const r = partsToTplCall(parts);
    src = src.substring(0, x.pos) + r.call + src.substring(x.end);
  }
}

// 4) Add i18n import
let modified = totalRep > 0;
if (modified) {
  const hasImp = /import\s+i18n\s+from\s+['"]@\/i18n['"]/.test(src) || /import\s*\{\s*i18n\s*\}/.test(src);
  const uses = /i18n\.t\s*\(/.test(
    src
      .split('\n')
      .filter((l) => !l.trim().startsWith('import '))
      .join('\n')
  );
  if (uses && !hasImp) {
    const la = src.split('\n');
    let last = -1;
    for (let i = 0; i < la.length; i++) {
      if (la[i].trim().startsWith('import ')) last = i;
      else if (last >= 0 && !la[i].trim().startsWith('import') && la[i].trim() !== '') break;
    }
    if (last >= 0) {
      la.splice(last + 1, 0, "import i18n from '@/i18n';");
      src = la.join('\n');
    }
  }
}

if (!dryRun && modified) {
  fs.writeFileSync(ABS_FILE, src, 'utf8');
  saveJSON(zhNsPath, translations.zh);
  saveJSON(enNsPath, translations.en);
}

console.log(
  JSON.stringify(
    {
      file: REL_FILE,
      ns: NS,
      replaced: totalRep,
      modified,
      zhPath: zhNsPath,
      enPath: enNsPath,
      dry: dryRun,
      keys: replacedKeys.slice(0, 30),
    },
    null,
    2
  )
);
