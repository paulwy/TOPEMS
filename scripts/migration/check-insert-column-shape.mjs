#!/usr/bin/env node
// [Gate INSERT] 迁移 INSERT 语句形态静态检查（2026-11-06）
//
// 背景：20261107000011 的 VALUES 行实际顺序为 (code, resource, action, name, level)，
//       但派生表别名声明为 (code, name, resource, action, level)，导致 name/resource/action
//       三列内容整体错位（如 name='aps:material_plan'、resource='create'、
//       action='material_plancreate'）。纯语法合法、列数一致，静态结构检查抓不到，
//       故本检查器分两层：
//   1) 确定性结构层（可静态判定）：
//      - INSERT 列清单 vs VALUES 每条元组的顶层值个数
//      - 派生表 (VALUES ...) AS v(...) 的别名列数 vs 每条元组值个数
//      - INSERT 列清单 vs SELECT 列表顶层表达式个数
//   2) 已知语义层（core_permissions 专用，可静态判定）：
//      - 由「INSERT 列清单 ← SELECT 列表 ← 别名」组合出列→值映射后断言：
//        action 必须是 code 的最后一个 ':' 段；resource 必须是 code 去掉最后一段的前缀
//        （允许 ':' 与 '_' 两种模块写法）。这一条直接覆盖 000011 的错位形态。
//   其余“列名与值语义错位”无法通用静态判定，核对方法见
//   docs/quality/migration-000011-column-order-fix-2026-11-06.md 的 scratch 库主键断言。
//
// 用法：
//   node scripts/migration/check-insert-column-shape.mjs            # 全仓扫描
//   node scripts/migration/check-insert-column-shape.mjs --changed-only  # 仅 git 变更的迁移
// 退出码：0 无确定性错误；1 有错误（逐条输出 path:line）。
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const DIRS = ['database/migrations', 'migrations'];

function collectDirs() {
  const svc = join(ROOT, 'svc');
  if (existsSync(svc)) {
    for (const name of readdirSync(svc).sort()) {
      const d = join(svc, name, 'migrations');
      if (existsSync(d)) DIRS.push(relative(ROOT, d));
    }
  }
}

function listFiles() {
  const files = [];
  for (const rel of DIRS) {
    const dir = join(ROOT, rel);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).sort()) {
      if (f.endsWith('.sql') && !f.endsWith('.backup') && !f.endsWith('.down.sql')) {
        files.push(join(dir, f));
      }
    }
  }
  return files;
}

