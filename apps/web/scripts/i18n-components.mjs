import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const CHINESE_RE = /[\u4e00-\u9fff]/;

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getZhObj() {
  const filePath = path.join(projectRoot, 'src', 'i18n', 'locales', 'zh.json');
  if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return {};
}

function saveZhObj(obj) {
  const filePath = path.join(projectRoot, 'src', 'i18n', 'locales', 'zh.json');
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n', 'utf-8');
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
    let obj = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = v;
  }
  return result;
}

function sanitizeKey(text) {
  let key = text
    .replace(/[\u4e00-\u9fff]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!key) key = `key_${text.length}`;
  return key;
}

function findExportComponentBodyStart(content) {
  const exportRe = /export\s+(?:const|function|default)\s+(?:\w+)\s*(?::\s*React\.FC(?:<[^>]*>)?)?\s*=\s*/g;
  
  let match;
  while ((match = exportRe.exec(content)) !== null) {
    const afterExport = content.slice(match.index + match[0].length);
    
    let pos = 0;
    let depth = 0;
    let inParams = false;
    let paramsEnd = -1;
    let foundArrow = false;
    
    while (pos < afterExport.length) {
      const ch = afterExport[pos];
      
      if (!inParams) {
        if (ch === '(' || ch === '{') {
          inParams = true;
          depth = 1;
        } else if (/[a-zA-Z_]\w*$/.test(afterExport.slice(0, pos))) {
          foundArrow = true;
        }
      } else {
        if (ch === '(') depth++;
        else if (ch === ')') {
          depth--;
          if (depth === 0) {
            paramsEnd = pos + 1;
            break;
          }
        } else if (ch === '{') {
          depth++;
        } else if (ch === '}') {
          depth--;
        }
      }
      pos++;
    }
    
    let bodyStart = -1;
    
    if (paramsEnd !== -1) {
      const afterParams = afterExport.slice(paramsEnd);
      const arrowMatch = afterParams.match(/^\s*=>\s*/);
      if (arrowMatch) {
        const afterArrow = afterParams.slice(arrowMatch[0].length);
        if (afterArrow[0] === '{') {
          bodyStart = match.index + match[0].length + paramsEnd + arrowMatch[0].length + 1;
        }
      } else if (afterParams.trim()[0] === '{') {
        const braceIdx = afterParams.indexOf('{');
        bodyStart = match.index + match[0].length + paramsEnd + braceIdx + 1;
      }
    }
    
    if (bodyStart !== -1) {
      const rest = content.slice(bodyStart);
      if (/return\s*[(<]/.test(rest) || /const\s+\w+\s*=/.test(rest.slice(0, 100))) {
        return bodyStart;
      }
    }
  }
  
  const functionRe = /export\s+function\s+(\w+)\s*/g;
  while ((match = functionRe.exec(content)) !== null) {
    const afterName = content.slice(match.index + match[0].length);
    
    let pos = 0;
    let depth = 0;
    let inParams = false;
    let paramsEnd = -1;
    
    while (pos < afterName.length) {
      const ch = afterName[pos];
      
      if (!inParams) {
        if (ch === '(') {
          inParams = true;
          depth = 1;
        }
      } else {
        if (ch === '(') depth++;
        else if (ch === ')') {
          depth--;
          if (depth === 0) {
            paramsEnd = pos + 1;
            break;
          }
        }
      }
      pos++;
    }
    
    if (paramsEnd !== -1) {
      const afterParams = afterName.slice(paramsEnd);
      const braceMatch = afterParams.match(/^\s*\{/);
      if (braceMatch) {
        const bodyStart = match.index + match[0].length + paramsEnd + braceMatch[0].length;
        const rest = content.slice(bodyStart);
        if (/return\s*[(<]/.test(rest) || /const\s+\w+\s*=/.test(rest.slice(0, 100))) {
          return bodyStart;
        }
      }
    }
  }
  
  return null;
}

function insertUseTranslationHook(content, hookInsertPos, hasTHook) {
  if (hasTHook) return content;
  
  let importLine = "import { useTranslation } from 'react-i18next';";
  
  const importRe = /import\s+{([^}]+)}\s+from\s+['"]react-i18next['"]/;
  const importMatch = content.match(importRe);
  
  if (importMatch) {
    const imports = importMatch[1];
    if (!imports.includes('useTranslation')) {
      content = content.replace(importRe, `import {${imports}, useTranslation} from 'react-i18next'`);
    }
  } else {
    const lastImportRe = /(import\s+[^;]+;?\s*\n?)/g;
    let lastImportIndex = 0;
    let m;
    while ((m = lastImportRe.exec(content)) !== null) {
      lastImportIndex = lastImportRe.lastIndex;
    }
    
    if (lastImportIndex > 0) {
      content = content.slice(0, lastImportIndex) + importLine + '\n' + content.slice(lastImportIndex);
    } else {
      const firstLineEnd = content.indexOf('\n');
      if (firstLineEnd !== -1) {
        content = content.slice(0, firstLineEnd + 1) + importLine + '\n' + content.slice(firstLineEnd + 1);
      } else {
        content = importLine + '\n' + content;
      }
    }
  }
  
  const hookLine = 'const { t } = useTranslation();';
  const beforeHook = content.slice(0, hookInsertPos);
  const afterHook = content.slice(hookInsertPos);
  
  if (beforeHook.endsWith('\n')) {
    return beforeHook + hookLine + '\n' + afterHook;
  } else {
    return beforeHook + '\n' + hookLine + '\n' + afterHook;
  }
}

function isInJsxContext(content, start, end) {
  const before = content.slice(Math.max(0, start - 60), start);
  
  const attrMatch = before.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*$/);
  if (attrMatch) {
    const propName = attrMatch[1];
    const prevChar = before[before.length - propName.length - 1] || '';
    if (!/[=!<>+\-*/%&|^~?:,.([\]{}]/.test(prevChar)) {
      return true;
    }
  }

  let lastGt = -1;
  for (let i = start - 1; i >= 0; i--) {
    if (content[i] === '>') { lastGt = i; break; }
    if (content[i] === '<') break;
  }
  if (lastGt !== -1) {
    let nextLt = -1;
    for (let i = end; i < content.length; i++) {
      if (content[i] === '<') { nextLt = i; break; }
      if (content[i] === '>') break;
    }
    if (nextLt !== -1) return true;
  }

  return false;
}

function processFile(filePath, zhFlat, zhObj) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  const hasTHook = /const\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useTranslation/.test(content);
  
  if (!hasTHook) return null;
  
  const relativePath = path.relative(path.join(projectRoot, 'src', 'components'), filePath);
  const parts = relativePath.split(path.sep);
  const topDir = parts[0] || 'shared';
  const fileName = path.basename(filePath, path.extname(filePath));
  const prefix = `components.${topDir}.${sanitizeKey(fileName)}`;
  
  const newKeys = {};
  const replacements = [];

  const stringPatterns = [
    { re: /'((?:[^'\\]|\\.)*[\u4e00-\u9fff](?:[^'\\]|\\.)*)'/g },
    { re: /"((?:[^"\\]|\\.)*[\u4e00-\u9fff](?:[^"\\]|\\.)*)"/g },
  ];

  for (const { re } of stringPatterns) {
    for (const m of content.matchAll(re)) {
      const fullMatch = m[0];
      const text = m[1];
      if (!CHINESE_RE.test(text)) continue;
      if (text.startsWith('//') || text.startsWith('*')) continue;
      if (text.includes('${') || text.includes('{') || text.includes('}')) continue;
      if (text.includes('<') || text.includes('>')) continue;
      if (text.length < 1) continue;
      if (/useTranslation|i18n|locales/.test(text)) continue;

      const matchStart = m.index;
      const matchEnd = m.index + fullMatch.length;

      if (isInJsxContext(content, matchStart, matchEnd)) continue;

      const key = `${prefix}.${sanitizeKey(text)}`;
      newKeys[key] = text;
      replacements.push({ fullMatch, key });
    }
  }

  if (replacements.length === 0) return null;

  let newContent = content;

  for (const { fullMatch, key } of replacements) {
    newContent = newContent.replace(escapeRegExp(fullMatch), `t('${key}')`);
  }

  fs.writeFileSync(filePath, newContent, 'utf-8');

  for (const [k, v] of Object.entries(newKeys)) {
    zhFlat[k] = v;
  }

  return { count: replacements.length, newKeys };
}

function walkComponents(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '__tests__') continue;
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...walkComponents(fp));
    } else if (/\.(tsx?|jsx?)$/.test(e.name)) {
      files.push(fp);
    }
  }
  return files;
}

function main() {
  const zhObj = getZhObj();
  const zhFlat = flatten(zhObj);

  const componentsDir = path.join(projectRoot, 'src', 'components');
  const allFiles = walkComponents(componentsDir);

  const results = [];
  let totalCount = 0;
  let totalFiles = 0;
  const allNewKeys = {};

  for (const file of allFiles) {
    try {
      const result = processFile(file, zhFlat, zhObj);
      if (result) {
        results.push({ file, count: result.count });
        totalCount += result.count;
        totalFiles++;
        Object.assign(allNewKeys, result.newKeys);
        console.log(`  ${path.relative(projectRoot, file)}: ${result.count} 处`);
      }
    } catch (err) {
      console.error(`  ERROR ${path.relative(projectRoot, file)}: ${err.message}`);
    }
  }

  const newZhObj = unflatten(zhFlat);
  saveZhObj(newZhObj);

  console.log(`\n=== 摘要 ===`);
  console.log(`  处理文件: ${totalFiles}`);
  console.log(`  替换处数: ${totalCount}`);
  console.log(`  新增key: ${Object.keys(allNewKeys).length}`);
}

main();