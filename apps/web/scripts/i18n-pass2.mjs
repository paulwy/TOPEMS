import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const CHINESE_RE = /[\u4e00-\u9fff]/;

function getModuleObj(module) {
  const fp = path.join(projectRoot, 'src', 'i18n', 'locales', 'zh', `${module}.json`);
  return fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp, 'utf-8')) : {};
}
function saveModuleObj(module, obj) {
  fs.writeFileSync(path.join(projectRoot, 'src', 'i18n', 'locales', 'zh', `${module}.json`), JSON.stringify(obj, null, 2) + '\n', 'utf-8');
}
function getZhObj() { return JSON.parse(fs.readFileSync(path.join(projectRoot, 'src', 'i18n', 'locales', 'zh.json'), 'utf-8')); }
function saveZhObj(obj) { fs.writeFileSync(path.join(projectRoot, 'src', 'i18n', 'locales', 'zh.json'), JSON.stringify(obj, null, 2) + '\n', 'utf-8'); }

function flatten(obj, prefix = '') {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) Object.assign(result, flatten(v, key));
    else if (typeof v === 'string') result[key] = v;
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
    if (k in result && typeof result[k] === 'object' && result[k] !== null && !Array.isArray(result[k]) && typeof v === 'object' && v !== null && !Array.isArray(v)) result[k] = deepMerge(result[k], v);
    else result[k] = v;
  }
  return result;
}

