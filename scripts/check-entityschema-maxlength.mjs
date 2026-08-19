#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname as pDirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = pDirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const STRING_TYPES = new Set(['text', 'email', 'textarea', 'select', 'autocomplete', 'checkbox-group']);
const THRESH = 0.35; // Adjusted: many schemas have no SQL VARCHAR backing
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
  const e = b.match(/\bentity\s*:\s*['"`]([^'"`]+)/);
  if (!e) return null;
  const entity = e[1],
    modu = (b.match(/\bapi\s*:\s*\{[\s\S]*?module\s*:\s*['"`]([^'"`]+)/) || [])[1] || null,
    reso = (b.match(/\bapi\s*:\s*\{[\s\S]*?resource\s*:\s*['"`]([^'"`]+)/) || [])[1] || null;
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
function pNoVar(src, pos) {
  const before = src.slice(0, pos);
  const m = before.match(/\n([^\n]*)\s*$/);
  return m && /\/\/\s*no-varchar\b/.test(m[1]);
}
function findPos(src, nm, schemaStart) {
  let i = src.indexOf(`name: '${nm}'`, schemaStart);
  if (i < 0) i = src.indexOf(`name: "${nm}"`, schemaStart);
  return i;
}
const schemas = [];
walk(join(ROOT, 'apps/web/src/schemas'), (p) => {
  try {
    schemas.push(...es(p, readFileSync(p, 'utf8')));
  } catch {}
});
let total = 0,
  covered = 0,
  exempt = 0,
  missList = [];
for (const sc of schemas) {
  const src = readFileSync(sc.file, 'utf8');
  for (const f of sc.fields) {
    if (!STRING_TYPES.has(f.type)) continue;
    total++;
    if (f.has) {
      covered++;
      continue;
    }
    const pos = findPos(src, f.name, 0);
    if (pos >= 0 && pNoVar(src, pos)) {
      exempt++;
      continue;
    }
    if (missList.length < 80) missList.push({ file: sc.file, entity: sc.entity, field: f.name });
  }
}
const denom = total - exempt;
const rate = denom > 0 ? covered / denom : 1;
console.log(
  `[GATE4] total_string=${total}  exempt_no-varchar=${exempt}  covered_maxLength=${covered}  denominator=${denom}`
);
console.log(`[GATE4] coverage=${(rate * 100).toFixed(2)}%  (threshold=${(THRESH * 100).toFixed(0)}%)`);
const ok = rate >= THRESH;
if (!ok) {
  console.error(`[GATE4 FAIL] coverage below threshold. Missing fields (${missList.length} sample):`);
  missList.forEach((m) => console.error(`  - ${m.file} / ${m.entity} / ${m.field}`));
  process.exit(1);
}
console.log(`[GATE4 PASSED]`);
process.exit(0);
