#!/usr/bin/env node
/**
 * V4: Robust JSX detection
 *  - Only accept JSX inner text where { and } counts MATCH (no unclosed control flows)
 *  - Reject JSX inner if contains control tokens: &&, ||, ?, : (ternary-like) at depth 0
 *  - parseMixed validates balanced parentheses/brackets inside each {expr}
 *  - Attr replacement unchanged
 *  - Plain string replacement unchanged
 *  - Translation: write to temp file FIRST (return in stdout JSON), commit only if wrapper says OK
 */
const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '../../apps/web/src');
const I18N_DIR = path.join(WEB_ROOT, 'i18n', 'locales');
const PENDING_DIR = path.resolve(__dirname, '../../tmp/i18n_pending');

const args = process.argv.slice(2);
const fileIdx = args.indexOf('--file');
const nsIdx = args.indexOf('--ns');
const commitIdx = args.indexOf('--commit');
const dryRun = args.includes('--dry');

if (fileIdx === -1 || nsIdx === -1) {
  console.error(JSON.stringify({ error: 'Usage: --file <rel> --ns <ns> [--dry] [--commit <pending-json>]' }));
  process.exit(1);
}
const REL_FILE = args[fileIdx + 1];
const NS = args[nsIdx + 1];
const ABS_FILE = path.join(WEB_ROOT, REL_FILE);

if (!fs.existsSync(ABS_FILE)) {
  console.error(JSON.stringify({ error: 'not found: ' + ABS_FILE }));
  process.exit(1);
}
try {
  fs.mkdirSync(PENDING_DIR, { recursive: true });
} catch {}

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

// ============== Commit mode: merge pending JSON into real namespace JSON ==============
if (commitIdx !== -1) {
  const pendingPath = args[commitIdx + 1];
  const pending = JSON.parse(fs.readFileSync(pendingPath, 'utf8'));
  const zhPath = path.join(I18N_DIR, 'zh', `${NS}.json`);
  const enPath = path.join(I18N_DIR, 'en', `${NS}.json`);
  const zh = JSON.parse(fs.existsSync(zhPath) ? fs.readFileSync(zhPath, 'utf8') : '{}');
  const en = JSON.parse(fs.existsSync(enPath) ? fs.readFileSync(enPath, 'utf8') : '{}');
  let added = 0;
  for (const k of Object.keys(pending.zh || {})) {
    if (!(k in zh)) {
      zh[k] = pending.zh[k];
      en[k] = pending.en[k];
      added++;
    }
  }
  fs.writeFileSync(zhPath, JSON.stringify(zh, null, 2) + '\n', 'utf8');
  fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ committed: true, added, zhPath, enPath }));
  process.exit(0);
}

function flabel(fp) {
  const b = path.basename(fp).replace(/\.[mc]?[tj]sx?$/, '');
  return b
    .replace(/(.)([A-Z][a-z]+)/g, '$1_$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase();
}
const fl = flabel(ABS_FILE);
let kc = 0;
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

const pendingZh = {};
const pendingEn = {};
const replacedKeys = [];
let totalRep = 0;
function addEntry(k, zh, en) {
  if (!(k in pendingZh)) {
    pendingZh[k] = zh;
    pendingEn[k] = en || 'TODO: translate';
  }
}
function makeTCall(k, vars) {
  const fk = `${NS}:${k}`;
  replacedKeys.push(fk);
  totalRep++;
  if (vars && vars.length) {
    const arg = ', { ' + vars.map((v) => `${v.name}: (${v.expr})`).join(', ') + ' }';
    return `i18n.t('${fk}'${arg})`;
  }
  return `i18n.t('${fk}')`;
}

// Validate balanced {} () [] in a substring
function balanced(s) {
  let a = 0,
    b = 0,
    c = 0;
  let sqi = false,
    dqi = false,
    bti = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "'" && !dqi && !bti) sqi = !sqi;
    else if (ch === '"' && !sqi && !bti) dqi = !dqi;
    else if (ch === '`' && !sqi && !dqi) bti = !bti;
    if (sqi || dqi || bti) continue;
    if (ch === '{') a++;
    else if (ch === '}') a--;
    if (ch === '(') b++;
    else if (ch === ')') b--;
    if (ch === '[') c++;
    else if (ch === ']') c--;
    if (a < 0 || b < 0 || c < 0) return false;
  }
  return a === 0 && b === 0 && c === 0;
}