function changedFiles() {
  try {
    const out = execFileSync('git', ['diff', '--name-only', 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
    const staged = execFileSync('git', ['diff', '--name-only', '--cached'], { cwd: ROOT, encoding: 'utf8' });
    const names = new Set((out + staged).trim().split('\n').filter(Boolean));
    return listFiles().filter((f) => names.has(relative(ROOT, f)));
  } catch {
    return listFiles();
  }
}

// ---- 词法：跳过注释/字符串内容，保留字面量与行号 ---------------------------------
const DOLLAR_RE = /\$([A-Za-z_][A-Za-z0-9_]*)?\$/;

function tokenize(src, path) {
  const toks = [];
  let i = 0;
  let line = 1;
  const push = (kind, text, raw, l) => toks.push({ kind, text, raw, line: l });

  while (i < src.length) {
    const c = src[i];
    if (c === '\n') { line += 1; i += 1; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { i += 1; continue; }
    if (c === '-' && src[i + 1] === '-') {
      while (i < src.length && src[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] === '\n') line += 1;
        i += 1;
      }
      i += 2;
      continue;
    }
    if (c === "'" || (c === 'E' && src[i + 1] === "'") || (c === 'e' && src[i + 1] === "'")) {
      const startLine = line;
      let raw = '';
      if (src[i] !== "'") { raw += src[i]; i += 1; }
      raw += src[i]; i += 1;
      let text = '';
      while (i < src.length) {
        const ch = src[i];
        if (ch === '\n') line += 1;
        if (ch === "'") {
          if (src[i + 1] === "'") { text += "'"; raw += "''"; i += 2; continue; }
          raw += ch; i += 1; break;
        }
        if (ch === '\\' && raw.startsWith('E')) {
          text += src[i + 1] ?? ''; raw += ch + (src[i + 1] ?? ''); i += 2; continue;
        }
        text += ch; raw += ch; i += 1;
      }
      push('string', text, raw, startLine);
      continue;
    }
    if (c === '"') {
      const startLine = line;
      let text = '';
      const start = i;
      i += 1;
      while (i < src.length && src[i] !== '"') {
        if (src[i] === '\n') line += 1;
        if (src[i] === '"' && src[i + 1] === '"') { text += '"'; i += 2; continue; }
        text += src[i]; i += 1;
      }
      i += 1;
      push('word', text, src.slice(start, i), startLine);
      continue;
    }
    if (c === '$') {
      const m = DOLLAR_RE.exec(src.slice(i));
      if (m) {
        const tag = m[0];
        const startLine = line;
        const start = i;
        i += tag.length;
        const end = src.indexOf(tag, i);
        const bodyEnd = end === -1 ? src.length : end;
        for (let k = i; k < bodyEnd; k += 1) if (src[k] === '\n') line += 1;
        const text = src.slice(i, bodyEnd);
        i = bodyEnd + tag.length;
        push('string', text, src.slice(start, i), startLine);
        continue;
      }
    }
    if (/[A-Za-z0-9_]/.test(c)) {
      const start = i;
      const startLine = line;
      while (i < src.length && /[A-Za-z0-9_$]/.test(src[i])) i += 1;
      push('word', src.slice(start, i), src.slice(start, i), startLine);
      continue;
    }
    push('punct', c, c, line);
    i += 1;
  }
  return toks;
}

const isWord = (t, w) => t && t.kind === 'word' && t.text.toUpperCase() === w;
const isPunct = (t, p) => t && t.kind === 'punct' && t.text === p;

// 从 '(' 开始找到匹配的 ')'（考虑嵌套）
function matchParen(toks, openIdx) {
  let depth = 0;
  for (let k = openIdx; k < toks.length; k += 1) {
    if (isPunct(toks[k], '(')) depth += 1;
    else if (isPunct(toks[k], ')')) {
      depth -= 1;
      if (depth === 0) return k;
    }
  }
  return -1;
}

// 把 [start,end) 内按顶层逗号切成项，返回每项的 token 区间
function splitTopLevel(toks, start, end) {
  const items = [];
  let depth = 0;
  let itemStart = start;
  for (let k = start; k < end; k += 1) {
    if (isPunct(toks[k], '(') || isPunct(toks[k], '[')) depth += 1;
    else if (isPunct(toks[k], ')') || isPunct(toks[k], ']')) depth -= 1;
    else if (isPunct(toks[k], ',') && depth === 0) {
      items.push([itemStart, k]);
      itemStart = k + 1;
    }
  }
  if (itemStart < end) items.push([itemStart, end]);
  return items;
}

// 分析一个 INSERT 语句（toks[insertIdx..endIdx)，endIdx 为语句结束或 EOF）
function analyzeInsert(toks, insertIdx, endIdx, file, errors) {
  let k = insertIdx + 2; // 跳过 INSERT INTO
  // 表名（可带 schema. 前缀）
  const tableParts = [];
  while (k < endIdx && !isPunct(toks[k], '(')) {
    if (toks[k].kind === 'word') tableParts.push(toks[k].text);
    k += 1;
  }
  const table = tableParts.length ? tableParts[tableParts.length - 1].toLowerCase() : '?';
  if (k >= endIdx || !isPunct(toks[k], '(')) return; // 无显式列清单，无法做结构核对
  const colClose = matchParen(toks, k);
  if (colClose === -1 || colClose >= endIdx) return;

  const cols = splitTopLevel(toks, k + 1, colClose)
    .map(([s, e]) => (toks[e - 1] && toks[e - 1].kind === 'word' ? toks[e - 1].text.toLowerCase() : null))
    .filter(Boolean);
  const colsLine = toks[k].line;

  let p = colClose + 1;
  // VALUES 直插：INSERT INTO t (cols) VALUES (row), (row) ...
  if (isWord(toks[p], 'VALUES')) {
    const rows = [];
    p += 1;
    while (p < endIdx) {
      while (p < endIdx && isPunct(toks[p], ',')) p += 1;
      if (p >= endIdx || !isPunct(toks[p], '(')) break;
      const rowClose = matchParen(toks, p);
      if (rowClose === -1) break;
      rows.push({ items: splitTopLevel(toks, p + 1, rowClose).map(([s, e]) => toks[s]), line: toks[p].line });
      p = rowClose + 1;
    }
    for (const row of rows) {
      if (row.items.length !== cols.length) {
        errors.push(
          `${file}:${row.line}: 列数与值数不匹配（表 ${table}）：列清单 ${cols.length} 列 (${cols.join(',')}) vs 该行 ${row.items.length} 个值`,
        );
      }
    }
    const mapping = new Map(cols.map((c, i) => [c, rows[0]?.items[i]]));
    if (rows.length) checkSemantics(table, mapping, file, rows[0].line, errors);
    return;
  }

  // SELECT 形态：INSERT INTO t (cols) SELECT ... 可能带派生 VALUES
  if (isWord(toks[p], 'SELECT')) {
    const selStart = p + 1;
    let q = selStart;
    let depth = 0;
    while (q < endIdx) {
      if (isPunct(toks[q], '(')) depth += 1;
      else if (isPunct(toks[q], ')')) depth -= 1;
      else if (depth === 0 && isWord(toks[q], 'FROM')) break;
      else if (depth === 0 && isPunct(toks[q], ';')) break;
      q += 1;
    }
    const selItems = splitTopLevel(toks, selStart, q);
    const selectListHasStar = selItems.some(([s, e]) => (e - s === 1 && isPunct(toks[s], '*')));
    if (!selectListHasStar && selItems.length !== cols.length) {
      errors.push(
        `${file}:${colsLine}: 列数与 SELECT 表达式数不匹配（表 ${table}）：列清单 ${cols.length} 列 vs SELECT ${selItems.length} 项`,
      );
    }

    // 找派生表 (VALUES ...) AS alias(...)
    let valuesIdx = -1;
    for (let r = q; r < endIdx; r += 1) {
      if (isWord(toks[r], 'VALUES') && isPunct(toks[r - 1], '(')) { valuesIdx = r; break; }
    }
    if (valuesIdx === -1) return;

    const outerOpen = valuesIdx - 1;
    const outerClose = matchParen(toks, outerOpen);
    if (outerClose === -1) return;
    const rawRows = splitTopLevel(toks, valuesIdx + 1, outerClose)
      .map(([s, e]) => {
        if (s === e || !isPunct(toks[s], '(') || !isPunct(toks[e - 1], ')')) return null;
        // 去掉该行自身的括号后再按顶层逗号切值
        return { items: splitTopLevel(toks, s + 1, e - 1).map(([a]) => toks[a]), line: toks[s].line };
      })
      .filter(Boolean);

    // 别名：... ) [AS] v (a, b, c)
    let a = outerClose + 1;
    if (isWord(toks[a], 'AS')) a += 1;
    let aliasName = null;
    if (toks[a] && toks[a].kind === 'word' && isPunct(toks[a + 1], '(')) {
      aliasName = toks[a].text.toLowerCase();
      const aliasClose = matchParen(toks, a + 1);
      if (aliasClose !== -1) {
        const aliasCols = splitTopLevel(toks, a + 2, aliasClose)
          .map(([s, e]) => (toks[e - 1] && toks[e - 1].kind === 'word' ? toks[e - 1].text.toLowerCase() : null))
          .filter(Boolean);
        for (const row of rawRows) {
          if (row.items.length !== aliasCols.length) {
            errors.push(
              `${file}:${row.line}: 派生 VALUES 别名数与值数不匹配（表 ${table}）：AS ${aliasName}(${aliasCols.join(',')}) 共 ${aliasCols.length} 列 vs 该行 ${row.items.length} 个值`,
            );
          }
        }
        // 组合映射：INSERT 列 ← SELECT 项 ← 别名位置 ← VALUES 值
        const mapping = new Map();
        selItems.forEach(([s, e], i) => {
          if (i >= cols.length) return;
          const item = toks.slice(s, e);
          if (item.length === 3 && item[0].kind === 'word' && isPunct(item[1], '.') && item[2].kind === 'word'
              && item[0].text.toLowerCase() === aliasName) {
            const aliasIdx = aliasCols.indexOf(item[2].text.toLowerCase());
            if (aliasIdx >= 0 && rawRows[0]) mapping.set(cols[i], rawRows[0].items[aliasIdx]);
          }
        });
        if (rawRows.length) checkSemantics(table, mapping, file, rawRows[0].line, errors);
      }
    }
    return;
  }
}

// core_permissions 语义断言：code 决定 resource/action 应有的取值
function checkSemantics(table, mapping, file, line, errors) {
  if (table !== 'core_permissions') return;
  const code = mapping.get('code');
  const resource = mapping.get('resource');
  const action = mapping.get('action');
  if (!code || !resource || !action) return;
  if (code.kind !== 'string' || resource.kind !== 'string' || action.kind !== 'string') return;

  const codeText = code.text;
  const lastColon = codeText.lastIndexOf(':');
  if (lastColon <= 0) return;
  const expectAction = codeText.slice(lastColon + 1);
  const expectResource = codeText.slice(0, lastColon);
  const actual = resource.text;
  // 允许两种既有写法：
  //   实体级 resource：等于 code 前缀，':' 可写成 '_'（如 aps:material_plan / srm_scoring_dimension）
  //   模块级 resource：只取 code 的首段（如 bi:data_source:write 的 resource='bi'，见 20261107000001）
  const codeNorm = codeText.toLowerCase();
  const resourceOk = actual === expectResource
    || actual === expectResource.replace(/:/g, '_')
    || actual.toLowerCase() === expectResource.replace(/:/g, '_').toLowerCase()
    || codeNorm.startsWith(`${actual.toLowerCase()}:`)
    || codeNorm.startsWith(`${actual.toLowerCase()}_`);
  if (action.text !== expectAction) {
    errors.push(
      `${file}:${line}: core_permissions 语义错位 code='${codeText}'：action 期望 '${expectAction}'，实际写入 '${action.text}'`,
    );
  }
  if (!resourceOk) {
    errors.push(
      `${file}:${line}: core_permissions 语义错位 code='${codeText}'：resource 期望 '${expectResource}'（或 '${expectResource.replace(/:/g, '_')}'），实际写入 '${resource.text}'`,
    );
  }
}

// ---- 主流程 -------------------------------------------------------------------
const useChanged = process.argv.includes('--changed-only');
collectDirs();
const files = useChanged ? changedFiles() : listFiles();
const errors = [];
let insertCount = 0;

for (const file of files) {
  const rel = relative(ROOT, file);
  const toks = tokenize(readFileSync(file, 'utf8'), rel);
  for (let i = 0; i < toks.length; i += 1) {
    if (!isWord(toks[i], 'INSERT') || !isWord(toks[i + 1], 'INTO')) continue;
    let end = i + 2;
    let depth = 0;
    while (end < toks.length) {
      if (isPunct(toks[end], '(')) depth += 1;
      else if (isPunct(toks[end], ')')) depth -= 1;
      else if (depth === 0 && isPunct(toks[end], ';')) break;
      end += 1;
    }
    insertCount += 1;
    analyzeInsert(toks, i, end, rel, errors);
  }
}

if (errors.length) {
  for (const e of errors) console.error(`[Gate INSERT] ERR ${e}`);
  console.error(`[Gate INSERT] FAILED 扫描 ${files.length} 个迁移文件 / ${insertCount} 条 INSERT，发现 ${errors.length} 个确定性问题`);
  process.exit(1);
}
console.log(`[Gate INSERT] PASS 扫描 ${files.length} 个迁移文件 / ${insertCount} 条 INSERT，列数与值数、派生别名一致；core_permissions 语义断言通过`);
