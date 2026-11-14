#!/usr/bin/env node
// decode-contract 扫描：交叉比对 prod 列目录与 Rust 侧 sqlx 解码类型。
//
// 覆盖面：
//   1) 动态 `query_as::<_, Struct>`（无编译期类型校验）；
//   2) 动态 `Row::try_get::<T, _>("col")` / `row.get::<T, _>("col")`；
//   3) 动态 `query_scalar::<_, T>`。
// `query!` / `query_as!` 宏路径由 SQLX_OFFLINE 编译门禁保证，不在本脚本范围。
//
// 用法：
//   1) 生成列目录（只读，第 5/6 列可空性与 relkind 用于 medium 分级）：
//      ssh <host> "psql -d topems_prod -tA -F'|' -c \"SELECT n.nspname, c.relname,
//        a.attname, format_type(a.atttypid,a.atttypmod), a.attnotnull, c.relkind
//        FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
//        JOIN pg_namespace n ON n.oid=c.relnamespace
//        WHERE c.relkind IN ('r','p','v','m') AND a.attnum>0 AND NOT a.attisdropped
//        AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')\"" \
//        > /tmp/prod_cols.psv
//   2) node scripts/ci/check-decode-contract.mjs /tmp/prod_cols.psv
//
// 输出：`risk|file:line|subject:RustType|table.column:DBType|reason`
// 退出码：缺少列目录时 exit 2；扫描命中项默认仅报告，不改变退出码（high 需人工复核后再修）。
// 阻断语义：pre-push 包装层（lefthook decode-contract）在缺少 /tmp/prod_cols.psv 且本次变更
//           涉及 svc/*/src/modules/**.rs 时 exit 1，避免“缺少输入”被当成通过。
//
// 已知边界（保守跳过，不会误报）：
//   - 解码列名不是字面量（变量/拼接）无法定位；
//   - 无法在同一函数（或其调用方的 SQL）内找到查询的解码点计入 unmapped；
//   - 别名表达式解析为启发式（聚合/CAST/THEN 分支取最后一个可匹配列）。

import fs from 'node:fs';
import path from 'node:path';

const catalogPath = process.argv[2] || '/tmp/prod_cols.psv';
if (!fs.existsSync(catalogPath)) {
  console.error(`缺少列目录 ${catalogPath}，请按文件头注释生成`);
  process.exit(2);
}

const catalog = new Map();
const tablesByName = new Map();
for (const line of fs.readFileSync(catalogPath, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const parts = line.split('|');
  if (parts.length < 4) continue;
  const [schema, table, col, type, notnull, relkind] = parts;
  const key = `${schema}.${table}`;
  if (!catalog.has(key)) catalog.set(key, new Map());
  catalog.get(key).set(col.toLowerCase(), {
    type,
    notNull: notnull === undefined || notnull === '' ? null : notnull === 't' || notnull === 'true',
    kind: relkind || 'r',
  });
  const tkey = table.toLowerCase();
  if (!tablesByName.has(tkey)) tablesByName.set(tkey, []);
  tablesByName.get(tkey).push(key);
}

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'target' || e.name === 'node_modules') continue;
      walk(p, out);
    } else if (e.name.endsWith('.rs')) out.push(p);
  }
  return out;
}

const norm = (t) => t.replace(/\s+/g, ' ').trim();

function dbCat(t0) {
  const t = t0.toLowerCase();
  if (/^(numeric|decimal)/.test(t)) return 'numeric';
  if (/^(double precision|float8|real|float4)/.test(t)) return 'float';
  if (/^(bigint|int8)/.test(t)) return 'int8';
  if (/^(integer|int4|smallint|int2)/.test(t)) return 'int';
  if (/^(character varying|varchar|character|char|text|name|bpchar)/.test(t)) return 'text';
  if (/^uuid/.test(t)) return 'uuid';
  if (/^(jsonb|json)/.test(t)) return 'json';
  if (/^(boolean|bool)/.test(t)) return 'bool';
  return 'other';
}

