const fs = require('fs');

const warnings = require('/tmp/p8-unused-vars.json');

const byFile = {};
warnings.forEach(w => {
  if (!byFile[w.file]) byFile[w.file] = [];
  byFile[w.file].push(w);
});

const stats = {
  filesProcessed: 0,
  filesModified: 0,
  totalApplied: 0,
  skipped: 0,
  byCategory: { importNamed: 0, importDefault: 0, varDecl_plain: 0, varDecl_destructure: 0, paramFunc: 0, catchClause: 0, forOf: 0 },
  errors: []
};

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

function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

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
  
  // Case: ", Name" (preceding comma and spaces) → remove trailing comma before
  const preComma = before.match(/,\s*$/);
  // Case: "Name ," (following comma and spaces) → remove it
  const postComma = after.match(/^\s*,/);
  
  if (preComma && !postComma) {
    before = before.slice(0, before.length - preComma[0].length);
  } else if (postComma && !preComma) {
    after = after.slice(postComma[0].length);
  } else if (postComma) {
    after = after.slice(postComma[0].length);
  } else if (preComma) {
    before = before.slice(0, before.length - preComma[0].length);
  }
  
  let result = before + after;
  // Clean up: "{  ,  }" → "{ }" or "{ , }" → "{  }"
  result = result.replace(/\{\s*,/, '{').replace(/,\s*\}/, '}');
  result = result.replace(/\[\s*,/, '[').replace(/,\s*\]/, ']');
  // Clean double spaces within tokens
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

