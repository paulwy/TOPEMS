#!/usr/bin/env node
// decode-contract 扫描：交叉比对 prod 列目录与 Rust 侧 sqlx 解码类型。
//
// 覆盖面：动态 `query_as::<_, Struct>`（无编译期类型校验）；`query!` 宏路径由
// SQLX_OFFLINE 编译门禁保证，不在本脚本范围。
//
// 用法：
//   1) 生成列目录（只读）：
//      ssh <host> "psql -d topems_prod -tA -F'|' -c \"SELECT n.nspname, c.relname,
//        a.attname, format_type(a.atttypid,a.atttypmod) FROM pg_attribute a
//        JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
//        WHERE c.relkind IN ('r','p','v','m') AND a.attnum>0 AND NOT a.attisdropped
//        AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')\"" \
//        > /tmp/prod_cols.psv
//   2) node scripts/ci/check-decode-contract.mjs /tmp/prod_cols.psv
//
// 输出：`risk|file:line|Struct.field:RustType|table.column:DBType|reason`
// 仅报告，不改变退出码；高风险需人工复核后再修。

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
  const [schema, table, col, type] = line.split('|');
  const key = `${schema}.${table}`;
  if (!catalog.has(key)) catalog.set(key, new Map());
  catalog.get(key).set(col, type);
  if (!tablesByName.has(table)) tablesByName.set(table, []);
  tablesByName.get(table).push(key);
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
  return null;
}

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

const findings = [];
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const re = /query_as::<[^,>]*,\s*([A-Za-z0-9_]+)\s*>/g;
  let m;
  while ((m = re.exec(src))) {
    const structName = m[1];
    const q = literalAt(src, m.index + m[0].length);
    if (!q) continue;
    const fields = fieldsOf(src, structName);
    if (!fields) continue;

    const preferred = svcSchema[file.split('/')[1]];
    const tables = [];
    const tre = /(?:FROM|JOIN|UPDATE|INTO)\s+((?:[a-zA-Z_][a-zA-Z0-9_]*\.)?[a-zA-Z_][a-zA-Z0-9_]*)/gi;
    let tm;
    while ((tm = tre.exec(q))) {
      const raw = tm[1];
      if (/^\(|select|values|unnest|generate_series|jsonb_|lateral/i.test(raw)) continue;
      if (raw.includes('.')) { if (catalog.has(raw)) tables.push(raw); }
      else if (tablesByName.has(raw)) {
        const cands = tablesByName.get(raw);
        const pref = preferred ? cands.find((c) => c.startsWith(preferred + '.')) : undefined;
        tables.push(...(pref ? [pref] : cands));
      }
    }
    if (!tables.length) continue;

    for (const f of fields) {
      const rc = rustCat(f.type);
      if (!rc) continue;
      if (!new RegExp(`\\b${f.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(q)) continue;

      const esc = f.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // 显式 cast（前置/后置两种写法）视为已规避：
      const castFloat = new RegExp(`\\b${esc}\\s*::\\s*(float8|float4|double\\s+precision)|::\\s*(float8|float4|double\\s+precision)\\s+(AS\\s+)?${esc}\\b`, 'i');
      const castText = new RegExp(`${esc}\\s*::\\s*text|::\\s*text\\s+(AS\\s+)?${esc}\\b`, 'i');
      const castNum = new RegExp(`${esc}\\s*::\\s*(numeric|decimal)|::\\s*(numeric|decimal)[^,]*\\s+(AS\\s+)?${esc}\\b`, 'i');

      for (const t of tables) {
        const cols = catalog.get(t);
        if (!cols || !cols.has(f.name)) continue;
        const dc = dbCat(cols.get(f.name));
        // 兼容矩阵：null 表示安全
        let why = null;
        if (rc === 'float') {
          if (castFloat.test(q) || dc === 'float') continue;
          why = 'f64 只解 FLOAT4/FLOAT8，NUMERIC/INT 会 ColumnDecode';
        } else if (rc === 'numeric') {
          if (castNum.test(q) || dc === 'numeric') continue;
          why = 'Decimal/BigDecimal 只解 NUMERIC';
        } else if (rc === 'text') {
          if (castText.test(q) || dc === 'text') continue;
          why = 'String 无法解非文本类型';
        } else if (rc === 'int32') {
          if (dc === 'int') continue;
          why = dc === 'int8' ? 'i32 无法解 BIGINT（错误/截断）' : 'i32 与 DB 类型不匹配';
        } else if (rc === 'int64') {
          if (dc === 'int' || dc === 'int8') continue;
          why = 'i64 与 DB 类型不匹配';
        } else if (rc === 'uuid') {
          if (dc === 'uuid') continue;
          why = 'Uuid 只解 UUID';
        } else if (rc === 'json') {
          if (dc === 'json') continue;
          why = 'JSON 值类型与 DB 不匹配';
        } else {
          continue;
        }
        const line = src.slice(0, m.index + (src.slice(m.index).indexOf('query_as'))).split('\n').length;
        findings.push({ risk: 'high', file, line, struct: structName, field: f.name, rust: f.type, db: `${t}.${f.name}`, dbType: cols.get(f.name), why });
      }
    }
  }
}

const uniq = new Map();
for (const f of findings) uniq.set(`${f.file}|${f.struct}|${f.field}|${f.db}`, f);
const list = [...uniq.values()];
const high = list.filter((f) => f.risk === 'high');
console.log(`# decode-contract 扫描：high=${high.length}`);
for (const f of high) {
  console.log(`${f.risk}|${f.file}:${f.line}|${f.struct}.${f.field}:${f.rust}|${f.db}:${f.dbType}|${f.why}`);
}
