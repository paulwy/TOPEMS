#!/usr/bin/env node
/**
 * fix-unused-vars.cjs — 统一的 no-unused-vars 修复脚本
 *
 * 合并自 v3 + v8，支持以下类别：
 *   1. catchClause    — catch (e) → catch (_e)
 *   2. importNamed    — 移除 import { A, unused, B } 中的 unused
 *   3. importDefault  — 移除 import unused from 'mod'
 *   4. varDecl_plain  — 删除 const unused = expr;
 *   5. varDecl_destructure — 从解构中移除未使用标识符
 *   6. paramFunc      — 函数参数加 _ 前缀
 *   7. forOf          — for (const unused of ...) 参数加 _ 前缀
 *   8. useQueryBlock  — 删除 const { x } = useQuery(...) 整个块（来自 v3）
 *
 * 用法：
 *   node scripts/fix-unused-vars.cjs --input <path> [--output <path>] [--root <path>] [--scope <scope>] [--dry-run]
 *
 *   --input    <path>       ESLint JSON 报告路径（必填）
 *   --output   <path>       统计输出路径（可选，默认 stdout 摘要）
 *   --root     <path>       项目根目录（默认 process.cwd()）
 *   --scope    <scope>      all|import|vars|params|catch|forof|usequery（默认 all）
 *   --dry-run               仅预览，不写文件
 *   --help                  显示帮助
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// CLI Argument Parsing
// ============================================================

function parseArgs(argv) {
  const args = { input: null, output: null, root: process.cwd(), scope: 'all', dryRun: false, help: false };
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--input') { args.input = argv[++i]; }
    else if (a === '--output') { args.output = argv[++i]; }
    else if (a === '--root') { args.root = argv[++i]; }
    else if (a === '--scope') { args.scope = (argv[++i] || 'all').toLowerCase(); }
    i++;
  }
  return args;
}

function showHelp() {
  console.log(`
fix-unused-vars.cjs — 统一的 no-unused-vars 修复脚本

用法:
  node scripts/fix-unused-vars.cjs --input <path> [options]

参数:
  --input    <path>       ESLint JSON 报告路径 (必填)
  --output   <path>       统计 JSON 输出路径 (默认 stdout 摘要)
  --root     <path>       项目根目录 (默认 process.cwd())
  --scope    <scope>      修复类别范围，可选值:
                            all        - 全部 (默认)
                            import     - 仅 import 相关
                            vars       - 仅变量声明
                            params     - 仅函数参数
                            catch      - 仅 catch 子句
                            forof      - 仅 for-of
                            usequery   - 仅 useQuery 块移除
  --dry-run               预览模式，不写入文件
  --help, -h              显示帮助
`);
}

const cli = parseArgs(process.argv.slice(2));

if (cli.help) { showHelp(); process.exit(0); }
if (!cli.input) { console.error('错误: --input 参数为必填项。使用 --help 查看帮助。'); process.exit(1); }

const VALID_SCOPES = new Set(['all', 'import', 'vars', 'params', 'catch', 'forof', 'usequery']);
if (!VALID_SCOPES.has(cli.scope)) {
  console.error(`错误: --scope 值无效: ${cli.scope}。有效值: ${[...VALID_SCOPES].join(', ')}`);
  process.exit(1);
}

// ============================================================
// Load Input
// ============================================================

let warnings;
try {
  const raw = fs.readFileSync(cli.input, 'utf8');
  const data = JSON.parse(raw);
  if (Array.isArray(data)) {
    if (data.length > 0 && data[0].messages) {
      warnings = [];
      for (const f of data) {
        if (!f.messages) continue;
        for (const m of f.messages) {
          if (m.ruleId === '@typescript-eslint/no-unused-vars') {
            const msg = m.message || '';
            const nameMatch = msg.match(/'([^']+)'/);
            const isCaught = /caught error/i.test(msg);
            const isAssigned = /assigned a value but never used/i.test(msg);
            const isDefined = !isAssigned && !isCaught;
            warnings.push({
              file: f.filePath,
              line: m.line,
              col: m.column || 1,
              name: nameMatch ? nameMatch[1] : '',
              msg,
              type: isCaught ? 'catch' : (isAssigned ? 'var' : 'import'),
            });
          }
        }
      }
    } else {
      warnings = data;
    }
  } else {
    console.error('错误: --input 文件必须是数组格式');
    process.exit(1);
  }
} catch (e) {
  console.error(`读取 --input 失败: ${e.message}`);
  process.exit(1);
}

if (!warnings || warnings.length === 0) {
  console.log('没有需要修复的警告。');
  process.exit(0);
}

// ============================================================
// Scope Filter
// ============================================================

const SCOPE_CATEGORIES = {
  catch: ['catchClause'],
  import: ['importNamed', 'importDefault'],
  vars: ['varDecl_plain', 'varDecl_destructure'],
  params: ['paramFunc'],
  forof: ['forOf'],
  usequery: ['useQueryBlock'],
};

function categoryEnabled(cat) {
  if (cli.scope === 'all') return true;
  const cats = SCOPE_CATEGORIES[cli.scope] || [];
  return cats.includes(cat);
}

// ============================================================
// Statistics
// ============================================================

const stats = {
  scope: cli.scope,
  dryRun: cli.dryRun,
  filesProcessed: 0,
  filesModified: 0,
  totalApplied: 0,
  skipped: 0,
  byCategory: { importNamed: 0, importDefault: 0, varDecl_plain: 0, varDecl_destructure: 0, paramFunc: 0, catchClause: 0, forOf: 0, useQueryBlock: 0 },
  errors: []
};

// ============================================================
// Utility Functions
// ============================================================

function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function countBrackets(str) {
  let b = 0, s = 0, c = 0, paren = 0;
  for (const ch of str) {
    if (ch === '{') b++; else if (ch === '}') b--;
    else if (ch === '[') s++; else if (ch === ']') s--;
    else if (ch === '(') paren++; else if (ch === ')') paren--;
    else if (ch === '<') c++; else if (ch === '>') c--;
  }
  return { b, s, paren, c };
}

function sameBracketDelta(a, b) {
  const ba = countBrackets(a), bb = countBrackets(b);
  return ba.b === bb.b && ba.s === bb.s && ba.paren === bb.paren;
}

function isInStringOrComment(line, colIdx) {
  let inStr = null, inComment = false, inTpl = false;
  for (let i = 0; i < colIdx && i < line.length; i++) {
    const ch = line[i];
    const prev = i > 0 ? line[i-1] : '';
    if (inComment) continue;
    if (ch === '/' && line[i+1] === '/' && !inStr && !inTpl) return true;
    if (inStr) { if (ch === inStr && prev !== '\\') inStr = null; continue; }
    if (inTpl) { if (ch === '`' && prev !== '\\') inTpl = false; continue; }
    if (ch === '"' || ch === "'") { inStr = ch; continue; }
    if (ch === '`') { inTpl = true; continue; }
  }
  return !!(inStr || inTpl || inComment);
}

function findIdentifierPosition(line, name, colHint) {
  const nameRe = new RegExp('\\b' + escapeRegExp(name) + '\\b', 'g');
  let m;
  const matches = [];
  while ((m = nameRe.exec(line)) !== null) {
    if (!isInStringOrComment(line, m.index)) {
      matches.push(m.index);
    }
  }
  if (matches.length === 0) return -1;
  if (matches.length === 1) return matches[0];
  let best = matches[0];
  let bestDist = Infinity;
  for (const idx of matches) {
    const dist = Math.abs(idx - (colHint - 1));
    if (dist < bestDist) { bestDist = dist; best = idx; }
  }
  return best;
}

function removeIdentifierFromList(line, pos, nameLen) {
  let before = line.slice(0, pos);
  let after = line.slice(pos + nameLen);

  const preComma = before.match(/,\s*$/);
  const postComma = after.match(/^\s*,/);

  if (preComma && !postComma) {
    before = before.slice(0, before.length - preComma[0].length);
  } else if (postComma) {
    after = after.slice(postComma[0].length);
  } else if (preComma) {
    before = before.slice(0, before.length - preComma[0].length);
  }

  let result = before + after;
  result = result.replace(/\{\s*,/, '{').replace(/,\s*\}/, '}');
  result = result.replace(/\[\s*,/, '[').replace(/,\s*\]/, ']');
  result = result.replace(/\(\s*,/, '(').replace(/,\s*\)/, ')');
  return result;
}

function findEnclosingStatement(lines, lineIdx) {
  let start = lineIdx, end = lineIdx;
  let open = 0;
  let sawSemi = false;
  for (let i = lineIdx; i < lines.length; i++) {
    const l = lines[i];
    for (const ch of l) {
      if (ch === '{' || ch === '[' || ch === '(') open++;
      else if (ch === '}' || ch === ']' || ch === ')') open--;
      if (ch === ';' && open <= 0) { sawSemi = true; }
    }
    end = i;
    if (sawSemi && open <= 0) break;
    if (open <= 0 && l.trim().endsWith(';')) break;
    if (i - lineIdx > 30) break;
  }
  open = 0;
  for (let i = lineIdx; i >= 0; i--) {
    start = i;
    const l = lines[i];
    for (let j = l.length - 1; j >= 0; j--) {
      const ch = l[j];
      if (ch === '}' || ch === ']' || ch === ')') open++;
      else if (ch === '{' || ch === '[' || ch === '(') open--;
    }
    if (open < 0) break;
    if (l.trim().match(/^(const|let|var|import|export)\b/) && i < lineIdx) break;
  }
  return { start, end };
}

function splitTopLevel(s) {
  const parts = [];
  let depth = 0;
  let cur = '';
  let inStr = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      cur += ch;
      if (ch === inStr && s[i-1] !== '\\') inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inStr = ch;
      cur += ch;
      continue;
    }
    if (ch === '{' || ch === '[' || ch === '(') depth++;
    else if (ch === '}' || ch === ']' || ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

function isInsideImportBlock(lines, lineIdx) {
  let depth = 0;
  let sawImport = false;
  for (let i = lineIdx - 1; i >= 0 && i >= lineIdx - 50; i--) {
    const l = lines[i];
    for (const ch of l) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }
    if (/^\s*import\s/.test(l)) {
      sawImport = true;
      break;
    }
    if (depth > 0) { sawImport = true; continue; }
    if (sawImport && depth === 0) break;
  }
  return sawImport;
}

/**
 * findOpenImportBlock — 精确检测某行是否处于未闭合的 import 块内
 *
 * 算法: 从目标行向上扫描最多 50 行，寻找 import 语句起始行。
 * 找到后，从该 import 语句向下追踪括号深度到目标行，
 * 若 import 的 { 未闭合 (depth > 0) 则确认目标行在 import 块内。
 */
