#!/usr/bin/env node
/**
 * V65.2.1 v2: 改进的未用变量修复脚本
 *
 * 改进点：
 * - 处理多行 import 块中的未用导入名（单独一行的 `Name,` 或 `type Name,`）
 * - 处理多行函数参数列表中的未用参数
 * - 处理多行 import 声明整块删除（TS6192）
 * - 更安全的解构检测（不误判 destructuring 为 param）
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { createInterface } from 'readline';

const ROOT = process.cwd();

const ERROR_RE =
  /^(.+?)\((\d+),(\d+)\): error (TS\d+): '(.+?)' is (?:declared but its value is never read|declared but never used)\./;

const fileErrors = new Map();
let skipped = 0;
let totalLines = 0;

const rl = createInterface({ input: process.stdin });
const allLines = [];

rl.on('line', (line) => allLines.push(line));
rl.on('close', () => {
  for (const line of allLines) {
    totalLines++;
    const m = line.match(ERROR_RE);
    if (!m) {
      skipped++;
      continue;
    }
    const [, filePath, lineStr, colStr, code, name] = m;
    const lineNum = parseInt(lineStr, 10);
    const col = parseInt(colStr, 10);

    if (code === 'TS6196') {
      skipped++;
      continue;
    }

    const absPath = resolve(ROOT, filePath);
    if (!fileErrors.has(absPath)) {
      fileErrors.set(absPath, []);
    }
    fileErrors.get(absPath).push({ line: lineNum, col, code, name });
  }

  let totalFixed = 0;
  let totalSkipped = 0;

  for (const [filePath, errors] of fileErrors) {
    errors.sort((a, b) => b.line - a.line);

    let content;
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch {
      totalSkipped += errors.length;
      continue;
    }

    const lines = content.split('\n');
    let fileFixed = 0;
    let fileSkipped = 0;

    for (const err of errors) {
      const idx = err.line - 1;
      if (idx < 0 || idx >= lines.length) {
        fileSkipped++;
        continue;
      }
      const sourceLine = lines[idx];
      if (sourceLine === null) {
        fileSkipped++;
        continue;
      }

      const trimmed = sourceLine.trim();

      // ============================================================
      // Case 1: TS6192 — entire import declaration unused
      // Need to find the full multi-line import block and remove it
      // ============================================================
      if (err.code === 'TS6192') {
        // Find the extent of this import block
        const { startIdx, endIdx } = findImportBlockExtent(lines, idx);
        if (startIdx !== -1 && endIdx !== -1) {
          for (let i = startIdx; i <= endIdx; i++) {
            lines[i] = null;
          }
          fileFixed++;
          continue;
        }
        fileSkipped++;
        continue;
      }

      // ============================================================
      // Case 2: TS6198 — all destructured elements unused
      // ============================================================
      if (err.code === 'TS6198') {
        lines[idx] = null;
        fileFixed++;
        continue;
      }

      // ============================================================
      // Case 3: TS6133 — specific name unused
      // ============================================================
      if (err.code === 'TS6133') {
        // Check if this line is inside a multi-line import block
        const importContext = getImportContext(lines, idx);
        if (importContext) {
          // This is a name inside an import block
          // The line is like: "  ListItemText," or "  type ModelVersion," or "  ListItemText"
          // Just remove the entire line
          if (isImportNameLine(sourceLine, err.name)) {
            lines[idx] = null;
            fileFixed++;
            continue;
          }
        }

        // Check if it's a single-line import
        if (/^\s*import\s/.test(sourceLine)) {
          const result = fixSingleLineImport(sourceLine, err.name);
          if (result !== null) {
            lines[idx] = result;
            fileFixed++;
            continue;
          }
          fileSkipped++;
          continue;
        }

        // Check if it's a multi-line function parameter
        // Line like: "  lowerQuery: string," or "  context?: Record<string, unknown>"
        const paramContext = getParamContext(lines, idx);
        if (paramContext && isParamNameLine(sourceLine, err.name)) {
          // Prefix with _
          const fixed = prefixParamInLine(sourceLine, err.name, err.col);
          if (fixed !== null) {
            lines[idx] = fixed;
            fileFixed++;
            continue;
          }
        }

        // Check if it's a function param on a single line
        const nameCol = err.col - 1;
        const beforeName = sourceLine.substring(0, nameCol);
        const afterName = sourceLine.substring(nameCol + err.name.length);
        const isParam =
          /[(,]\s*$/.test(beforeName) &&
          /^[,):=]/.test(afterName.trimStart()) &&
          !/\{[^}]*$/.test(beforeName); // not inside object destructuring
        if (isParam && !err.name.startsWith('_')) {
          const newName = `_${err.name}`;
          lines[idx] =
            sourceLine.substring(0, nameCol) +
            newName +
            sourceLine.substring(nameCol + err.name.length);
          fileFixed++;
          continue;
        }

        // Check if it's a simple local variable declaration
        // const name = ...; or let name = ...;
        const localVarRe = new RegExp(
          `^\\s*(?:const|let|var)\\s+${escapeRegex(err.name)}\\s*=`
        );
        if (localVarRe.test(sourceLine)) {
          const trimmedLine = sourceLine.trim();
          if (trimmedLine.endsWith(';') || trimmedLine.endsWith(')')) {
            lines[idx] = null;
            fileFixed++;
            continue;
          }
        }

        // Check if it's a destructuring: const { name, ... } = ...
        const destructureRe = new RegExp(
          `^\\s*(?:const|let|var)\\s+\\{[^}]*\\b${escapeRegex(err.name)}\\b[^}]*\\}\\s*=`
        );
        if (destructureRe.test(sourceLine)) {
          const result = removeFromDestructuring(sourceLine, err.name);
          if (result !== null) {
            lines[idx] = result;
            fileFixed++;
            continue;
          }
        }

        // Check if it's a useState destructuring: const [name, setter] = useState(...)
        const useStateRe = new RegExp(
          `^\\s*(?:const|let|var)\\s+\\[\\s*${escapeRegex(err.name)}\\s*,`
        );
        if (useStateRe.test(sourceLine)) {
          // Replace unused state var with _ prefix won't work for locals
          // Remove the entire line if it's a single line
          const trimmedLine = sourceLine.trim();
          if (trimmedLine.endsWith(';')) {
            lines[idx] = null;
            fileFixed++;
            continue;
          }
        }

        // Skip everything else (class properties, complex patterns, etc.)
        fileSkipped++;
        continue;
      }

      fileSkipped++;
    }

    if (fileFixed > 0) {
      const newContent = lines.filter((l) => l !== null).join('\n');
      try {
        writeFileSync(filePath, newContent, 'utf-8');
        totalFixed += fileFixed;
      } catch {
        totalSkipped += fileFixed;
      }
    }
    totalSkipped += fileSkipped;
  }

  console.log(`\n=== Fix Summary v2 ===`);
  console.log(`Total errors parsed: ${totalLines}`);
  console.log(`Total fixed: ${totalFixed}`);
  console.log(`Total skipped: ${totalSkipped + skipped}`);
});

// ============================================================
// Helper functions
// ============================================================

/**
 * Check if a line is inside a multi-line import block
 * Returns { isImport: true } if so
 */
