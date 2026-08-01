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
    let target = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!target[parts[i]]) target[parts[i]] = {};
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
  return base
    .replace(/^Pm/, '').replace(/^Scm/, '').replace(/^Hrm/, '')
    .replace(/^Mes/, '').replace(/^Qms/, '').replace(/^Pdm/, '')
    .replace(/^Rd/, '').replace(/^Finance/, '').replace(/^Ehs/, '')
    .replace(/^Gis/, '').replace(/^Analytics/, '')
    .toLowerCase().replace(/[_-]/g, '_').replace(/page$/i, '');
}

function sanitizeKey(text) {
  return text
    .replace(/[^a-zA-Z0-9_\u4e00-\u9fff]/g, '_')
    .replace(/_+/g, '_').replace(/^_|_$/g, '')
    .toLowerCase().slice(0, 40);
}

function isInJsxTag(content, pos) {
  let depth = 0;
  for (let i = 0; i < pos; i++) {
    const ch = content[i];
    if (ch === '<') depth++;
    else if (ch === '>') depth--;
  }
  return depth > 0;
}

function findExportComponentBodyStart(content) {
  const patterns = [
    /export\s+const\s+(\w+)\s*(?::\s*React\.FC(?:<[^>]*>)?)?\s*=\s*(?:\([^)]*\)|[a-zA-Z_]\w*)\s*(?::\s*[^=)]+)?\s*=>\s*\{/,
    /export\s+function\s+(\w+)\s*\([^)]*\)\s*\{/,
    /export\s+default\s+(?:const|function)\s+(?:\w+)\s*(?:\([^)]*\))?\s*=>\s*\{/,
    /export\s+default\s+(?:function)\s+(?:\w+)\s*\([^)]*\)\s*\{/,
    /export\s+default\s+(?:const|function)\s*\w*\s*(?::\s*React\.FC(?:<[^>]*>)?)?\s*=\s*(?:\([^)]*\)|[a-zA-Z_]\w*)\s*(?::\s*[^=)]+)?\s*=>\s*\{/,
    /export\s+default\s+(\w+)\s*(?:\([^)]*\))?\s*=>\s*\{/,
  ];

  for (const pat of patterns) {
    const m = pat.exec(content);
    if (m) {
      const bodyStart = m.index + m[0].length;
      const rest = content.slice(bodyStart);
      if (/return\s*[(<]/.test(rest)) return bodyStart;
    }
  }
  return null;
}

function processFile(filePath, moduleName) {
  const relPath = path.relative(projectRoot, filePath);
  let content = fs.readFileSync(filePath, 'utf-8');
  if (!CHINESE_RE.test(content)) return null;

  const importLine = "import { useTranslation } from 'react-i18next';";
  const hasImport = content.includes(importLine);
  const hasTHook = /const\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useTranslation/.test(content);

  const prefix = fileNameToPrefix(filePath);
  const newKeys = {};
  const replacements = [];

  const stringPatterns = [
    { re: /'((?:[^'\\]|\\.)*[\u4e00-\u9fff](?:[^'\\]|\\.)*)'/g, quote: "'" },
    { re: /"((?:[^"\\]|\\.)*[\u4e00-\u9fff](?:[^"\\]|\\.)*)"/g, quote: '"' },
  ];

  for (const { re } of stringPatterns) {
    for (const m of content.matchAll(re)) {
      const fullMatch = m[0];
      const text = m[1];
      if (!CHINESE_RE.test(text)) continue;
      if (text.startsWith('//') || text.startsWith('*')) continue;
      if (text.includes('${') || text.includes('{') || text.includes('}')) continue;
      if (text.length < 1) continue;
      if (/useTranslation|i18n|locales/.test(text)) continue;

      const matchStart = m.index;
      const matchEnd = m.index + fullMatch.length;

      if (isInJsxTag(content, matchStart)) continue;

      const key = `${prefix}.${sanitizeKey(text)}`;
      newKeys[key] = text;
      replacements.push({ fullMatch, key });
    }
  }

  if (replacements.length === 0) return null;

  if (!hasImport) {
    const reactMatch = content.match(/^import React[^;]*;/m);
    if (reactMatch) {
      content = content.replace(reactMatch[0], `${reactMatch[0]}\n${importLine}`);
    } else {
      const allImports = [...content.matchAll(/^import .+;/gm)];
      if (allImports.length > 0) {
        const last = allImports[allImports.length - 1];
        const pos = last.index + last[0].length;
        content = content.slice(0, pos) + '\n' + importLine + content.slice(pos);
      }
    }
  }

  if (!hasTHook) {
    const insertPoint = findExportComponentBodyStart(content);
    if (insertPoint !== null) {
      const hookLine = `  const { t } = useTranslation('${moduleName}');\n`;
      content = content.slice(0, insertPoint) + '\n' + hookLine + content.slice(insertPoint);
    } else {
      console.log(`  [NO-HOOK] ${relPath}`);
    }
  }

  for (const rep of replacements.reverse()) {
    content = content.replace(escapeRegExp(rep.fullMatch), `t('${rep.key}')`);
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  return { file: relPath, count: replacements.length, newKeys };
}

function processModule(moduleName) {
  const modulePath = path.join(projectRoot, 'src', 'pages', moduleName);
  if (!fs.existsSync(modulePath)) {
    console.log(`  [SKIP] ${moduleName}: 目录不存在`);
    return null;
  }

  console.log(`\n--- ${moduleName} ---`);

  const files = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const fp = path.join(dir, e.name);
      if (e.name === 'node_modules') continue;
      if (e.isDirectory()) walk(fp);
      else if (/\.(tsx?|jsx?)$/.test(e.name)) files.push(fp);
    }
  }
  walk(modulePath);

  let totalChanges = 0;
  let changedFiles = 0;
  const allNewKeys = {};

  for (const filePath of files) {
    try {
      const result = processFile(filePath, moduleName);
      if (result) {
        totalChanges += result.count;
        changedFiles++;
        Object.assign(allNewKeys, result.newKeys);
        if (result.count >= 5) {
          console.log(`  ${path.relative(projectRoot, filePath)}: ${result.count} 处`);
        }
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
      if (!mergedFlat[k]) {
        mergedFlat[k] = v;
        newCount++;
      }
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
const modules = targetModules.length > 0 ? targetModules : [
  'scm', 'hrm', 'mes', 'qms', 'pdm', 'rd', 'pm',
  'finance', 'ehs', 'gis', 'analytics'
];

console.log('=== TOPEMS i18n 安全模式 v5 ===');
console.log('策略: 基于标签深度跳过 JSX + 仅 export 组件注入 hook');
console.log(`模块: ${modules.join(', ')}`);

const results = [];
for (const mod of modules) {
  try {
    const r = processModule(mod);
    if (r) results.push(r);
  } catch (err) {
    console.log(`\n[ERROR] ${mod}: ${err.message}`);
  }
}

console.log('\n=== 总摘要 ===');
let totalFiles = 0, totalChanges = 0;
for (const r of results) {
  console.log(`  ${r.module}: ${r.files}/${r.totalFiles} 文件, ${r.changes} 处`);
  totalFiles += r.files;
  totalChanges += r.changes;
}
console.log(`\n总计: ${totalFiles} 文件, ${totalChanges} 处`);