function findOpenImportBlock(lines, lineIdx) {
  let importStart = -1;
  for (let i = lineIdx - 1; i >= 0 && i >= lineIdx - 50; i--) {
    if (/^\s*import\s/.test(lines[i])) {
      importStart = i;
      break;
    }
  }
  if (importStart === -1) return null;

  const importLine = lines[importStart];
  if (!importLine.includes('{')) return null;

  let depth = 0;
  let sawImportOpen = false;
  for (let i = importStart; i <= lineIdx; i++) {
    const l = lines[i];
    for (const ch of l) {
      if (ch === '{') { depth++; sawImportOpen = true; }
      else if (ch === '}') depth--;
    }
    if (sawImportOpen && depth <= 0) {
      if (/from\s+['"]/.test(l) || /^\s*export\s/.test(l)) return null;
      if (i > importStart) return null;
    }
  }

  if (sawImportOpen && depth > 0) {
    return { multiLine: true };
  }

  return null;
}

// ============================================================
// Fix Functions — v3 useQuery Block Removal (merged from v3)
// ============================================================

/**
 * tryRemoveUseQueryBlock — 检测并移除 `const { ... } = useQuery(...)` 块
 *
 * 当以下条件全部满足时删除整个块:
 *   1. 起始行匹配 `const { ... } = use*(...)` 模式
 *   2. 解构中只有 1 个名称且与 varName 匹配
 *   3. 找到闭合的 `);`
 */
function tryRemoveUseQueryBlock(lines, lineIdx, varName) {
  const line = lines[lineIdx];
  const startRe = /^(\s*)(?:const|let)\s+\{([^}]*)\}\s*=\s*\w+\s*\(/;
  const m = line.match(startRe);
  if (!m) return false;

  let depth = 0;
  let endIdx = -1;
  let sawOpen = false;
  for (let i = lineIdx; i < lines.length && i < lineIdx + 200; i++) {
    const l = lines[i];
    for (const ch of l) {
      if (ch === '{') { depth++; sawOpen = true; }
      else if (ch === '}') depth--;
    }
    if (sawOpen && depth === 0) {
      if (/\)\s*;?\s*$/.test(l)) {
        endIdx = i;
        break;
      }
    }
  }
  if (endIdx === -1) return false;

  const destructureNames = m[2].split(',').map(s => s.trim()).filter(Boolean);
  const names = destructureNames.map(s => {
    const mm = s.match(/^([a-zA-Z_$][\w$]*)(?:\s*:\s*([a-zA-Z_$][\w$]*))?(?:\s*=.*)?$/);
    return mm ? (mm[2] || mm[1]) : null;
  }).filter(Boolean);

  if (names.length === 1 && names[0] === varName) {
    lines.splice(lineIdx, endIdx - lineIdx + 1);
    return true;
  }

  return false;
}

// ============================================================
// Fix Function — per-warker dispatcher (merged v8 + v3)
// ============================================================

function fixFile(filePath, fileWarnings) {
  let content;
  try { content = fs.readFileSync(filePath, 'utf8'); } catch (e) {
    stats.errors.push({ file: filePath, err: e.message });
    return;
  }
  const original = content;
  let lines = content.split('\n');
  const originalLines = lines.slice();
  let applied = 0;

  const sorted = fileWarnings.slice().sort((a, b) => b.line - a.line);

  for (const w of sorted) {
    const lineIdx = w.line - 1;
    if (lineIdx < 0 || lineIdx >= lines.length) { stats.skipped++; continue; }

    const name = w.name;
    const nameLen = name.length;
    const colHint = w.col || 1;

    let line = lines[lineIdx];
    if (!line) { stats.skipped++; continue; }

    const lineTrim = line.trim();
    const prevLine = lineIdx > 0 ? lines[lineIdx - 1] : '';
    const nextLine = lineIdx < lines.length - 1 ? lines[lineIdx + 1] : '';

    const contextBefore = lines.slice(Math.max(0, lineIdx - 5), lineIdx + 1).join('\n');
    const contextAfter = lines.slice(lineIdx, Math.min(lines.length, lineIdx + 2)).join('\n');
    const fullContext = contextBefore + '\n' + contextAfter;

    // ========== CATCH CLAUSE ==========
    if (categoryEnabled('catchClause')) {
      if (w.msg.includes('catch') || /catch\s*\(\s*\w+\s*\)/.test(line) ||
          (new RegExp('catch\\s*\\(\\s*\\b' + escapeRegExp(name) + '\\b\\s*\\)').test(line))) {
        const re = new RegExp('(catch\\s*\\(\\s*)' + escapeRegExp(name) + '(\\s*\\))');
        if (re.test(line)) {
          const newLine = line.replace(re, '$1_' + name + '$2');
          if (sameBracketDelta(line, newLine)) {
            lines[lineIdx] = newLine;
            applied++; stats.byCategory.catchClause++;
            continue;
          }
        }
      }
    }

    // ========== IMPORT (named or default) ==========
    if (categoryEnabled('importNamed') || categoryEnabled('importDefault')) {
      let isImport = false;
      let isMultiLineImport = false;
      if (lineTrim.startsWith('import ') && (line.includes('from ') || line.includes(name))) {
        isImport = true;
      } else {
        const importInfo = findOpenImportBlock(lines, lineIdx);
        if (importInfo) { isImport = true; isMultiLineImport = importInfo.multiLine; }
      }

      if (isImport) {
        // import default: `import X from 'y'` → remove whole line
        if (categoryEnabled('importDefault') && !isMultiLineImport && lineTrim.startsWith('import ') &&
            !line.includes('{') && new RegExp('\\bimport\\s+' + escapeRegExp(name) + '\\s+from').test(lineTrim)) {
          lines.splice(lineIdx, 1);
          applied++; stats.byCategory.importDefault++;
          continue;
        }

        // import named
        if (categoryEnabled('importNamed')) {
          const pos = findIdentifierPosition(line, name, colHint);
          if (pos >= 0) {
            const trimmed = line.trim();
            const onlyNameAndComma = new RegExp('^' + escapeRegExp(name) + '\\s*,?\\s*$').test(trimmed);
            if (onlyNameAndComma && isMultiLineImport) {
              lines.splice(lineIdx, 1);
              applied++; stats.byCategory.importNamed++;
              continue;
            }

            const newLine = removeIdentifierFromList(line, pos, nameLen);
            if (sameBracketDelta(line, newLine)) {
              if (/import\s*\{\s*\}\s*from/.test(newLine)) {
                lines.splice(lineIdx, 1);
                applied++; stats.byCategory.importNamed++;
                continue;
              }
              lines[lineIdx] = newLine;
              applied++; stats.byCategory.importNamed++;
              continue;
            }
          }
        }
        stats.skipped++;
        continue;
      }
    }

    // ========== FUNCTION PARAMETER ==========
    if (categoryEnabled('paramFunc')) {
      const fnRegex1 = new RegExp('function\\s*\\w*\\s*\\([^)]*\\b' + escapeRegExp(name) + '\\b');
      const fnRegex2 = new RegExp('\\([^)]*\\b' + escapeRegExp(name) + '\\b[^)]*\\)\\s*=>');
      const arrowParamNoParen = new RegExp('^\\s*' + escapeRegExp(name) + '\\s*=>');

      let isParam = false;
      if (fnRegex1.test(fullContext) || fnRegex2.test(fullContext) ||
          w.msg.includes('unused args') || arrowParamNoParen.test(line)) {
        isParam = true;
      }

      if (isParam) {
        const pos = findIdentifierPosition(line, name, colHint);
        if (pos >= 0) {
          const isDestructured = /:\s*$/.test(line.slice(0, pos)) ||
            (line.slice(0, pos).includes(':') && line.slice(pos, pos + nameLen + 1).includes(':') === false);

          if (isDestructured) {
            const afterPos = pos + nameLen;
            const hasColonAfter = /^\s*:/.test(line.slice(afterPos));
            if (hasColonAfter) {
              const rest = line.slice(afterPos);
              const m = rest.match(/^(\s*:\s*)([A-Za-z_$][\w$]*)/);
              if (m) {
                const newLine = line.slice(0, afterPos) + m[1] + '_' + m[2] + line.slice(afterPos + m[0].length);
                if (sameBracketDelta(line, newLine)) {
                  lines[lineIdx] = newLine;
                  applied++; stats.byCategory.paramFunc++;
                  continue;
                }
              }
            } else {
              const beforeIdent = line.slice(0, pos);
              const afterIdent = line.slice(pos + nameLen);
              const newLine = beforeIdent + name + ': _' + name + afterIdent;
              if (sameBracketDelta(line, newLine)) {
                lines[lineIdx] = newLine;
                applied++; stats.byCategory.paramFunc++;
                continue;
              }
            }
          } else {
            if (!line.slice(0, pos).endsWith('_')) {
              const newLine = line.slice(0, pos) + '_' + name + line.slice(pos + nameLen);
              if (sameBracketDelta(line, newLine)) {
                lines[lineIdx] = newLine;
                applied++; stats.byCategory.paramFunc++;
                continue;
              }
            }
          }
        }
        stats.skipped++;
        continue;
      }
    }

    // ========== FOR OF / FOR IN ==========
    if (categoryEnabled('forOf')) {
      const forRegex = new RegExp('for\\s*\\(\\s*(const|let|var)\\s+\\b' + escapeRegExp(name) + '\\b\\s+(of|in)');
      if (forRegex.test(fullContext)) {
        const pos = findIdentifierPosition(line, name, colHint);
        if (pos >= 0) {
          if (!line.slice(0, pos).endsWith('_')) {
            const newLine = line.slice(0, pos) + '_' + name + line.slice(pos + nameLen);
            if (sameBracketDelta(line, newLine)) {
              lines[lineIdx] = newLine;
              applied++; stats.byCategory.forOf++;
              continue;
            }
          }
        }
      }
    }

    // ========== USE QUERY BLOCK (from v3) ==========
    if (categoryEnabled('useQueryBlock')) {
      if (tryRemoveUseQueryBlock(lines, lineIdx, name)) {
        applied++; stats.byCategory.useQueryBlock++;
        continue;
      }
    }

    // ========== VAR DECL (const/let/var) ==========
    if (categoryEnabled('varDecl_plain') || categoryEnabled('varDecl_destructure')) {
      const isDeclLine = /^(const|let|var)\s/.test(lineTrim) ||
        (prevLine && /^(const|let|var)\s*\{?\s*$/.test(prevLine.trim()));

      let isMultilineDecl = false;
      let declStartLine = -1;
      for (let i = lineIdx; i >= Math.max(0, lineIdx - 15); i--) {
        const pl = lines[i].trim();
        if (/^(const|let|var)\s*\{/.test(pl) || /^(const|let|var)\s*\[/.test(pl)) {
          isMultilineDecl = true; declStartLine = i; break;
        }
        if (/^(const|let|var)\s+\w+\s*=/.test(pl) && i < lineIdx) break;
      }

      if (isDeclLine || isMultilineDecl || w.type === 'var') {
        // Single-line plain declaration
        if (categoryEnabled('varDecl_plain')) {
          const plainRegex = new RegExp('^\\s*(const|let|var)\\s+' + escapeRegExp(name) + '\\s*=\\s*.+;?\\s*$');
          if (plainRegex.test(line) && !isMultilineDecl) {
            const br = countBrackets(line);
            if (br.b === 0 && br.s === 0 && br.paren === 0) {
              lines.splice(lineIdx, 1);
              applied++; stats.byCategory.varDecl_plain++;
              continue;
            }
          }
        }

        // Multi-line destructure: target identifier alone on line with comma
        if (categoryEnabled('varDecl_destructure') && isMultilineDecl) {
          const trimmedLine = line.trim();
          const onlyNameComma = new RegExp('^' + escapeRegExp(name) + '\\s*,?\\s*$').test(trimmedLine);
          if (onlyNameComma) {
            lines.splice(lineIdx, 1);
            applied++; stats.byCategory.varDecl_destructure++;
            continue;
          }
        }

        // Same-line destructure removal
        if (categoryEnabled('varDecl_destructure') || categoryEnabled('varDecl_plain')) {
          const pos = findIdentifierPosition(line, name, colHint);
          if (pos >= 0) {
            const newLine = removeIdentifierFromList(line, pos, nameLen);
            if (sameBracketDelta(line, newLine) && newLine.trim().length > 0) {
              if (/(const|let|var)\s*\{\s*\}\s*=/.test(newLine) ||
                  /(const|let|var)\s*\[\s*\]\s*=/.test(newLine)) {
                const { start, end } = findEnclosingStatement(lines, lineIdx);
                lines = lines.slice(0, start).concat(lines.slice(end + 1));
                applied++; stats.byCategory.varDecl_destructure++;
                continue;
              }
              lines[lineIdx] = newLine;
              applied++; stats.byCategory.varDecl_destructure++;
              continue;
            }
          }
        }

        // Fallback: complex multi-line const assignment
        if (categoryEnabled('varDecl_plain') && w.type === 'var' && /^(const|let|var)\s/.test(lineTrim)) {
          const { start, end } = findEnclosingStatement(lines, lineIdx);
          const firstLine = lines[start];
          const firstRegex = new RegExp('^\\s*(const|let|var)\\s+' + escapeRegExp(name) + '\\b[^,]*$');
          if (firstRegex.test(firstLine) ||
              new RegExp('^\\s*(const|let|var)\\s+' + escapeRegExp(name) + '\\s*=').test(firstLine)) {
            const countBefore = (lines.join('\n').match(/\bconst\b/g) || []).length;
            lines.splice(start, end - start + 1);
            const countAfter = (lines.join('\n').match(/\bconst\b/g) || []).length;
            if (countBefore - countAfter <= 2) {
              applied++; stats.byCategory.varDecl_plain++;
              continue;
            } else {
              lines = originalLines.slice();
            }
          }
        }
      }
    }

    stats.skipped++;
  }

  stats.filesProcessed++;
  if (lines.join('\n') !== original) {
    if (cli.dryRun) {
      stats.filesModified++;
      stats.totalApplied += applied;
    } else {
      try {
        fs.writeFileSync(filePath, lines.join('\n'));
        stats.filesModified++;
        stats.totalApplied += applied;
      } catch (e) {
        stats.errors.push({ file: filePath, err: e.message });
      }
    }
  }
}

// ============================================================
// Main
// ============================================================

const byFile = {};
for (const w of warnings) {
  if (!byFile[w.file]) byFile[w.file] = [];
  byFile[w.file].push(w);
}

const allFiles = Object.keys(byFile);
console.log(`[fix-unused-vars] scope=${cli.scope} dryRun=${cli.dryRun}`);
console.log(`Processing ${allFiles.length} files with ${warnings.length} warnings...\n`);

for (const f of allFiles) {
  fixFile(f, byFile[f]);
}

console.log('\n==== RESULTS ====');
console.log('Scope:', cli.scope);
console.log('Files processed:', stats.filesProcessed);
console.log('Files modified:', stats.filesModified);
console.log('Total fixes applied:', stats.totalApplied);
console.log('Skipped (safe no-op):', stats.skipped);
console.log('By category:', JSON.stringify(stats.byCategory, null, 2));
if (stats.errors.length) {
  console.log('Errors:', stats.errors.length);
  stats.errors.slice(0, 5).forEach(e => console.log(' ', e.file, e.err));
}

if (cli.dryRun) {
  console.log('\n[DRY-RUN] 未写入任何文件。');
}

if (cli.output) {
  fs.writeFileSync(cli.output, JSON.stringify(stats, null, 2));
  console.log(`Stats saved to ${cli.output}`);
}