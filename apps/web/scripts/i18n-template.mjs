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

function extractTemplateVars(template) {
  const vars = [];
  const re = /\$\{([^}]+)\}/g;
  let m;
  while ((m = re.exec(template)) !== null) {
    const expr = m[1].trim();
    const varName = expr.split('.')[0].split('(')[0].trim();
    vars.push({ raw: m[0], name: varName, full: expr });
  }
  return vars;
}

function processTemplateLiterals(content, prefix) {
  const newKeys = {};
  const replacements = [];
  
  const templateRe = /`([^`]*[\u4e00-\u9fff][^`]*)`/g;
  
  for (const m of content.matchAll(templateRe)) {
    const fullMatch = m[0];
    const template = m[1];
    if (!CHINESE_RE.test(template)) continue;
    
    if (/useTranslation|i18n|locales/.test(template)) continue;
    
    const vars = extractTemplateVars(fullMatch);
    
    if (vars.length === 0) {
      const key = `${prefix}.${sanitizeKey(template)}`;
      newKeys[key] = template;
      replacements.push({ fullMatch, replacement: `t('${key}')` });
    } else {
      let processed = template;
      const params = {};
      
      for (const v of vars) {
        const placeholder = `{{${v.name}}}`;
        processed = processed.replace(v.raw, placeholder);
        params[v.name] = v.full;
      }
      
      const key = `${prefix}.${sanitizeKey(processed)}`;
      newKeys[key] = processed;
      
      const paramStr = Object.keys(params).map(k => `${k}: ${params[k]}`).join(', ');
      replacements.push({ 
        fullMatch, 
        replacement: `t('${key}', { ${paramStr} })` 
      });
    }
  }
  
  return { newKeys, replacements };
}

function fileNameToPrefix(filePath) {
  const relativePath = path.relative(path.join(projectRoot, 'src', 'pages'), filePath);
  const parts = relativePath.split(path.sep);
  const module = parts[0] || 'shared';
  const fileName = path.basename(filePath, path.extname(filePath));
  return `${module}.${sanitizeKey(fileName)}`;
}

function processFile(filePath, zhFlat) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  const hasTHook = /const\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useTranslation/.test(content);
  if (!hasTHook) return null;
  
  const prefix = fileNameToPrefix(filePath);
  
  const { newKeys, replacements } = processTemplateLiterals(content, prefix);
  
  if (replacements.length === 0) return null;
  
  let newContent = content;
  
  for (const { fullMatch, replacement } of replacements) {
    newContent = newContent.replace(escapeRegExp(fullMatch), replacement);
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
  const modules = ['scm', 'hrm', 'mes', 'qms', 'pdm', 'rd', 'pm', 'finance', 'ehs', 'gis'];
  
  let totalCount = 0;
  let totalFiles = 0;
  const allNewKeys = {};
  
  for (const moduleName of modules) {
    const moduleDir = path.join(pagesDir, moduleName);
    if (!fs.existsSync(moduleDir)) continue;
    
    const files = walkDir(moduleDir);
    let moduleCount = 0;
    let moduleFiles = 0;
    
    for (const file of files) {
      try {
        const result = processFile(file, zhFlat);
        if (result) {
          console.log(`  ${path.relative(projectRoot, file)}: ${result.count} 处`);
          totalCount += result.count;
          totalFiles++;
          moduleCount += result.count;
          moduleFiles++;
          Object.assign(allNewKeys, result.newKeys);
        }
      } catch (err) {
        console.error(`  ERROR ${path.relative(projectRoot, file)}: ${err.message}`);
      }
    }
    
    console.log(`--- ${moduleName}: ${moduleFiles}/${files.length} 文件, ${moduleCount} 处 ---`);
  }
  
  const newZhObj = unflatten(zhFlat);
  saveZhObj(newZhObj);
  
  console.log(`\n=== 摘要 ===`);
  console.log(`  处理文件: ${totalFiles}`);
  console.log(`  替换处数: ${totalCount}`);
  console.log(`  新增key: ${Object.keys(allNewKeys).length}`);
}

main();