function getImportContext(lines, idx) {
  // Look backwards for "import" keyword
  for (let i = idx; i >= Math.max(0, idx - 20); i--) {
    const line = lines[i];
    if (line === null) continue;
    if (/^\s*import\s/.test(line)) {
      return { isImport: true };
    }
    // If we hit a non-import, non-empty line that's not part of the block, stop
    if (i < idx && line.trim() && !line.trim().startsWith('//') &&
        !line.includes(',') && !line.includes('{') && !line.includes('}')) {
      return null;
    }
  }
  return null;
}

/**
 * Check if a line is just an import name (possibly with `type` prefix and/or comma)
 * Examples: "  ListItemText,", "  type ModelVersion,", "  ListItemText"
 */
function isImportNameLine(line, name) {
  const trimmed = line.trim();
  // Match: Name, or type Name, or Name or type Name
  const re = new RegExp(`^(?:type\\s+)?${escapeRegex(name)}\\s*,?\\s*$`);
  return re.test(trimmed);
}

/**
 * Check if a line is inside a multi-line function parameter list
 */
function getParamContext(lines, idx) {
  // Look backwards for opening paren of a function signature
  for (let i = idx; i >= Math.max(0, idx - 30); i--) {
    const line = lines[i];
    if (line === null) continue;
    // Check for function signature start
    if (/\)\s*[{=]/.test(line) || /^\s*\}/.test(line.trim())) {
      // We've gone past the function signature
      return null;
    }
    if (/^\s*(export\s+)?(?:async\s+)?(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(|(\w+)\s*\()/.test(line) ||
        /\(\s*$/.test(line)) {
      return { isParam: true };
    }
    // Check if this line is part of a param list (has param-like syntax)
    if (i < idx && line.trim() && !line.trim().startsWith('//') &&
        !line.trim().startsWith('*') &&
        !line.includes('(') && !line.includes(')')) {
      // Could be a param line, keep looking
      continue;
    }
  }
  return null;
}

/**
 * Check if a line is just a param name (with type annotation)
 * Examples: "  lowerQuery: string,", "  context?: Record<string, unknown>"
 */
function isParamNameLine(line, name) {
  const trimmed = line.trim();
  const re = new RegExp(`^(?:_)??${escapeRegex(name)}[??]\\s*[:?]`);
  // Simpler: just check if the name is at the start (after whitespace) followed by : or ?
  const nameRe = new RegExp(`^${escapeRegex(name)}\\s*[?:]`);
  return nameRe.test(trimmed);
}

/**
 * Prefix a parameter name with _ in a line
 */
function prefixParamInLine(line, name, col) {
  const nameCol = col - 1;
  const before = line.substring(0, nameCol);
  const after = line.substring(nameCol + name.length);
  // Verify the name is at the expected position
  if (line.substring(nameCol, nameCol + name.length) !== name) {
    return null;
  }
  return before + '_' + name + after;
}

/**
 * Find the start and end of a multi-line import block containing the given line
 */
function findImportBlockExtent(lines, idx) {
  let startIdx = -1;
  let endIdx = -1;

  // Find start (look backwards for "import")
  for (let i = idx; i >= Math.max(0, idx - 20); i--) {
    if (lines[i] === null) continue;
    if (/^\s*import\s/.test(lines[i])) {
      startIdx = i;
      break;
    }
  }

  // Find end (look forward for "from '...'" or ";" at end of line)
  for (let i = idx; i < Math.min(lines.length, idx + 30); i++) {
    if (lines[i] === null) continue;
    if (/from\s+['"].*['"]\s*;?\s*$/.test(lines[i])) {
      endIdx = i;
      break;
    }
    // Single line import
    if (i === idx && /;\s*$/.test(lines[i]) && startIdx === idx) {
      endIdx = i;
      break;
    }
  }

  return { startIdx, endIdx };
}

/**
 * Fix a single-line import by removing a name
 */
function fixSingleLineImport(line, name) {
  // If the import only has this one name, remove the entire line
  const singleRe = new RegExp(
    `^\\s*import\\s+(?:type\\s+)?\\{\\s*${escapeRegex(name)}\\s*\\}\\s*from\\s+['"]`
  );
  if (singleRe.test(line)) {
    return null; // signal to remove line
  }

  // Try removing ", name"
  let result = line.replace(new RegExp(`,\\s*${escapeRegex(name)}\\b`), '');
  if (result !== line) return result;

  // Try removing "name,"
  result = line.replace(new RegExp(`\\b${escapeRegex(name)}\\s*,\\s*`), '');
  if (result !== line) return result;

  return null;
}

/**
 * Remove a name from a destructuring pattern
 */
function removeFromDestructuring(line, name) {
  // Try ", name"
  let result = line.replace(new RegExp(`,\\s*${escapeRegex(name)}\\b`), '');
  if (result !== line) return result;

  // Try "name,"
  result = line.replace(new RegExp(`\\b${escapeRegex(name)}\\s*,\\s*`), '');
  if (result !== line) return result;

  // Try "{ name }" → remove entire line
  if (new RegExp(`\\{\\s*${escapeRegex(name)}\\s*\\}`).test(line)) {
    return null;
  }

  return null;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
