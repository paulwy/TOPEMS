#!/usr/bin/env node
/**
 * V223: Enhanced i18n batch replacement for complex patterns
 *
 * Handles patterns NOT covered by existing scripts (batch-i18n-enhanced.cjs etc.):
 * 1. Object property keys (unquoted Chinese): 项目名称: value -> [i18n.t('key')]: value
 * 2. Logger/console/error call args: logger.error('创建报表失败:', err) -> logger.error(i18n.t('key'), err)
 * 3. Standalone JSX text: Chinese-only line between tags -> {i18n.t('key')}
 * 4. JSX text with inline {expr}: 共 {count} 项 -> {i18n.t('key', {count})}
 * 5. Chinese in ternary/conditional: {x ? '中文' : ...} -> {x ? i18n.t('key') : ...}
 * 6. Mixed i18n.t() + raw Chinese: 暂无工作流，点击i18n.t('k')开始 -> split & wrap
 * 7. Throw new Error('中文') -> throw new Error(i18n.t('key'))
 * 8. String literals in function args (non-JSX context)
 * 9. Chinese in arrow function return: () => '中文'
 *
 * Usage:
 *   node scripts/i18n/batch-i18n-v223.cjs --dir pages --module pages
 *   node scripts/i18n/batch-i18n-v223.cjs --dir components --module components
 *   node scripts/i18n/batch-i18n-v223.cjs --dir ai --module ai
 */

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '../../apps/web/src');
const I18N_DIR = path.join(WEB_ROOT, 'i18n', 'locales');

const args = process.argv.slice(2);
const dirIdx = args.indexOf('--dir');
const targetDir = dirIdx !== -1 ? args[dirIdx + 1] : '';
const modIdx = args.indexOf('--module');
const moduleName = modIdx !== -1 ? args[modIdx + 1] : '';
const dryRun = args.includes('--dry');
const verbose = args.includes('--verbose');

const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff]/;
const CJK_CHARS = '\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff';
const CJK_PUNCT = '：，。、（）()·\\-—\\!！？%／·…';
const CJK_CLASS = `[${CJK_CHARS}${CJK_PUNCT}]`;

if (!targetDir || !moduleName) {
  console.error('Usage: --dir <relative-to-src> --module <namespace> [--dry] [--verbose]');
  process.exit(1);
}

const BASE_DIR = path.join(WEB_ROOT, targetDir);