function rustCat(rt) {
  const t = rt.replace(/Option<|>|sqlx::types::|rust_decimal::|std::|::/g, '').trim();
  if (/^f64$/i.test(t) || /^f32$/i.test(t)) return 'float';
  if (/^i32$/i.test(t) || /^u32$/i.test(t) || /^i16$/i.test(t) || /^u16$/i.test(t)) return 'int32';
  if (/^i64$/i.test(t) || /^u64$/i.test(t)) return 'int64';
  if (/^String$/i.test(t)) return 'text';
  if (/^BigDecimal$/i.test(t) || /^Decimal$/i.test(t)) return 'numeric';
  if (/^Uuid$/i.test(t)) return 'uuid';
  if (/^Value$/i.test(rt)) return 'json';
  if (/^bool$/i.test(t)) return 'bool';
  return null;
}

const isOpt = (rt) => /^Option<\s*[^>]+\s*>$/.test(norm(rt));

function fieldsOf(src, structName) {
  const m = new RegExp(`struct\\s+${structName}\\s*\\{`).exec(src);
  if (!m) return null;
  let i = m.index + m[0].length;
  let depth = 1;
  let body = '';
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth++;
    if (src[i] === '}') depth--;
    body += src[i++];
  }
  const out = [];
  for (const raw of body.split('\n')) {
    const line = raw.replace(/\/\/.*$/, '').trim();
    const fm = line.match(/^(?:pub\s+)?([A-Za-z0-9_]+)\s*:\s*([^,]+),?$/);
    if (fm) out.push({ name: fm[1], type: norm(fm[2]) });
  }
  return out;
}

function literalAt(src, start) {
  const rest = src.slice(start);
  const r = rest.match(/r#*"/);
  const q = rest.match(/"/);
  if (r && (!q || r.index <= q.index)) {
    const hashes = r[0].length - 2;
    const open = r.index + r[0].length;
    const close = '"' + '#'.repeat(hashes);
    const end = rest.indexOf(close, open);
    return rest.slice(open, end);
  }
  if (q) {
    let j = q.index + 1;
    let out = '';
    while (j < rest.length) {
      if (rest[j] === '\\') { out += rest[j + 1]; j += 2; continue; }
      if (rest[j] === '"') break;
      out += rest[j]; j++;
    }
    return out;
  }
  return null;
}

// ---- 词法遮罩：注释/字符串/字符字面量替换为空格，保留换行与偏移 ----
function buildMask(src) {
  const mask = src.split('');
  const literals = [];
  const blank = (from, to) => {
    for (let k = from; k < to; k++) if (mask[k] !== '\n') mask[k] = ' ';
  };
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') {
      const e = src.indexOf('\n', i);
      const end = e < 0 ? src.length : e;
      blank(i, end);
      i = end;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const e = src.indexOf('*/', i + 2);
      const end = e < 0 ? src.length : e + 2;
      blank(i, end);
      i = end;
      continue;
    }
    const prev = i > 0 ? src[i - 1] : '';
    if (c === 'r' && /[A-Za-z0-9_]/.test(prev) === false) {
      const m = /^r(#*)"/.exec(src.slice(i, i + 8));
      if (m) {
        const hashes = m[1].length;
        const open = i + m[0].length;
        const close = '"' + '#'.repeat(hashes);
        const e = src.indexOf(close, open);
        const end = e < 0 ? src.length : e + close.length;
        literals.push({ start: i, end, text: src.slice(open, e < 0 ? src.length : e) });
        blank(i, end);
        i = end;
        continue;
      }
    }
    if (c === '"') {
      let j = i + 1;
      while (j < src.length) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === '"') break;
        j++;
      }
      const end = Math.min(j + 1, src.length);
      literals.push({ start: i, end, text: src.slice(i + 1, j) });
      blank(i, end);
      i = end;
      continue;
    }
    if (c === "'") {
      const m = /^'(?:\\.|[^\\'])'/.exec(src.slice(i, i + 5));
      if (m) {
        blank(i, i + m[0].length);
        i += m[0].length;
        continue;
      }
    }
    i++;
  }
  return { mask: mask.join(''), literals };
}

