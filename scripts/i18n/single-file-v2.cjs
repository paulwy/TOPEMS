#!/usr/bin/env node
/**
 * Single-file V2: Enhanced safe replacement
 *  - Handles: JsxText (incl. multi-segment with {expr}), JsxAttr strings, plain strings
 *  - Handles: pattern like ¥{expr}万 => t('key', { v: expr }) with template ¥{{v}}万
 *  - Skips: type blocks, regex literals, bracket access, property names, whitelists
 *  - Per-file: write, then TSC verify, rollback on fail (via wrapper)
 */
const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '../../apps/web/src');
const I18N_DIR = path.join(WEB_ROOT, 'i18n', 'locales');
const args = process.argv.slice(2);
const fileIdx = args.indexOf('--file');
const nsIdx = args.indexOf('--ns');
const dryRun = args.includes('--dry');

if (fileIdx === -1 || nsIdx === -1) {
  console.error(JSON.stringify({ error: 'Usage: --file <rel> --ns <ns> [--dry]' }));
  process.exit(1);
}
const REL_FILE = args[fileIdx + 1];
const NS = args[nsIdx + 1];
const ABS_FILE = path.join(WEB_ROOT, REL_FILE);

if (!fs.existsSync(ABS_FILE)) {
  console.error(JSON.stringify({ error: 'not found' }));
  process.exit(1);
}

const CJK = /[\u4e00-\u9fff\u3400-\u4dbf]/;
const WHITELIST = ['utils/ai/ui-recommender.ts', 'utils/apiPath.ts', 'config/ai-templates.ts'];
const BI = 'pages/bi/';

function isWL(rel) {
  if (rel.startsWith(BI)) return true;
  if (WHITELIST.some((w) => rel.includes(w))) return true;
  if (path.basename(rel).toLowerCase().includes('mock')) return true;
  return false;
}
if (isWL(REL_FILE)) {
  console.error(JSON.stringify({ error: 'whitelisted', file: REL_FILE }));
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

function skipLineContext(lines) {
  const skip = new Array(lines.length).fill(false);
  let typeStart = -1,
    depth = 0,
    braceDepth = 0;
  const typeRE = /^\s*(export\s+)?(type|interface|enum)\s+\w+\s*(=|\{|<|extends)/;
  let inBlockComment = false;
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (typeStart === -1 && typeRE.test(line)) {
      typeStart = i;
      depth = 0;
      braceDepth = 0;
    }
    if (typeStart !== -1) {
      skip[i] = true;
      for (const ch of line) {
        if (ch === '{' || ch === '(') {
          depth++;
          braceDepth++;
        } else if (ch === '}' || ch === ')') {
          depth--;
          braceDepth--;
        }
      }
      if (typeRE.test(line) && line.includes('=') && !line.includes('{') && line.trim().endsWith(';')) typeStart = -1;
      else if (braceDepth === 0 && (line.trim().endsWith(';') || line.trim() === '};' || line.trim() === '}')) {
        if (depth <= 0 || i > typeStart + 1) typeStart = -1;
      }
    }
    const t = line.trim();
    if (
      t.startsWith('//') ||
      t.startsWith('import ') ||
      t.startsWith('import\t') ||
      t.startsWith('*') ||
      t.startsWith('/*')
    )
      skip[i] = true;
    let sqi = false,
      dqi = false,
      bti = false;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j],
        nx = line[j + 1];
      if (inBlockComment) {
        if (ch === '*' && nx === '/') {
          inBlockComment = false;
          j++;
        }
        continue;
      }
      if (!sqi && !dqi && !bti && ch === '/' && nx === '*') {
        inBlockComment = true;
        j++;
        skip[i] = true;
        continue;
      }
      if (!sqi && !dqi && !bti && ch === '/' && nx === '/') break;
      if (ch === "'" && !dqi && !bti) sqi = !sqi;
      else if (ch === '"' && !sqi && !bti) dqi = !dqi;
      else if (ch === '`' && !sqi && !dqi) bti = !bti;
    }
  }
  return skip;
}

