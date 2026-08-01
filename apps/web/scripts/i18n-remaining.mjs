import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const CHINESE_RE = /[\u4e00-\u9fff]/;

function getModuleObj(module) {
  const filePath = path.join(projectRoot, 'src', 'i18n', 'locales', 'zh', `${module}.json`);
  if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return {};
}

function saveModuleObj(module, obj) {
  const filePath = path.join(projectRoot, 'src', 'i18n', 'locales', 'zh', `${module}.json`);
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n', 'utf-8');
}

function getZhObj() {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, 'src', 'i18n', 'locales', 'zh.json'), 'utf-8'));
}

function saveZhObj(obj) {
  fs.writeFileSync(path.join(projectRoot, 'src', 'i18n', 'locales', 'zh.json'), JSON.stringify(obj, null, 2) + '\n', 'utf-8');
}

function flatten(obj, prefix = '') {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      Object.assign(result, flatten(v, key));
    } else if (typeof v === 'string') {
      result[key] = v;
    }
  }
  return result;
}

function unflatten(flat) {
  const result = {};
  for (const [k, v] of Object.entries(flat)) {
    const parts = k.split('.');
    let target = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!target[parts[i]] || typeof target[parts[i]] !== 'object') target[parts[i]] = {};
      target = target[parts[i]];
    }
    target[parts[parts.length - 1]] = v;
  }
  return result;
}

function deepMerge(base, override) {
  const result = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, v] of Object.entries(override)) {
    if (k in result && typeof result[k] === 'object' && result[k] !== null && !Array.isArray(result[k]) && typeof v === 'object' && v !== null && !Array.isArray(v)) {
      result[k] = deepMerge(result[k], v);
    } else {
      result[k] = v;
    }
  }
  return result;
}

function fileNameToPrefix(filePath) {
  const base = path.basename(filePath, path.extname(filePath));
  let name = base
    .replace(/^Pm/, '').replace(/^Scm/, '').replace(/^Hrm/, '')
    .replace(/^Mes/, '').replace(/^Qms/, '').replace(/^Pdm/, '')
    .replace(/^Rd/, '').replace(/^Rs/, '').replace(/^Finance/, '')
    .replace(/^Ehs/, '').replace(/^Gis/, '').replace(/^Analytics/, '')
    .replace(/^Lims/, '').replace(/^Iam/, '')
    .toLowerCase().replace(/[_-]/g, '_').replace(/page$/i, '');
  return name || 'page';
}

function sanitizeKey(text) {
  return text
    .replace(/[^a-zA-Z0-9_\u4e00-\u9fff]/g, '_')
    .replace(/_+/g, '_').replace(/^_|_$/g, '')
    .toLowerCase().slice(0, 40);
}

function isInComment(content, pos) {
  const lineStart = content.lastIndexOf('\n', pos) + 1;
  const linePrefix = content.slice(lineStart, pos);
  if (linePrefix.trim().startsWith('//') || linePrefix.trim().startsWith('*')) return true;
  const before = content.slice(0, pos);
  const lastOpen = before.lastIndexOf('/*');
  const lastClose = before.lastIndexOf('*/');
  if (lastOpen > lastClose && lastOpen !== -1) return true;
  return false;
}