function fixFile(file, fileWarnings) {
  let content;
  try { content = fs.readFileSync(file, 'utf8'); } catch(e) { return; }
  const original = content;
  let lines = content.split('\n');
  const originalLines = lines.slice();
  let applied = 0;
  
  const sorted = fileWarnings.slice().sort((a,b) => b.line - a.line);
  
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
    
    // ========== CATCH CLAUSE ==========
    if (w.msg.includes('catch') || /catch\s*\(\s*\w+\s*\)/.test(line) || 
        (new RegExp('catch\\s*\\(\\s*\\b' + escapeRegExp(name) + '\\b\\s*\\)').test(line))) {
      const before = line;
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
    
    // ========== IMPORT (named or default) ==========
    let isImport = false;
    let isMultiLineImport = false;
    if (lineTrim.startsWith('import ') && (line.includes('from ') || line.includes(name))) {
      isImport = true;
    } else {
      for (let i = lineIdx - 1; i >= Math.max(0, lineIdx - 15); i--) {
        const pl = lines[i].trim();
        if (pl.startsWith('import {')) { isImport = true; isMultiLineImport = true; break; }
        if (pl.startsWith('import ') && pl.includes('from')) break;
      }
    }
    
    if (isImport) {
      // import default: `import X from 'y'` → remove whole line
      if (!isMultiLineImport && lineTrim.startsWith('import ') && 
          !line.includes('{') && new RegExp('\\bimport\\s+' + escapeRegExp(name) + '\\s+from').test(lineTrim)) {
        const before = line;
        // Check if previous line ends with continuation
        lines.splice(lineIdx, 1);
        applied++; stats.byCategory.importDefault++;
        continue;
      }
      
      // import named: in single line or multiline
      const pos = findIdentifierPosition(line, name, colHint);
      if (pos >= 0) {
        // Check if line is ONLY the identifier (with optional comma) → multiline destructure case
        const trimmed = line.trim();
        const onlyNameAndComma = new RegExp('^' + escapeRegExp(name) + '\\s*,?\\s*$').test(trimmed);
        if (onlyNameAndComma && isMultiLineImport) {
          lines.splice(lineIdx, 1);
          applied++; stats.byCategory.importNamed++;
          continue;
        }
        
        const newLine = removeIdentifierFromList(line, pos, nameLen);
        if (sameBracketDelta(line, newLine)) {
          // Handle resulting empty import: import { } from 'x' → remove
          if (/import\s*\{\s*\}\s*from/.test(newLine)) {
            lines.splice(lineIdx, 1);
            applied++; stats.byCategory.importNamed++;
            continue;
          }
          lines[lineIdx] = newLine;
          applied++; stats.byCategory.importNamed++;
          continue;
        }
      } else {
        // Check previous or next line if identifier was expected but not found in this line
      }
      stats.skipped++;
      continue;
    }
    
    // ========== FUNCTION PARAMETER ==========
    let isParam = false;
    // Check 5 lines before + current
    const contextBefore = lines.slice(Math.max(0, lineIdx - 5), lineIdx + 1).join('\n');
    const contextAfter = lines.slice(lineIdx, Math.min(lines.length, lineIdx + 2)).join('\n');
    const fullContext = contextBefore + '\n' + contextAfter;
    
    const fnRegex1 = new RegExp('function\\s*\\w*\\s*\\([^)]*\\b' + escapeRegExp(name) + '\\b');
    const fnRegex2 = new RegExp('\\([^)]*\\b' + escapeRegExp(name) + '\\b[^)]*\\)\\s*=>');
    const typeParamRegex = new RegExp('<[^>]*\\b' + escapeRegExp(name) + '\\b[^>]*>\\s*=');
    const arrowParamNoParen = new RegExp('^\\s*' + escapeRegExp(name) + '\\s*=>');
    
    if (fnRegex1.test(fullContext) || fnRegex2.test(fullContext) || 
        w.msg.includes('unused args') || arrowParamNoParen.test(line)) {
      isParam = true;
    }
    
    if (isParam) {
      const pos = findIdentifierPosition(line, name, colHint);
      if (pos >= 0) {
        // Destructured param: { param } → { param: _param }  OR  rename identifier
        // Check if position is inside destructured object in params
        const isDestructured = /:\s*$/.test(line.slice(0, pos)) || 
          (line.slice(0, pos).includes(':') && line.slice(pos, pos + nameLen + 1).includes(':') === false);
        
        if (isDestructured) {
          // Shorthand property rename: `name,` → `name: _name,`
          const afterPos = pos + nameLen;
          const hasColonAfter = /^\s*:/.test(line.slice(afterPos));
          if (hasColonAfter) {
            // Already has rename colon, rename right side: `name: X` → `name: _X` but wait we want to rename the param binding
            // Actually if it's `{ foo }` it's shorthand for `{ foo: foo }`. If it's `{ foo: bar }`, bar is the binding.
            // Find the identifier after colon
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
            // Shorthand → explicit rename with colon + underscore prefix
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
          // Plain identifier param: just prefix underscore
          const beforeIdent = line.slice(0, pos);
          const afterIdent = line.slice(pos + nameLen);
          // Don't double prefix if already starts with _
          if (!beforeIdent.endsWith('_')) {
            const newLine = beforeIdent + '_' + name + afterIdent;
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
    
    // ========== FOR OF / FOR IN variable ==========
    const forRegex = new RegExp('for\\s*\\(\\s*(const|let|var)\\s+\\b' + escapeRegExp(name) + '\\b\\s+(of|in)');
    if (forRegex.test(fullContext)) {
      const pos = findIdentifierPosition(line, name, colHint);
      if (pos >= 0) {
        const beforeIdent = line.slice(0, pos);
        const afterIdent = line.slice(pos + nameLen);
        if (!beforeIdent.endsWith('_')) {
          const newLine = beforeIdent + '_' + name + afterIdent;
          if (sameBracketDelta(line, newLine)) {
            lines[lineIdx] = newLine;
            applied++; stats.byCategory.forOf++;
            continue;
          }
        }
      }
    }
    
    // ========== VAR DECL (const/let/var) ==========
    const isDeclLine = /^(const|let|var)\s/.test(lineTrim) || 
      (prevLine && /^(const|let|var)\s*\{?\s*$/.test(prevLine.trim()));
    
    // Check multi-line destructure declaration
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
      // Single-line plain declaration: `const X = expr;` → remove line if simple
      const plainRegex = new RegExp('^\\s*(const|let|var)\\s+' + escapeRegExp(name) + '\\s*=\\s*.+;?\\s*$');
      if (plainRegex.test(line) && !isMultilineDecl) {
        // Check if this line has balanced brackets (if not, it's multi-line expr → skip)
        const br = countBrackets(line);
        if (br.b === 0 && br.s === 0 && br.paren === 0) {
          lines.splice(lineIdx, 1);
          applied++; stats.byCategory.varDecl_plain++;
          continue;
        }
      }
      
      // Multi-line destructure declaration, target identifier is alone on line with comma
      const trimmedLine = line.trim();
      if (isMultilineDecl) {
        const onlyNameComma = new RegExp('^' + escapeRegExp(name) + '\\s*,?\\s*$').test(trimmedLine);
        if (onlyNameComma) {
          lines.splice(lineIdx, 1);
          applied++; stats.byCategory.varDecl_destructure++;
          continue;
        }
      }
      
      // Same-line destructure: `const { A, B, C } = ...` → remove identifier + comma
      const pos = findIdentifierPosition(line, name, colHint);
      if (pos >= 0) {
        const newLine = removeIdentifierFromList(line, pos, nameLen);
        // Validate that braces still balance AND it's not removing the only var
        if (sameBracketDelta(line, newLine) && newLine.trim().length > 0) {
          // Empty destructure result: `const {} = x;` → remove whole statement (find multi-line)
          if (/(const|let|var)\s*\{\s*\}\s*=/.test(newLine) ||
              /(const|let|var)\s*\[\s*\]\s*=/.test(newLine)) {
            const { start, end } = findEnclosingStatement(lines, lineIdx);
            const newLines = lines.slice(0, start).concat(lines.slice(end + 1));
            lines = newLines;
            applied++; stats.byCategory.varDecl_destructure++;
            continue;
          }
          lines[lineIdx] = newLine;
          applied++; stats.byCategory.varDecl_destructure++;
          continue;
        }
      }
      
      // Fallback: complex multi-line const assignment (e.g., `const name = fn(\n...`)
      // Try to remove entire statement by bracket balance
      if (w.type === 'var' && /^(const|let|var)\s/.test(lineTrim)) {
        const { start, end } = findEnclosingStatement(lines, lineIdx);
        const beforeJoin = lines.slice(start, end + 1).join('\n');
        const afterJoin = '';
        // Only remove if statement doesn't contain other declarations (single name on first line)
        const firstLine = lines[start];
        const firstRegex = new RegExp('^\\s*(const|let|var)\\s+' + escapeRegExp(name) + '\\b[^,]*$');
        if (firstRegex.test(firstLine) || 
            new RegExp('^\\s*(const|let|var)\\s+' + escapeRegExp(name) + '\\s*=').test(firstLine)) {
          const countBefore = (lines.join('\n').match(/\bconst\b/g) || []).length;
          lines.splice(start, end - start + 1);
          const countAfter = (lines.join('\n').match(/\bconst\b/g) || []).length;
          // Basic sanity: should have only removed 0 or 1 const occurrences
          if (countBefore - countAfter <= 2) {
            applied++; stats.byCategory.varDecl_plain++;
            continue;
          } else {
            // Restore
            lines = originalLines.slice();
          }
        }
      }
    }
    
    stats.skipped++;
  }
  
  stats.filesProcessed++;
  if (lines.join('\n') !== original) {
    try {
      fs.writeFileSync(file, lines.join('\n'));
      stats.filesModified++;
      stats.totalApplied += applied;
    } catch(e) {
      stats.errors.push({ file, err: e.message });
    }
  }
}

// Actually run
const allFiles = Object.keys(byFile);
console.log('Processing', allFiles.length, 'files with', warnings.length, 'warnings...');

allFiles.forEach(f => fixFile(f, byFile[f]));

console.log('\n==== PASS 2 (v8 script) RESULTS ====');
console.log('Files processed:', stats.filesProcessed);
console.log('Files modified:', stats.filesModified);
console.log('Total fixes applied:', stats.totalApplied);
console.log('Skipped warnings (safe no-op):', stats.skipped);
console.log('By category:', JSON.stringify(stats.byCategory, null, 2));
if (stats.errors.length) {
  console.log('Errors:', stats.errors.length);
  stats.errors.slice(0, 5).forEach(e => console.log(' ', e.file, e.err));
}

// Write stats
fs.writeFileSync('/tmp/p8-pass2-stats.json', JSON.stringify(stats, null, 2));
console.log('Stats saved to /tmp/p8-pass2-stats.json');
