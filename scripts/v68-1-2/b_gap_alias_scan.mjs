#!/usr/bin/env node
/**
 * V68.1-2 Stage B — Schema string-field scanner → gap report + alias template
 */
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, extname, dirname as pDirname, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = pDirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const MAP_FILE = join(__dirname, ".run", "table-col-varchar.map.json");
const ALIAS_FILE = join(__dirname, "entity-table-map.json");
const OUT_DIR = join(__dirname, ".run");
const GAP_REPORT = join(OUT_DIR, "gap-report.md");

if (!existsSync(MAP_FILE)) { console.error("Run Stage A first (a_scan_sql.mjs)."); process.exit(2); }
const VARCHAR_MAP = JSON.parse(readFileSync(MAP_FILE, "utf8"));
const ALL_TABLE_KEYS = new Set(Object.keys(VARCHAR_MAP).map(k => k.split(".")[0]));

const STRING_TYPES = new Set(["text","email","textarea","select","autocomplete","checkbox-group"]);

function walk(dir, visitor) { for (const e of readdirSync(dir,{withFileTypes:true})) { const p=join(dir,e.name); if (e.isDirectory()) walk(p,visitor); else if (e.isFile() && (e.name.endsWith(".ts")||e.name.endsWith(".tsx"))) visitor(p); } }
function balancedClose(src, start, openCh, closeCh) {
  let d=0,i=start,inS=null,esc=false,lc=false,bc=false;
  for (;i<src.length;i++) { const ch=src[i],n=src[i+1];
    if (lc){if(ch==="\n")lc=false;continue;}
    if (bc){if(ch==="*"&&n==="/"){bc=false;i++;}continue;}
    if (inS){if(esc){esc=false;continue;}if(ch==="\\"){esc=true;continue;}if(ch===inS)inS=null;continue;}
    if (ch==="/"&&n==="/"){lc=true;i++;continue;}
    if (ch==="/"&&n==="*"){bc=true;i++;continue;}
    if (ch==="'"||ch==='"'||ch==="`"){inS=ch;continue;}
    if (ch===openCh) d++;
    else if (ch===closeCh){d--;if(d===0)return i;}
  } return -1;
}
const braceClose = (s,i) => balancedClose(s,i,"{","}");
const bracketClose = (s,i) => balancedClose(s,i,"[","]");