function isAlreadyTranslated(content, matchStart) {
  const before = content.slice(Math.max(0, matchStart - 30), matchStart);
  if (/i18n\.t\(\s*$/.test(before) || /\bt\(\s*$/.test(before)) return true;
  return false;
}

function isComparisonValue(content, matchStart) {
  const before = content.slice(Math.max(0, matchStart - 20), matchStart);
  return /(?:===|!==|==|!=)\s*$/.test(before);
}

function isObjectKey(content, matchEnd) {
  const after = content.slice(matchEnd, Math.min(content.length, matchEnd + 5));
  return /^\s*:/.test(after);
}

function detectI18nSetup(content) {
  const hasI18nImport = /import\s+i18n\s+from\s+['"]@\/i18n['"]/.test(content);
  const hasUseTranslationImport = /import\s+\{[^}]*useTranslation[^}]*\}\s+from\s+['"]react-i18next['"]/.test(content);
  const hasTHook = /const\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useTranslation/.test(content);
  return { hasI18nImport, hasUseTranslationImport, hasTHook };
}

function addI18nImport(content) {
  const importLine = "import i18n from '@/i18n';";
  if (content.includes(importLine)) return content;
  const allImports = [...content.matchAll(/^import .+;/gm)];
  if (allImports.length > 0) {
    const last = allImports[allImports.length - 1];
    const pos = last.index + last[0].length;
    return content.slice(0, pos) + '\n' + importLine + content.slice(pos);
  }
  return importLine + '\n' + content;
}

function findComponentBodyStart(content) {
  const patterns = [
    /(?:export\s+)?(?:const|function)\s+\w+(?:\s*:[^=]+)?\s*(?:=\s*(?:\([^)]*\)\s*=>|\(\)\s*=>|function))\s*\{/,
    /(?:export\s+)?(?:default\s+)?function\s+\w+\s*\([^)]*\)\s*\{/,
  ];
  for (const re of patterns) {
    const m = content.match(re);
    if (m) {
      const bracePos = content.indexOf('{', m.index);
      if (bracePos !== -1) return bracePos + 1;
    }
  }
  return null;
}

// Track ranges that have been claimed by earlier passes to avoid double-processing
function rangesOverlap(a, b) {
  return a.start < b.end && b.start < a.end;
}

function processFile(filePath, moduleName) {
  let content = fs.readFileSync(filePath, 'utf-8');
  if (!CHINESE_RE.test(content)) return null;

  const { hasI18nImport, hasUseTranslationImport, hasTHook } = detectI18nSetup(content);
  const useHook = hasTHook;
  const prefix = fileNameToPrefix(filePath);
  const fullPrefix = `${moduleName}.${prefix}`;
  const useFn = useHook ? 't' : 'i18n.t';
  const newKeys = {};
  // Each replacement: { start, end, replacement }
  const replacements = [];
  const claimedRanges = [];

  function isClaimed(start, end) {
    return claimedRanges.some(r => rangesOverlap({ start, end }, r));
  }

  function claim(start, end) {
    claimedRanges.push({ start, end });
  }

  // === Pass 1: JSX text content (text between > and <) ===
  const jsxTextRe = />(\s*)([\u4e00-\u9fff][^<>]{0,120})(\s*)</g;
  for (const m of content.matchAll(jsxTextRe)) {
    const text = m[2];
    if (!CHINESE_RE.test(text)) continue;
    if (isInComment(content, m.index)) continue;
    if (text.trim().length < 2) continue;
    const textStart = m.index + 1 + m[1].length; // after > and whitespace
    if (isClaimed(m.index, m.index + m[0].length)) continue;
    if (text.includes('{') && text.includes('}')) continue; // skip mixed expressions

    const key = `${fullPrefix}.${sanitizeKey(text.trim())}`;
    newKeys[key] = text.trim();
    const ws1 = m[1];
    const ws2 = m[3];
    replacements.push({
      start: m.index,
      end: m.index + m[0].length,
      replacement: `>${ws1}{${useFn}('${key}')}${ws2}<`,
    });
    claim(m.index, m.index + m[0].length);
  }

  // === Pass 2: JSX attributes with Chinese string values ===
  const attrRe = /(\w+)=["']([\u4e00-\u9fff][^"'\n]{0,80})["']/g;
  const skipProps = new Set(['className', 'sx', 'color', 'bg', 'variant', 'size', 'href', 'src', 'key', 'id', 'name', 'component', 'to', 'onClick', 'onChange', 'value', 'defaultValue', 'fullWidth', 'direction', 'spacing', 'md', 'xs', 'sm', 'lg', 'xl', 'type', 'disabled', 'open', 'selected', 'checked', 'rows', 'maxRows', 'min', 'max', 'step', 'margin', 'align', 'justifyContent', 'alignItems', 'display', 'flexDirection', 'gap', 'p', 'm', 'px', 'py', 'mx', 'my', 'mt', 'mb', 'ml', 'mr', 'pt', 'pb', 'pl', 'pr', 'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight', 'position', 'top', 'bottom', 'left', 'right', 'zIndex', 'border', 'borderRadius', 'fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'letterSpacing', 'textTransform', 'whiteSpace', 'overflow', 'cursor', 'background', 'backgroundColor', 'backgroundImage', 'borderColor', 'borderTop', 'borderBottom', 'borderLeft', 'borderRight', 'boxShadow', 'opacity', 'visibility', 'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'flexWrap', 'gridColumn', 'gridRow', 'textAlign', 'textOverflow', 'wordBreak', 'wordWrap', 'objectFit', 'transform', 'transition', 'animation']);
  for (const m of content.matchAll(attrRe)) {
    const propName = m[1];
    const text = m[2];
    if (!CHINESE_RE.test(text)) continue;
    if (isInComment(content, m.index)) continue;
    if (isAlreadyTranslated(content, m.index)) continue;
    if (skipProps.has(propName)) continue;
    if (isClaimed(m.index, m.index + m[0].length)) continue;

    const key = `${fullPrefix}.${sanitizeKey(text)}`;
    newKeys[key] = text;
    replacements.push({
      start: m.index,
      end: m.index + m[0].length,
      replacement: `${propName}={${useFn}('${key}')}`,
    });
    claim(m.index, m.index + m[0].length);
  }

  // === Pass 3: Template literals with Chinese ===
  const templateRe = /`([^`]*[\u4e00-\u9fff][^`]*)`/g;
  for (const m of content.matchAll(templateRe)) {
    const text = m[1];
    if (!CHINESE_RE.test(text)) continue;
    if (isInComment(content, m.index)) continue;
    if (isAlreadyTranslated(content, m.index)) continue;
    if (isObjectKey(content, m.index + m[0].length)) continue;
    if (isClaimed(m.index, m.index + m[0].length)) continue;

    const varRe = /\$\{([^}]+)\}/g;
    const vars = [];
    let varMatch;
    while ((varMatch = varRe.exec(text)) !== null) {
      vars.push(varMatch[1]);
    }

    let transText = text;
    const varParams = {};
    for (let i = 0; i < vars.length; i++) {
      const varName = `v${i}`;
      transText = transText.replace(`\${${vars[i]}}`, `{{${varName}}}`);
      varParams[varName] = vars[i];
    }

    const keyText = text.replace(/\$\{[^}]+\}/g, '').trim();
    const key = `${fullPrefix}.${sanitizeKey(keyText)}`;
    newKeys[key] = transText;

    const paramsStr = Object.entries(varParams).map(([k, v]) => `${k}: ${v}`).join(', ');
    if (paramsStr) {
      replacements.push({
        start: m.index,
        end: m.index + m[0].length,
        replacement: `${useFn}('${key}', { ${paramsStr} })`,
      });
    } else {
      replacements.push({
        start: m.index,
        end: m.index + m[0].length,
        replacement: `${useFn}('${key}')`,
      });
    }
    claim(m.index, m.index + m[0].length);
  }

  // === Pass 4: Regular string literals (single/double quotes) ===
  const stringPatterns = [
    /'((?:[^'\\]|\\.)*[\u4e00-\u9fff](?:[^'\\]|\\.)*)'/g,
    /"((?:[^"\\]|\\.)*[\u4e00-\u9fff](?:[^"\\]|\\.)*)"/g,
  ];

  for (const re of stringPatterns) {
    for (const m of content.matchAll(re)) {
      const fullMatch = m[0];
      const text = m[1];
      if (!CHINESE_RE.test(text)) continue;
      if (isInComment(content, m.index)) continue;
      if (isAlreadyTranslated(content, m.index)) continue;
      if (isComparisonValue(content, m.index)) continue;
      if (isObjectKey(content, m.index + fullMatch.length)) continue;
      if (text.includes('<') || text.includes('>')) continue;
      if (text.startsWith('/') || text.startsWith('./') || text.startsWith('../')) continue;
      if (text.trim().length < 2) continue;
      if (isClaimed(m.index, m.index + fullMatch.length)) continue;

      // Skip if preceded by > (JSX text handled in pass 1) or = (JSX attribute handled in pass 2)
      const before = content.slice(Math.max(0, m.index - 2), m.index);
      if (before.endsWith('>')) continue;
      const attrCheck = content.slice(Math.max(0, m.index - 60), m.index);
      if (/\w+=\s*$/.test(attrCheck) && !/=\s*\{/.test(attrCheck)) continue;

      const key = `${fullPrefix}.${sanitizeKey(text)}`;
      newKeys[key] = text;
      replacements.push({
        start: m.index,
        end: m.index + fullMatch.length,
        replacement: `${useFn}('${key}')`,
      });
      claim(m.index, m.index + fullMatch.length);
    }
  }

  if (replacements.length === 0) return null;

  // Add imports if needed
  if (useHook) {
    if (!hasUseTranslationImport) {
      const importLine = "import { useTranslation } from 'react-i18next';";
      const allImports = [...content.matchAll(/^import .+;/gm)];
      if (allImports.length > 0) {
        const last = allImports[allImports.length - 1];
        const pos = last.index + last[0].length;
        content = content.slice(0, pos) + '\n' + importLine + content.slice(pos);
        // Shift all replacement positions by the added import length
        const added = importLine.length + 1;
        for (const r of replacements) { r.start += added; r.end += added; }
      }
    }
    if (!hasTHook) {
      const insertPoint = findComponentBodyStart(content);
      if (insertPoint !== null) {
        const hookLine = `\n  const { t } = useTranslation('${moduleName}');\n`;
        content = content.slice(0, insertPoint) + hookLine + content.slice(insertPoint);
        const added = hookLine.length;
        for (const r of replacements) {
          if (r.start >= insertPoint) { r.start += added; r.end += added; }
        }
      }
    }
  } else {
    if (!hasI18nImport) {
      content = addI18nImport(content);
      const importLine = "import i18n from '@/i18n';";
      const allImports = [...content.matchAll(/^import .+;/gm)];
      // Find where our import was added
      const idx = content.indexOf(importLine);
      if (idx !== -1) {
        // The import was inserted after the last import, so positions after it need shifting
        const insertEnd = idx + importLine.length + 1; // +1 for newline
        for (const r of replacements) {
          if (r.start >= insertEnd) { r.start += importLine.length + 1; r.end += importLine.length + 1; }
        }
      }
    }
  }

  // Apply replacements in reverse order (last position first) to preserve positions
  replacements.sort((a, b) => b.start - a.start);
  for (const r of replacements) {
    content = content.slice(0, r.start) + r.replacement + content.slice(r.end);
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  return { file: path.relative(projectRoot, filePath), count: replacements.length, newKeys };
}

function processModule(moduleName) {
  const modulePath = path.join(projectRoot, 'src', 'pages', moduleName);
  if (!fs.existsSync(modulePath)) return null;

  console.log(`\n--- ${moduleName} ---`);
  const files = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const fp = path.join(dir, e.name);
      if (e.name === 'node_modules') continue;
      if (e.isDirectory()) walk(fp);
      else if (/\.tsx?$/.test(e.name)) files.push(fp);
    }
  }
  walk(modulePath);

  let totalChanges = 0, changedFiles = 0;
  const allNewKeys = {};

  for (const filePath of files) {
    try {
      const result = processFile(filePath, moduleName);
      if (result) {
        totalChanges += result.count;
        changedFiles++;
        Object.assign(allNewKeys, result.newKeys);
        if (result.count >= 3) console.log(`  ${path.relative(projectRoot, filePath)}: ${result.count} 处`);
      }
    } catch (err) {
      console.log(`  [ERROR] ${path.relative(projectRoot, filePath)}: ${err.message}`);
    }
  }

  if (Object.keys(allNewKeys).length > 0) {
    const moduleObj = getModuleObj(moduleName);
    const flatModule = flatten(moduleObj);
    const mergedFlat = { ...flatModule };
    let newCount = 0;
    for (const [k, v] of Object.entries(allNewKeys)) {
      if (!mergedFlat[k]) { mergedFlat[k] = v; newCount++; }
    }
    if (newCount > 0) {
      const newObj = unflatten(mergedFlat);
      saveModuleObj(moduleName, newObj);
      const zhObj = getZhObj();
      zhObj[moduleName] = deepMerge(zhObj[moduleName] || {}, newObj);
      saveZhObj(zhObj);
      console.log(`  翻译: +${newCount} key`);
    }
  }

  console.log(`  结果: ${changedFiles}/${files.length} 文件, ${totalChanges} 处`);
  return { module: moduleName, files: changedFiles, totalFiles: files.length, changes: totalChanges };
}

const targetModules = process.argv.slice(2);
const modules = targetModules.length > 0 ? targetModules : ['lims', 'ehs', 'rd', 'iam'];

console.log('=== TOPEMS i18n 剩余处理 ===');
const results = [];
for (const mod of modules) {
  try { const r = processModule(mod); if (r) results.push(r); }
  catch (err) { console.log(`\n[ERROR] ${mod}: ${err.message}`); }
}
console.log('\n=== 总摘要 ===');
for (const r of results) console.log(`  ${r.module}: ${r.files}/${r.totalFiles} 文件, ${r.changes} 处`);