// Parse mixed text with balanced validation
function parseMixed(text) {
  if (!CJK_RE.test(text)) return null;
  if (!balanced(text)) return null;
  const parts = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === '{') {
      let a = 1,
        b = 0,
        c = 0;
      let j = i + 1;
      let sqi = false,
        dqi = false,
        bti = false;
      while (j < text.length && (a > 0 || b > 0 || c > 0 || sqi || dqi || bti)) {
        const ch = text[j];
        if (ch === "'" && !dqi && !bti) sqi = !sqi;
        else if (ch === '"' && !sqi && !bti) dqi = !dqi;
        else if (ch === '`' && !sqi && !dqi) bti = !bti;
        if (sqi || dqi || bti) {
          j++;
          continue;
        }
        if (ch === '{') a++;
        else if (ch === '}') a--;
        if (ch === '(') b++;
        else if (ch === ')') b--;
        if (ch === '[') c++;
        else if (ch === ']') c--;
        j++;
        if (a === 0 && b === 0 && c === 0 && !sqi && !dqi && !bti) break;
      }
      if (a !== 0 || b !== 0 || c !== 0) return null;
      const expr = text.substring(i + 1, j - 1);
      parts.push({ t: 'e', v: expr });
      i = j;
    } else {
      let j = i;
      while (j < text.length && text[j] !== '{') j++;
      parts.push({ t: 's', v: text.substring(i, j) });
      i = j;
    }
  }
  return parts.some((p) => p.t === 's' && CJK_RE.test(p.v)) ? parts : null;
}
function partsToCall(parts) {
  if (parts.length === 1 && parts[0].t === 's') {
    const txt = parts[0].v;
    const k = genKey(txt);
    addEntry(k, txt);
    return { call: makeTCall(k, null) };
  }
  let tpl = '';
  const vars = [];
  let vi = 0;
  for (const p of parts) {
    if (p.t === 's') tpl += p.v;
    else {
      const n = `v${vi++}`;
      tpl += `{{${n}}}`;
      vars.push({ name: n, expr: p.v });
    }
  }
  const k = genKey(tpl);
  addEntry(k, tpl);
  return { call: makeTCall(k, vars) };
}

// ====== Exclude ranges ======
function buildExcludeRanges(src) {
  const excl = [];
  let sqi = false,
    dqi = false,
    bti = false,
    inLine = false,
    inBlock = false;
  let i = 0,
    n = src.length;
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
  return excl.sort((a, b) => a[0] - b[0]);
}
function buildTypeExcludes(src) {
  const lines = src.split('\n');
  const ranges = [];
  let acc = 0,
    inType = false,
    brace = 0,
    paren = 0,
    typeSL = -1;
  const tRE = /^\s*(export\s+)?(type|interface|enum)\s+\w+\s*(=|\{|<|extends)/;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li],
      so = acc,
      eo = acc + line.length + 1;
    acc = eo;
    if (!inType && tRE.test(line)) {
      inType = true;
      brace = 0;
      paren = 0;
      typeSL = li;
    }
    if (inType) {
      ranges.push([so, eo]);
      for (const ch of line) {
        if (ch === '{') brace++;
        else if (ch === '}') brace--;
        if (ch === '(') paren++;
        else if (ch === ')') paren--;
      }
      if (tRE.test(line) && line.includes('=') && !line.includes('{') && line.trim().endsWith(';')) inType = false;
      else if (brace === 0 && (line.trim().endsWith(';') || line.trim() === '};' || line.trim() === '}'))
        if (li > typeSL) inType = false;
    }
    const t = line.trim();
    if (t.startsWith('import ') || t.startsWith('import\t')) ranges.push([so, eo - 1]);
  }
  return ranges;
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
function isExcluded(commentExcl, typeExcl, s, e) {
  for (const [a, b] of typeExcl) if (e > a && s < b) return true;
  return inExcl(commentExcl, s) || inExcl(commentExcl, Math.max(0, e - 1));
}

// ====== main ======
let src = fs.readFileSync(ABS_FILE, 'utf8');
const exclComment = buildExcludeRanges(src);
const exclType = buildTypeExcludes(src);
const isEx = (s, e) => isExcluded(exclComment, exclType, s, e);

// 1) JSX attr
{
  const re =
    /(\w[\w-]*)=("([^"\\]|\\.)*[\u4e00-\u9fff\u3400-\u4dbf]([^"\\]|\\.)*"|'([^'\\]|\\.)*[\u4e00-\u9fff\u3400-\u4dbf]([^'\\]|\\.)*')/g;
  const matches = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    if (isEx(m.index, m.index + m[0].length)) continue;
    const txt = m[3] !== undefined ? (m[3] ?? '') : (m[5] ?? '');
    if (!CJK_RE.test(txt)) continue;
    matches.push({ pos: m.index, end: m.index + m[0].length, attr: m[1], txt });
  }
  for (let mi = matches.length - 1; mi >= 0; mi--) {
    const x = matches[mi];
    const parts = parseMixed(x.txt);
    if (!parts) continue;
    const { call } = partsToCall(parts);
    src = src.substring(0, x.pos) + `${x.attr}={${call}}` + src.substring(x.end);
  }
}

