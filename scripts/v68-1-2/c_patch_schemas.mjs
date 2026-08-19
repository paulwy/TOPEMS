#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join, extname, dirname as pDirname, basename, resolve, relative, dirname as _dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = pDirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const MAP_FILE = join(__dirname, '.run', 'table-col-varchar.map.json');
const ALIAS_FILE = join(__dirname, 'entity-table-map.json');
const BACKUP_DIR = join(__dirname, '.run', 'patches-backup');

const argv = new Set(process.argv.slice(2));
const DRY_RUN = argv.has('--dry-run');
const ONLY = [...argv].find((a) => a.startsWith('--only='))?.slice(7);
const LIMIT = parseInt([...argv].find((a) => a.startsWith('--limit='))?.slice(8) ?? 'Infinity', 10);

if (!existsSync(MAP_FILE) || !existsSync(ALIAS_FILE)) {
  console.error('Run Stage A then Stage B + fill alias first.');
  process.exit(2);
}
const VARCHAR_MAP = JSON.parse(readFileSync(MAP_FILE, 'utf8'));
const ALIAS = JSON.parse(readFileSync(ALIAS_FILE, 'utf8'));

const STRING_TYPES = new Set(['text', 'email', 'textarea', 'select', 'autocomplete', 'checkbox-group']);

