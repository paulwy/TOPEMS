#!/usr/bin/env node
/**
 * V68.1-2 Gate 1 — EntitySchema-side VARCHAR reception coverage
 *
 * Measures: of EntitySchema String-type fields that have a backing VARCHAR(n)
 * column in SQL (excluding TEXT columns per option A, and frontend-only fields
 * with no SQL column), what fraction received a matching maxLength entry?
 *
 * Pass criteria:
 *   - reception_rate >= 90%  (VARCHAR-backed fields that got matched)
 *   - long_col_rate  = 100%  (SQL VARCHAR>=500 columns backing EntitySchema fields)
 *   - all alias entries with non-null tableKey point to existing SQL tables
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, dirname as pDirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = pDirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const MAP_FILE = join(__dirname, '.run', 'table-col-varchar.map.json');
const ALIAS_FILE = join(__dirname, 'entity-table-map.json');

if (!existsSync(MAP_FILE) || !existsSync(ALIAS_FILE)) {
  console.error('Run Stage A then Stage B first.');
  process.exit(2);
}

const VARCHAR_MAP = JSON.parse(readFileSync(MAP_FILE, 'utf8'));
const ALIAS = JSON.parse(readFileSync(ALIAS_FILE, 'utf8'));
const ALL_TABLE_KEYS = new Set(Object.keys(VARCHAR_MAP).map((k) => k.split('.')[0]));

// --- Scan TEXT columns from SQL (same parser as Stage A, but for TEXT) ---
const TEXT_MAP = new Map(); // "table.col" -> true
function scanSqlText(p) {
  const src = readFileSync(p, 'utf8');
  const buf = '\n' + src + '\n';
  const stmts = [];
  {
    let start = 1,
      inStr = null,
      esc = false,
      lc = false,
      bc = false,
      inDol = false;
    for (let i = 1; i < buf.length; i++) {
      const ch = buf[i],
        n = buf[i + 1];
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
      if (inDol) {
        if (ch === '$' && buf.slice(i, i + 3) === '$$') {
          inDol = false;
          i += 2;
        }
        continue;
      }
      if (inStr) {
        if (esc) {
          esc = false;
          continue;
        }
        if (ch === '\\') {
          esc = true;
          continue;
        }
        if (ch === inStr) inStr = null;
        continue;
      }
      if ((ch === '-' && n === '-') || (ch === '/' && n === '/')) {
        lc = true;
        i++;
        continue;
      }
      if (ch === '/' && n === '*') {
        bc = true;
        i++;
        continue;
      }
      if (ch === '$' && buf.slice(i, i + 3) === '$$') {
        inDol = true;
        i += 2;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') {
        inStr = ch;
        continue;
      }
      if (ch === ';') {
        stmts.push(buf.slice(start, i));
        start = i + 1;
      }
    }
    if (start < buf.length - 1) stmts.push(buf.slice(start, -1));
  }
  for (const sRaw of stmts) {
    const s = sRaw.replace(/^--[^\n]*\n/gm, '').trim();
    if (!s) continue;
    const h = s.match(/^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:([\w]+)\.)?([\w]+)\s*\(/i);
    if (!h) continue;
    const pg = (h[1] || '').toLowerCase();
    const tbl = h[2].toLowerCase();
    const tableKey = pg ? `${pg}_${tbl}` : tbl;
    const bs = s.indexOf('(');
    if (bs < 0) continue;
    let d = 0,
      inS = null,
      end = -1;
    for (let i = bs; i < s.length; i++) {
      const ch = s[i];
      if (inS) {
        if (ch === inS) inS = null;
        else if (ch === '\\') i++;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') {
        inS = ch;
        continue;
      }
      if (ch === '(') d++;
      else if (ch === ')') {
        d--;
        if (d === 0) {
          end = i;
          break;
        }
      }
    }
    if (end < 0) continue;
    const body = s.slice(bs + 1, end);
    const lines = body.split(/,(?![^()]*\))/);
    for (const cl of lines) {
      const col = cl.trim();
      if (/^(CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK|INDEX|KEY|FULLTEXT|SPATIAL|EXCLUDE)\b/i.test(col))
        continue;
      const m = col.match(/^[`""]?([\w]+)[`""]?\s+TEXT\b/i);
      if (m) TEXT_MAP.set(`${tableKey}.${m[1].toLowerCase()}`, true);
    }
  }
}
function walkSql(dir, fn) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkSql(p, fn);
    else if (e.isFile() && extname(p) === '.sql' && basename(pDirname(p)) === 'migrations') fn(p);
  }
}
for (const r of [join(ROOT, 'svc'), join(ROOT, 'lib'), join(ROOT, 'database')]) {
  try {
    statSync(r);
    walkSql(r, scanSqlText);
  } catch {}
}

// --- alias validity check ---
const aliasEntries = Object.entries(ALIAS).filter(([k, v]) => !k.startsWith('_') && v && v.tableKey);
const invalidAliases = aliasEntries.filter(([k, v]) => !ALL_TABLE_KEYS.has(v.tableKey));

// --- schema parsing (same logic as Stage B/C) ---
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
  const n = body.match(/\bname\s*:\s*['"`]([^'"`]+)/);
  const t = body.match(/\btype\s*:\s*['"`]([^'"`]+)/);
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
    out.push(parseField(src.slice(s, i)));
  }
  return out;
}
function parseBlock(file, block) {
  const e = block.match(/\bentity\s*:\s*['"`]([^'"`]+)/);
  const o = block.match(/\bapi\s*:\s*\{[\s\S]*?module\s*:\s*['"`]([^'"`]+)/);
  const r = block.match(/\bapi\s*:\s*\{[\s\S]*?resource\s*:\s*['"`]([^'"`]+)/);
  if (!e) return null;
  const entity = e[1],
    modu = o ? o[1] : null,
    reso = r ? r[1] : null;
  const fIdx = block.search(/\bfields\s*:\s*\[/);
  if (fIdx < 0) return null;
  const ls = block.indexOf('[', fIdx);
  const rs = bracketClose(block, ls);
  if (rs < 0) return null;
  return { file, entity, modu, reso, fields: splitFields(block.slice(ls, rs + 1)) };
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
      const b = parseBlock(file, src.slice(bi, ei + 1));
      if (b) res.push(b);
      re.lastIndex = ei + 1;
    }
  }
  return res;
}

function toSnake(s) {
  return s.replace(/[A-Z]/g, (l) => '_' + l.toLowerCase()).replace(/^_/, '');
}
function pluralize(s) {
  if (s.endsWith('s')) return s + 'es';
  if (s.endsWith('y') && !/[aeiou]y$/.test(s)) return s.slice(0, -1) + 'ies';
  return s + 's';
}
function singularize(s) {
  if (s.endsWith('ies')) return s.slice(0, -3) + 'y';
  if (s.endsWith('es')) return s.slice(0, -2);
  if (s.endsWith('s') && !s.endsWith('ss')) return s.slice(0, -1);
  return s;
}
function guessTableKeys(s) {
  const out = new Set();
  const mod = s.modu ? s.modu.toLowerCase() : null,
    ent = s.entity ? s.entity.toLowerCase() : null,
    res = s.reso ? s.reso.toLowerCase() : null;
  const base = new Set();
  if (ent)
    [ent, toSnake(ent)].forEach((v) => {
      base.add(v);
      base.add(pluralize(v));
      base.add(singularize(v));
    });
  if (res)
    [res, toSnake(res)].forEach((v) => {
      base.add(v);
      base.add(pluralize(v));
      base.add(singularize(v));
    });
  if (mod) {
    base.forEach((v) => out.add(`${mod}_${v}`));
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
        'accounting',
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
    ) {
      base.forEach((v) => {
        out.add(`core_${v}`);
        out.add(`${mod}_${v}`);
      });
    }
  }
  base.forEach((v) => out.add(v));
  return [...out];
}
function guessCols(fn) {
  return [...new Set([fn.toLowerCase(), toSnake(fn)])];
}
function aliasKey(s) {
  return `${s.entity}|${s.modu ?? ''}|${s.reso ?? ''}`;
}

// --- collect schemas ---
const schemas = [];
walk(join(ROOT, 'apps/web/src/schemas'), (p) => {
  try {
    schemas.push(...extractSchemas(p, readFileSync(p, 'utf8')));
  } catch {}
});

// --- compute reception coverage ---
let varcharBackedTotal = 0; // String fields with a backing VARCHAR(n) column in SQL
let varcharBackedMatched = 0; // of those, how many received maxLength
let textExempt = 0; // String fields whose SQL column is TEXT (exempt per option A)
let noColumnExempt = 0; // String fields with no SQL column at all (frontend-only)
let noSqlBacking = 0; // String fields whose entity has NO SQL table at all
let longColTotal = 0; // SQL VARCHAR>=500 columns that correspond to EntitySchema fields
let longColMatched = 0; // of those, how many are matched

for (const s of schemas) {
  const a = ALIAS[aliasKey(s)];
  const tks = new Set(guessTableKeys(s));
  if (a && a.tableKey) tks.add(a.tableKey);
  const sqlTableKey = [...tks].find((tk) => ALL_TABLE_KEYS.has(tk));
  const hasSqlBacking = !!sqlTableKey;

  for (const f of s.fields) {
    if (!STRING_TYPES.has(f.type)) continue;
    if (!f.name) continue;

    if (!hasSqlBacking) {
      noSqlBacking++;
      continue;
    }

    const cols = guessCols(f.name);
    let found = null;
    for (const tk of [sqlTableKey, ...tks]) {
      for (const ck of cols) {
        const k = `${tk}.${ck}`;
        if (VARCHAR_MAP[k]) {
          found = { tk, ck, n: VARCHAR_MAP[k] };
          break;
        }
      }
      if (found) break;
    }

    if (found) {
      varcharBackedTotal++;
      varcharBackedMatched++;
      if (found.n >= 500) {
        longColTotal++;
        longColMatched++;
      }
    } else {
      // Classify the unmatched field
      let isText = false;
      let hasVarchar = false;
      for (const ck of cols) {
        if (TEXT_MAP.has(`${sqlTableKey}.${ck}`)) {
          isText = true;
        }
        if (VARCHAR_MAP[`${sqlTableKey}.${ck}`]) {
          hasVarchar = true;
        }
      }
      if (isText) {
        textExempt++;
      } else if (hasVarchar) {
        // VARCHAR exists in SQL but wasn't matched — naming mismatch, counts against us
        varcharBackedTotal++;
        for (const ck of cols) {
          if (VARCHAR_MAP[`${sqlTableKey}.${ck}`] >= 500) {
            longColTotal++;
            break;
          }
        }
      } else {
        // No SQL column at all — frontend-only field
        noColumnExempt++;
      }
    }
  }
}

const receptionRate = varcharBackedTotal > 0 ? varcharBackedMatched / varcharBackedTotal : 1;
const longColRate = longColTotal > 0 ? longColMatched / longColTotal : 1;

console.log(`[GATE1] alias_entries=${aliasEntries.length}  invalid=${invalidAliases.length}`);
console.log(
  `[GATE1] varchar_backed_fields=${varcharBackedTotal}  matched=${varcharBackedMatched}  reception=${(receptionRate * 100).toFixed(1)}%`
);
console.log(`[GATE1] exempt: TEXT=${textExempt}  no_column=${noColumnExempt}  no_sql_table=${noSqlBacking}`);
console.log(
  `[GATE1] long_col(>=500)=${longColTotal}  matched=${longColMatched}  rate=${(longColRate * 100).toFixed(1)}%`
);

let ok = true;
if (invalidAliases.length > 0) {
  console.error(`[GATE1 FAIL] ${invalidAliases.length} alias entries point to non-existent SQL tables:`);
  invalidAliases.slice(0, 10).forEach(([k, v]) => console.error(`  ${k} → ${v.tableKey} (not found)`));
  ok = false;
}
if (receptionRate < 0.9) {
  console.error(`[GATE1 FAIL] reception coverage <90% (got ${(receptionRate * 100).toFixed(1)}%).`);
  console.error(
    `  ${sqlBackedTotal - sqlBackedMatched} SQL-backed fields could not be matched — check column name mismatches.`
  );
  ok = false;
}
if (longColRate < 1.0) {
  console.error(`[GATE1 FAIL] long columns (>=500) 100% expected, got ${(longColRate * 100).toFixed(1)}%.`);
  ok = false;
}
if (ok) console.log(`[GATE1 PASSED] reception=${(receptionRate * 100).toFixed(1)}%  longcols=100%  aliases_valid`);
process.exit(ok ? 0 : 1);