function fileLabel(filePath) {
  const b = path.basename(filePath).replace(/\.[mc]?[tj]sx?$/, '');
  const s1 = b.replace(/(.)([A-Z][a-z]+)/g, '$1_$2');
  return s1.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function collectFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['__tests__', 'node_modules', 'test', 'tests', 'dist', 'build'].includes(entry.name)) continue;
      results.push(...collectFiles(fullPath));
    } else if ((entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
               !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.tsx') &&
               !entry.name.endsWith('.d.ts') && !entry.name.endsWith('.stories.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

function loadJson(filepath) {
  try { return JSON.parse(fs.readFileSync(filepath, 'utf-8')); } catch { return {}; }
}

function saveJson(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function shouldSkipLine(line) {
  const t = line.trim();
  if (!t) return true;
  if (t.startsWith('//')) return true;
  if (t.startsWith('*') || t.startsWith('/*')) return true;
  if (t.startsWith('import ')) return true;
  return false;
}

function generateKey(moduleName, fl, text, index) {
  const prefix = `${moduleName}.${fl}`;
  const hash = text.length <= 15
    ? text.replace(new RegExp(`[${CJK_CHARS}]`, 'g'), '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
    : '';
  return hash ? `${prefix}.${hash}_${index}` : `${prefix}.k${index}`;
}

function ensureI18nImport(lines) {
  const usesI18n = lines.some(l => /i18n\.t\s*\(/.test(l) && !/import/.test(l));
  const hasImport = lines.some(l =>
    /import\s+i18n\s+from\s+['"]@\/i18n['"]/.test(l) ||
    /import\s+\{\s*i18n\s*\}/.test(l)
  );
  if (usesI18n && !hasImport) {
    let lastImport = -1;
    let inMultiLineImport = false;
    for (let i = 0; i < lines.length; i++) {
      const lt = lines[i].trim();
      if (lt.startsWith('import ')) {
        lastImport = i;
        if (lt.includes('{') && !lt.includes('}')) {
          inMultiLineImport = true;
        } else {
          inMultiLineImport = false;
        }
      } else if (inMultiLineImport) {
        if (lines[i].includes('}')) {
          inMultiLineImport = false;
          lastImport = i;
        }
      } else if (lastImport >= 0 && !lt.startsWith('import') && lt !== '') {
        break;
      }
    }
    if (lastImport >= 0) {
      lines.splice(lastImport + 1, 0, "import i18n from '@/i18n';");
      return true;
    } else {
      lines.unshift("import i18n from '@/i18n';");
      return true;
    }
  }
  return false;
}

// Check if a position is inside an existing i18n.t() call
function isInsideI18nCall(line, pos) {
  const before = line.substring(0, pos);
  const lastI18n = before.lastIndexOf('i18n.t(');
  if (lastI18n === -1) return false;
  const afterI18n = before.substring(lastI18n);
  const openParens = (afterI18n.match(/\(/g) || []).length;
  const closeParens = (afterI18n.match(/\)/g) || []).length;
  return openParens > closeParens;
}

// Extract all Chinese-containing string literals from a line (single/double quoted)
function extractStringLiterals(line) {
  const results = [];
  const re = new RegExp(
    `(['"])((?:[^'"\\\\\\n]|\\\\.)*[${CJK_CHARS}](?:[^'"\\\\\\n]|\\\\.)*)\\1`,
    'g'
  );
  let m;
  while ((m = re.exec(line)) !== null) {
    if (!CJK_RE.test(m[2])) continue;
    if (isInsideI18nCall(line, m.index)) continue;
    results.push({
      text: m[2],
      quote: m[1],
      full: m[0],
      offset: m.index,
      end: m.index + m[0].length,
    });
  }
  return results;
}

// Extract Chinese-containing template literals (backtick)
function extractTemplateLiterals(line) {
  const results = [];
  const re = new RegExp(
    `\`((?:[^\`\\\\]|\\\\.)*[${CJK_CHARS}](?:[^\`\\\\]|\\\\.)*)\``,
    'g'
  );
  let m;
  while ((m = re.exec(line)) !== null) {
    if (!CJK_RE.test(m[1])) continue;
    if (isInsideI18nCall(line, m.index)) continue;
    const content = m[1];
    const hasInterpolation = content.includes('${');

    if (hasInterpolation) {
      const chunks = [];
      const interpRe = /\$\{([^}]*)\}/g;
      let lastEnd = 0;
      let im;
      while ((im = interpRe.exec(content)) !== null) {
        if (im.index > lastEnd) {
          chunks.push({ type: 'text', value: content.substring(lastEnd, im.index) });
        }
        chunks.push({ type: 'expr', value: im[1] });
        lastEnd = im.index + im[0].length;
      }
      if (lastEnd < content.length) {
        chunks.push({ type: 'text', value: content.substring(lastEnd) });
      }
      results.push({
        type: 'template_interp',
        content,
        chunks,
        full: m[0],
        offset: m.index,
        end: m.index + m[0].length,
      });
    } else {
      results.push({
        type: 'template_simple',
        content,
        full: m[0],
        offset: m.index,
        end: m.index + m[0].length,
      });
    }
  }
  return results;
}

// Pattern 1: Object property keys (unquoted Chinese)
// Match:  Chinese_word:  at start of line (with optional whitespace)
// But NOT if preceded by . (method call) or inside a string
function matchObjectKeys(line) {
  const results = [];
  // Match unquoted Chinese keys: start of trimmed line or after { or , 
  const re = new RegExp(
    `(^|\\{|\\,)\\s*([${CJK_CHARS}][${CJK_CHARS}\\w·]*?)\\s*:`,
    'g'
  );
  let m;
  while ((m = re.exec(line)) !== null) {
    const key = m[2];
    if (!CJK_RE.test(key)) continue;
    // Skip if this is actually inside a string
    const before = line.substring(0, m.index + m[1].length);
    const lastQuote = Math.max(before.lastIndexOf("'"), before.lastIndexOf('"'));
    const lastBacktick = before.lastIndexOf('`');
    const maxStr = Math.max(lastQuote, lastBacktick);
    if (maxStr >= 0) {
      const afterStr = line.substring(maxStr);
      const strContent = afterStr.substring(1);
      const closingQuote = afterStr.indexOf(strContent[0], 1);
      if (closingQuote === -1 || m.index < maxStr + closingQuote) continue;
    }
    // Skip if preceded by ? (optional chaining) or . (method)
    const charBefore = before.trim().slice(-1);
    if (charBefore === '.' || charBefore === '?') continue;

    const keyOffset = m.index + m[1].length + (m[0].length - m[1].length - key.length - 1);
    const keyEnd = keyOffset + key.length;

    results.push({
      type: 'object_key',
      key,
      prefix: m[1],
      full: m[0],
      offset: m.index,
      end: m.index + m[0].length,
      keyOffset,
      keyEnd,
    });
  }
  return results;
}

// Pattern 2: Logger/console/error call arguments
// Match: logger.xxx('中文' or console.xxx('中文' or new Error('中文'
function matchLoggerCalls(line) {
  const results = [];
  // Match function calls with Chinese string as first argument
  const re = new RegExp(
    `(logger\\.(?:error|warn|info|debug|log)|console\\.(?:error|warn|info|log|debug)|apiLogger\\.(?:error|warn|info)|throw new Error)\\(\\s*(['"])((?:[^'"\\\\\\n]|\\\\.)*[${CJK_CHARS}](?:[^'"\\\\\\n]|\\\\.)*)\\2`,
    'g'
  );
  let m;
  while ((m = re.exec(line)) !== null) {
    if (!CJK_RE.test(m[3])) continue;
    if (isInsideI18nCall(line, m.index)) continue;
    results.push({
      type: 'logger_call',
      fn: m[1],
      text: m[3],
      quote: m[2],
      full: m[0],
      offset: m.index,
      end: m.index + m[0].length,
    });
  }
  return results;
}

// Pattern 3: Standalone JSX text (Chinese-only line between tags)
// Match:  ^\s*Chinese_text\s*$  where the surrounding lines have JSX tags
function matchStandaloneJSXText(line, prevLine, nextLine) {
  const t = line.trim();
  if (!t || !CJK_RE.test(t)) return null;
  // Must be Chinese-only (no JSX tags, no code, no expressions except maybe {' '})
  if (/[<>{}]/.test(t)) return null;
  // Must be between JSX tags (prev line ends with > and next starts with <)
  const prevEnds = prevLine && prevLine.trim().endsWith('>');
  const nextStarts = nextLine && nextLine.trim().startsWith('<');
  if (!prevEnds && !nextStarts) return null;
  // Skip if already i18n.t()
  if (/i18n\.t\s*\(/.test(t)) return null;
  return {
    type: 'standalone_jsx',
    text: t,
    offset: line.indexOf(t),
    end: line.indexOf(t) + t.length,
  };
}

// Pattern 4: JSX text with inline {expression}
// Match: >Chinese {expr} more Chinese<
function matchJSXTextWithExpr(line) {
  const results = [];
  // Match text between > and < that contains both Chinese and {expressions}
  const re = new RegExp(
    `>([\\s]*[${CJK_CHARS}](?:[^<]*[${CJK_CHARS}]?)*?\\{[^}]+\\}[^<]*)<`,
    'g'
  );
  let m;
  while ((m = re.exec(line)) !== null) {
    const text = m[1];
    if (!CJK_RE.test(text)) continue;
    if (/i18n\.t\s*\(/.test(text)) continue;
    results.push({
      type: 'jsx_text_expr',
      text: text.trim(),
      full: m[0],
      offset: m.index,
      end: m.index + m[0].length,
    });
  }
  return results;
}

// Pattern 5: Chinese in ternary/conditional expressions
// Match: ? 'Chinese text' :  or && 'Chinese text'
function matchTernaryChinese(line) {
  const results = [];
  // Match Chinese strings in ternary branches: ? '中文' : or : '中文'
  const re = new RegExp(
    `(\\?\\s*)(['"])((?:[^'"\\\\\\n]|\\\\.)*[${CJK_CHARS}](?:[^'"\\\\\\n]|\\\\.)*)\\2`,
    'g'
  );
  let m;
  while ((m = re.exec(line)) !== null) {
    if (!CJK_RE.test(m[3])) continue;
    if (isInsideI18nCall(line, m.index)) continue;
    results.push({
      type: 'ternary_branch',
      text: m[3],
      quote: m[2],
      prefix: m[1],
      full: m[0],
      offset: m.index,
      end: m.index + m[0].length,
    });
  }
  // Also match && 'Chinese text'
  const re2 = new RegExp(
    `(&&\\s*)(['"])((?:[^'"\\\\\\n]|\\\\.)*[${CJK_CHARS}](?:[^'"\\\\\\n]|\\\\.)*)\\2`,
    'g'
  );
  while ((m = re2.exec(line)) !== null) {
    if (!CJK_RE.test(m[3])) continue;
    if (isInsideI18nCall(line, m.index)) continue;
    const overlaps = results.some(r => m.index < r.end && m.index + m[0].length > r.offset);
    if (overlaps) continue;
    results.push({
      type: 'conditional_and',
      text: m[3],
      quote: m[2],
      prefix: m[1],
      full: m[0],
      offset: m.index,
      end: m.index + m[0].length,
    });
  }
  return results;
}

// Pattern 6: Mixed i18n.t() + raw Chinese text
// Match lines that have both i18n.t() and raw Chinese outside of it
function matchMixedI18nRaw(line) {
  if (!/i18n\.t\s*\(/.test(line)) return null;
  if (!CJK_RE.test(line)) return null;

  // Find all Chinese text that is NOT inside i18n.t() calls
  const chineseSegments = [];
  const re = new RegExp(`[${CJK_CHARS}][${CJK_CHARS}${CJK_PUNCT}\\s\\w:：，。、（）()·\\-—\\!！？%／·…]*`, 'g');
  let m;
  while ((m = re.exec(line)) !== null) {
    const text = m[0].trim();
    if (!text || !CJK_RE.test(text)) continue;
    if (isInsideI18nCall(line, m.index)) continue;
    // Skip if this segment is inside a string literal that's already an i18n arg
    chineseSegments.push({
      text,
      offset: m.index,
      end: m.index + m[0].length,
    });
  }

  if (chineseSegments.length === 0) return null;
  return chineseSegments;
}

// Pattern 7: Arrow function returning Chinese string
// Match: => '中文' or => `中文`
function matchArrowReturn(line) {
  const results = [];
  const re = new RegExp(
    `=>\\s*(['"\`])((?:[^'"\\\`\\\\\\n]|\\\\.)*[${CJK_CHARS}](?:[^'"\\\`\\\\\\n]|\\\\.)*)\\1`,
    'g'
  );
  let m;
  while ((m = re.exec(line)) !== null) {
    if (!CJK_RE.test(m[2])) continue;
    if (isInsideI18nCall(line, m.index)) continue;
    results.push({
      type: 'arrow_return',
      text: m[2],
      quote: m[1],
      full: m[0],
      offset: m.index,
      end: m.index + m[0].length,
    });
  }
  return results;
}

// Pattern 8: Chinese in JSX expression container (not ternary)
// Match: {'Chinese text'} inside JSX
function matchJSXExprContainer(line) {
  const results = [];
  const re = new RegExp(
    `\\{(['"])((?:[^'"\\\\\\n]|\\\\.)*[${CJK_CHARS}](?:[^'"\\\\\\n]|\\\\.)*)\\1\\}`,
    'g'
  );
  let m;
  while ((m = re.exec(line)) !== null) {
    if (!CJK_RE.test(m[2])) continue;
    if (isInsideI18nCall(line, m.index)) continue;
    // Skip if this is actually a ternary (handled by matchTernaryChinese)
    const before = line.substring(0, m.index);
    if (before.endsWith('?') || before.endsWith(':') || before.endsWith('&&')) continue;
    results.push({
      type: 'jsx_expr_container',
      text: m[2],
      quote: m[1],
      full: m[0],
      offset: m.index,
      end: m.index + m[0].length,
    });
  }
  return results;
}

function processFile(filePath, moduleName, translations) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const fl = fileLabel(filePath);
  let keyCounter = 0;
  let replacedCount = 0;
  const newLines = [...lines];
  let usesI18n = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (shouldSkipLine(line) || !CJK_RE.test(line)) continue;

    let modifiedLine = line;
    const replacements = [];

    // 1. Object property keys
    const objKeys = matchObjectKeys(line);
    for (const seg of objKeys) {
      // Check not overlapping with existing replacements
      if (replacements.some(r => seg.keyOffset < r.end && seg.keyEnd > r.offset)) continue;
      const key = generateKey(moduleName, fl, seg.key, keyCounter++);
      if (!(key in translations.zh)) {
        translations.zh[key] = seg.key;
        translations.en[key] = seg.key;
      }
      // Replace the unquoted key with [i18n.t('key')]
      const before = modifiedLine.substring(0, seg.keyOffset);
      const after = modifiedLine.substring(seg.keyEnd);
      // Find the colon position
      const colonIdx = after.indexOf(':');
      if (colonIdx >= 0) {
        const newSeg = `${before}[i18n.t('${key}')]${after}`;
        replacements.push({
          oldText: modifiedLine.substring(seg.keyOffset, seg.keyEnd),
          newText: `[i18n.t('${key}')]`,
          offset: seg.keyOffset,
          end: seg.keyEnd,
          newLine: newSeg,
        });
        usesI18n = true;
        replacedCount++;
        if (verbose) console.log(`  L${i+1}: objkey "${seg.key}" -> [i18n.t('${key}')]`);
      }
    }

    // Sort replacements by offset descending for safe replacement
    replacements.sort((a, b) => b.offset - a.offset);
    for (const rep of replacements) {
      modifiedLine = rep.newLine;
    }
    replacements.length = 0; // Clear for next pattern

    // 2. Logger/console/error calls
    const loggerCalls = matchLoggerCalls(modifiedLine);
    for (const seg of loggerCalls) {
      if (replacements.some(r => seg.offset < r.end && seg.end > r.offset)) continue;
      const key = generateKey(moduleName, fl, seg.text, keyCounter++);
      if (!(key in translations.zh)) {
        translations.zh[key] = seg.text;
        translations.en[key] = seg.text;
      }
      const replacement = `${seg.fn}(i18n.t('${key}')`;
      replacements.push({
        offset: seg.offset,
        end: seg.end,
        newLine: modifiedLine.substring(0, seg.offset) + replacement + modifiedLine.substring(seg.end),
      });
      usesI18n = true;
      replacedCount++;
      if (verbose) console.log(`  L${i+1}: logger "${seg.text}" -> i18n.t('${key}')`);
    }
    replacements.sort((a, b) => b.offset - a.offset);
    for (const rep of replacements) {
      modifiedLine = rep.newLine;
    }
    replacements.length = 0;

    // 3. Standalone JSX text
    const prevLine = i > 0 ? lines[i - 1] : '';
    const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
    const standalone = matchStandaloneJSXText(modifiedLine, prevLine, nextLine);
    if (standalone) {
      const key = generateKey(moduleName, fl, standalone.text, keyCounter++);
      if (!(key in translations.zh)) {
        translations.zh[key] = standalone.text;
        translations.en[key] = standalone.text;
      }
      const indent = modifiedLine.substring(0, standalone.offset);
      modifiedLine = `${indent}{i18n.t('${key}')}`;
      usesI18n = true;
      replacedCount++;
      if (verbose) console.log(`  L${i+1}: standalone "${standalone.text}" -> {i18n.t('${key}')}`);
    }

    // 4. Template literals (simple and with interpolation)
    const templates = extractTemplateLiterals(modifiedLine);
    for (const seg of templates) {
      if (replacements.some(r => seg.offset < r.end && seg.end > r.offset)) continue;
      if (seg.type === 'template_simple') {
        const key = generateKey(moduleName, fl, seg.content, keyCounter++);
        if (!(key in translations.zh)) {
          translations.zh[key] = seg.content;
          translations.en[key] = seg.content;
        }
        const before = modifiedLine.substring(0, seg.offset);
        // Check if this is a JSX attribute (preceded by word=)
        const jsxAttrMatch = before.match(/(\w+)=$/);
        if (jsxAttrMatch) {
          const replacement = `${jsxAttrMatch[1]}={i18n.t('${key}')}`;
          replacements.push({
            offset: seg.offset - jsxAttrMatch[1].length - 1,
            end: seg.end,
            newLine: modifiedLine.substring(0, seg.offset - jsxAttrMatch[1].length - 1) + replacement + modifiedLine.substring(seg.end),
          });
        } else {
          replacements.push({
            offset: seg.offset,
            end: seg.end,
            newLine: modifiedLine.substring(0, seg.offset) + `i18n.t('${key}')` + modifiedLine.substring(seg.end),
          });
        }
        usesI18n = true;
        replacedCount++;
        if (verbose) console.log(`  L${i+1}: template \`${seg.content}\` -> i18n.t('${key}')`);
      } else if (seg.type === 'template_interp') {
        // Replace Chinese text chunks in the template literal
        let newContent = '';
        for (const chunk of seg.chunks) {
          if (chunk.type === 'expr') {
            newContent += '${' + chunk.value + '}';
          } else if (CJK_RE.test(chunk.value)) {
            const trimmed = chunk.value.trim();
            if (trimmed) {
              const key = generateKey(moduleName, fl, trimmed, keyCounter++);
              if (!(key in translations.zh)) {
                translations.zh[key] = trimmed;
                translations.en[key] = trimmed;
              }
              // Preserve leading/trailing whitespace
              const leading = chunk.value.substring(0, chunk.value.length - chunk.value.trimStart().length);
              const trailing = chunk.value.substring(chunk.value.trimEnd().length);
              newContent += leading + '${i18n.t(\'' + key + '\')}' + trailing;
              usesI18n = true;
              replacedCount++;
              if (verbose) console.log(`  L${i+1}: template chunk "${trimmed}" -> i18n.t('${key}')`);
            } else {
              newContent += chunk.value;
            }
          } else {
            newContent += chunk.value;
          }
        }
        const replacement = '`' + newContent + '`';
        replacements.push({
          offset: seg.offset,
          end: seg.end,
          newLine: modifiedLine.substring(0, seg.offset) + replacement + modifiedLine.substring(seg.end),
        });
      }
    }
    replacements.sort((a, b) => b.offset - a.offset);
    for (const rep of replacements) {
      modifiedLine = rep.newLine;
    }
    replacements.length = 0;

    // 5. Ternary/conditional Chinese
    const ternaries = matchTernaryChinese(modifiedLine);
    for (const seg of ternaries) {
      if (replacements.some(r => seg.offset < r.end && seg.end > r.offset)) continue;
      const key = generateKey(moduleName, fl, seg.text, keyCounter++);
      if (!(key in translations.zh)) {
        translations.zh[key] = seg.text;
        translations.en[key] = seg.text;
      }
      const replacement = `${seg.prefix}i18n.t('${key}')`;
      replacements.push({
        offset: seg.offset,
        end: seg.end,
        newLine: modifiedLine.substring(0, seg.offset) + replacement + modifiedLine.substring(seg.end),
      });
      usesI18n = true;
      replacedCount++;
      if (verbose) console.log(`  L${i+1}: ternary "${seg.text}" -> i18n.t('${key}')`);
    }
    replacements.sort((a, b) => b.offset - a.offset);
    for (const rep of replacements) {
      modifiedLine = rep.newLine;
    }
    replacements.length = 0;

    // 6. Arrow function returns
    const arrows = matchArrowReturn(modifiedLine);
    for (const seg of arrows) {
      if (replacements.some(r => seg.offset < r.end && seg.end > r.offset)) continue;
      const key = generateKey(moduleName, fl, seg.text, keyCounter++);
      if (!(key in translations.zh)) {
        translations.zh[key] = seg.text;
        translations.en[key] = seg.text;
      }
      const replacement = `=> i18n.t('${key}')`;
      replacements.push({
        offset: seg.offset,
        end: seg.end,
        newLine: modifiedLine.substring(0, seg.offset) + replacement + modifiedLine.substring(seg.end),
      });
      usesI18n = true;
      replacedCount++;
      if (verbose) console.log(`  L${i+1}: arrow "${seg.text}" -> i18n.t('${key}')`);
    }
    replacements.sort((a, b) => b.offset - a.offset);
    for (const rep of replacements) {
      modifiedLine = rep.newLine;
    }
    replacements.length = 0;

    // 7. String literals (broad - catches remaining quoted Chinese)
    const strLits = extractStringLiterals(modifiedLine);
    for (const seg of strLits) {
      if (replacements.some(r => seg.offset < r.end && seg.end > r.offset)) continue;
      // Skip if it's an object key (already handled)
      const after = modifiedLine.substring(seg.end);
      if (/^\s*:/.test(after)) continue;
      // Skip if it's a type/enum value
      const before = modifiedLine.substring(0, seg.offset);
      if (/=\s*$/.test(before) && !/return\s*$/.test(before) && !/\?\s*$/.test(before)) {
        // This is an assignment, likely a variable value - still replace
      }

      const key = generateKey(moduleName, fl, seg.text, keyCounter++);
      if (!(key in translations.zh)) {
        translations.zh[key] = seg.text;
        translations.en[key] = seg.text;
      }
      // Check if preceded by JSX attribute (word=)
      const jsxAttrMatch = before.match(/(\w+)=$/);
      if (jsxAttrMatch) {
        const replacement = `${jsxAttrMatch[1]}={i18n.t('${key}')}`;
        replacements.push({
          offset: seg.offset - jsxAttrMatch[1].length - 1,
          end: seg.end,
          newLine: modifiedLine.substring(0, seg.offset - jsxAttrMatch[1].length - 1) + replacement + modifiedLine.substring(seg.end),
        });
      } else {
        replacements.push({
          offset: seg.offset,
          end: seg.end,
          newLine: modifiedLine.substring(0, seg.offset) + `i18n.t('${key}')` + modifiedLine.substring(seg.end),
        });
      }
      usesI18n = true;
      replacedCount++;
      if (verbose) console.log(`  L${i+1}: strlit "${seg.text}" -> i18n.t('${key}')`);
    }
    replacements.sort((a, b) => b.offset - a.offset);
    for (const rep of replacements) {
      modifiedLine = rep.newLine;
    }
    replacements.length = 0;

    // 8. JSX text between > and < (single line, broader)
    const jsxTextRe = new RegExp(
      `>([\\s]*[${CJK_CHARS}][${CJK_CHARS}\\s\\w：，。、（）()·\\-—\\!！？%\\.\\,，]*?[\\s]*)<`,
      'g'
    );
    let jtm;
    while ((jtm = jsxTextRe.exec(modifiedLine)) !== null) {
      const text = jtm[1].trim();
      if (!text || !CJK_RE.test(text)) continue;
      if (/i18n\.t\s*\(/.test(jtm[0])) continue;
      if (replacements.some(r => jtm.index < r.end && jtm.index + jtm[0].length > r.offset)) continue;

      const key = generateKey(moduleName, fl, text, keyCounter++);
      if (!(key in translations.zh)) {
        translations.zh[key] = text;
        translations.en[key] = text;
      }
      replacements.push({
        offset: jtm.index,
        end: jtm.index + jtm[0].length,
        newLine: modifiedLine.substring(0, jtm.index) + `>{i18n.t('${key}')}<` + modifiedLine.substring(jtm.index + jtm[0].length),
      });
      usesI18n = true;
      replacedCount++;
      if (verbose) console.log(`  L${i+1}: jsxtext "${text}" -> {i18n.t('${key}')}`);
    }
    replacements.sort((a, b) => b.offset - a.offset);
    for (const rep of replacements) {
      modifiedLine = rep.newLine;
    }
    replacements.length = 0;

    // 9. Mixed i18n.t() + raw Chinese text (DISABLED - causes TSC errors)
    // The mixed pattern handler is too aggressive and corrupts JSX/template syntax.
    // These remaining cases need manual handling.

    if (modifiedLine !== line) {
      newLines[i] = modifiedLine;
    }
  }

  if (usesI18n) {
    ensureI18nImport(newLines);
  }

  if (!dryRun && replacedCount > 0) {
    fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
  }

  return { replacedCount, fileLabel: fl };
}

// Main
const files = collectFiles(BASE_DIR);
if (files.length === 0) {
  console.log(`目录 ${BASE_DIR} 无 .ts/.tsx 文件`);
  process.exit(0);
}

const translations = { zh: {}, en: {} };
const zhNsPath = path.join(I18N_DIR, 'zh', `${moduleName}.json`);
const enNsPath = path.join(I18N_DIR, 'en', `${moduleName}.json`);
translations.zh = loadJson(zhNsPath);
translations.en = loadJson(enNsPath);

console.log(`\n📦 V223 ${targetDir} (${files.length} 文件, namespace=${moduleName})`);

const results = [];
let totalReplaced = 0;

for (const file of files) {
  const result = processFile(file, moduleName, translations);
  if (result.replacedCount > 0) {
    results.push(result);
    totalReplaced += result.replacedCount;
    const rel = path.relative(BASE_DIR, file);
    console.log(`  ✅ ${rel}: ${result.replacedCount} 处替换`);
  }
}

if (!dryRun && totalReplaced > 0) {
  saveJson(zhNsPath, translations.zh);
  saveJson(enNsPath, translations.en);
  console.log(`  💾 翻译条目已保存: zh/${moduleName}.json, en/${moduleName}.json`);
}

console.log(`  总计: ${totalReplaced} 处替换${dryRun ? ' (DRY RUN)' : ''}`);
console.log(`\n==================================================`);
console.log(`V223 总计替换: ${totalReplaced} 处${dryRun ? ' (DRY RUN)' : ''}`);