function inRegexContext(line, pos) {
  let sqi = false,
    dqi = false,
    bti = false,
    inStr = false;
  for (let j = 0; j < pos; j++) {
    const ch = line[j];
    if (!inStr && ch === '/' && line[j - 1] !== '\\') {
      let k = j + 1,
        end = -1;
      while (k < line.length) {
        if (line[k] === '/' && line[k - 1] !== '\\') {
          end = k;
          break;
        }
        k++;
      }
      if (end !== -1 && end > pos) return true;
    }
    if (ch === "'" && !dqi && !bti) sqi = !sqi;
    else if (ch === '"' && !sqi && !bti) dqi = !dqi;
    else if (ch === '`' && !sqi && !dqi) bti = !bti;
    inStr = sqi || dqi || bti;
  }
  return false;
}

const zhNsPath = path.join(I18N_DIR, 'zh', `${NS}.json`);
const enNsPath = path.join(I18N_DIR, 'en', `${NS}.json`);
const translations = { zh: loadJSON(zhNsPath), en: loadJSON(enNsPath) };
const fl = flabel(ABS_FILE);
let kc = 0;

function genKey(text, vars) {
  const clean = text
    .replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, '')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase();
  const h = text.length <= 30 && clean.length >= 2 ? `${clean}_${kc}` : `k${kc}`;
  kc++;
  return `${fl}.${h}`;
}

function addKey(key, zhVal, enVal) {
  if (!(key in translations.zh)) {
    translations.zh[key] = zhVal;
    translations.en[key] = enVal || 'TODO: translate';
  }
}

const content = fs.readFileSync(ABS_FILE, 'utf8');
const lines = content.split('\n');
const skip = skipLineContext(lines);
const replacedKeys = [];
let totalRep = 0;
const newLines = [...lines];