// 2) JSX inner text: >...CJK...<, with BALANCED curly braces, NO control tokens at top level
{
  const re = />([^<>]*[\u4e00-\u9fff\u3400-\u4dbf][^<>]*)</g;
  const matches = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    if (isEx(m.index, m.index + m[0].length)) continue;
    const inner = m[1];
    if (!CJK_RE.test(inner)) continue;
    if (inner.trim() === '') continue;
    const trimmed = inner.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}') && !CJK_RE.test(trimmed.slice(1, -1))) continue;
    if (!balanced(inner)) continue;
    // Check no control tokens (&& || ?) outside of {} expression
    let ok = true,
      a = 0,
      sqi = false,
      dqi = false,
      bti = false;
    for (let i = 0; i < inner.length; i++) {
      const ch = inner[i],
        nx = inner[i + 1];
      if (ch === "'" && !dqi && !bti) sqi = !sqi;
      else if (ch === '"' && !sqi && !bti) dqi = !dqi;
      else if (ch === '`' && !sqi && !dqi) bti = !bti;
      if (sqi || dqi || bti) continue;
      if (ch === '{') a++;
      else if (ch === '}') a--;
      if (a === 0) {
        if (ch === '&' && nx === '&') {
          ok = false;
          break;
        }
        if (ch === '|' && nx === '|') {
          ok = false;
          break;
        }
        if (ch === '?' && i < inner.length - 1 && inner[i + 1] !== '?') {
          ok = false;
          break;
        }
      }
    }
    if (!ok) continue;
    matches.push({ pos: m.index, end: m.index + m[0].length, inner });
  }
  for (let mi = matches.length - 1; mi >= 0; mi--) {
    const x = matches[mi];
    const parts = parseMixed(x.inner);
    if (!parts) continue;
    const { call } = partsToCall(parts);
    src = src.substring(0, x.pos) + `>{${call}}<` + src.substring(x.end);
  }
}

// 3) Plain string literals
{
  const re =
    /("([^"\\]|\\.)*[\u4e00-\u9fff\u3400-\u4dbf]([^"\\]|\\.)*"|'([^'\\]|\\.)*[\u4e00-\u9fff\u3400-\u4dbf]([^'\\]|\\.)*')/g;
  const matches = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    if (isEx(m.index, m.index + m[0].length)) continue;
    const full = m[0];
    const txt = full.slice(1, -1);
    if (!CJK_RE.test(txt)) continue;
    const before = src.substring(0, m.index);
    if (/(i18n\.t|\bt)\s*\(\s*$/.test(before)) continue;
    const tb = before.trimEnd();
    if (tb.endsWith('[')) continue;
    if (/[\w$]\s*:\s*$/.test(tb)) continue;
    if (!balanced(txt)) continue;
    matches.push({ pos: m.index, end: m.index + full.length, txt });
  }
  for (let mi = matches.length - 1; mi >= 0; mi--) {
    const x = matches[mi];
    const parts = parseMixed(x.txt);
    if (!parts) continue;
    const { call } = partsToCall(parts);
    src = src.substring(0, x.pos) + call + src.substring(x.end);
  }
}

// 4) Ensure i18n import
let modified = totalRep > 0;
if (modified) {
  const hasImp = /import\s+i18n\s+from\s+['"]@\/i18n['"]/.test(src) || /import\s*\{\s*i18n\s*\}/.test(src);
  const srcLines = src.split('\n');
  const usesI18n = srcLines.some((l) => /i18n\.t\s*\(/.test(l) && !l.trim().startsWith('import '));
  if (usesI18n && !hasImp) {
    const la = srcLines;
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

// Write tsx file + save pending translations (if not dry)
const pendingFile = path.join(PENDING_DIR, `${fl.replace(/[^a-z0-9]/g, '_')}_${Date.now()}.json`);
let tsxWritten = false;
if (!dryRun && modified) {
  fs.writeFileSync(ABS_FILE, src, 'utf8');
  tsxWritten = true;
  const pendingData = { zh: pendingZh, en: pendingEn };
  fs.writeFileSync(pendingFile, JSON.stringify(pendingData, null, 2), 'utf8');
}

console.log(
  JSON.stringify(
    {
      file: REL_FILE,
      ns: NS,
      replaced: totalRep,
      modified,
      dry: dryRun,
      tsxWritten,
      pending: modified && !dryRun ? pendingFile : null,
      keys: replacedKeys.slice(0, 20),
    },
    null,
    2
  )
);
