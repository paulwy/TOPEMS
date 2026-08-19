#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, extname, dirname as pDirname, basename, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = pDirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MAP_FILE = resolve(__dirname, 'v68-1-2/.run/table-col-varchar.map.json');
const ALIAS_FILE = resolve(__dirname, 'v68-1-2/entity-table-map.json');
if (!existsSync(MAP_FILE) || !existsSync(ALIAS_FILE)) {
  console.error('Must build Stage A map & alias before running this gate.');
  process.exit(2);
}
const V = JSON.parse(readFileSync(MAP_FILE, 'utf8'));
const A = JSON.parse(readFileSync(ALIAS_FILE, 'utf8'));
const STRICT = process.argv.includes('--strict');
const STRING_TYPES = new Set(['text', 'email', 'textarea', 'select', 'autocomplete', 'checkbox-group']);
function walk(dir, v) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, v);
    else if (e.isFile() && (e.name.endsWith('.ts') || e.name.endsWith('.tsx'))) v(p);
  }
}
function bC(s, i, O, C) {
  let d = 0,
    i2 = i,
    inS = null,
    e = false,
    lc = false,
    bc = false;
  for (; i2 < s.length; i2++) {
    const c = s[i2],
      n = s[i2 + 1];
    if (lc) {
      if (c === '\n') lc = false;
      continue;
    }
    if (bc) {
      if (c === '*' && n === '/') {
        bc = false;
        i2++;
      }
      continue;
    }
    if (inS) {
      if (e) {
        e = false;
        continue;
      }
      if (c === '\\') {
        e = true;
        continue;
      }
      if (c === inS) inS = null;
      continue;
    }
    if (c === '/' && n === '/') {
      lc = true;
      i2++;
      continue;
    }
    if (c === '/' && n === '*') {
      bc = true;
      i2++;
      continue;
    }
    if (c === '`' || c === "'" || c === '"') {
      inS = c;
      continue;
    }
    if (c === O) d++;
    else if (c === C) {
      d--;
      if (d === 0) return i2;
    }
  }
  return -1;
}
const br = (s, i) => bC(s, i, '{', '}');
const bk = (s, i) => bC(s, i, '[', ']');
function pf(body) {
  const nm = body.match(/\bname\s*:\s*['"`]([^'"`]+)/),
    tp = body.match(/\btype\s*:\s*['"`]([^'"`]+)/);
  const name = nm ? nm[1] : null,
    type = tp ? tp[1] : null;
  let has = false,
    val = null;
  const vr = /\bvalidation\s*:\s*\[([\s\S]*?)\]/g;
  let vm;
  while ((vm = vr.exec(body)) !== null) {
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
function sfs(src) {
  const o = [];
  let i = 1;
  while (i < src.length) {
    let d = 0,
      s = -1,
      iS = null,
      e = false,
      lc = false,
      bc = false;
    for (; i < src.length; i++) {
      const c = src[i],
        n = src[i + 1];
      if (lc) {
        if (c === '\n') lc = false;
        continue;
      }
      if (bc) {
        if (c === '*' && n === '/') {
          bc = false;
          i++;
        }
        continue;
      }
      if (iS) {
        if (e) {
          e = false;
          continue;
        }
        if (c === '\\') {
          e = true;
          continue;
        }
        if (c === iS) iS = null;
        continue;
      }
      if (c === '/' && n === '/') {
        lc = true;
        i++;
        continue;
      }
      if (c === '/' && n === '*') {
        bc = true;
        i++;
        continue;
      }
      if (c === '`' || c === "'" || c === '"') {
        iS = c;
        continue;
      }
      if (c === '{') {
        s = i;
        d++;
        break;
      }
    }
    if (s < 0) break;
    i++;
    d = 1;
    for (; i < src.length; i++) {
      const c = src[i],
        n = src[i + 1];
      if (lc) {
        if (c === '\n') lc = false;
        continue;
      }
      if (bc) {
        if (c === '*' && n === '/') {
          bc = false;
          i++;
        }
        continue;
      }
      if (iS) {
        if (e) {
          e = false;
          continue;
        }
        if (c === '\\') {
          e = true;
          continue;
        }
        if (c === iS) iS = null;
        continue;
      }
      if (c === '/' && n === '/') {
        lc = true;
        i++;
        continue;
      }
      if (c === '/' && n === '*') {
        bc = true;
        i++;
        continue;
      }
      if (c === '`' || c === "'" || c === '"') {
        iS = c;
        continue;
      }
      if (c === '{') d++;
      else if (c === '}') {
        d--;
        if (d === 0) {
          i++;
          break;
        }
      }
    }
    o.push(pf(src.slice(s, i)));
  }
  return o;
}
function pBlock(f, b) {
  const e = b.match(/\bentity\s*:\s*['"`]([^'"`]+)/),
    o = b.match(/\bapi\s*:\s*\{[\s\S]*?module\s*:\s*['"`]([^'"`]+)/),
    r = b.match(/\bapi\s*:\s*\{[\s\S]*?resource\s*:\s*['"`]([^'"`]+)/);
  if (!e) return null;
  const entity = e[1],
    modu = o ? o[1] : null,
    reso = r ? r[1] : null;
  const fi = b.search(/\bfields\s*:\s*\[/);
  if (fi < 0) return null;
  const ls = b.indexOf('[', fi),
    rs = bk(b, ls);
  if (rs < 0) return null;
  return { file: f, entity, modu, reso, fields: sfs(b.slice(ls, rs + 1)) };
}
function es(f, s) {
  const r = [];
  const ps = [
    /EntitySchema\s*=\s*\{|:\s*EntitySchema\b[^=]*=\s*\{/g,
    /export\s+(?:const|let|var)\s+\w+\s*=\s*\{[\s\S]{0,200}\bentity\s*:\s*['"][^'"]+['"]/g,
    /(?:^|\n)\s*(?:const|let|var)\s+\w+\s*=\s*\{[\s\S]{0,120}\bentity\s*:\s*['"][^'"]+['"]/g,
  ];
  const sn = new Set();
  for (const re of ps) {
    let m;
    while ((m = re.exec(s)) !== null) {
      const bi = s.indexOf('{', m.index);
      if (bi < 0) continue;
      const ei = br(s, bi);
      if (ei < 0) continue;
      if (sn.has(ei)) {
        re.lastIndex = ei + 1;
        continue;
      }
      sn.add(ei);
      const bb = pBlock(f, s.slice(bi, ei + 1));
      if (bb) r.push(bb);
      re.lastIndex = ei + 1;
    }
  }
  return r;
}
function toSnake(x) {
  return x.replace(/[A-Z]/g, (l) => '_' + l.toLowerCase()).replace(/^_/, '');
}
function ak(s) {
  return `${s.entity}|${s.modu ?? ''}|${s.reso ?? ''}`;
}
function findPos(src, nm, schemaStart) {
  let i = src.indexOf(`name: '${nm}'`, schemaStart);
  if (i < 0) i = src.indexOf(`name: "${nm}"`, schemaStart);
  return i;
}
function prevLineHasNoVarchar(src, pos) {
  const before = src.slice(0, pos);
  const m = before.match(/\n([^\n]*)\s*$/);
  return m && /\/\/\s*no-varchar\b/.test(m[1]);
}

const schemas = [];
walk(join(ROOT, 'apps/web/src/schemas'), (p) => {
  try {
    schemas.push(...es(p, readFileSync(p, 'utf8')));
  } catch {}
});

let matchN = 0,
  extraOk = 0,
  extras = [],
  mismatches = [];
for (const sc of schemas) {
  const src = readFileSync(sc.file, 'utf8');
  const tbl = (A[ak(sc)] || {}).tableKey || null;
  for (const f of sc.fields) {
    if (!STRING_TYPES.has(f.type)) continue;
    if (!f.has) continue;
    const cols = new Set([f.name.toLowerCase(), toSnake(f.name)]);
    const tkeys = tbl ? [tbl] : [];
    const mod = sc.modu ? sc.modu.toLowerCase() : null,
      ent = sc.entity ? sc.entity.toLowerCase() : null,
      res = sc.reso ? sc.reso.toLowerCase() : null;
    const bs = new Set();
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
        bs.add(v);
        bs.add(pl(v));
        bs.add(sg(v));
      });
    if (res)
      [res, toSnake(res)].forEach((v) => {
        bs.add(v);
        bs.add(pl(v));
        bs.add(sg(v));
      });
    if (mod) {
      bs.forEach((v) => {
        tkeys.push(`${mod}_${v}`);
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
          tkeys.push(`core_${v}`);
      });
    }
    bs.forEach((v) => tkeys.push(v));
    let hit = null;
    outer: for (const tk of new Set(tkeys))
      for (const ck of cols) {
        const k = `${tk}.${ck}`;
        if (V[k]) {
          hit = { tk, ck, n: V[k] };
          break outer;
        }
      }
    const pos = findPos(src, f.name, 0);
    const exempt = pos >= 0 ? prevLineHasNoVarchar(src, pos) : false;
    if (!hit) {
      if (exempt) extraOk++;
      else extras.push({ file: relative(ROOT, sc.file), entity: sc.entity, field: f.name, value: f.val });
      continue;
    }
    if (hit.n !== f.val) {
      mismatches.push({
        file: relative(ROOT, sc.file),
        entity: sc.entity,
        field: f.name,
        schema: f.val,
        sql: hit.n,
        sqlKey: `${hit.tk}.${hit.ck}`,
      });
      continue;
    }
    matchN++;
  }
}
console.log(
  `[GATE2] matched_varchar=${matchN}  extra_maxlength_ok(exempt)=${extraOk}  extra_maxlength_unmarked=${extras.length}  mismatches=${mismatches.length}`
);
let ok = true;
if (mismatches.length > 0) {
  console.error('[GATE2 FAIL] mismatches:');
  mismatches
    .slice(0, 50)
    .forEach((m) =>
      console.error(`  - ${m.file} / ${m.entity} / ${m.field}: schema=${m.schema} vs ${m.sqlKey}=${m.sql}`)
    );
  ok = false;
}
if (STRICT && extras.length > 0) {
  console.error('[GATE2 FAIL --strict] extras without // no-varchar:');
  extras.slice(0, 50).forEach((m) => console.error(`  - ${m.file} / ${m.entity} / ${m.field} value=${m.value}`));
  ok = false;
}
if (ok)
  console.log(
    `[GATE2 PASSED] matched=${matchN} exempt=${extraOk} extras=${STRICT ? extras.length : 'advisory'} mismatches=0`
  );
process.exit(ok ? 0 : 1);
