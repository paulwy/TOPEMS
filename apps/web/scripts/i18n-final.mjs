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

function isObjectProperty(content, start, end) {
  let nextNonSpace = end;
  while (nextNonSpace < content.length && /\s/.test(content[nextNonSpace])) {
    nextNonSpace++;
  }
  
  if (nextNonSpace < content.length && content[nextNonSpace] === ':') {
    return true;
  }
  
  let prevNonSpace = start - 1;
  while (prevNonSpace >= 0 && /\s/.test(content[prevNonSpace])) {
    prevNonSpace--;
  }
  
  if (prevNonSpace >= 0 && content[prevNonSpace] === ':') {
    return true;
  }
  
  return false;
}

function fileNameToPrefix(filePath, baseDir) {
  const relativePath = path.relative(baseDir, filePath);
  const parts = relativePath.split(path.sep);
  let prefix = '';
  
  if (baseDir.includes('pages')) {
    const module = parts[0] || 'shared';
    const fileName = path.basename(filePath, path.extname(filePath));
    prefix = `${module}.${sanitizeKey(fileName)}`;
  } else {
    const topDir = parts[0] || 'shared';
    const fileName = path.basename(filePath, path.extname(filePath));
    prefix = `components.${topDir}.${sanitizeKey(fileName)}`;
  }
  
  return prefix;
}

function processFile(filePath, baseDir, zhFlat) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  const hasTHook = /const\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useTranslation/.test(content);
  
  if (!hasTHook) return null;
  
  const prefix = fileNameToPrefix(filePath, baseDir);
  
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
      if (text.includes('\n') || text.includes('\r')) continue;
      if (text.length < 1) continue;
      if (/useTranslation|i18n|locales/.test(text)) continue;

      const matchStart = m.index;
      const matchEnd = m.index + fullMatch.length;

      if (isInJsxContext(content, matchStart, matchEnd)) continue;
      if (isObjectProperty(content, matchStart, matchEnd)) continue;

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

function walkDir(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '__tests__' || e.name === 'i18n') continue;
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walkDir(fp));
    else if (/\.(tsx?|jsx?)$/.test(e.name)) files.push(fp);
  }
  return files;
}

function main() {
  const zhObj = getZhObj();
  const zhFlat = flatten(zhObj);
  
  const pagesDir = path.join(projectRoot, 'src', 'pages');
  const componentsDir = path.join(projectRoot, 'src', 'components');
  
  const pageFiles = walkDir(pagesDir);
  const componentFiles = walkDir(componentsDir);
  
  let totalCount = 0;
  let totalFiles = 0;
  const allNewKeys = {};
  
  console.log('=== 处理 Pages ===');
  for (const file of pageFiles) {
    try {
      const result = processFile(file, pagesDir, zhFlat);
      if (result) {
        console.log(`  ${path.relative(projectRoot, file)}: ${result.count} 处`);
        totalCount += result.count;
        totalFiles++;
        Object.assign(allNewKeys, result.newKeys);
      }
    } catch (err) {
      console.error(`  ERROR ${path.relative(projectRoot, file)}: ${err.message}`);
    }
  }
  
  console.log('\n=== 处理 Components ===');
  for (const file of componentFiles) {
    try {
      const result = processFile(file, componentsDir, zhFlat);
      if (result) {
        console.log(`  ${path.relative(projectRoot, file)}: ${result.count} 处`);
        totalCount += result.count;
        totalFiles++;
        Object.assign(allNewKeys, result.newKeys);
      }
    } catch (err) {
      console.error(`  ERROR ${path.relative(projectRoot, file)}: ${err.message}`);
    }
  }
  
  const newZhObj = unflatten(zhFlat);
  saveZhObj(newZhObj);
  
  console.log(`\n=== 总摘要 ===`);
  console.log(`  处理文件: ${totalFiles}`);
  console.log(`  替换处数: ${totalCount}`);
  console.log(`  新增key: ${Object.keys(allNewKeys).length}`);
}

main();