function walk(dir, visitor) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, visitor);
    else if (e.isFile() && (e.name.endsWith('.ts') || e.name.endsWith('.tsx'))) visitor(p);
  }
}
function balancedClose(src, start, openCh, closeCh) {
  let d = 0,
    i = start,
    inS = null,
    esc = false,
    lc = false,
    bc = false;
  for (; i < src.length; i++) {
    const ch = src[i],
      n = src[i + 1];
    if (lc) {
      if (ch === '\n') lc = false;
      continue;
    }
    if (bc) {
      if (ch === '*' && n === '/') {
        bc = false;
        i++;
      }
      continue;
    }
    if (inS) {
      if (esc) {
        esc = false;
        continue;
      }
      if (ch === '\\') {
        esc = true;
        continue;
      }
      if (ch === inS) inS = null;
      continue;
    }
    if (ch === '/' && n === '/') {
      lc = true;
      i++;
      continue;
    }
    if (ch === '/' && n === '*') {
      bc = true;
      i++;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      inS = ch;
      continue;
    }
    if (ch === openCh) d++;
    else if (ch === closeCh) {
      d--;
      if (d === 0) return i;
    }
  }
  return -1;
}
const braceClose = (s, i) => balancedClose(s, i, '{', '}');
const bracketClose = (s, i) => balancedClose(s, i, '[', ']');
function parseField(body) {
  const n = body.match(/\bname\s*:\s*['"`]([^'"`]+)/),
    t = body.match(/\btype\s*:\s*['"`]([^'"`]+)/);
  const name = n ? n[1] : null,
    type = t ? t[1] : null;
  let has = false,
    val = null;
  const vRe = /\bvalidation\s*:\s*\[([\s\S]*?)\]/g;
  let vm;
  while ((vm = vRe.exec(body)) !== null) {
    const b = vm[1];
    const a = b.match(/\{\s*type\s*:\s*['"`]maxLength['"`]\s*,\s*value\s*:\s*(\d+)/);
    const c = b.match(/value\s*:\s*(\d+)\s*,\s*type\s*:\s*['"`]maxLength['"`]/);
    if (a) {
      has = true;
      val = parseInt(a[1], 10);
      break;
    }
    if (c) {
      has = true;
      val = parseInt(c[1], 10);
      break;
    }
  }
  return { name, type, has, val };
}
function splitFields(src) {
  const out = [];
  let i = 1;
  while (i < src.length) {
    let d = 0,
      s = -1,
      inS = null,
      esc = false,
      lc = false,
      bc = false;
    for (; i < src.length; i++) {
      const ch = src[i],
        n = src[i + 1];
      if (lc) {
        if (ch === '\n') lc = false;
        continue;
      }
      if (bc) {
        if (ch === '*' && n === '/') {
          bc = false;
          i++;
        }
        continue;
      }
      if (inS) {
        if (esc) {
          esc = false;
          continue;
        }
        if (ch === '\\') {
          esc = true;
          continue;
        }
        if (ch === inS) inS = null;
        continue;
      }
      if (ch === '/' && n === '/') {
        lc = true;
        i++;
        continue;
      }
      if (ch === '/' && n === '*') {
        bc = true;
        i++;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') {
        inS = ch;
        continue;
      }
      if (ch === '{') {
        s = i;
        d++;
        break;
      }
    }
    if (s < 0) break;
    i++;
    d = 1;
    for (; i < src.length; i++) {
      const ch = src[i],
        n = src[i + 1];
      if (lc) {
        if (ch === '\n') lc = false;
        continue;
      }
      if (bc) {
        if (ch === '*' && n === '/') {
          bc = false;
          i++;
        }
        continue;
      }
      if (inS) {
        if (esc) {
          esc = false;
          continue;
        }
        if (ch === '\\') {
          esc = true;
          continue;
        }
        if (ch === inS) inS = null;
        continue;
      }
      if (ch === '/' && n === '/') {
        lc = true;
        i++;
        continue;
      }
      if (ch === '/' && n === '*') {
        bc = true;
        i++;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') {
        inS = ch;
        continue;
      }
      if (ch === '{') d++;
      else if (ch === '}') {
        d--;
        if (d === 0) {
          i++;
          break;
        }
      }
    }
    out.push({ startAbsOffset: s, endAbsOffset: i, body: src.slice(s, i), parsed: parseField(src.slice(s, i)) });
  }
  return out;
}
function parseBlock(file, block, absOffsetInFile) {
  const e = block.match(/\bentity\s*:\s*['"`]([^'"`]+)/),
    o = block.match(/\bapi\s*:\s*\{[\s\S]*?module\s*:\s*['"`]([^'"`]+)/),
    r = block.match(/\bapi\s*:\s*\{[\s\S]*?resource\s*:\s*['"`]([^'"`]+)/);
  if (!e) return null;
  const entity = e[1],
    modu = o ? o[1] : null,
    reso = r ? r[1] : null;
  const fIdx = block.search(/\bfields\s*:\s*\[/);
  if (fIdx < 0) return null;
  const ls = fIdx + block.slice(fIdx).indexOf('[');
  const rs = bracketClose(block, ls);
  if (rs < 0) return null;
  return {
    file,
    entity,
    modu,
    reso,
    fieldsArrAbsStart: absOffsetInFile + ls,
    fieldsArrAbsEnd: absOffsetInFile + rs + 1,
    fields: splitFields(block.slice(ls, rs + 1)),
  };
}
function extractSchemas(file, src) {
  const res = [];
  const patterns = [
    /EntitySchema\s*=\s*\{|:\s*EntitySchema\b[^=]*=\s*\{/g,
    /export\s+(?:const|let|var)\s+\w+\s*=\s*\{[\s\S]{0,200}\bentity\s*:\s*['"][^'"]+['"]/g,
    /(?:^|\n)\s*(?:const|let|var)\s+\w+\s*=\s*\{[\s\S]{0,120}\bentity\s*:\s*['"][^'"]+['"]/g,
  ];
  const seen = new Set();
  for (const re of patterns) {
    let m;
    while ((m = re.exec(src)) !== null) {
      const bi = src.indexOf('{', m.index);
      if (bi < 0) continue;
      const ei = braceClose(src, bi);
      if (ei < 0) continue;
      if (seen.has(ei)) {
        re.lastIndex = ei + 1;
        continue;
      }
      seen.add(ei);
      const b = parseBlock(file, src.slice(bi, ei + 1), bi);
      if (b) res.push(b);
      re.lastIndex = ei + 1;
    }
  }
  return res;
}
function toSnake(s) {
  return s.replace(/[A-Z]/g, (l) => '_' + l.toLowerCase()).replace(/^_/, '');
}
function aliasKey(s) {
  return `${s.entity}|${s.modu ?? ''}|${s.reso ?? ''}`;
}
function resolveVarchar(schema, fieldName) {
  const a = ALIAS[aliasKey(schema)];
  const cols = [fieldName.toLowerCase(), toSnake(fieldName)];
  const tks = new Set();
  if (a && a.tableKey) tks.add(a.tableKey);
  const mod = schema.modu ? schema.modu.toLowerCase() : null,
    ent = schema.entity ? schema.entity.toLowerCase() : null,
    res = schema.reso ? schema.reso.toLowerCase() : null;
  const base = new Set();
  const pl = (s) =>
    s.endsWith('s') ? s + 'es' : s.endsWith('y') && !/[aeiou]y$/.test(s) ? s.slice(0, -1) + 'ies' : s + 's';
  const sg = (s) =>
    s.endsWith('ies')
      ? s.slice(0, -3) + 'y'
      : s.endsWith('es')
        ? s.slice(0, -2)
        : s.endsWith('s') && !s.endsWith('ss')
          ? s.slice(0, -1)
          : s;
  if (ent)
    [ent, toSnake(ent)].forEach((v) => {
      base.add(v);
      base.add(pl(v));
      base.add(sg(v));
    });
  if (res)
    [res, toSnake(res)].forEach((v) => {
      base.add(v);
      base.add(pl(v));
      base.add(sg(v));
    });
  if (mod) {
    base.forEach((v) => tks.add(`${mod}_${v}`));
    if (
      new Set([
        'admin',
        'tenant',
        'user',
        'role',
        'permission',
        'plugin',
        'billing',
        'finance',
        'workflow',
        'menu',
        'notification',
        'chat',
        'guide',
        'dict',
        'file',
        'migration',
        'help',
        'portal',
        'core',
      ]).has(mod)
    )
      base.forEach((v) => {
        tks.add(`core_${v}`);
        tks.add(`${mod}_${v}`);
      });
  }
  base.forEach((v) => tks.add(v));
  for (const tk of tks)
    for (const ck of cols) {
      const k = `${tk}.${ck}`;
      if (VARCHAR_MAP[k]) return { tKey: tk, cKey: ck, n: VARCHAR_MAP[k] };
    }
  return null;
}

function patchFieldBody(oldBody, varcharN) {
  const newItem = `{ type: 'maxLength', value: ${varcharN} }`;
  const vRe = /\bvalidation\s*:\s*(\[[\s\S]*?\])/;
  const vm = oldBody.match(vRe);
  if (vm) {
    const arrSrc = vm[1];
    if (/['"`]maxLength['"`]/.test(arrSrc)) return null;
    const trimmed = arrSrc.slice(1, -1).trim();
    // Try single-line format first (prettier prefers this for short arrays)
    if (trimmed.length === 0) {
      return oldBody.slice(0, vm.index) + `validation: [${newItem}]` + oldBody.slice(vm.index + vm[0].length);
    }
    // Existing items — try single-line if combined is short enough
    const existing = trimmed.endsWith(',') ? trimmed : trimmed + ',';
    const singleLine = `[${existing} ${newItem}]`;
    if (singleLine.length <= 80) {
      return oldBody.slice(0, vm.index) + `validation: ${singleLine}` + oldBody.slice(vm.index + vm[0].length);
    }
    // Fall back to multi-line
    const indentGuess = (oldBody.match(/\n(\s+)[\w]/) || ['', '  '])[1];
    const itemIndent = indentGuess + indentGuess;
    const newArr = `[${trimmed.endsWith(',') ? '\n' + itemIndent : trimmed + ' ,\n' + itemIndent}${newItem},\n${indentGuess}]`;
    return oldBody.slice(0, vm.index) + `validation: ${newArr}` + oldBody.slice(vm.index + vm[0].length);
  } else {
    // No existing validation array — add one (single-line, prettier-friendly)
    const indent = (oldBody.match(/\n(\s+)[\w]/) || ['', '  '])[1];
    const trimmed = oldBody.replace(/\s*$/, '');
    const bodyNoCloseBrace = trimmed.endsWith('}') ? trimmed.slice(0, -1).replace(/,?\s*$/, '') : trimmed;
    const commaFix = bodyNoCloseBrace.trim().length === 0 ? '' : ',';
    return `${bodyNoCloseBrace}${commaFix}\n${indent}validation: [${newItem}],\n}`;
  }
}

const filesToPatch = [];
walk(join(ROOT, 'apps/web/src/schemas'), (p) => {
  if (ONLY) {
    if (p.endsWith(ONLY)) filesToPatch.push(p);
  } else filesToPatch.push(p);
});

let patchedFields = 0;
let skippedExisting = 0;
let skippedNoVarchar = 0;
let warnedMis = 0;

for (const f of filesToPatch) {
  if (patchedFields >= LIMIT) break;
  const originalSrc = readFileSync(f, 'utf8');
  const schemas = extractSchemas(f, originalSrc);
  const edits = [];
  for (const s of schemas) {
    for (const fld of s.fields) {
      if (!STRING_TYPES.has(fld.parsed.type)) continue;
      if (fld.parsed.has) {
        skippedExisting++;
        continue;
      }
      const name = fld.parsed.name;
      if (!name) continue;
      const vc = resolveVarchar(s, name);
      if (!vc) {
        skippedNoVarchar++;
        continue;
      }
      if (fld.parsed.has && fld.parsed.val !== vc.n) {
        console.warn(`WARN mismatch @${relative(ROOT, f)}:${name} schema.val=${fld.parsed.val} vs sql=${vc.n}`);
        warnedMis++;
        continue;
      }
      const fieldStart = s.fieldsArrAbsStart + fld.startAbsOffset;
      const fieldEnd = s.fieldsArrAbsStart + fld.endAbsOffset;
      const newBody = patchFieldBody(fld.body, vc.n);
      if (newBody === null) {
        skippedExisting++;
        continue;
      }
      edits.push({
        start: fieldStart,
        end: fieldEnd,
        repl: newBody,
        info: `${relative(ROOT, f)} field=${name} → ${vc.tKey}.${vc.cKey} VARCHAR(${vc.n})`,
      });
      patchedFields++;
      if (patchedFields >= LIMIT) break;
    }
    if (patchedFields >= LIMIT) break;
  }
  if (edits.length === 0) continue;
  edits.sort((a, b) => b.start - a.start);
  let newSrc = originalSrc;
  for (const e of edits) newSrc = newSrc.slice(0, e.start) + e.repl + newSrc.slice(e.end);
  console.log(`[${DRY_RUN ? 'PLAN' : 'PATCH'}] ${relative(ROOT, f)}: ${edits.length} fields`);
  edits.slice(0, 5).forEach((e) => console.log('    · ' + e.info));
  if (edits.length > 5) console.log(`      ... + ${edits.length - 5} more in this file`);
  if (DRY_RUN) continue;
  const rel = relative(ROOT, f);
  const bk = join(BACKUP_DIR, rel);
  if (!existsSync(_dirname(bk))) mkdirSync(_dirname(bk), { recursive: true });
  copyFileSync(f, bk);
  writeFileSync(f, newSrc, 'utf8');
}
console.log(
  `\n[Stage C ${DRY_RUN ? 'dry-run' : 'apply'}] patched=${patchedFields}  skipped(already_maxLength)=${skippedExisting}  skipped(no_sql_varchar)=${skippedNoVarchar}  mismatches_warn=${warnedMis}`
);
process.exit(0);