function parseField(body) {
  const n = body.match(/\bname\s*:\s*['"`]([^'"`]+)/);
  const t = body.match(/\btype\s*:\s*['"`]([^'"`]+)/);
  const name = n?n[1]:null, type = t?t[1]:null;
  let has=false, val=null;
  const vRe = /\bvalidation\s*:\s*\[([\s\S]*?)\]/g; let vm;
  while ((vm = vRe.exec(body)) !== null) {
    const b = vm[1];
    const a = b.match(/\{\s*type\s*:\s*['"`]maxLength['"`]\s*,\s*value\s*:\s*(\d+)/);
    const c = b.match(/value\s*:\s*(\d+)\s*,\s*type\s*:\s*['"`]maxLength['"`]/);
    if (a){has=true;val=parseInt(a[1],10);break;}
    if (c){has=true;val=parseInt(c[1],10);break;}
  }
  return { name, type, has, val };
}
function splitFields(src) {
  const out = []; let i = 1;
  while (i < src.length) {
    let d=0, s=-1, inS=null,esc=false,lc=false,bc=false;
    for (; i < src.length; i++) {
      const ch=src[i],n=src[i+1];
      if (lc){if(ch==="\n")lc=false;continue;}
      if (bc){if(ch==="*"&&n==="/"){bc=false;i++;}continue;}
      if (inS){if(esc){esc=false;continue;}if(ch==="\\"){esc=true;continue;}if(ch===inS)inS=null;continue;}
      if (ch==="/"&&n==="/"){lc=true;i++;continue;}
      if (ch==="/"&&n==="*"){bc=true;i++;continue;}
      if (ch==="'"||ch==='"'||ch==="`"){inS=ch;continue;}
      if (ch==="{"){s=i;d++;break;}
    }
    if (s<0) break; i++; d=1;
    for (; i < src.length; i++) {
      const ch=src[i],n=src[i+1];
      if (lc){if(ch==="\n")lc=false;continue;}
      if (bc){if(ch==="*"&&n==="/"){bc=false;i++;}continue;}
      if (inS){if(esc){esc=false;continue;}if(ch==="\\"){esc=true;continue;}if(ch===inS)inS=null;continue;}
      if (ch==="/"&&n==="/"){lc=true;i++;continue;}
      if (ch==="/"&&n==="*"){bc=true;i++;continue;}
      if (ch==="'"||ch==='"'||ch==="`"){inS=ch;continue;}
      if (ch==="{") d++;
      else if (ch==="}"){d--;if(d===0){i++;break;}}
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
  const entity = e[1], modu = o?o[1]:null, reso = r?r[1]:null;
  const fIdx = block.search(/\bfields\s*:\s*\[/);
  if (fIdx < 0) return null;
  const ls = block.indexOf("[", fIdx); const rs = bracketClose(block, ls);
  if (rs < 0) return null;
  return { file, entity, modu, reso, fields: splitFields(block.slice(ls, rs+1)) };
}
function extractSchemas(file, src) {
  const res = [];
  const patterns = [
    /EntitySchema\s*=\s*\{|:\s*EntitySchema\b[^=]*=\s*\{/g,
    /export\s+(?:const|let|var)\s+\w+\s*=\s*\{[\s\S]{0,200}\bentity\s*:\s*['"][^'"]+['"]/g,
    /(?:^|\n)\s*(?:const|let|var)\s+\w+\s*=\s*\{[\s\S]{0,120}\bentity\s*:\s*['"][^'"]+['"]/g
  ];
  const seen = new Set();
  for (const re of patterns) { let m;
    while ((m = re.exec(src)) !== null) {
      const bi = src.indexOf("{", m.index);
      if (bi < 0) continue;
      const ei = braceClose(src, bi);
      if (ei < 0) continue;
      if (seen.has(ei)) { re.lastIndex = ei+1; continue; }
      seen.add(ei);
      const b = parseBlock(file, src.slice(bi, ei+1));
      if (b) res.push(b);
      re.lastIndex = ei+1;
    }
  }
  return res;
}

// Collect schemas
const schemas = [];
walk(join(ROOT,"apps/web/src/schemas"), (p) => {
  try { schemas.push(...extractSchemas(p, readFileSync(p,"utf8"))); } catch {}
});

const strFields = schemas.flatMap(s => s.fields.map(f => ({schema:s,field:f}))).filter(x => STRING_TYPES.has(x.field.type));
const withM = strFields.filter(x => x.field.has);
const miss = strFields.filter(x => !x.field.has);

// Alias utils
function toSnake(s){return s.replace(/[A-Z]/g, l=>"_"+l.toLowerCase()).replace(/^_/,"");}
function pluralize(s){if(s.endsWith("s"))return s+"es";if(s.endsWith("y")&&!/[aeiou]y$/.test(s))return s.slice(0,-1)+"ies";return s+"s";}
function singularize(s){if(s.endsWith("ies"))return s.slice(0,-3)+"y";if(s.endsWith("es"))return s.slice(0,-2);if(s.endsWith("s")&&!s.endsWith("ss"))return s.slice(0,-1);return s;}
function guessTableKeys(s){
  const out = new Set();
  const mod = s.modu?s.modu.toLowerCase():null, ent=s.entity?s.entity.toLowerCase():null, res=s.reso?s.reso.toLowerCase():null;
  const base = new Set();
  if (ent) [ent, toSnake(ent)].forEach(v=>{base.add(v);base.add(pluralize(v));base.add(singularize(v));});
  if (res) [res, toSnake(res)].forEach(v=>{base.add(v);base.add(pluralize(v));base.add(singularize(v));});
  if (mod) {
    base.forEach(v => out.add(`${mod}_${v}`));
    if (new Set(["admin","tenant","user","role","permission","plugin","billing","finance","accounting","workflow","menu","notification","chat","guide","dict","file","migration","help","portal","core"]).has(mod)) {
      base.forEach(v => { out.add(`core_${v}`); out.add(`${mod}_${v}`); });
    }
  }
  base.forEach(v => out.add(v));
  return [...out];
}
function guessCols(fn){return [...new Set([fn.toLowerCase(), toSnake(fn)])];}

// Load alias (if any) to augment guesses
const ALIAS = existsSync(ALIAS_FILE) ? JSON.parse(readFileSync(ALIAS_FILE,"utf8")) : {};
function aliasKey(s){return `${s.entity}|${s.modu??""}|${s.reso??""}`;}

const matched=[], umm=[], amb=[];
for (const m of miss) {
  const tks = new Set(guessTableKeys(m.schema));
  const a = ALIAS[aliasKey(m.schema)];
  if (a && a.tableKey) tks.add(a.tableKey);
  const cands = guessCols(m.field.name);
  const hits = [];
  for (const tk of tks) for (const ck of cands) {
    const k = `${tk}.${ck}`;
    if (VARCHAR_MAP[k]) { hits.push({tKey:tk,cKey:ck,n:VARCHAR_MAP[k]}); if (hits.length>=3) break; }
    if (hits.length>=3) break;
  }
  if (hits.length===0) umm.push({...m});
  else if (hits.length===1) matched.push({...m,match:hits[0]});
  else amb.push({...m,hits});
}

// --- Write alias template only if not exists ---
if (!existsSync(ALIAS_FILE)) {
  const tmpl = {};
  const uniq = new Map();
  for (const s of schemas) { const k = aliasKey(s); if (!uniq.has(k)) uniq.set(k, s); }
  const ordered = [...uniq.entries()].sort();
  for (const [k, s] of ordered) {
    tmpl[k] = {
      _comment: `file=${s.file.replace(ROOT+"/","")}  entity=${s.entity}  modu=${s.modu??""}  resource=${s.reso??""}`,
      tableKey: null,
    };
  }
  tmpl["_ALL_TABLE_KEYS"] = [...ALL_TABLE_KEYS].sort();
  writeFileSync(ALIAS_FILE, JSON.stringify(tmpl, null, 2) + "\n", "utf8");
  console.log(`[Stage B] wrote alias template with ${ordered.length} entries → ${ALIAS_FILE}`);
}

// --- Write gap-report.md ---
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const lines = [];
lines.push(`# V68.1-2 Gap Report (generated by Stage B)\n`);
lines.push(`| Metric | Value |`);
lines.push(`|---|---|`);
lines.push(`| EntitySchemas | ${schemas.length} |`);
lines.push(`| String-type fields total | ${strFields.length} |`);
lines.push(`| maxLength already covered | ${withM.length} (${((withM.length/Math.max(1,strFields.length))*100).toFixed(1)}%) |`);
lines.push(`| **Missing** | **${miss.length}** |`);
lines.push(`|   → auto-matched (exactly 1 hit) | ${matched.length} |`);
lines.push(`|   → ambiguous (2+ hits) | ${amb.length} |`);
lines.push(`|   → UNMATCHED (0 hits) | ${umm.length} |\n`);
lines.push(`## 1. Auto-matched (${matched.length}) — ready to patch\n`);
matched.slice(0,200).forEach(r => lines.push(`- \`${basename(r.schema.file)}\` / entity=\`${r.schema.entity}\` / field=\`${r.field.name}\` → \`${r.match.tKey}.${r.match.cKey}\` VARCHAR(**${r.match.n}**)`));
if (matched.length>200) lines.push(`\n_... and ${matched.length-200} more_`);
lines.push(`\n## 2. Ambiguous (${amb.length}) — pick first or fill alias to disambiguate\n`);
amb.slice(0,50).forEach(r => { lines.push(`- \`${basename(r.schema.file)}\` / field=\`${r.field.name}\``); r.hits.forEach(h => lines.push(`  - candidate: \`${h.tKey}.${h.cKey}\` VARCHAR(${h.n})`)); });
lines.push(`\n## 3. UNMATCHED (${umm.length}) — MUST fill entity-table-map.json\n`);
const bySchema = new Map();
umm.forEach(r => { const k = aliasKey(r.schema); if (!bySchema.has(k)) bySchema.set(k, { schema: r.schema, fields: [] }); bySchema.get(k).fields.push(r.field.name); });
[...bySchema.entries()].sort().forEach(([k,v]) => {
  lines.push(`- **${k}** → \`${basename(v.schema.file)}\` (${v.fields.length} fields: ${v.fields.slice(0,6).map(n=>"`"+n+"`").join(", ")}${v.fields.length>6?", …":""})`);
});
lines.push(`\n## 4. Table keys available (${[...ALL_TABLE_KEYS].length}) — for alias lookup\n`);
lines.push("```");
[...ALL_TABLE_KEYS].sort().forEach(t => lines.push(t));
lines.push("```\n");
writeFileSync(GAP_REPORT, lines.join("\n"), "utf8");

console.log(`[Stage B] schemas=${schemas.length}  strings=${strFields.length}  missing=${miss.length}`);
console.log(`            matched=${matched.length}  ambiguous=${amb.length}  unmatched=${umm.length}`);
console.log(`            gap report: ${GAP_REPORT}`);
console.log(`            alias file: ${ALIAS_FILE}`);
process.exit(0);