function matchBrace(mask, open) {
  let depth = 0;
  for (let i = open; i < mask.length; i++) {
    if (mask[i] === '{') depth++;
    else if (mask[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return mask.length;
}

function collectFns(mask) {
  const out = [];
  const re = /\bfn\s+([A-Za-z0-9_]+)\s*(?:<[^<>]*>)?\s*\(/g;
  let m;
  while ((m = re.exec(mask))) {
    // 找到参数列表右括号
    let i = mask.indexOf('(', m.index);
    let depth = 0;
    let closeParen = -1;
    for (; i < mask.length; i++) {
      if (mask[i] === '(') depth++;
      else if (mask[i] === ')') {
        depth--;
        if (depth === 0) { closeParen = i; break; }
      }
    }
    if (closeParen < 0) continue;
    const brace = mask.indexOf('{', closeParen);
    if (brace < 0) continue;
    const end = matchBrace(mask, brace);
    out.push({ name: m[1], start: m.index, end });
  }
  return out;
}

function fnAt(fns, pos) {
  let lo = 0;
  let hi = fns.length - 1;
  let res = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const f = fns[mid];
    if (pos < f.start) hi = mid - 1;
    else if (pos > f.end) lo = mid + 1;
    else { res = f; break; }
  }
  return res;
}

const svcSchema = {
  rd: 'rs', 'unified-core': 'unified_core', communication: 'communication', crm: 'crm',
  mes: 'mes', erp: 'erp', scm: 'scm', pm: 'pm', wms: 'wms', qms: 'qms', srm: 'srm',
  pdm: 'pdm', hrm: 'hrm', lims: 'lims', ehs: 'ehs', mobile: 'mobile',
  integration: 'integration', finance: 'finance', im: 'im', mail: 'mail', bi: 'bi',
  ai: 'ai', portal: 'portal', gis: 'gis', rs: 'rs',
};

const files = [];
if (fs.existsSync('svc')) walk('svc', files);
if (fs.existsSync('lib')) walk('lib', files);

// 展开 `const COLS: &str = "..."` 形式的列清单常量（如 `SELECT {PRODUCT_COLS} ...`），
// 否则 cast 与真实列类型都会被 `{PLACEHOLDER}` 遮住，产生误报/漏报。
const constMap = new Map();
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const re = /const\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*&str\s*=\s*"((?:[^"\\]|\\.)*)"/g;
  let cm;
  while ((cm = re.exec(src))) constMap.set(cm[1], cm[2].replace(/\\"/g, '"'));
}
const expandConsts = (text) =>
  text.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (m, name) => constMap.get(name) ?? m);