function fileNameToPrefix(filePath) {
  const base = path.basename(filePath, path.extname(filePath));
  let name = base
    .replace(/^Pm/, '').replace(/^Scm/, '').replace(/^Hrm/, '').replace(/^Mes/, '').replace(/^Qms/, '')
    .replace(/^Pdm/, '').replace(/^Rd/, '').replace(/^Rs/, '').replace(/^Finance/, '').replace(/^Ehs/, '')
    .replace(/^Gis/, '').replace(/^Analytics/, '').replace(/^Lims/, '').replace(/^Iam/, '')
    .toLowerCase().replace(/[_-]/g, '_').replace(/page$/i, '');
  return name || 'page';
}
function sanitizeKey(text) {
  return text.replace(/[^a-zA-Z0-9_\u4e00-\u9fff]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').toLowerCase().slice(0, 40);
}

function hasI18nImport(content) { return /import\s+i18n\s+from\s+['"]@\/i18n['"]/.test(content); }
function addI18nImport(content) {
  const line = "import i18n from '@/i18n';";
  if (content.includes(line)) return content;
  const imports = [...content.matchAll(/^import .+;/gm)];
  if (imports.length > 0) { const last = imports[imports.length - 1]; return content.slice(0, last.index + last[0].length) + '\n' + line + content.slice(last.index + last[0].length); }
  return line + '\n' + content;
}

function processFile(filePath, moduleName) {
  let content = fs.readFileSync(filePath, 'utf-8');
  if (!CHINESE_RE.test(content)) return null;

  const prefix = fileNameToPrefix(filePath);
  const fullPrefix = `${moduleName}.${prefix}`;
  const useFn = 'i18n.t'; // Use i18n.t for consistency
  const newKeys = {};
  const replacements = []; // { start, end, replacement }
  const claimed = [];
  const isClaimed = (s, e) => claimed.some(r => s < r.end && e > r.start);
  const claim = (s, e) => claimed.push({ start: s, end: e });

  // === Pass A: Mixed JSX text with expressions (text + {expr} + text) ===
  // Match: >text with {expr} more text<
  // Also handle text starting with English letters
  const jsxMixedRe = />([^<>]*(?:\{[^}]*\}[^<>]*)+)</g;
  for (const m of content.matchAll(jsxMixedRe)) {
    const inner = m[1];
    if (!CHINESE_RE.test(inner)) continue;
    if (isClaimed(m.index, m.index + m[0].length)) continue;

    // Parse the text and expressions
    // Split by {expr} to get text parts and expr parts
    const parts = [];
    let remaining = inner;
    let pos = 0;
    const exprRe = /\{([^}]+)\}/g;
    let lastEnd = 0;
    let match;
    while ((match = exprRe.exec(inner)) !== null) {
      if (match.index > lastEnd) {
        parts.push({ type: 'text', value: inner.slice(lastEnd, match.index) });
      }
      parts.push({ type: 'expr', value: match[1] });
      lastEnd = match.index + match[0].length;
    }
    if (lastEnd < inner.length) {
      parts.push({ type: 'text', value: inner.slice(lastEnd) });
    }

    // Check if any text part has Chinese
    const hasChineseText = parts.some(p => p.type === 'text' && CHINESE_RE.test(p.value));
    if (!hasChineseText) continue;

    // Build translation text and params
    let transText = '';
    const params = {};
    let paramIdx = 0;
    for (const p of parts) {
      if (p.type === 'text') {
        transText += p.value;
      } else {
        const varName = `v${paramIdx}`;
        transText += `{{${varName}}}`;
        params[varName] = p.value;
        paramIdx++;
      }
    }

    const transTextTrimmed = transText.trim();
    if (transTextTrimmed.length < 2) continue;

    const key = `${fullPrefix}.${sanitizeKey(transTextTrimmed)}`;
    newKeys[key] = transTextTrimmed;

    const paramsStr = Object.entries(params).map(([k, v]) => `${k}: ${v}`).join(', ');
    const replacement = paramsStr
      ? `>{${useFn}('${key}', { ${paramsStr} })}<`
      : `>{${useFn}('${key}')}<`;

    // Calculate exact positions
    const innerStart = m.index + 1; // after >
    const innerEnd = m.index + m[0].length - 1; // before <
    replacements.push({ start: innerStart, end: innerEnd, replacement: `{${useFn}('${key}'${paramsStr ? `, { ${paramsStr} }` : ''})}` });
    claim(m.index, m.index + m[0].length);
  }

  // === Pass B: JSX text starting with English followed by Chinese ===
  const jsxTextRe2 = />(\s*)([A-Za-z][^<>]*[\u4e00-\u9fff][^<>]{0,120})(\s*)</g;
  for (const m of content.matchAll(jsxTextRe2)) {
    const text = m[2];
    if (!CHINESE_RE.test(text)) continue;
    if (text.includes('{') && text.includes('}')) continue; // skip mixed (handled by Pass A)
    if (isClaimed(m.index, m.index + m[0].length)) continue;
    if (text.trim().length < 2) continue;

    const key = `${fullPrefix}.${sanitizeKey(text.trim())}`;
    newKeys[key] = text.trim();
    const innerStart = m.index + 1 + m[1].length;
    const innerEnd = m.index + 1 + m[1].length + m[2].length;
    replacements.push({ start: innerStart, end: innerEnd, replacement: `{${useFn}('${key}')}` });
    claim(m.index, m.index + m[0].length);
  }

  // === Pass C: Remaining string literals (catch missed ones) ===
  const strRes = [/'((?:[^'\\]|\\.)*[\u4e00-\u9fff](?:[^'\\]|\\.)*)'/g, /"((?:[^"\\]|\\.)*[\u4e00-\u9fff](?:[^"\\]|\\.)*)"/g];
  for (const re of strRes) {
    for (const m of content.matchAll(re)) {
      const fullMatch = m[0];
      const text = m[1];
      if (!CHINESE_RE.test(text)) continue;
      if (isClaimed(m.index, m.index + fullMatch.length)) continue;
      // Skip comments
      const lineStart = content.lastIndexOf('\n', m.index) + 1;
      const linePrefix = content.slice(lineStart, m.index);
      if (linePrefix.trim().startsWith('//') || linePrefix.trim().startsWith('*')) continue;
      // Skip if already translated
      const before = content.slice(Math.max(0, m.index - 30), m.index);
      if (/i18n\.t\(\s*$/.test(before) || /\bt\(\s*$/.test(before)) continue;
      // Skip comparison values
      if (/(?:===|!==|==|!=)\s*$/.test(before)) continue;
      // Skip object keys
      const after = content.slice(m.index + fullMatch.length, m.index + fullMatch.length + 5);
      if (/^\s*:/.test(after)) continue;
      // Skip if preceded by > (JSX text)
      if (before.endsWith('>')) continue;
      // Skip JSX attributes
      if (/\w+=\s*$/.test(before) && !/=\s*\{/.test(before)) continue;
      if (text.includes('<') || text.includes('>')) continue;
      if (text.startsWith('/') || text.startsWith('./') || text.startsWith('../')) continue;
      if (text.trim().length < 2) continue;

      const key = `${fullPrefix}.${sanitizeKey(text)}`;
      newKeys[key] = text;
      replacements.push({ start: m.index, end: m.index + fullMatch.length, replacement: `${useFn}('${key}')` });
      claim(m.index, m.index + fullMatch.length);
    }
  }

  // === Pass D: Template literals (catch missed ones) ===
  const templateRe = /`([^`]*[\u4e00-\u9fff][^`]*)`/g;
  for (const m of content.matchAll(templateRe)) {
    const text = m[1];
    if (!CHINESE_RE.test(text)) continue;
    if (isClaimed(m.index, m.index + m[0].length)) continue;
    const lineStart = content.lastIndexOf('\n', m.index) + 1;
    const linePrefix = content.slice(lineStart, m.index);
    if (linePrefix.trim().startsWith('//') || linePrefix.trim().startsWith('*')) continue;
    const before = content.slice(Math.max(0, m.index - 30), m.index);
    if (/i18n\.t\(\s*$/.test(before) || /\bt\(\s*$/.test(before)) continue;
    const after = content.slice(m.index + m[0].length, m.index + m[0].length + 5);
    if (/^\s*:/.test(after)) continue;

    const varRe = /\$\{([^}]+)\}/g;
    const vars = [];
    let vm;
    while ((vm = varRe.exec(text)) !== null) vars.push(vm[1]);

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
    replacements.push({
      start: m.index,
      end: m.index + m[0].length,
      replacement: paramsStr ? `${useFn}('${key}', { ${paramsStr} })` : `${useFn}('${key}')`,
    });
    claim(m.index, m.index + m[0].length);
  }

  // === Pass E: Translate comments to English ===
  // Single-line comments: // 中文 → // English
  const lines = content.split('\n');
  let offset = 0;
  const commentReplacements = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = offset;
    // Match // comment with Chinese
    const commentMatch = line.match(/^(\s*)(\/\/\s*)(.*)$/);
    if (commentMatch && CHINESE_RE.test(commentMatch[3])) {
      const text = commentMatch[3].trim();
      const englishText = translateComment(text);
      if (englishText !== text) {
        const textStart = lineStart + commentMatch[1].length + commentMatch[2].length;
        const textEnd = lineStart + line.length;
        commentReplacements.push({ start: textStart, end: textEnd, replacement: englishText });
      }
    }
    // Match * comment (JSDoc) with Chinese
    const jsdocMatch = line.match(/^(\s*\*\s*)(.*)$/);
    if (jsdocMatch && CHINESE_RE.test(jsdocMatch[2]) && !line.includes('*/')) {
      const text = jsdocMatch[2].trim();
      if (text && !text.startsWith('@')) {
        const englishText = translateComment(text);
        if (englishText !== text) {
          const textStart = lineStart + jsdocMatch[1].length;
          const textEnd = lineStart + line.length;
          commentReplacements.push({ start: textStart, end: textEnd, replacement: englishText });
        }
      }
    }
    // Match {/* 中文 */} JSX comments
    const jsxCommentMatch = line.match(/(\{\/\*\s*)([^*]+)(\s*\*\/\})/);
    if (jsxCommentMatch && CHINESE_RE.test(jsxCommentMatch[2])) {
      const text = jsxCommentMatch[2].trim();
      const englishText = translateComment(text);
      if (englishText !== text) {
        const commentStart = line.indexOf('{/*') + 3;
        const commentEnd = line.lastIndexOf('*/}');
        if (commentStart > 2 && commentEnd > commentStart) {
          commentReplacements.push({
            start: lineStart + commentStart,
            end: lineStart + commentEnd,
            replacement: ` ${englishText} `,
          });
        }
      }
    }
    offset += line.length + 1; // +1 for \n
  }
  replacements.push(...commentReplacements);

  if (replacements.length === 0) return null;

  // Add import if needed
  let importAdded = 0;
  if (!hasI18nImport(content) && replacements.some(r => r.replacement.includes('i18n.t('))) {
    const line = "import i18n from '@/i18n';";
    const imports = [...content.matchAll(/^import .+;/gm)];
    if (imports.length > 0) {
      const last = imports[imports.length - 1];
      const pos = last.index + last[0].length;
      content = content.slice(0, pos) + '\n' + line + content.slice(pos);
      importAdded = line.length + 1;
      for (const r of replacements) { r.start += importAdded; r.end += importAdded; }
    }
  }

  // Apply replacements in reverse order
  replacements.sort((a, b) => b.start - a.start);
  for (const r of replacements) {
    content = content.slice(0, r.start) + r.replacement + content.slice(r.end);
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  return { file: path.relative(projectRoot, filePath), count: replacements.length, newKeys };
}

// Simple Chinese to English translation for common comment patterns
function translateComment(text) {
  const translations = {
    '公司架构管理页面': 'Company structure management page',
    '管理母子公司关系、持股比例、控制类型等，用于合并报表': 'Manage parent-subsidiary company relationships, ownership ratios, control types, etc. for consolidated reporting',
    '关系类型配置': 'Relationship type configuration',
    '公司架构树节点组件': 'Company structure tree node component',
    '状态': 'Status',
    '查询公司关系列表': 'Query company relationship list',
    '查询公司架构树': 'Query company structure tree',
    '创建公司关系': 'Create company relationship',
    '更新公司关系': 'Update company relationship',
    '删除公司关系': 'Delete company relationship',
    '处理展开/折叠': 'Handle expand/collapse',
    '处理选择关系': 'Handle select relationship',
    '处理删除关系': 'Handle delete relationship',
    '关系列表列定义': 'Relationship list column definitions',
    '搜索栏': 'Search bar',
    '公司架构内容': 'Company structure content',
    '架构树视图': 'Structure tree view',
    '关系列表视图': 'Relationship list view',
    '统计信息': 'Statistics',
    '提示信息': 'Tips',
    '用户管理页面 — Schema 驱动的 CRUD 页面': 'User management page - Schema-driven CRUD page',
    '使用 userSchema 配置 + CrudPage 组件，': 'Using userSchema config + CrudPage component,',
    '代码量从 ~910 行缩减到 ~100 行，减少约 89%。': 'Code reduced from ~910 lines to ~100 lines, ~89% reduction.',
    '用户管理 API 适配器': 'User management API adapter',
    '用户管理页面组件': 'User management page component',
    '默认数据': 'Default data',
    '当前Tab的数据': 'Current tab data',
    '创建本地数据的API适配器（支持所有Tab）': 'Create local data API adapter (supports all tabs)',
    '获取当前Tab的标题': 'Get current tab title',
    '统计概览': 'Statistics overview',
    '左侧Tab导航': 'Left tab navigation',
    '右侧内容区 - 使用CrudPage': 'Right content area - using CrudPage',
    '各Tab特有的额外内容': 'Extra content specific to each tab',
    '页面头部': 'Page header',
    '试验概览': 'Experiment overview',
    '详细信息标签页': 'Detail info tabs',
    '实验记录': 'Experiment records',
    '数据结果': 'Data results',
    '批次追溯': 'Batch traceability',
    '添加记录对话框': 'Add record dialog',
    '文档为统计派生数据，删除后重新查询将刷新列表': 'Documents are derived from statistics; deleting and re-querying will refresh the list',
    'Sidebar - 关联检验任务': 'Sidebar - Related inspection tasks',
    '检测方法管理页面 — Schema 驱动的 CRUD 页面': 'Test method management page - Schema-driven CRUD page',
    'Sidebar - 检验进度': 'Sidebar - Inspection progress',
    '用于统计计算的字段（原页面使用的字段集合）': 'Fields used for statistics calculation (field set used by original page)',
    '统计数据查询（使用 schema entity 作为 key 前缀，CRUD 变更会自动失效）': 'Statistics query (uses schema entity as key prefix, CRUD changes auto-invalidate)',
    'MSDS 弹窗状态': 'MSDS modal state',
  };
  if (translations[text]) return translations[text];
  // For unknown comments, do a simple transliteration: keep as-is but mark
  // Actually, let's try to translate common words
  let result = text;
  const wordMap = {
    '新建': 'Create', '编辑': 'Edit', '删除': 'Delete', '查看': 'View',
    '保存': 'Save', '取消': 'Cancel', '确认': 'Confirm', '关闭': 'Close',
    '搜索': 'Search', '筛选': 'Filter', '排序': 'Sort', '导出': 'Export',
    '导入': 'Import', '添加': 'Add', '修改': 'Modify', '更新': 'Update',
    '加载': 'Load', '加载中': 'Loading', '成功': 'Success', '失败': 'Fail',
    '错误': 'Error', '警告': 'Warning', '信息': 'Info', '提示': 'Tip',
    '操作': 'Operation', '管理': 'Management', '配置': 'Config', '设置': 'Settings',
    '页面': 'Page', '组件': 'Component', '数据': 'Data', '列表': 'List',
    '详情': 'Detail', '统计': 'Statistics', '查询': 'Query', '处理': 'Handle',
    '类型': 'Type', '状态': 'Status', '名称': 'Name', '描述': 'Description',
    '标题': 'Title', '内容': 'Content', '时间': 'Time', '日期': 'Date',
  };
  // If the text is mostly Chinese and not in translations, return as-is
  // (we don't want to badly mistranslate)
  return text;
}

function processModule(moduleName) {
  const modulePath = path.join(projectRoot, 'src', 'pages', moduleName);
  if (!fs.existsSync(modulePath)) return null;

  console.log(`\n--- ${moduleName} ---`);
  const files = [];
  function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
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
        if (result.count >= 2) console.log(`  ${path.relative(projectRoot, filePath)}: ${result.count} 处`);
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

const modules = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ['lims', 'ehs', 'rd', 'iam'];
console.log('=== TOPEMS i18n 第二轮处理 ===');
for (const mod of modules) {
  try { processModule(mod); } catch (err) { console.log(`[ERROR] ${mod}: ${err.message}`); }
}
