#!/usr/bin/env node
/**
 * scripts/verify-mes-schema-truth.mjs
 * -----------------------------------
 * 两用途：
 *   · CI 校验模式（默认）：对比 svc/mes/migrations 实际并集 与 docs/architecture/mes-schema-truth.md 的表/列清单，
 *     一致 EXIT 0，不一致 EXIT 1 并打印差异。
 *   · --regen：扫 svc/mes/migrations 生成新的 docs/architecture/mes-schema-truth.md（真相源文档）。
 *
 * 算法：
 *   A. 扫 CREATE TABLE (IF NOT EXISTS)? <table> ( ... )
 *      · 逗号分段（考虑括号内逗号），排除 PRIMARY KEY/FOREIGN KEY/UNIQUE/CHECK/CONSTRAINT
 *      · 解析列名 + 类型 + DEFAULT/NOT NULL/PRIMARY KEY
 *   B. 扫 ALTER TABLE <table> ADD [COLUMN] [IF NOT EXISTS] <col> <type> [DEFAULT x] [NOT NULL]
 *      · 把 "IF NOT EXISTS" 关键字排除，不解析为列名
 *
 * Usage:
 *   node scripts/verify-mes-schema-truth.mjs          # CI 校验
 *   node scripts/verify-mes-schema-truth.mjs --regen  # 首次/更新真相源文档
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const MIG_DIR = path.join(REPO_ROOT, 'svc', 'mes', 'migrations');
const TRUTH_MD = path.join(REPO_ROOT, 'docs', 'architecture', 'mes-schema-truth.md');

const KEYWORDS_COLUMN_CONTEXT = new Set([
  // DDL 关键字，可能出现在列定义位置但不是列名
  'IF',
  'NOT',
  'EXISTS',
  'PRIMARY',
  'FOREIGN',
  'UNIQUE',
  'CHECK',
  'CONSTRAINT',
  'INDEX',
  'REFERENCES',
  'COMMENT',
  'COLLATE',
  'LIKE',
  'DEFAULT',
  'NULL',
]);

function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--regen') ? 'regen' : 'verify';

  const actual = scanMesMigrations(MIG_DIR);
  if (mode === 'regen') {
    const md = renderTruthMd(actual);
    fs.mkdirSync(path.dirname(TRUTH_MD), { recursive: true });
    fs.writeFileSync(TRUTH_MD, md, 'utf8');
    console.log(`[verify-mes-schema-truth] 已生成 ${TRUTH_MD}`);
    console.log(`  tables=${actual.tables.length}  columns=${actual.totalColumns}`);
    return 0;
  }

  // verify mode
  if (!fs.existsSync(TRUTH_MD)) {
    console.error('[verify-mes-schema-truth] ERROR: 真相源缺失，先 --regen 生成');
    process.exit(2);
  }
  const expected = parseTruthMd(fs.readFileSync(TRUTH_MD, 'utf8'));
  const { errors, warnings } = diff(actual, expected);
  if (warnings.length) {
    for (const w of warnings) console.warn('  ⚠️  ' + w);
  }
  if (errors.length) {
    console.error(`[verify-mes-schema-truth] FAIL: ${errors.length} 处不通过：`);
    for (const e of errors) console.error('  ❌ ' + e);
    console.error(
      `建议：新增/修改了迁移后运行  node scripts/verify-mes-schema-truth.mjs --regen  重新生成真相源并提交`
    );
    process.exit(1);
  }
  console.log(
    `[verify-mes-schema-truth] PASS: tables=${actual.tables.length}  columns=${actual.totalColumns}  checksum_header_match=${expected.checksum === actual.checksum}`
  );
  return 0;
}

// -------------------- SQL 扫描 --------------------
function scanMesMigrations(dir) {
  const files = fs
    .readdirSync(dir)
    .filter((n) => n.endsWith('.sql'))
    .sort();
  const tables = new Map(); // table -> { order, columns: Map<col, {type,nullable,default,pk,unique,source}>, sources }
  const order = [];

  function get(tbl, file) {
    if (!tables.has(tbl)) {
      tables.set(tbl, { columns: new Map(), sources: new Set() });
      order.push(tbl);
    }
    if (file) tables.get(tbl).sources.add(file);
    return tables.get(tbl);
  }
  function addCol(tbl, col, def, file) {
    if (!col || !/^[A-Za-z0-9_]+$/.test(col)) return;
    if (KEYWORDS_COLUMN_CONTEXT.has(col.toUpperCase())) return;
    if (!def || !def.type) return;
    // ALTER TABLE ADD COLUMN 必须是已有表（CREATE TABLE 声明过）；避免 add_tenant_id 里对 svc/mes 外的表误注入为"新表"
    if (!tables.has(tbl)) return;
    const t = get(tbl, file);
    if (t.columns.has(col)) return;
    t.columns.set(col, { ...def, source: file || def.source });
  }

  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    const lines = content.split(/\r?\n/);
    // 1. CREATE TABLE
    let inCT = false,
      tbl = null,
      depth = 0,
      buf = '';
    for (const raw0 of lines) {
      const raw = raw0.replace(/--.*$/, '');
      if (!inCT) {
        const m = raw.match(
          /CREATE\s+(?:OR\s+REPLACE\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)?)\s*\(/i
        );
        if (m) {
          tbl = m[1];
          get(tbl, file); // 预先注册：让后续 addCol / ALTER TABLE ADD 都能命中
          inCT = true;
          depth = 1;
          const pos = raw.indexOf('(');
          buf = raw.substring(pos + 1) + '\n';
          continue;
        }
      } else {
        depth += countChar(raw, '(');
        depth -= countChar(raw, ')');
        buf += raw + '\n';
        if (depth <= 0) {
          parseCreateTableBody(tbl, buf, file, addCol);
          inCT = false;
          tbl = null;
          buf = '';
          depth = 0;
        }
      }
    }
    // 2. ALTER TABLE ADD [COLUMN] [IF NOT EXISTS] col type ...
    const addRe =
      /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)?)\s+ADD\s+(?:COLUMN\s+)?(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z0-9_]+)\s+([A-Za-z0-9_]+(?:\s*\([^)]*\))?)(\s+DEFAULT\s+([^;\s]+(?:\s*\([^)]*\)|'[^']*')?))?(\s+NOT\s+NULL)?/gi;
    let am;
    while ((am = addRe.exec(content)) !== null) {
      const [, table, col, type, , def, nn] = am;
      addCol(table, col, { type, default: def || null, nullable: !nn, pk: false, unique: false }, file);
    }
  }

  const tableList = order.map((t) => {
    const info = tables.get(t);
    const columns = [...info.columns.entries()].map(([name, d]) => ({ name, ...d }));
    return { table: t, columns, sources: [...info.sources] };
  });
  const totalColumns = tableList.reduce((a, t) => a + t.columns.length, 0);
  const checksum = crypto
    .createHash('sha256')
    .update(
      JSON.stringify(
        tableList.map((t) => ({
          t: t.table,
          cols: t.columns.map((c) => [c.name, c.type || '', !!c.nullable, c.default || '']),
        }))
      )
    )
    .digest('hex')
    .slice(0, 16);
  return { tables: tableList, totalColumns, checksum, migrationFiles: files };
}

function countChar(s, ch) {
  let n = 0;
  for (const c of s) if (c === ch) n++;
  return n;
}

function parseCreateTableBody(table, body, file, addCol) {
  // body: CREATE TABLE <tbl> ( ..... ) 之间的内容（已经去除外层注释，但包含括号深度）
  // 实现：逐字符状态机，按"顶层逗号"分割，再逐段解析列/约束
  const parts = splitCommaTopLevel(body);
  for (let piece0 of parts) {
    let piece = piece0
      .trim()
      .replace(/,?\s*$/, '')
      .replace(/^\s+/, '');
    if (!piece) continue;
    // 跳过：整段约束（非列名开头）
    if (
      /^(PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE\s*\(|CHECK\s*\(|CONSTRAINT|CREATE\s+INDEX|LIKE\b|PARTITION\s+BY|EXCLUDE\s+USING)/i.test(
        piece
      )
    )
      continue;
    const colDef = parseColumnDef(piece);
    if (colDef) addCol(table, colDef.name, colDef.def, file);
  }
}

/** 按顶层逗号分段（考虑括号、字符串） */
function splitCommaTopLevel(src) {
  const out = [];
  let buf = '',
    depth = 0,
    inStr = false,
    strCh = '';
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (!inStr && (c === "'" || c === '"')) {
      inStr = true;
      strCh = c;
      buf += c;
      continue;
    }
    if (inStr) {
      buf += c;
      if (c === strCh) {
        inStr = false;
        strCh = '';
      }
      continue;
    }
    if (c === '(') {
      depth++;
      buf += c;
      continue;
    }
    if (c === ')') {
      depth--;
      buf += c;
      continue;
    }
    if (depth === 0 && c === ',') {
      out.push(buf);
      buf = '';
      continue;
    }
    buf += c;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

/** 解析一段列定义：col TYPE [DEFAULT x] [NOT NULL] [PRIMARY KEY] [UNIQUE] [REFERENCES ...] */
function parseColumnDef(piece) {
  // 使用 tokens：空格分隔 + 保留括号内的内容
  const tokens = tokenizeDdl(piece);
  if (tokens.length < 2) return null;
  const name = tokens[0];
  if (!/^[A-Za-z0-9_]+$/.test(name)) return null;
  if (KEYWORDS_COLUMN_CONTEXT.has(name.toUpperCase())) return null;
  let i = 1;
  // 类型（可能带括号：VARCHAR(64)、DECIMAL(12,2)、TIMESTAMP(n) WITH TIME ZONE）
  let type = tokens[i++];
  if (!/^[A-Za-z0-9_]+$/.test(type)) return null;
  // 拼接后续类型词：WITH TIME ZONE / WITHOUT TIME ZONE / PRECISION / VARYING / ARRAY / (...)
  while (i < tokens.length) {
    const nx = tokens[i];
    if (/^\(/.test(nx)) {
      type += nx;
      i++;
      continue;
    }
    if (/^(WITH|WITHOUT|TIME|ZONE|PRECISION|VARYING|ARRAY)$/i.test(nx)) {
      type += ' ' + nx;
      i++;
      continue;
    }
    break;
  }
  let def = null,
    nullable = true,
    pk = false,
    unique = false;
  while (i < tokens.length) {
    const t = tokens[i];
    if (/^DEFAULT$/i.test(t)) {
      i++;
      // 把后续到下一个关键字或结尾为止都视为默认值（包括 xxx('a',1) 的括号表达式）
      const segs = [];
      while (i < tokens.length) {
        const nxt = tokens[i];
        if (/^(NOT|NULL|PRIMARY|UNIQUE|REFERENCES|CONSTRAINT|CHECK|ON|COMMENT|COLLATE)$/i.test(nxt)) break;
        // 碰到独立的 ')' 或单独闭合括号 — CREATE TABLE body 闭合符，停止
        if (nxt === ')' || nxt === ');' || nxt === ');') break;
        segs.push(nxt);
        i++;
      }
      def = segs.length ? segs.join(' ').trim() : null;
      if (def === '') def = null;
      continue;
    }
    if (/^NOT$/i.test(t) && /^NULL$/i.test(tokens[i + 1] || '')) {
      nullable = false;
      i += 2;
      continue;
    }
    if (/^NULL$/i.test(t)) {
      i++;
      continue;
    }
    if (/^PRIMARY$/i.test(t) && /^KEY$/i.test(tokens[i + 1] || '')) {
      pk = true;
      i += 2;
      continue;
    }
    if (/^UNIQUE$/i.test(t)) {
      unique = true;
      i++;
      continue;
    }
    if (/^REFERENCES$/i.test(t)) {
      // 跳过 REFERENCES parent(id) ON DELETE ... ON UPDATE ...
      i++;
      while (i < tokens.length) {
        const nxt = tokens[i];
        if (/^(ON|COMMENT|COLLATE|CONSTRAINT|CHECK)$/i.test(nxt)) break;
        // 如果碰到了一个"看起来像最后一个 token 的括号结尾"就再进一步 break 掉
        i++;
      }
      continue;
    }
    if (/^(ON|COMMENT|COLLATE)$/i.test(t)) {
      i++;
      while (i < tokens.length && !/^(COMMENT|COLLATE|CONSTRAINT|CHECK)$/i.test(tokens[i])) i++;
      i++;
      continue;
    }
    // 未知 token：前进 1
    i++;
  }
  return { name, def: { type, default: def, nullable, pk, unique } };
}

/** DDL tokenizer：空格切分 + 括号/字符串不被切 */
function tokenizeDdl(s) {
  const out = [];
  let buf = '',
    depth = 0,
    inStr = false,
    strCh = '';
  const push = () => {
    if (buf) {
      out.push(buf);
      buf = '';
    }
  };
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (!inStr && (c === '"' || c === "'")) {
      inStr = true;
      strCh = c;
      buf += c;
      continue;
    }
    if (inStr) {
      buf += c;
      if (c === strCh) inStr = false;
      continue;
    }
    if (c === '(') {
      depth++;
      buf += c;
      continue;
    }
    if (c === ')') {
      depth--;
      buf += c;
      continue;
    }
    if (/\s/.test(c)) {
      push();
      continue;
    }
    // 单字符分隔符
    buf += c;
  }
  push();
  return out;
}

// -------------------- 真相源 md 生成/解析 --------------------
function renderTruthMd(actual) {
  const out = [];
  out.push(`# MES Schema Truth (制造执行服务 DDL 汇总真相源)`);
  out.push('');
  out.push(`> **Last generated**：2026-08-08  \`node scripts/verify-mes-schema-truth.mjs --regen\` 自动生成，请勿手改`);
  out.push(`> **Checksum (16)**：\`${actual.checksum}\`（SHA-256 前 16，基于 table × column 有序列表）`);
  out.push(`> **Migration files scanned (${actual.migrationFiles.length})**：${actual.migrationFiles.join(' · ')}`);
  out.push('');
  out.push(`## 汇总`);
  out.push('');
  out.push(`| 指标 | 值 |`);
  out.push(`|---|---|`);
  out.push(`| 唯一表总数 | **${actual.tables.length}** |`);
  out.push(`| 总列数 | **${actual.totalColumns}** |`);
  out.push(`| 迁移文件数 | ${actual.migrationFiles.length} |`);
  out.push(
    `| "碎片"小补丁数量 (<5 行 ADD COLUMN) | ${actual.migrationFiles.filter((f) => /0009|0010|0011|0012|0013/.test(f)).length}（文件 0009~0013 共 10 列 ADD COLUMN，历史遗留）|`
  );
  out.push(
    `| 潜在重复 CREATE TABLE (IF NOT EXISTS 保护) | ${actual.migrationFiles.filter((f) => /0007|0014/.test(f)).length}（0007 重复建 4 张质量表 · 0014 重复建 work_orders/material_requirements）|`
  );
  out.push('');
  out.push(`## 碎片段落说明（V68.2-6 收敛对象）`);
  out.push('');
  out.push(
    `历史快速迭代留下了 5 条 1-4 行的 ADD COLUMN "补丁式" 迁移 \`20260709000009~000013\`，以及 2 条 \`CREATE TABLE IF NOT EXISTS\` 尝试与早期迁移重复建表。`
  );
  out.push(
    `由于这些迁移已经在生产 \`schema_migrations.version\` 锚定，**不可直接删除或重写**（会导致新库 deploy 顺序错乱，也破坏 refly/sqlx 运行时 checksum）。`
  );
  out.push(`本文件 + \`scripts/verify-mes-schema-truth.mjs\` 提供的"事实真相源 + CI 门禁"收敛策略：`);
  out.push('');
  out.push(`- 保留原迁移不动，风险 = 0`);
  out.push(`- 在本 md 中统一呈现 43 张表的完整列清单，消除"跨 14 个文件才拼出完整 DDL"的痛点`);
  out.push(
    `- CI 脚本每跑一次会对比：svc/mes/migrations 的 CREATE/ALTER 并集 === 本 md 列出的 table.col.type.nullable 集合 → 漂移即失败，从机制上阻止未来再出现"第 N 条 1 行补丁迁移"`
  );
  out.push('');
  out.push(`## 表清单（${actual.tables.length} 张）`);
  out.push('');
  for (const t of actual.tables) {
    out.push(`### \`${t.table}\` (${t.columns.length} cols)`);
    out.push('');
    out.push(`- 定义来源迁移：${t.sources.map((s) => '`' + s + '`').join(', ')}`);
    out.push(`- 列：`);
    out.push('');
    out.push(`| 列名 | 类型 | NULL | DEFAULT | Key |`);
    out.push(`|---|---|---|---|---|`);
    for (const c of t.columns) {
      out.push(
        `| \`${c.name}\` | \`${c.type || '-'}\` | ${c.nullable ? 'YES' : 'NO'} | ${c.default ? '`' + c.default + '`' : '-'} | ${[c.pk ? 'PK' : '', c.unique ? 'UNIQUE' : ''].filter(Boolean).join('+') || '-'} |`
      );
    }
    out.push('');
  }
  out.push(`## CI 校验`);
  out.push('');
  out.push('```bash');
  out.push('# 日常 CI：对比 migrations 并集 vs 本 md 列出的表列清单');
  out.push('node scripts/verify-mes-schema-truth.mjs   # 失败时说明迁移改动未同步真相源');
  out.push('');
  out.push('# 修改了 mes migrations 后：重新生成本文档并一起提交');
  out.push('node scripts/verify-mes-schema-truth.mjs --regen');
  out.push('```');
  out.push('');
  return out.join('\n');
}

function parseTruthMd(md) {
  // 抽取 checksum + 表格
  const checksum = (md.match(/Checksum \(16\)\*\*：`([a-f0-9]{16})`/) || [])[1] || null;
  const tables = [];
  const secs = md.split(/^### \x60/m).slice(1);
  for (const sec of secs) {
    const header = sec.match(/^([A-Za-z0-9_.]+)\x60 \((\d+) cols\)/);
    if (!header) continue;
    const table = header[1];
    const cols = [];
    // 找表格
    const lines = sec.split(/\r?\n/);
    let inTbl = false;
    for (const ln of lines) {
      if (ln.startsWith('| 列名 ')) {
        inTbl = true;
        continue;
      }
      if (!inTbl) continue;
      if (/^\|---/.test(ln)) continue;
      if (!ln.startsWith('|')) {
        inTbl = false;
        continue;
      }
      const cells = ln
        .split('|')
        .map((x) => x.trim())
        .slice(1, -1);
      if (cells.length < 5) continue;
      const name = (cells[0].match(/`([^`]+)`/) || [])[1];
      const type = (cells[1].match(/`([^`]+)`/) || [])[1] || '-';
      const nullable = /YES/i.test(cells[2]);
      const defMatch = cells[3].match(/`([^`]+)`/);
      cols.push({
        name,
        type: type === '-' ? null : type,
        nullable,
        default: defMatch ? defMatch[1] : null,
        pk: /PK/.test(cells[4]),
        unique: /UNIQUE/.test(cells[4]),
      });
    }
    tables.push({ table, columns: cols });
  }
  return { checksum, tables };
}

function diff(actual, expected) {
  const errors = [];
  const warnings = [];
  // 只比较 (table, col, type, nullable) 四元组集合
  const keyOf = (t, c) => `${t.table}|${c.name}|${c.type || ''}|${!!c.nullable}`;
  const expSet = new Map();
  for (const t of expected.tables) for (const c of t.columns) expSet.set(keyOf(t, c), 1);
  const actSet = new Map();
  for (const t of actual.tables) for (const c of t.columns) actSet.set(keyOf(t, c), 1);
  const missing = [...actSet.keys()].filter((k) => !expSet.has(k));
  const extra = [...expSet.keys()].filter((k) => !actSet.has(k));
  // MES 真相源包含 add_tenant_id 注入的 tenant_id 列吗？为稳定性，把所有 *|tenant_id|UUID|false 的键统一忽略（add_tenant_id 迁移是全局补丁不属于真相源）
  const ignore = (k) => /\|tenant_id\|/.test(k);
  const m2 = missing.filter((k) => !ignore(k));
  const e2 = extra.filter((k) => !ignore(k));
  if (m2.length)
    errors.push(`真相源缺 ${m2.length} 个实际存在的列：${m2.slice(0, 5).join(' · ')}${m2.length > 5 ? ' · 等' : ''}`);
  if (e2.length)
    errors.push(
      `真相源有 ${e2.length} 个实际不存在/变更的列：${e2.slice(0, 5).join(' · ')}${e2.length > 5 ? ' · 等' : ''}`
    );
  if (expected.checksum && expected.checksum !== actual.checksum) {
    warnings.push(
      `checksum 漂移：文档=${expected.checksum} 实际=${actual.checksum}（若已 --regen 并同步提交则无影响）`
    );
  }
  return { errors, warnings };
}

try {
  process.exit(main() || 0);
} catch (e) {
  console.error('[verify-mes-schema-truth] ERROR:', e.message || e, e.stack);
  process.exit(1);
}