// ---------- 查询分析（query_as 静态结构与动态解码共用） ----------
function tablesIn(q, preferred) {
  const tables = [];
  const tre = /(?:FROM|JOIN|UPDATE|INTO)\s+((?:[a-zA-Z_][a-zA-Z0-9_]*\.)?[a-zA-Z_][a-zA-Z0-9_]*)/gi;
  let tm;
  while ((tm = tre.exec(q))) {
    const raw = tm[1];
    if (/^\(|select|values|unnest|generate_series|jsonb_|lateral/i.test(raw)) continue;
    if (raw.includes('.')) {
      if (catalog.has(raw.toLowerCase())) tables.push(raw.toLowerCase());
    } else if (tablesByName.has(raw.toLowerCase())) {
      const cands = tablesByName.get(raw.toLowerCase());
      // 未限定 schema 时优先本服务 schema，避免跨 schema 同名表误判
      const pref = preferred ? cands.find((c) => c.startsWith(preferred + '.')) : undefined;
      tables.push(...(pref ? [pref] : cands));
    }
  }
  return tables;
}

function colInfo(table, name) {
  const cols = catalog.get(table);
  if (!cols) return null;
  return cols.get(name.toLowerCase()) || null;
}

// 回溯到 `AS <name>` 前的表达式（遇到顶层逗号/换行截止）
function exprBefore(q, idx) {
  let i = idx;
  let depth = 0;
  while (i > 0) {
    const ch = q[i - 1];
    if (ch === ')') depth++;
    else if (ch === '(') {
      if (depth > 0) depth--;
      else break;
    } else if (depth === 0 && (ch === ',' || ch === '\n')) {
      break;
    }
    i--;
  }
  return q.slice(i, idx).trim();
}

function words(s) {
  return s.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
}

const CAST_CAT = {
  float8: 'float', 'double precision': 'float', float4: 'float', real: 'float',
  numeric: 'numeric', decimal: 'numeric',
  int8: 'int8', bigint: 'int8',
  int4: 'int', integer: 'int', int2: 'int', smallint: 'int',
  text: 'text', varchar: 'text', uuid: 'uuid', jsonb: 'json', json: 'json', boolean: 'bool',
};

function castIn(expr) {
  let last = null;
  const re = /::\s*([a-zA-Z_][a-zA-Z0-9_ ]*)/g;
  let m;
  while ((m = re.exec(expr))) {
    const key = m[1].trim().toLowerCase();
    if (CAST_CAT[key]) last = { type: CAST_CAT[key], key };
  }
  return last;
}

const SKIP_WORDS = new Set([
  'SUM', 'AVG', 'MAX', 'MIN', 'COUNT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'COALESCE', 'CAST', 'AS', 'EXTRACT', 'TO_CHAR', 'DATE_PART', 'NULLIF', 'ROUND',
]);

// 只取 SELECT 列表 / RETURNING 列表，避免把 WHERE、INSERT 列清单误当解码来源。
function selectScope(q) {
  const r = /\bRETURNING\b/i.exec(q);
  if (r) return q.slice(r.index + r[0].length);
  const s = /\bSELECT\b/i.exec(q);
  if (!s) return '';
  const f = /\bFROM\b/i.exec(q.slice(s.index));
  const end = f ? s.index + f.index : q.length;
  return q.slice(s.index + s[0].length, end);
}

// 解析解码目标列。strength=strong 表示类型可由列/CAST/聚合直接推出；
// weak 表示表达式（EXTRACT/拼接/日期运算等）推断不可靠，只作 medium 提示。
function resolveTarget(q, tables, name) {
  const scope = selectScope(q);
  // 解码名必须真的出现在该查询的选择列表里（别名或裸列），否则属于跨查询误关联
  if (!scope || !new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(scope)) {
    return { col: null, expr: name, cast: null, agg: null, info: null, strength: 'weak' };
  }
  const aliasRe = new RegExp(`\\bAS\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  const am = aliasRe.exec(scope);
  let expr = name;
  if (am) {
    const e = exprBefore(scope, am.index);
    if (e) expr = e;
  } else {
    // 无 AS 别名时，识别 `col::type` / `CAST(col AS type)` 内联 cast
    const inline = new RegExp(`\\b${name}\\s*::\\s*([a-zA-Z_][a-zA-Z0-9_ ]*)`, 'i').exec(scope);
    const casted = new RegExp(`CAST\\s*\\(\\s*${name}\\s+AS\\s+([a-zA-Z_][a-zA-Z0-9_ ]*)`, 'i').exec(scope);
    if (inline) expr = `${name}::${inline[1].trim()}`;
    else if (casted) expr = `${name}::${casted[1].trim()}`;
  }
  const cleaned = expr.replace(/^SELECT\s+/i, '').trim();
  const cast = castIn(cleaned);
  const agg = ((/^(COUNT|SUM|AVG|MAX|MIN)\s*\(/i.exec(cleaned) || [])[1] || '').toUpperCase() || null;

  let base = null;
  let strength = 'weak';
  const plain = /^(?:[A-Za-z_][A-Za-z0-9_]*\.)?[A-Za-z_][A-Za-z0-9_]*$/.test(cleaned);
  if (plain) {
    base = cleaned.split('.').pop();
    strength = 'strong';
  } else if (cast) {
    const before = cleaned.slice(0, cleaned.indexOf('::'));
    const w = words(before).filter((x) => !SKIP_WORDS.has(x.toUpperCase()));
    if (w.length === 1) base = w[0];
    strength = 'strong';
  } else if (agg) {
    const open = cleaned.indexOf('(');
    const close = cleaned.lastIndexOf(')');
    const inner = close > open ? cleaned.slice(open + 1, close).trim() : '';
    const thenM = /\bTHEN\s+([A-Za-z_][A-Za-z0-9_.]*)/i.exec(inner);
    if (thenM) {
      base = thenM[1].split('.').pop();
      strength = 'strong';
    } else if (/^(?:[A-Za-z_][A-Za-z0-9_]*\.)?[A-Za-z_][A-Za-z0-9_]*$/.test(inner)) {
      base = inner.split('.').pop();
      strength = 'strong';
    } else if (inner === '*') {
      strength = 'strong';
    }
  }

  if (!base) {
    if (strength === 'strong') return { col: null, expr: cleaned, cast, agg, info: null, strength };
    return { col: null, expr: cleaned, cast, agg, info: null, strength: 'weak' };
  }
  let info = null;
  let table = null;
  for (const t of tables) {
    const ci = colInfo(t, base);
    if (ci) { info = ci; table = t; break; }
  }
  if (!info) strength = 'weak';
  return { col: base, table, expr: cleaned, cast, agg, info, strength };
}

function effectiveCat(target) {
  if (target.cast) return target.cast.type;
  if (target.agg === 'COUNT') return 'int8';
  if (!target.info) return null;
  const dc = dbCat(target.info.type);
  if (target.agg === 'SUM' || target.agg === 'AVG') {
    return dc === 'numeric' ? 'numeric' : dc === 'float' ? 'float' : 'int8';
  }
  return dc;
}

function classify(code, target, rustType) {
  const rc = rustCat(rustType);
  if (!rc) return null;
  const dc = effectiveCat(target);
  if (!dc) return null;
  if (target.strength !== 'strong') {
    return { risk: 'medium', why: `表达式类型推断不确定（${target.expr}），需人工复核` };
  }
  const nullable = target.info ? target.info.notNull === false && target.info.kind === 'r' : false;
  const opt = isOpt(rustType);
  const high = (why) => ({ risk: 'high', why });
  switch (rc) {
    case 'float':
      if (dc === 'float') break;
      return high(`f64/f32 只解 FLOAT4/FLOAT8，DB 为 ${dc} 需显式 ::float8 或改类型`);
    case 'int32':
      if (dc === 'int') break;
      return high(`i32/u32/i16 只解 INT2/INT4，DB 为 ${dc}`);
    case 'int64':
      if (dc === 'int' || dc === 'int8') break;
      return high(`i64/u64 只解 INT4/INT8，DB 为 ${dc}（NUMERIC 需显式 ::bigint 或改 BigDecimal）`);
    case 'numeric':
      if (dc === 'numeric') break;
      return high(`BigDecimal/Decimal 只解 NUMERIC，DB 为 ${dc}`);
    case 'text':
      if (dc === 'text') break;
      return high(`String 只解 TEXT 系，DB 为 ${dc}（UUID/JSONB/NUMERIC 会 ColumnDecode）`);
    case 'uuid':
      if (dc === 'uuid') break;
      return high(`Uuid 只解 UUID，DB 为 ${dc}`);
    case 'json':
      if (dc === 'json') break;
      return high(`JSON Value 只解 JSON/JSONB，DB 为 ${dc}`);
    case 'bool':
      if (dc === 'bool') break;
      return high(`bool 只解 BOOLEAN，DB 为 ${dc}`);
    default:
      return null;
  }
  if (nullable && !opt) {
    return { risk: 'medium', why: 'DB 列可空但 Rust 非 Option，遇 NULL 会 ColumnDecode（现有 .ok() 会静默为 null）' };
  }
  return null;
}

const lineAt = (src, pos) => src.slice(0, pos).split('\n').length;

const findings = [];
const unmapped = [];
const noCatalog = [];
const stats = { dynamicPoints: 0, mappedPoints: 0, unmappedPoints: 0, noCatalogPoints: 0, castSafe: 0 };

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const { mask, literals } = buildMask(src);
  const fns = collectFns(mask);
  const preferred = svcSchema[file.split('/')[1]];
  const sqlLits = literals
    .filter((l) => /\b(SELECT|INSERT|UPDATE|DELETE)\b/i.test(l.text))
    .map((l) => ({ ...l, text: expandConsts(l.text) }));
  const sqlOf = (fn) => sqlLits.filter((l) => l.start >= fn.start && l.start <= fn.end);

  // ---- 1) query_as::<_, Struct>（原逻辑） ----
  const reAs = /query_as::<[^,>]*,\s*([A-Za-z0-9_]+)\s*>/g;
  let m;
  while ((m = reAs.exec(src))) {
    const structName = m[1];
    const rawQ = literalAt(src, m.index + m[0].length);
    if (!rawQ) continue;
    const q = expandConsts(rawQ);
    const fields = fieldsOf(src, structName);
    if (!fields) continue;
    const tables = tablesIn(q);
    if (!tables.length) continue;
    const line = lineAt(src, m.index);
    for (const f of fields) {
      const rc = rustCat(f.type);
      if (!rc) continue;
      const esc = f.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!new RegExp(`\\b${esc}\\b`, 'i').test(q)) continue;
      const target = resolveTarget(q, tables, f.name);
      if (!target.col) continue;
      const res = classify(rc, target, f.type);
      if (!res) continue;
      findings.push({
        risk: res.risk,
        file,
        line,
        subject: `${structName}.${f.name}`,
        rust: f.type,
        db: `${target.table}.${target.col}`,
        dbType: target.cast ? `::${target.cast.key}` : target.info?.type || '?',
        why: res.why,
        origin: 'query_as',
      });
    }
  }

  // ---- 2) 动态 try_get / get 解码点 ----
  const decoders = [];
  const dre = /(?:try_get|get)\s*::<\s*((?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)+?)\s*,\s*_\s*>\s*\(\s*"([A-Za-z0-9_]+)"|(?:try_get|get)\s*::<\s*((?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)+?)\s*>\s*\(\s*"([A-Za-z0-9_]+)"/g;
  let dm;
  while ((dm = dre.exec(src))) {
    const rustType = dm[1] || dm[3];
    const colName = dm[2] || dm[4];
    stats.dynamicPoints++;
    decoders.push({ pos: dm.index, rustType, colName });
  }

  // 2b) 类型标注式推断解码：`let x: T = row.get("col")`（无 turbofish，易被遗漏）
  const ire =
    /let\s+[A-Za-z_][A-Za-z0-9_]*\s*:\s*((?:[A-Za-z0-9_():<>,&\s])+?)\s*=\s*(?:&)?(?:row|r|rec|record|pg_row|sql_row)\s*\.(?:try_get|get)\s*\(\s*"([A-Za-z0-9_]+)"\s*\)/g;
  let im;
  while ((im = ire.exec(src))) {
    stats.dynamicPoints++;
    decoders.push({ pos: im.index, rustType: norm(im[1]), colName: im[2] });
  }

  // ---- 3) query_scalar::<_, T> ----
  const scalarRe = /query_scalar\s*::<\s*_\s*,\s*((?:[^<>]|<(?:[^<>]*?)>)+?)\s*>/g;
  let sm;
  while ((sm = scalarRe.exec(mask))) {
    const rustType = src.slice(sm.index, sm.index + sm[0].length).match(/query_scalar\s*::<\s*_\s*,\s*((?:[^<>]|<(?:[^<>]*?)>)+?)\s*>/)?.[1];
    const lit = sqlLits.find((l) => l.start > sm.index && l.start < sm.index + 400);
    if (!lit) continue;
    // 中间夹杂 `let ... = format!(...)` 说明该字面量属于后续动态 SQL，不是本 scalar 的查询
    if (/\blet\b/.test(src.slice(sm.index + sm[0].length, lit.start))) continue;
    const q = lit.text;
    const sel = q.match(/SELECT\s+([^]*?)\s+FROM/i);
    const ret = q.match(/RETURNING\s+([^]*)$/i);
    let expr = null;
    if (sel) expr = sel[1].split(',')[0].trim();
    else if (ret) expr = ret[1].split(',')[0].trim();
    if (!expr) continue;
    const name = (/^(?:[A-Za-z_][A-Za-z0-9_]*\.)?([A-Za-z_][A-Za-z0-9_]*)$/.exec(expr) || [])[1];
    if (!name) continue;
    stats.dynamicPoints++;
    const fn = fnAt(fns, sm.index);
    decoders.push({ pos: sm.index, rustType, colName: name, fnOverride: fn, sqlOverride: q });
  }

  // ---- 4) 映射解码点到 SQL：同函数，或 helper 的调用方函数 ----
  const callersOf = new Map();
  const needCallers = new Set();
  for (const d of decoders) {
    if (d.sqlOverride) continue;
    const fn = fnAt(fns, d.pos);
    if (!fn) continue;
    if (!sqlOf(fn).length) needCallers.add(fn.name);
  }
  if (needCallers.size) {
    const cre = /\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
    let cm;
    while ((cm = cre.exec(mask))) {
      if (!needCallers.has(cm[1])) continue;
      const fn = fnAt(fns, cm.index);
      if (!fn || fn.name === cm[1]) continue;
      if (!callersOf.has(cm[1])) callersOf.set(cm[1], []);
      callersOf.get(cm[1]).push(fn);
    }
  }

  for (const d of decoders) {
    let queries = [];
    let anchor = null;
    let fallback = false;
    const escCol = d.colName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (d.sqlOverride) {
      queries = [d.sqlOverride];
      anchor = d.fnOverride || fnAt(fns, d.pos);
    } else {
      const fn = fnAt(fns, d.pos);
      if (!fn) {
        stats.unmappedPoints++;
        unmapped.push({ file, line: lineAt(src, d.pos), subject: d.colName, rust: d.rustType, why: '解码点不在函数内（顶层/闭包）' });
        continue;
      }
      anchor = fn;
      const own = sqlOf(fn);
      if (own.length) {
        // 多个语句时，优先取真正输出该列的那条（含 `AS <name>`，或 SELECT/RETURNING）
        const cands = own.filter((l) => l.start <= d.pos);
        const outRe = new RegExp(`\\bAS\\s+${escCol}\\b`, 'i');
        const outLit = cands.slice().reverse().find((l) => outRe.test(l.text));
        const selLit = cands
          .slice()
          .reverse()
          .find((l) => /^[^]*?(SELECT|RETURNING)/i.test(l.text) && new RegExp(`\\b${escCol}\\b`, 'i').test(l.text));
        const prev = outLit || selLit || cands[cands.length - 1];
        queries = [prev ? prev.text : own[own.length - 1].text];
      } else {
        const cfs = callersOf.get(fn.name) || [];
        // 只取会产生行集的语句（SELECT 或 INSERT/UPDATE ... RETURNING），跳过 INSERT 列清单
        for (const cf of cfs) {
          for (const l of sqlOf(cf)) {
            if (/\bRETURNING\b/i.test(l.text) || /\bSELECT\b/i.test(l.text)) queries.push(l.text);
          }
        }
        // 无同文件调用方时的兜底：用同文件全部含该列的 SELECT/RETURNING（仅在唯一目标时采信）
        if (!queries.length) {
          const cands = sqlLits.filter(
            (l) => /^[^]*?(SELECT|RETURNING)/i.test(l.text) && new RegExp(`\\b${escCol}\\b`, 'i').test(l.text)
          );
          if (cands.length) {
            queries = cands.map((l) => l.text);
            fallback = true;
          }
        }
      }
    }
    if (!queries.length) {
      stats.unmappedPoints++;
      unmapped.push({ file, line: lineAt(src, d.pos), subject: d.colName, rust: d.rustType, why: 'helper 无调用方 SQL，且同文件无含该列的 SELECT/RETURNING' });
      continue;
    }
    if (fallback) {
      const keys = new Set();
      for (const q of queries) {
        const tables = tablesIn(q);
        if (!tables.length) continue;
        const target = resolveTarget(q, tables, d.colName);
        if (target.col) keys.add(`${target.table}.${target.col}`);
      }
      if (keys.size !== 1) {
        stats.unmappedPoints++;
        unmapped.push({ file, line: lineAt(src, d.pos), subject: d.colName, rust: d.rustType, why: `同文件兜底候选歧义（${keys.size} 个目标列）` });
        continue;
      }
    }

    // 同一列在多个查询中的类型取并集，任一不一致即报告
    let resolvedAny = false;
    const seen = new Set();
    for (const q of queries) {
      const tables = tablesIn(q);
      if (!tables.length) continue;
      const target = resolveTarget(q, tables, d.colName);
      if (!target.col) continue;
      resolvedAny = true;
      const key = `${target.table}.${target.col}|${target.cast?.type || ''}|${target.agg || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const res = classify(rustCat(d.rustType), target, d.rustType);
      if (!res) continue;
      if (res.risk === 'high' && target.cast) stats.castSafe++;
      const aliasNote = d.colName !== target.col ? `（别名 ${d.colName}）` : '';
      findings.push({
        risk: res.risk,
        file,
        line: lineAt(src, d.pos),
        subject: `${anchor ? anchor.name + '()' : 'decode'}.${d.colName}`,
        rust: d.rustType,
        db: `${target.table}.${target.col}${aliasNote}`,
        dbType: target.cast ? `::${target.cast.key}` : target.info?.type || '?',
        why: res.why,
        origin: d.sqlOverride ? 'query_scalar' : 'try_get',
      });
    }
    if (resolvedAny) {
      stats.mappedPoints++;
    } else {
      // 已找到 SQL 但列类型无法由 prod 目录解析：单独计数并逐条标注原因，
      // 既不算「未定位」（SQL 已定位），也不静默丢弃。
      stats.noCatalogPoints++;
      const qtext = queries.join('\n');
      let why = '动态列名/跨 crate 映射（SQL 中未出现该列）';
      if (/\bWITH\b/i.test(qtext)) why = 'CTE/子查询动态别名';
      else if (!tablesIn(qtext, preferred).length) why = '表未限定或 prod 目录无同名表（宏包装/跨 schema）';
      else if (new RegExp(`\\bAS\\s+${escCol}\\b`, 'i').test(qtext)) why = '表达式/聚合/函数别名（目录无列类型）';
      noCatalog.push({ file, line: lineAt(src, d.pos), subject: d.colName, rust: d.rustType, why });
    }
  }
}

const uniq = new Map();
for (const f of findings) uniq.set(`${f.file}|${f.line}|${f.subject}|${f.db}`, f);
const list = [...uniq.values()].sort((a, b) => (a.risk === b.risk ? (a.file + a.line).localeCompare(b.file + b.line) : a.risk === 'high' ? -1 : 1));
const high = list.filter((f) => f.risk === 'high');
const medium = list.filter((f) => f.risk === 'medium');

console.log(`# decode-contract 扫描：high=${high.length} medium=${medium.length} 动态点=${stats.dynamicPoints} 可定位=${stats.mappedPoints} 未定位=${stats.unmappedPoints} 目录无列=${stats.noCatalogPoints}`);
for (const f of high) {
  console.log(`${f.risk}|${f.file}:${f.line}|${f.subject}:${f.rust}|${f.db}:${f.dbType}|${f.why}`);
}
for (const f of medium) {
  console.log(`${f.risk}|${f.file}:${f.line}|${f.subject}:${f.rust}|${f.db}:${f.dbType}|${f.why}`);
}
// 未定位项全部输出原因，禁止静默丢弃（供审计逐条标注）。
for (const u of unmapped) {
  console.log(`unmapped|${u.file}:${u.line}|${u.subject}:${u.rust}|${u.why}`);
}
// SQL 已定位、但列类型来自表达式/CTE/动态拼接，prod 目录无对应列（已标注原因）。
for (const u of noCatalog) {
  console.log(`nocatalog|${u.file}:${u.line}|${u.subject}:${u.rust}|${u.why}`);
}