for (let i = 0; i < lines.length; i++) {
  if (skip[i]) continue;
  const line = lines[i];
  if (!CJK.test(line)) continue;
  if (inRegexContext(line, line.search(CJK))) continue;
  if (/i18n\.t\s*\(/.test(line) || /\bt\s*\(\s*['"`]/.test(line)) continue;

  let mod = line;

  // Pattern 1: JSX attr: name="中文" / name='中文' => name={i18n.t('ns:k')}
  let m;
  const attrRe = /(\w+)=("([^"]*[\u4e00-\u9fff\u3400-\u4dbf][^"]*)"|'([^']*[\u4e00-\u9fff\u3400-\u4dbf][^']*)')/g;
  const attrSegs = [];
  while ((m = attrRe.exec(line)) !== null) {
    const txt = m[3] ?? m[4];
    if (inRegexContext(line, m.index + 1)) continue;
    attrSegs.push({ o: m.index, e: m.index + m[0].length, attr: m[1], txt });
  }
  for (let s = attrSegs.length - 1; s >= 0; s--) {
    const seg = attrSegs[s];
    const k = genKey(seg.txt, null);
    const fk = `${NS}:${k}`;
    addKey(k, seg.txt);
    replacedKeys.push(fk);
    mod = mod.substring(0, seg.o) + `${seg.attr}={i18n.t('${fk}')}` + mod.substring(seg.e);
    totalRep++;
  }

  // Pattern 2: JSX >text< (single-line, incl. {expr} inside)
  const jsxSegs = [];
  const jsxRe = />([^<]*[\u4e00-\u9fff\u3400-\u4dbf][^<]*)</g;
  while ((m = jsxRe.exec(line)) !== null) {
    const inner = m[1];
    if (!CJK.test(inner)) continue;
    const trimmed = inner.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('{') && trimmed.endsWith('}') && !CJK.test(trimmed.slice(1, -1))) continue;
    jsxSegs.push({ o: m.index, e: m.index + m[0].length, inner });
  }
  for (let s = jsxSegs.length - 1; s >= 0; s--) {
    const seg = jsxSegs[s];
    const { replaced, replText } = transformJsxInner(seg.inner);
    mod = mod.substring(0, seg.o) + '>' + replText + '<' + mod.substring(seg.e);
    totalRep += replaced;
  }

  // Pattern 3: Plain string literals with CJK (skip prop names, bracket)
  if (CJK.test(mod)) {
    const strSegs = [];
    const strRe =
      /("([^"\\]|\\.)*[\u4e00-\u9fff\u3400-\u4dbf]([^"\\]|\\.)*"|'([^'\\]|\\.)*[\u4e00-\u9fff\u3400-\u4dbf]([^'\\]|\\.)*')/g;
    while ((m = strRe.exec(line)) !== null) {
      const full = m[0],
        quote = full[0],
        txt = full.slice(1, -1);
      if (!CJK.test(txt)) continue;
      const before = line.substring(0, m.index);
      if (/i18n\.t\s*\(\s*$/.test(before) || /\bt\s*\(\s*$/.test(before)) continue;
      const tb = before.trimEnd();
      if (tb.endsWith('[')) continue;
      if (/[\w$]\s*:\s*$/.test(tb)) continue;
      if (inRegexContext(line, m.index + 1)) continue;
      strSegs.push({ o: m.index, e: m.index + full.length, txt });
    }
    for (let s = strSegs.length - 1; s >= 0; s--) {
      const seg = strSegs[s];
      const k = genKey(seg.txt, null);
      const fk = `${NS}:${k}`;
      addKey(k, seg.txt);
      replacedKeys.push(fk);
      mod = mod.substring(0, seg.o) + `i18n.t('${fk}')` + mod.substring(seg.e);
      totalRep++;
    }
  }

  if (mod !== line) newLines[i] = mod;
}

function transformJsxInner(inner) {
  let replaced = 0;
  const parts = [];
  const exprs = [];
  let i = 0;
  while (i < inner.length) {
    if (inner[i] === '{') {
      let depth = 1,
        j = i + 1;
      while (j < inner.length && depth > 0) {
        if (inner[j] === '{') depth++;
        else if (inner[j] === '}') depth--;
        j++;
      }
      const expr = inner.substring(i + 1, j - 1);
      const vn = `v${exprs.length}`;
      exprs.push({ vn, expr });
      parts.push({ type: 'expr', vn });
      i = j;
    } else {
      let j = i;
      while (j < inner.length && inner[j] !== '{') j++;
      parts.push({ type: 'text', val: inner.substring(i, j) });
      i = j;
    }
  }
  const onlyTextCJK = parts.filter((p) => p.type === 'text').some((p) => CJK.test(p.val));
  if (!onlyTextCJK) return { replaced: 0, replText: inner };

  if (parts.length === 1 && parts[0].type === 'text') {
    const txt = parts[0].val.trim();
    const k = genKey(txt, null);
    const fk = `${NS}:${k}`;
    addKey(k, txt);
    replacedKeys.push(fk);
    replaced++;
    return { replaced, replText: `{i18n.t('${fk}')}` };
  }

  let tplText = '';
  for (const p of parts) {
    if (p.type === 'text') tplText += p.val;
    else tplText += `{{${p.vn}}}`;
  }
  const tplTrim = tplText.trim();
  const k = genKey(tplTrim, exprs);
  const fk = `${NS}:${k}`;
  addKey(k, tplTrim);
  replacedKeys.push(fk);
  replaced++;
  let arg = '';
  if (exprs.length > 0) {
    arg = ', { ' + exprs.map((e) => `${e.vn}: (${e.expr})`).join(', ') + ' }';
  }
  return { replaced, replText: `{i18n.t('${fk}'${arg})}` };
}

let modified = totalRep > 0;
if (modified) {
  let has = newLines.some((l) => /import\s+i18n\s+from\s+['"]@\/i18n['"]/.test(l) || /import\s*\{\s*i18n\s*\}/.test(l));
  let uses = newLines.some((l) => /i18n\.t\s*\(/.test(l) && !l.trim().startsWith('import'));
  if (uses && !has) {
    let last = -1;
    for (let i = 0; i < newLines.length; i++) {
      if (newLines[i].trim().startsWith('import ')) last = i;
      else if (last >= 0 && !newLines[i].trim().startsWith('import') && newLines[i].trim() !== '') break;
    }
    if (last >= 0) {
      newLines.splice(last + 1, 0, "import i18n from '@/i18n';");
    }
  }
}

if (!dryRun && modified) {
  fs.writeFileSync(ABS_FILE, newLines.join('\n'), 'utf8');
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
      keys: replacedKeys.slice(0, 20),
    },
    null,
    2
  )
);

function ensureI18nImport(lns) {}
